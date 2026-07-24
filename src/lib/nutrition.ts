export function calcBMI(heightCm: number, weightKg: number): number {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return 0;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function bmiCategory(bmi: number): { label: string; tone: string } {
  if (!bmi) return { label: "—", tone: "text-muted-foreground" };
  if (bmi < 18.5) return { label: "You are underweight", tone: "text-accent-foreground" };
  if (bmi < 25) return { label: "Normal", tone: "text-primary-foreground" };
  if (bmi < 30) return { label: "Obese", tone: "text-accent-foreground" };
  return { label: "Obese", tone: "text-destructive" };
}

/** Ideal weight range (kg) for a healthy BMI 18.5–24.9 */
export function idealWeightRange(heightCm: number): { min: number; max: number } | null {
  if (!heightCm || heightCm <= 0) return null;
  const m = heightCm / 100;
  return { min: +(18.5 * m * m).toFixed(1), max: +(24.9 * m * m).toFixed(1) };
}

/** Target ideal weight (kg) at BMI 22 — midpoint of the healthy range */
export function idealWeightTarget(heightCm: number): number | null {
  if (!heightCm || heightCm <= 0) return null;
  const m = heightCm / 100;
  return +(22 * m * m).toFixed(1);
}

export function currentSeason(country: string, date = new Date()): string {
  const m = date.getMonth() + 1;
  // rough hemisphere check
  const southern = /argentina|australia|brazil|chile|new zealand|south africa|uruguay|peru|paraguay/i.test(country);
  const seasons = southern
    ? { spring: [9, 10, 11], summer: [12, 1, 2], autumn: [3, 4, 5], winter: [6, 7, 8] }
    : { spring: [3, 4, 5], summer: [6, 7, 8], autumn: [9, 10, 11], winter: [12, 1, 2] };
  for (const [s, months] of Object.entries(seasons)) if (months.includes(m)) return s;
  return "all-year";
}

export const ACTIVITY_LEVELS = ["Sedentary", "Light", "Moderate", "Active"] as const;
export const GOALS = ["Lose Weight", "Maintain Weight", "Gain Weight"] as const;
export const FOOD_PREFERENCES = ["Vegetarian", "Non-Vegetarian", "Vegan"] as const;
export const MEDICAL_CONDITIONS = [
  "Diabetes",
  "Hypertension",
  "High Cholesterol",
  "PCOS",
  "Kidney Disease",
  "Heart Disease",
  "Thyroid Disorders",
  "Fatty Liver",
  "Anemia",
  "IBS",
  "Celiac Disease",
  "Other",
] as const;
export const GENDERS = ["Male", "Female", "Other"] as const;

export type DayPlan = {
  day: number;
  breakfast: string;
  breakfast_time: string;
  breakfast_reason?: string;
  lunch: string;
  lunch_time: string;
  lunch_reason?: string;
  evening_snack: string;
  evening_snack_time: string;
  evening_snack_reason?: string;
  dinner: string;
  dinner_time: string;
  dinner_reason?: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  water_liters: number;
  exercise: string;
  exercise_time: string;
  health_tip: string;
};
