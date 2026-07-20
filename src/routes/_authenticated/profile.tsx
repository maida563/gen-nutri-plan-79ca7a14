import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ACTIVITY_LEVELS, GOALS, FOOD_PREFERENCES, MEDICAL_CONDITIONS, GENDERS, calcBMI, bmiCategory,
} from "@/lib/nutrition";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Your Profile — NutriPlan AI" }] }),
  component: ProfilePage,
});

type FormState = {
  name: string; age: string; gender: string;
  height_cm: string; weight_kg: string;
  activity_level: string; goal: string;
  food_preference: string; allergies: string; medical_conditions: string;
};

const empty: FormState = {
  name: "", age: "", gender: "", height_cm: "", weight_kg: "",
  activity_level: "", goal: "", food_preference: "", allergies: "", medical_conditions: "",
};

function ProfilePage() {
  const nav = useNavigate();
  const [f, setF] = useState<FormState>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) {
        setF({
          name: data.name ?? "", age: data.age?.toString() ?? "",
          gender: data.gender ?? "", height_cm: data.height_cm?.toString() ?? "",
          weight_kg: data.weight_kg?.toString() ?? "",
          activity_level: data.activity_level ?? "", goal: data.goal ?? "",
          food_preference: data.food_preference ?? "", allergies: data.allergies ?? "",
          medical_conditions: data.medical_conditions ?? "",
        });
      }
      setLoading(false);
    })();
  }, []);

  const h = parseFloat(f.height_cm) || 0;
  const w = parseFloat(f.weight_kg) || 0;
  const bmi = calcBMI(h, w);
  const cat = bmiCategory(bmi);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      name: f.name || null,
      age: f.age ? parseInt(f.age) : null,
      gender: f.gender || null,
      height_cm: h || null,
      weight_kg: w || null,
      activity_level: f.activity_level || null,
      goal: f.goal || null,
      food_preference: f.food_preference || null,
      allergies: f.allergies || null,
      medical_conditions: f.medical_conditions || null,
    });
    // Also log weight if provided
    if (w) {
      await supabase.from("weight_logs").insert({
        user_id: user.id, weight_kg: w, log_date: new Date().toISOString().slice(0, 10),
      });
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    nav({ to: "/dashboard" });
  }

  if (loading) return <AppShell><div>Loading…</div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Your profile</h1>
          <p className="text-muted-foreground mt-1">Used to personalize your AI meal plans.</p>
        </div>

        <form onSubmit={save} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Basic info</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <Field label="Name"><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required /></Field>
              <Field label="Age"><Input type="number" min={5} max={120} value={f.age} onChange={e => setF({ ...f, age: e.target.value })} required /></Field>
              <Field label="Gender">
                <Select value={f.gender} onValueChange={v => setF({ ...f, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <div />
              <Field label="Height (cm)"><Input type="number" min={50} max={260} value={f.height_cm} onChange={e => setF({ ...f, height_cm: e.target.value })} required /></Field>
              <Field label="Weight (kg)"><Input type="number" min={20} max={400} step="0.1" value={f.weight_kg} onChange={e => setF({ ...f, weight_kg: e.target.value })} required /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>BMI</CardTitle>
              <CardDescription>Auto-calculated from your height & weight.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <div className="text-5xl font-extrabold text-primary">{bmi || "—"}</div>
              <div className={`text-lg font-semibold ${cat.tone}`}>{cat.label}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Lifestyle & goals</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <Field label="Activity level">
                <Select value={f.activity_level} onValueChange={v => setF({ ...f, activity_level: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{ACTIVITY_LEVELS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Goal">
                <Select value={f.goal} onValueChange={v => setF({ ...f, goal: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{GOALS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Food preference">
                <Select value={f.food_preference} onValueChange={v => setF({ ...f, food_preference: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{FOOD_PREFERENCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Medical condition">
                <Select value={f.medical_conditions} onValueChange={v => setF({ ...f, medical_conditions: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{MEDICAL_CONDITIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Allergies (comma-separated)">
                  <Textarea value={f.allergies} onChange={e => setF({ ...f, allergies: e.target.value })} placeholder="e.g. peanuts, shellfish" />
                </Field>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} size="lg">
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
