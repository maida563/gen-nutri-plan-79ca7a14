import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Salad, Brain, Activity, ShoppingBasket, Droplet, LineChart, Leaf, Mail, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NutriPlan AI — Personalized AI Diet Plans" },
      { name: "description", content: "Generate personalized 7, 14, or 30-day meal plans with AI. Track water, weight, and shopping — tailored to your goals and medical conditions." },
    ],
  }),
  component: Landing,
});

function Nav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-background/70 border-b">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <Leaf className="size-4" />
          </div>
          NutriPlan <span className="text-accent">AI</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#features" className="hover:text-primary">Features</a>
          <a href="#how" className="hover:text-primary">How it works</a>
          <a href="#faq" className="hover:text-primary">FAQ</a>
          <a href="#contact" className="hover:text-primary">Contact</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/auth"><Button size="sm">Get started</Button></Link>
        </div>
      </div>
    </header>
  );
}

function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1">
        {/* Hero */}
        <section className="hero-gradient">
          <div className="mx-auto max-w-6xl px-4 py-20 md:py-28 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
              <Sparkles className="size-3 text-accent" /> AI-powered personal nutritionist
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl mx-auto">
              Personalized diet plans, <span className="text-primary">crafted by AI</span> for <span className="text-accent">your body & goals</span>.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Get 7, 14, or 30-day meal plans built around your BMI, medical conditions, allergies, and food preferences — with shopping lists, water tracking, and progress charts.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link to="/auth"><Button size="lg" className="text-base">Get started free</Button></Link>
              <a href="#how"><Button size="lg" variant="outline">See how it works</Button></a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Everything you need to eat smart</h2>
            <p className="mt-3 text-muted-foreground">Built for real life — with real food, real budgets, and real health needs.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Brain, title: "AI meal planning", desc: "Gemini-powered plans that adapt to diabetes, hypertension, PCOS, and more." },
              { icon: Salad, title: "Local, affordable foods", desc: "Recommends South-Asian staples that fit your budget and taste." },
              { icon: ShoppingBasket, title: "Auto shopping lists", desc: "Grouped by category — grab it all in one trip." },
              { icon: Droplet, title: "Water tracker", desc: "Hit your hydration goal with a visual daily tracker." },
              { icon: LineChart, title: "Weight trends", desc: "Log weight over time and see your progress charted." },
              { icon: Activity, title: "Exercise + tips", desc: "Every day includes a suggestion and a health tip." },
            ].map((f) => (
              <Card key={f.title} className="border-border/60 hover:border-primary/40 transition">
                <CardContent className="pt-6">
                  <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-4">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="bg-secondary/40 border-y">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">How it works</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { n: "01", title: "Tell us about you", desc: "Age, weight, height, activity, goal, allergies, and health conditions." },
                { n: "02", title: "Generate your plan", desc: "Pick 7, 14, or 30 days. AI builds a personalized plan in seconds." },
                { n: "03", title: "Track & adjust", desc: "Log water and weight, download PDF, save shopping lists." },
              ].map((s) => (
                <div key={s.n} className="rounded-xl bg-card p-6 border">
                  <div className="text-accent text-sm font-bold">{s.n}</div>
                  <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl px-4 py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Frequently asked</h2>
          <Accordion type="single" collapsible className="w-full">
            {[
              { q: "Is this medical advice?", a: "No. NutriPlan AI is for educational and informational purposes only. Always consult a doctor for medical concerns." },
              { q: "Which health conditions are supported?", a: "The AI considers diabetes, hypertension, high cholesterol, PCOS, thyroid, and kidney disease when generating plans." },
              { q: "Do you support vegetarian and vegan diets?", a: "Yes — set your food preference in the profile and the AI will respect it strictly." },
              { q: "Can I download my plan?", a: "Yes. Every plan can be exported as a PDF from the plan page." },
              { q: "Is my data private?", a: "Yes. Your data is stored securely and only you can access your plans and logs." },
            ].map((f, i) => (
              <AccordionItem key={i} value={`i${i}`}>
                <AccordionTrigger>{f.q}</AccordionTrigger>
                <AccordionContent>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Contact */}
        <section id="contact" className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center">
            <Mail className="size-8 mx-auto mb-4 opacity-90" />
            <h2 className="text-3xl md:text-4xl font-bold">Ready to eat smarter?</h2>
            <p className="mt-3 opacity-90">Create your free account and generate your first AI plan in under a minute.</p>
            <Link to="/auth" className="inline-block mt-6">
              <Button size="lg" variant="secondary" className="text-primary">Get started free</Button>
            </Link>
            <p className="mt-8 text-sm opacity-80">Questions? Email <a className="underline" href="mailto:hello@nutriplan.ai">hello@nutriplan.ai</a></p>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold">
            <Leaf className="size-4 text-primary" /> NutriPlan AI
          </div>
          <div>© {new Date().getFullYear()} NutriPlan AI. For educational purposes only.</div>
        </div>
      </footer>
    </div>
  );
}
