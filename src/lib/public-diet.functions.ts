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
  allergies: z.string().max(300).optional().default(""),
  medical_conditions: z.string().max(200).optional().default("None"),
  country: z.string().trim().min(1).max(60),
  budget: z.string().max(40).optional().default("Budget-friendly"),
  duration: z.union([z.literal(7), z.literal(14), z.literal(30)]),
});

const SYSTEM_PROMPT = `You are a certified nutritionist AI creating personalized meal plans.
Return ONLY valid JSON matching the requested schema. No markdown, no commentary.
Rules:
- Every day's meals MUST be different; never repeat meals on consecutive days.
- Suggest meals using ingredients that are LOCALLY AVAILABLE in the user's country and IN SEASON for the given season. Use familiar local dish names when possible.
- Prioritize BUDGET-FRIENDLY, affordable staples (grains, legumes, seasonal produce, eggs, local proteins). Avoid imported or expensive items unless unavoidable.
- Diabetic users: low-GI foods, no sugary items.
- Hypertension: low-sodium meals.
- High cholesterol: minimize saturated fats.
- Respect vegetarian/vegan/allergy restrictions strictly.
- Include realistic calorie/macro numbers appropriate to the user's goal, weight, and activity.
- Provide a specific clock time (e.g. "8:00 AM") for every meal and for the exercise. Space meals reasonably across the day.
- The exercise recommendation must fit the user's activity level, and include when to do it.`;

export const generatePublicDietPlan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const bmi = +(data.weight_kg / Math.pow(data.height_cm / 100, 2)).toFixed(1);
    const ideal = idealWeightRange(data.height_cm);
    const season = currentSeason(data.country);

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
- Medical Conditions: ${data.medical_conditions || "None"}
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
Generate a ${data.duration}-day meal plan for someone living in ${data.country} during ${season}.
Each day has FOUR meals only: Breakfast, Lunch, Evening Snack, Dinner (NO morning snack).
Return JSON exactly matching this schema:
${schema}
The "days" array MUST contain exactly ${data.duration} objects, day 1 through ${data.duration}. Every meal and the exercise MUST include a specific time-of-day string.`;

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service not configured.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
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
    if (!parsed.days?.length) throw new Error("AI returned no plan days");

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
