import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { DayPlan } from "./nutrition";
import { currentSeason, idealWeightRange } from "./nutrition";

const Input = z.object({
  name: z.string().trim().max(80).optional().default(""),
  age: z.number().int().min(5).max(120),
  gender: z.string().max(20).optional().default(""),
  height_cm: z.number().min(50).max(260),
  weight_kg: z.number().min(20).max(400),
  activity_level: z.string().max(40).optional().default("Moderate"),
  goal: z.string().max(40).optional().default("Maintain Weight"),
  food_preference: z.string().max(40).optional().default("Non-Vegetarian"),
  allergies: z.string().max(500).optional().default(""),
  medical_conditions: z.array(z.string().max(60)).optional().default([]),
  custom_condition: z.string().max(500).optional().default(""),
  country: z.string().trim().min(1).max(60),
  budget: z.string().max(40).optional().default("Budget-friendly"),
  duration: z.union([z.literal(7), z.literal(14), z.literal(30)]),
});

const SYSTEM_PROMPT = `You are a certified clinical nutritionist AI creating personalized, medically-safe meal plans.
Return ONLY valid JSON matching the requested schema. No markdown, no commentary.

HARD RULES:
- SAFETY FIRST: strictly exclude every food that conflicts with ANY of the user's allergies OR medical conditions. When conditions have conflicting dietary requirements, choose the SAFEST option that satisfies all constraints.
- Diabetes: low-GI, whole grains, no refined sugar / sweets / sugary drinks / white rice heavy meals.
- Hypertension: low-sodium; avoid pickles, cured/processed meats, high-salt snacks.
- High Cholesterol / Heart Disease: minimize saturated fat, red meat, fried foods, butter/ghee-heavy dishes; favor omega-3 fish, olive oil, nuts, oats.
- Kidney Disease: limit protein, sodium, potassium (avoid bananas, oranges, potatoes, tomatoes in excess), phosphorus (limit dairy, cola, processed).
- PCOS: low-GI, high-fiber, adequate protein, avoid refined carbs & sugary items.
- Thyroid Disorders: for hypothyroid limit raw cruciferous & excess soy; for hyperthyroid limit iodine excess.
- Fatty Liver: no alcohol, no fried food, minimize refined carbs & added sugar.
- Anemia: iron-rich foods (lentils, spinach, red meat if allowed, eggs), pair with vitamin C.
- IBS: low-FODMAP leaning; avoid known triggers (onion, garlic in bulk, beans in excess, dairy if sensitive).
- Celiac Disease: 100% gluten-free — NO wheat, barley, rye, regular oats, roti/chapati/naan/pasta/bread unless explicitly gluten-free.
- Respect vegetarian/vegan and allergy restrictions strictly.

VARIETY RULES:
- Every day's breakfast, lunch, evening snack, and dinner MUST be different from every other day in the plan. No meal repeats across the plan window.
- Rotate protein sources across days from the SAFE set: lentils, beans, chickpeas, chicken, fish, eggs, beef, mutton, tofu/paneer (as diet permits).
- Include a balanced mix of vegetables, fruits, oats, whole grains, dairy (if tolerated), dry fruits, seeds, and natural/organic foods across the week.
- Use LOCALLY AVAILABLE, IN-SEASON ingredients for the user's country and season. Use familiar local dish names when possible.
- Prioritize the user's budget tier; favor affordable staples when budget is limited.

MEAL EXPLANATION:
- For every meal (breakfast/lunch/evening_snack/dinner) include a short reason (max ~140 chars) explaining WHY it fits the user's medical conditions, allergies, and goal.

BEFORE RETURNING:
- Re-check the entire plan. If ANY item conflicts with an allergy or condition, replace it with a safe alternative and update its reason.

NUMBERS:
- Realistic calories/macros for the user's goal, weight, and activity.
- Provide clock times (e.g. "8:00 AM") for every meal AND the exercise, spaced reasonably.`;

export const generatePublicDietPlan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const bmi = +(data.weight_kg / Math.pow(data.height_cm / 100, 2)).toFixed(1);
    const ideal = idealWeightRange(data.height_cm);
    const season = currentSeason(data.country);

    const conditions = (data.medical_conditions ?? []).filter(Boolean);
    const hasOther = conditions.includes("Other");
    const conditionList = conditions.length
      ? conditions.filter(c => c !== "Other").join(", ") || "None from list"
      : "None";
    const customPart = hasOther && data.custom_condition
      ? ` | Additional user-described condition(s): ${data.custom_condition}`
      : "";

    const userCtx = `
User profile:
- Name: ${data.name || "User"}
- Age: ${data.age}
- Gender: ${data.gender || "N/A"}
- Height: ${data.height_cm} cm
- Weight: ${data.weight_kg} kg
- BMI: ${bmi}
- Country: ${data.country}
- Current season: ${season}
- Budget: ${data.budget}
- Activity Level: ${data.activity_level}
- Goal: ${data.goal}
- Food Preference: ${data.food_preference}
- Allergies: ${data.allergies || "None"}
- Medical Conditions: ${conditionList}${customPart}
`;

    const schema = `{
  "days": [
    {
      "day": 1,
      "breakfast": "string", "breakfast_time": "8:00 AM", "breakfast_reason": "string",
      "lunch": "string", "lunch_time": "1:00 PM", "lunch_reason": "string",
      "evening_snack": "string", "evening_snack_time": "5:00 PM", "evening_snack_reason": "string",
      "dinner": "string", "dinner_time": "8:00 PM", "dinner_reason": "string",
      "calories": number, "protein_g": number, "carbs_g": number, "fats_g": number,
      "water_liters": number,
      "exercise": "string", "exercise_time": "7:00 AM",
      "health_tip": "string"
    }
  ]
}`;

    const prompt = `${userCtx}
Generate a ${data.duration}-day meal plan for someone in ${data.country} during ${season}.
Each day has FOUR meals only: Breakfast, Lunch, Evening Snack, Dinner (NO morning snack).
Return JSON exactly matching this schema:
${schema}
The "days" array MUST contain exactly ${data.duration} objects, day 1 through ${data.duration}. Every meal and the exercise MUST include a time-of-day string, and every meal MUST include a "*_reason" field explaining why it fits the user's medical profile, allergies and goal.`;

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
    if (!parsed.days?.length) throw new Error("Gemini returned no plan days");

    return {
      bmi,
      ideal,
      season,
      country: data.country,
      days: parsed.days,
      goal: data.goal,
      duration: data.duration,
      name: data.name,
    };
  });
