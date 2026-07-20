import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { calcBMI, bmiCategory } from "@/lib/nutrition";
import { generateDietPlan, deleteDietPlan } from "@/lib/diet.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Trash2, Droplet, TrendingUp, ShoppingBasket, Plus, Minus, Loader2 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NutriPlan AI" }] }),
  component: Dashboard,
});

const TIPS = [
  "Drink a glass of water 30 minutes before every meal.",
  "Eat protein with every meal to stay full longer.",
  "Half your plate should be vegetables at lunch and dinner.",
  "Walk for 10 minutes after meals to help blood sugar.",
  "Sleep 7–8 hours — poor sleep drives cravings.",
];

function Dashboard() {
  const nav = useNavigate();
  const router = useRouter();
  const gen = useServerFn(generateDietPlan);
  const del = useServerFn(deleteDietPlan);
  const [profile, setProfile] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [waterToday, setWaterToday] = useState(0);
  const [weights, setWeights] = useState<{ log_date: string; weight_kg: number }[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [duration, setDuration] = useState<7 | 14 | 30>(7);
  const [generating, setGenerating] = useState(false);
  const [tip] = useState(TIPS[Math.floor(Math.random() * TIPS.length)]);
  const [shoppingList, setShoppingList] = useState<any>(null);

  const today = new Date().toISOString().slice(0, 10);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [p, pl, w, wl, sl] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("diet_plans").select("id,title,duration_days,goal,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("water_logs").select("glasses").eq("user_id", user.id).eq("log_date", today).maybeSingle(),
      supabase.from("weight_logs").select("log_date,weight_kg").eq("user_id", user.id).order("log_date", { ascending: true }).limit(30),
      supabase.from("shopping_lists").select("items,plan_id,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setProfile(p.data);
    setPlans(pl.data ?? []);
    setWaterToday(w.data?.glasses ?? 0);
    setWeights(wl.data ?? []);
    setShoppingList(sl.data?.items ?? null);
  }
  useEffect(() => { load(); }, []);

  async function updateWater(delta: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const next = Math.max(0, Math.min(20, waterToday + delta));
    setWaterToday(next);
    await supabase.from("water_logs").upsert(
      { user_id: user.id, log_date: today, glasses: next },
      { onConflict: "user_id,log_date" }
    );
  }

  async function logWeight(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(newWeight);
    if (!w) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("weight_logs").insert({
      user_id: user.id, weight_kg: w, log_date: today,
    });
    if (error) return toast.error(error.message);
    await supabase.from("profiles").update({ weight_kg: w }).eq("id", user.id);
    setNewWeight("");
    toast.success("Weight logged");
    load();
  }

  async function handleGenerate() {
    if (!profile?.age || !profile?.height_cm || !profile?.weight_kg) {
      toast.error("Please complete your profile first.");
      nav({ to: "/profile" });
      return;
    }
    setGenerating(true);
    try {
      const res = await gen({ data: { duration } });
      toast.success("Your plan is ready!");
      router.invalidate();
      nav({ to: "/plan/$id", params: { id: res.id } });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to generate plan");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this plan?")) return;
    try {
      await del({ data: { id } });
      toast.success("Plan deleted");
      load();
    } catch (err: any) { toast.error(err?.message ?? "Failed"); }
  }

  const bmi = calcBMI(profile?.height_cm ?? 0, profile?.weight_kg ?? 0);
  const cat = bmiCategory(bmi);
  const waterGoal = 8;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Welcome{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here's your nutrition snapshot for today.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Your BMI</CardDescription></CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-primary">{bmi || "—"}</div>
            <div className={`text-sm mt-1 font-semibold ${cat.tone}`}>{cat.label}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Current goal</CardDescription></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.goal || <Link to="/profile" className="text-accent underline">Set your goal</Link>}</div>
            <div className="text-sm text-muted-foreground mt-1">{profile?.activity_level ?? ""}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Health tip</CardDescription></CardHeader>
          <CardContent><p className="text-sm">{tip}</p></CardContent>
        </Card>
      </div>

      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="size-5 text-accent" />Generate a diet plan</CardTitle>
          <CardDescription>AI creates a personalized plan based on your profile.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium">Duration</label>
            <Select value={String(duration)} onValueChange={v => setDuration(Number(v) as 7 | 14 | 30)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7-Day Plan</SelectItem>
                <SelectItem value="14">14-Day Plan</SelectItem>
                <SelectItem value="30">30-Day Plan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={generating} size="lg" className="sm:w-auto">
            {generating ? <><Loader2 className="size-4 mr-2 animate-spin" />Generating…</> : <><Sparkles className="size-4 mr-2" />Generate plan</>}
          </Button>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Droplet className="size-5 text-primary" />Water tracker</CardTitle>
            <CardDescription>Today's hydration ({waterToday}/{waterGoal} glasses)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={(waterToday / waterGoal) * 100} className="h-3" />
            <div className="flex items-center justify-between">
              <Button size="sm" variant="outline" onClick={() => updateWater(-1)}><Minus className="size-4" /></Button>
              <div className="flex gap-1">
                {Array.from({ length: waterGoal }).map((_, i) => (
                  <Droplet key={i} className={`size-6 ${i < waterToday ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={() => updateWater(1)}><Plus className="size-4" /></Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="size-5 text-accent" />Weight tracker</CardTitle>
            <CardDescription>Your weight over time (kg)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32">
              {weights.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weights}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="log_date" tick={{ fontSize: 10 }} />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="weight_kg" stroke="oklch(0.62 0.16 145)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full grid place-items-center text-sm text-muted-foreground">Log at least two entries to see a trend.</div>
              )}
            </div>
            <form onSubmit={logWeight} className="flex gap-2 mt-4">
              <Input type="number" step="0.1" placeholder="Enter weight (kg)" value={newWeight} onChange={e => setNewWeight(e.target.value)} />
              <Button type="submit">Log</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Saved plans</CardTitle>
            <CardDescription>{plans.length} plan{plans.length === 1 ? "" : "s"} saved</CardDescription>
          </CardHeader>
          <CardContent>
            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No plans yet. Generate your first above.</p>
            ) : (
              <div className="space-y-2">
                {plans.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Link to="/plan/$id" params={{ id: p.id }} className="font-medium hover:text-primary">
                        {p.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">{p.duration_days} days · {p.goal ?? "—"}</div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShoppingBasket className="size-5 text-accent" />Latest shopping list</CardTitle>
            <CardDescription>Auto-generated from your most recent plan</CardDescription>
          </CardHeader>
          <CardContent className="max-h-72 overflow-auto">
            {!shoppingList?.categories ? (
              <p className="text-sm text-muted-foreground">Generate a plan to see a shopping list.</p>
            ) : (
              <div className="space-y-3">
                {shoppingList.categories.map((c: any) => (
                  <div key={c.name}>
                    <div className="font-semibold text-sm text-primary">{c.name}</div>
                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                      {(c.items || []).map((i: string) => <li key={i}>{i}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
