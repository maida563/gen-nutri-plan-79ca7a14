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
      "breakfast": "string",
      "morning_snack": "string",
      "lunch": "string",
      "evening_snack": "string",
      "dinner": "string",
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fats_g": number,
      "water_liters": number,
      "exercise": "string",
      "health_tip": "string"
    }
  ]
}`;

    const prompt = `${userCtx}\nGenerate a ${data.duration}-day meal plan.\nReturn JSON exactly matching this schema:\n${schema}\nThe "days" array MUST contain exactly ${data.duration} objects, day 1 through ${data.duration}.`;

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service not configured.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Rate limit reached — please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in workspace settings.");
      throw new Error(`AI request failed [${res.status}]: ${body}`);
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");
    let parsed: { days: DayPlan[] };
    try { parsed = JSON.parse(content); } catch { throw new Error("AI returned invalid JSON"); }
    if (!parsed.days || !Array.isArray(parsed.days) || parsed.days.length === 0) {
      throw new Error("AI returned no plan days");
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
      const sRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [{ role: "user", content: shoppingPrompt }],
          response_format: { type: "json_object" },
        }),
      });
      if (sRes.ok) {
        const sJson = await sRes.json();
        const sContent = sJson.choices?.[0]?.message?.content;
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
