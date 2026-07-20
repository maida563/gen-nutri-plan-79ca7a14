export function calcBMI(heightCm: number, weightKg: number): number {
  if (!heightCm || !weightKg) return 0;
  const m = heightCm / 100;
  return +(weightKg / (m * m)).toFixed(1);
}

export function bmiCategory(bmi: number): { label: string; tone: string } {
  if (!bmi) return { label: "—", tone: "text-muted-foreground" };
  if (bmi < 18.5) return { label: "Underweight", tone: "text-accent" };
  if (bmi < 25) return { label: "Healthy", tone: "text-primary" };
  if (bmi < 30) return { label: "Overweight", tone: "text-accent" };
  return { label: "Obese", tone: "text-destructive" };
}

export const ACTIVITY_LEVELS = ["Sedentary", "Light", "Moderate", "Active"] as const;
export const GOALS = ["Lose Weight", "Maintain Weight", "Gain Weight"] as const;
export const FOOD_PREFERENCES = ["Vegetarian", "Non-Vegetarian", "Vegan"] as const;
export const MEDICAL_CONDITIONS = [
  "None", "Diabetes", "Hypertension", "High Cholesterol", "PCOS", "Thyroid", "Kidney Disease", "Other",
] as const;
export const GENDERS = ["Male", "Female", "Other"] as const;

export type DayPlan = {
  day: number;
  breakfast: string;
  morning_snack: string;
  lunch: string;
  evening_snack: string;
  dinner: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  water_liters: number;
  exercise: string;
  health_tip: string;
};
