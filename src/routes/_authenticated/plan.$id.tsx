import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft } from "lucide-react";
import type { DayPlan } from "@/lib/nutrition";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_authenticated/plan/$id")({
  head: () => ({ meta: [{ title: "Diet Plan — NutriPlan AI" }] }),
  component: PlanPage,
});

function PlanPage() {
  const { id } = Route.useParams();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("diet_plans").select("*").eq("id", id).maybeSingle();
      setPlan(data);
      setLoading(false);
    })();
  }, [id]);

  function downloadPDF() {
    if (!plan) return;
    const doc = new jsPDF();
    let y = 15;
    doc.setFontSize(18); doc.text("NutriPlan AI", 14, y); y += 8;
    doc.setFontSize(14); doc.text(plan.title, 14, y); y += 10;
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`${plan.duration_days} days · Goal: ${plan.goal ?? "—"}`, 14, y); y += 8;
    doc.setTextColor(0);

    (plan.days as DayPlan[]).forEach((d) => {
      if (y > 260) { doc.addPage(); y = 15; }
      doc.setFontSize(12); doc.setFont("helvetica", "bold");
      doc.text(`Day ${d.day}`, 14, y); y += 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      const lines = [
        `Breakfast: ${d.breakfast}`,
        `Morning Snack: ${d.morning_snack}`,
        `Lunch: ${d.lunch}`,
        `Evening Snack: ${d.evening_snack}`,
        `Dinner: ${d.dinner}`,
        `Nutrition: ${d.calories} kcal | P: ${d.protein_g}g | C: ${d.carbs_g}g | F: ${d.fats_g}g`,
        `Water: ${d.water_liters} L`,
        `Exercise: ${d.exercise}`,
        `Tip: ${d.health_tip}`,
      ];
      lines.forEach(l => {
        const wrapped = doc.splitTextToSize(l, 180);
        wrapped.forEach((w: string) => {
          if (y > 285) { doc.addPage(); y = 15; }
          doc.text(w, 14, y); y += 5;
        });
      });
      y += 3;
    });

    if (y > 265) { doc.addPage(); y = 15; }
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text("Disclaimer: For educational purposes only. Not medical advice.", 14, y);

    doc.save(`${plan.title.replace(/[^a-z0-9]/gi, "_")}.pdf`);
  }

  if (loading) return <AppShell><div>Loading…</div></AppShell>;
  if (!plan) return <AppShell><div>Plan not found.</div></AppShell>;

  const days = plan.days as DayPlan[];

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft className="size-3" /> Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold mt-2">{plan.title}</h1>
          <p className="text-muted-foreground">{plan.duration_days} days · {plan.goal}</p>
        </div>
        <Button onClick={downloadPDF}><Download className="size-4 mr-2" />Download PDF</Button>
      </div>

      <div className="rounded-lg border bg-secondary/40 p-4 text-sm text-muted-foreground mb-6">
        <strong className="text-foreground">Disclaimer:</strong> This meal plan is for educational purposes only and is not medical advice. Consult a qualified healthcare professional for medical concerns.
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {days.map(d => (
          <Card key={d.day}>
            <CardHeader>
              <CardTitle>Day {d.day}</CardTitle>
              <CardDescription>{d.calories} kcal · P {d.protein_g}g · C {d.carbs_g}g · F {d.fats_g}g · Water {d.water_liters}L</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Breakfast" value={d.breakfast} />
              <Row label="Morning snack" value={d.morning_snack} />
              <Row label="Lunch" value={d.lunch} />
              <Row label="Evening snack" value={d.evening_snack} />
              <Row label="Dinner" value={d.dinner} />
              <div className="pt-2 border-t space-y-1 text-xs">
                <div><span className="font-semibold text-accent">Exercise:</span> {d.exercise}</div>
                <div><span className="font-semibold text-primary">Tip:</span> {d.health_tip}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground uppercase">{label}</div>
      <div>{value}</div>
    </div>
  );
}
