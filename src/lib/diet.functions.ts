import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DayPlan } from "./nutrition";

const GenInput = z.object({
  duration: z.union([z.literal(7), z.literal(14), z.literal(30)]),
});

const SYSTEM_PROMPT = `You are a certified nutritionist AI creating personalized meal plans.
Return ONLY valid JSON matching the requested schema. No markdown, no commentary.
Rules:
- Every day's meals MUST be different; never repeat meals on consecutive days.
- Prefer affordable, locally available Pakistani foods (daal, roti, sabzi, chicken karahi, etc.) when appropriate.
- Diabetic users: low-GI foods, no sugary items.
- Hypertension: low-sodium meals.
- High cholesterol: minimize saturated fats.
- Respect vegetarian/vegan/allergy restrictions strictly.
- Include realistic calorie/macro numbers appropriate to the user's goal, weight, and activity.`;

export const generateDietPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile, error: pErr } = await supabase
      .from("profiles").select("*").eq("id", userId).maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile || !profile.age || !profile.height_cm || !profile.weight_kg) {
      throw new Error("Please complete your profile first (age, height, weight).");
    }

    const bmi = +((profile.weight_kg / Math.pow(profile.height_cm / 100, 2))).toFixed(1);
    const userCtx = `
User profile:
- Name: ${profile.name || "User"}
- Age: ${profile.age}
- Gender: ${profile.gender || "N/A"}
- Height: ${profile.height_cm} cm
- Weight: ${profile.weight_kg} kg
- BMI: ${bmi}
- Activity Level: ${profile.activity_level || "Moderate"}
- Goal: ${profile.goal || "Maintain Weight"}
- Food Preference: ${profile.food_preference || "Non-Vegetarian"}
- Allergies: ${profile.allergies || "None"}
- Medical Conditions: ${profile.medical_conditions || "None"}
`;

    const schema = `{
  "days": [
    {
      "day": 1,
      "breakfast": "string", "breakfast_time": "8:00 AM",
      "lunch": "string", "lunch_time": "1:00 PM",
      "evening_snack": "string", "evening_snack_time": "5:00 PM",
      "dinner": "string", "dinner_time": "8:00 PM",
      "calories": number, "protein_g": number, "carbs_g": number, "fats_g": number,
      "water_liters": number,
      "exercise": "string", "exercise_time": "7:00 AM",
      "health_tip": "string"
    }
  ]
}`;

    const prompt = `${userCtx}
Generate a ${data.duration}-day meal plan with FOUR meals per day only (Breakfast, Lunch, Evening Snack, Dinner) — NO morning snack.
Return JSON exactly matching this schema:
${schema}
The "days" array MUST contain exactly ${data.duration} objects, day 1 through ${data.duration}. Every meal and the exercise MUST include a specific clock time (e.g. "8:00 AM").`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Gemini rate limit reached — please try again in a moment.");
      throw new Error(`Gemini request failed [${res.status}]: ${body}`);
    }
    const json = await res.json();
    const content = json.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    if (!content) throw new Error("Empty Gemini response");
    let parsed: { days: DayPlan[] };
    try { parsed = JSON.parse(content); } catch { throw new Error("Gemini returned invalid JSON"); }
    if (!parsed.days || !Array.isArray(parsed.days) || parsed.days.length === 0) {
      throw new Error("Gemini returned no plan days");
    }

    const title = `${data.duration}-Day ${profile.goal || "Plan"} — ${new Date().toLocaleDateString()}`;
    const { data: saved, error: iErr } = await supabase
      .from("diet_plans")
      .insert({
        user_id: userId,
        title,
        duration_days: data.duration,
        goal: profile.goal,
        days: parsed.days,
      })
      .select()
      .single();
    if (iErr) throw new Error(iErr.message);

    // Auto-generate shopping list grouped by category
    const shoppingPrompt = `From this meal plan, generate a weekly shopping list grouped by category (Proteins, Grains, Vegetables, Fruits, Dairy, Pantry). Return JSON: {"categories":[{"name":"Proteins","items":["chicken breast","eggs"]}]}\n\nMeals:\n${parsed.days.slice(0, 7).map(d => `Day ${d.day}: ${d.breakfast}; ${d.lunch}; ${d.dinner}`).join("\n")}`;
    try {
      const sRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: shoppingPrompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
      );
      if (sRes.ok) {
        const sJson = await sRes.json();
        const sContent = sJson.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
        if (sContent) {
          const items = JSON.parse(sContent);
          await supabase.from("shopping_lists").insert({
            user_id: userId, plan_id: saved.id, items,
          });
        }
      }
    } catch { /* non-fatal */ }

    return { id: saved.id };
  });

export const deleteDietPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("diet_plans").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
