import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Leaf, Sparkles, Loader2, Download, RotateCcw } from "lucide-react";
import jsPDF from "jspdf";
import {
  ACTIVITY_LEVELS, GOALS, FOOD_PREFERENCES, MEDICAL_CONDITIONS, GENDERS,
  calcBMI, bmiCategory, idealWeightRange, idealWeightTarget, type DayPlan,
} from "@/lib/nutrition";
import { generatePublicDietPlan } from "@/lib/public-diet.functions";

const BUDGETS = ["Budget-friendly", "Moderate", "Premium"] as const;
const COUNTRIES = [
  "Pakistan", "India", "Bangladesh", "Sri Lanka", "United States", "United Kingdom",
  "Canada", "Australia", "United Arab Emirates", "Saudi Arabia", "Turkey",
  "Indonesia", "Malaysia", "Philippines", "Nigeria", "Egypt", "South Africa",
  "Germany", "France", "Italy", "Spain", "Brazil", "Mexico", "China", "Japan", "Other",
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NutriPlan AI — Personalized AI Diet Plans" },
      { name: "description", content: "Fill in your details and get a personalized AI meal plan instantly — no sign-up required." },
    ],
  }),
  component: Landing,
});

type FormState = {
  name: string; age: string; gender: string;
  height_cm: string; weight_kg: string;
  activity_level: string; goal: string;
  food_preference: string; allergies: string;
  medical_conditions: string[];
  custom_condition: string;
  country: string; budget: string;
  duration: "7" | "14" | "30";
};

const empty: FormState = {
  name: "", age: "", gender: "Male", height_cm: "", weight_kg: "",
  activity_level: "Moderate", goal: "Maintain Weight",
  food_preference: "Non-Vegetarian", allergies: "",
  medical_conditions: [], custom_condition: "",
  country: "Pakistan", budget: "Budget-friendly",
  duration: "7",
};

type Result = { bmi: number; ideal: { min: number; max: number } | null; season: string; country: string; days: DayPlan[]; goal: string; duration: number; name: string };

function Landing() {
  const gen = useServerFn(generatePublicDietPlan);
  const [f, setF] = useState<FormState>(empty);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const h = parseFloat(f.height_cm) || 0;
  const w = parseFloat(f.weight_kg) || 0;
  const bmi = calcBMI(h, w);
  const cat = bmiCategory(bmi);

  function toggleCondition(c: string) {
    setF(prev => ({
      ...prev,
      medical_conditions: prev.medical_conditions.includes(c)
        ? prev.medical_conditions.filter(x => x !== c)
        : [...prev.medical_conditions, c],
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.age || !h || !w) return toast.error("Please fill age, height and weight.");
    if (f.medical_conditions.includes("Other") && !f.custom_condition.trim()) {
      return toast.error("Please describe your condition in the text box.");
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await gen({ data: {
        name: f.name, age: parseInt(f.age), gender: f.gender,
        height_cm: h, weight_kg: w,
        activity_level: f.activity_level, goal: f.goal,
        food_preference: f.food_preference,
        allergies: f.allergies,
        medical_conditions: f.medical_conditions,
        custom_condition: f.custom_condition,
        country: f.country, budget: f.budget,
        duration: Number(f.duration) as 7 | 14 | 30,
      }});
      setResult(res);
      toast.success("Your plan is ready!");
      setTimeout(() => document.getElementById("result")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  }


  function downloadPDF() {
    if (!result) return;
    const doc = new jsPDF();
    let y = 15;
    doc.setFontSize(18);
    doc.text(`${result.duration}-Day Meal Plan${result.name ? ` — ${result.name}` : ""}`, 14, y);
    y += 8;
    doc.setFontSize(11);
    doc.text(`Goal: ${result.goal}  |  BMI: ${result.bmi}`, 14, y);
    y += 10;
    result.days.forEach((d) => {
      if (y > 260) { doc.addPage(); y = 15; }
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(`Day ${d.day}`, 14, y); y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = [
        `Breakfast (${d.breakfast_time ?? ""}): ${d.breakfast}`,
        ...(d.breakfast_reason ? [`  Why: ${d.breakfast_reason}`] : []),
        `Lunch (${d.lunch_time ?? ""}): ${d.lunch}`,
        ...(d.lunch_reason ? [`  Why: ${d.lunch_reason}`] : []),
        `Evening snack (${d.evening_snack_time ?? ""}): ${d.evening_snack}`,
        ...(d.evening_snack_reason ? [`  Why: ${d.evening_snack_reason}`] : []),
        `Dinner (${d.dinner_time ?? ""}): ${d.dinner}`,
        ...(d.dinner_reason ? [`  Why: ${d.dinner_reason}`] : []),
        `Calories: ${d.calories} | P ${d.protein_g}g / C ${d.carbs_g}g / F ${d.fats_g}g | Water: ${d.water_liters}L`,
        `Exercise (${d.exercise_time ?? ""}): ${d.exercise}`,
        `Tip: ${d.health_tip}`,
      ];

      lines.forEach(l => {
        const wrapped = doc.splitTextToSize(l, 180);
        wrapped.forEach((wl: string) => {
          if (y > 285) { doc.addPage(); y = 15; }
          doc.text(wl, 14, y); y += 5;
        });
      });
      y += 3;
    });
    doc.save(`nutriplan-${result.duration}day.pdf`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background/70 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Leaf className="size-4" />
            </div>
            NutriPlan <span className="text-accent">AI</span>
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">No sign-up required</div>
        </div>
      </header>

      <main className="flex-1">
        <section className="hero-gradient">
          <div className="mx-auto max-w-3xl px-4 py-12 md:py-16 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground mb-4">
              <Sparkles className="size-3 text-accent" /> AI-powered personal nutritionist
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Get your personalized <span className="text-primary">AI diet plan</span> in seconds
            </h1>
            <p className="mt-4 text-muted-foreground">
              Fill in the form below — we'll build a plan around your body, goals, and health conditions.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-16 -mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Your details</CardTitle>
              <CardDescription>All fields help us personalize your plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Name (optional)">
                    <Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Your name" />
                  </Field>
                  <Field label="Age *">
                    <Input type="number" min={5} max={120} required value={f.age}
                      onChange={e => setF({ ...f, age: e.target.value })} />
                  </Field>
                  <Field label="Gender">
                    <Select value={f.gender} onValueChange={v => setF({ ...f, gender: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Plan duration">
                    <Select value={f.duration} onValueChange={v => setF({ ...f, duration: v as "7" | "14" | "30" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Height (cm) *">
                    <Input type="number" min={50} max={260} required value={f.height_cm}
                      onChange={e => setF({ ...f, height_cm: e.target.value })} />
                  </Field>
                  <Field label="Weight (kg) *">
                    <Input type="number" step="0.1" min={20} max={400} required value={f.weight_kg}
                      onChange={e => setF({ ...f, weight_kg: e.target.value })} />
                  </Field>
                  <Field label="Activity level">
                    <Select value={f.activity_level} onValueChange={v => setF({ ...f, activity_level: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ACTIVITY_LEVELS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Goal">
                    <Select value={f.goal} onValueChange={v => setF({ ...f, goal: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{GOALS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Food preference">
                    <Select value={f.food_preference} onValueChange={v => setF({ ...f, food_preference: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FOOD_PREFERENCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Medical conditions (select all that apply)">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-md border p-3 bg-secondary/40">
                        {MEDICAL_CONDITIONS.map(m => {
                          const active = f.medical_conditions.includes(m);
                          return (
                            <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                className="size-4 accent-[color:var(--color-primary)]"
                                checked={active}
                                onChange={() => toggleCondition(m)}
                              />
                              <span>{m}</span>
                            </label>
                          );
                        })}
                      </div>
                    </Field>
                    {f.medical_conditions.includes("Other") && (
                      <div className="mt-3">
                        <Field label="Describe your condition(s) *">
                          <Textarea
                            rows={2}
                            required
                            value={f.custom_condition}
                            onChange={e => setF({ ...f, custom_condition: e.target.value })}
                            placeholder="Briefly describe your condition and any foods to avoid"
                          />
                        </Field>
                      </div>
                    )}
                  </div>

                  <Field label="Country *">
                    <Select value={f.country} onValueChange={v => setF({ ...f, country: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Budget">
                    <Select value={f.budget} onValueChange={v => setF({ ...f, budget: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{BUDGETS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Allergies (comma-separated)">
                      <Textarea rows={2} value={f.allergies}
                        onChange={e => setF({ ...f, allergies: e.target.value })}
                        placeholder="e.g. peanuts, shellfish" />
                    </Field>
                  </div>
                </div>

                {bmi > 0 && (() => {
                  const ideal = idealWeightRange(h);
                  const target = idealWeightTarget(h);
                  const diff = target ? +(Math.abs(w - target)).toFixed(1) : 0;
                  return (
                    <div className="rounded-lg border bg-secondary/60 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-muted-foreground">Your BMI</div>
                          <div className="text-3xl font-extrabold text-primary">{bmi.toFixed(1)}</div>
                        </div>
                        <div className={`text-sm font-semibold ${cat.tone}`}>{cat.label}</div>
                      </div>
                      {ideal && target && (
                        <div className="text-xs text-muted-foreground border-t pt-2 space-y-1">
                          <div>
                            Healthy weight range:{" "}
                            <span className="font-semibold text-foreground">{ideal.min}–{ideal.max} kg</span>
                            {" · "}Ideal target: <span className="font-semibold text-foreground">{target} kg</span>
                          </div>
                          {diff <= 0.2 ? (
                            <div>You're at your ideal weight. Keep it up! 🎉</div>
                          ) : w > target ? (
                            <div>Lose <span className="font-semibold text-foreground">{diff} kg</span> to reach your ideal target.</div>
                          ) : (
                            <div>Gain <span className="font-semibold text-foreground">{diff} kg</span> to reach your ideal target.</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <Button type="submit" size="lg" disabled={loading} className="w-full">
                  {loading
                    ? <><Loader2 className="size-4 mr-2 animate-spin" />Generating your plan…</>
                    : <><Sparkles className="size-4 mr-2" />Generate my plan</>}
                </Button>
              </form>
            </CardContent>
          </Card>

          {result && (
            <div id="result" className="mt-10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">
                    Your {result.duration}-day plan{result.name ? `, ${result.name}` : ""}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Goal: {result.goal} · BMI: {result.bmi} · {result.country} · {result.season}
                    {result.ideal && <> · Ideal: {result.ideal.min}–{result.ideal.max} kg</>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setResult(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                    <RotateCcw className="size-4 mr-2" />New plan
                  </Button>
                  <Button onClick={downloadPDF}>
                    <Download className="size-4 mr-2" />Download PDF
                  </Button>
                </div>
              </div>

              <div className="grid gap-3">
                {result.days.map(d => (
                  <Card key={d.day}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>Day {d.day}</span>
                        <span className="text-sm font-normal text-muted-foreground">
                          {d.calories} kcal · {d.water_liters}L water
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-3">
                      <Meal label="Breakfast" time={d.breakfast_time} text={d.breakfast} reason={d.breakfast_reason} />
                      <Meal label="Lunch" time={d.lunch_time} text={d.lunch} reason={d.lunch_reason} />
                      <Meal label="Evening snack" time={d.evening_snack_time} text={d.evening_snack} reason={d.evening_snack_reason} />
                      <Meal label="Dinner" time={d.dinner_time} text={d.dinner} reason={d.dinner_reason} />
                      <div className="grid grid-cols-3 gap-2 pt-2 text-xs text-muted-foreground">
                        <div>Protein: <span className="text-foreground font-semibold">{d.protein_g}g</span></div>
                        <div>Carbs: <span className="text-foreground font-semibold">{d.carbs_g}g</span></div>
                        <div>Fats: <span className="text-foreground font-semibold">{d.fats_g}g</span></div>
                      </div>
                      <div className="pt-2 border-t text-xs space-y-1">
                        <div>
                          <span className="font-semibold text-accent">Exercise{d.exercise_time ? ` · ${d.exercise_time}` : ""}:</span> {d.exercise}
                        </div>
                        <div><span className="font-semibold text-primary">Tip:</span> {d.health_tip}</div>
                      </div>
                    </CardContent>

                  </Card>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-4 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} NutriPlan AI · Educational purposes only. Not medical advice.
        </div>
      </footer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function Meal({ label, time, text, reason }: { label: string; time?: string; text: string; reason?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <span className="font-semibold text-primary min-w-40">
          {label}{time ? ` · ${time}` : ""}:
        </span>
        <span className="text-foreground/90 flex-1">{text}</span>
      </div>
      {reason && (
        <div className="text-xs text-muted-foreground pl-1 border-l-2 border-accent/60 ml-1 pl-2 italic">
          Why: {reason}
        </div>
      )}
    </div>
  );
}

