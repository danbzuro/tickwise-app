import { Link } from "react-router-dom";
import {
  Newspaper,
  Sparkles,
  Filter,
  Lightbulb,
  CalendarClock,
  Users,
  ArrowRight,
  Check,
  Clock,
  ExternalLink,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Tickers de ejemplo para la "franja de confianza" del hero
const TICKERS = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "META", "GOOGL"];

// Features principales del producto
const FEATURES = [
  {
    icon: Sparkles,
    title: "AI materiality triage",
    description:
      "Every headline is classified as material, potentially material, or just noteworthy, so you focus on what can actually move the thesis.",
  },
  {
    icon: Filter,
    title: "Noise filtering",
    description:
      "Webinars, sponsored posts and re-packaged PR never reach your inbox. Exclude terms, domains and set a minimum materiality bar.",
  },
  {
    icon: Lightbulb,
    title: "Why it matters",
    description:
      "Each item ships with a short, investor-grade take on the read-through to estimates, margins and valuation.",
  },
  {
    icon: CalendarClock,
    title: "Scheduled digests",
    description:
      "Pick the times that fit your day. Tickwise scrapes your sources and emails a clean, prioritized brief on every run.",
  },
  {
    icon: Newspaper,
    title: "Source control",
    description:
      "Track news straight from company newsrooms, blogs and press pages — mapped to the tickers you care about.",
  },
  {
    icon: Users,
    title: "Built for teams",
    description:
      "Invite analysts, share one workspace, and keep the whole desk reading from the same curated feed.",
  },
];

// Pasos del "how it works"
const STEPS = [
  {
    step: "01",
    title: "Add your sources",
    description:
      "Point Tickwise at the newsrooms and pages that matter, each tied to a ticker.",
  },
  {
    step: "02",
    title: "AI triages the noise",
    description:
      "Our agent reads every update, scores materiality and drops the fluff.",
  },
  {
    step: "03",
    title: "Get your brief",
    description:
      "A prioritized digest lands in your inbox on your schedule — no doomscrolling.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ------------------------------------------------------------------ */}
      {/* Nav */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Newspaper className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Tickwise
            </span>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a
              href="#how-it-works"
              className="transition-colors hover:text-foreground"
            >
              How it works
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Sign in
            </Link>
            <Link
              to="/login"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Hero */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden">
        {/* Glow de fondo sutil */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--accent))_0%,transparent_70%)]" />

        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-5 gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered market intelligence
            </Badge>

            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Market-moving news.
              <br />
              <span className="text-muted-foreground">Without the noise.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
              Tickwise monitors the companies you follow, triages every headline
              by materiality, and delivers a clean, investor-grade brief on your
              schedule — so you never miss what matters.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/login"
                className={cn(buttonVariants({ size: "lg" }), "gap-2")}
              >
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" })
                )}
              >
                See how it works
              </a>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required · Set up in minutes
            </p>
          </div>

          {/* Preview del producto (card estilo feed item) */}
          <div className="mx-auto mt-16 max-w-3xl">
            <div className="rounded-xl border bg-card p-2 shadow-xl">
              <div className="rounded-lg border bg-background p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    NVDA
                  </Badge>
                  <Badge variant="outline">Market</Badge>
                  <Badge className="bg-emerald-600 text-white">Material</Badge>
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    08:00 AM
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-semibold leading-snug">
                  NVIDIA expands its data center platform for cloud customers
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  New deals with hyperscale providers drive demand for GPUs for
                  large-scale training and inference.
                </p>

                <div className="mt-4 rounded-md border bg-muted/40 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    Why it matters
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Locked-in hyperscale demand underpins data-center revenue
                    durability and defends margins against emerging accelerator
                    competition.
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    1 of 3 relevant · 2 screened as noise
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    Open <ExternalLink className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Franja de tickers */}
          <div className="mt-14 flex flex-col items-center gap-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Track the names that move your book
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {TICKERS.map((t) => (
                <span
                  key={t}
                  className="rounded-md border bg-card px-3 py-1 font-mono text-sm text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Features */}
      {/* ------------------------------------------------------------------ */}
      <section id="features" className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything an analyst needs, nothing they don't
            </h2>
            <p className="mt-4 text-muted-foreground">
              Tickwise turns a firehose of headlines into a short, prioritized
              read — built around how investors actually make decisions.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* How it works */}
      {/* ------------------------------------------------------------------ */}
      <section id="how-it-works" className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              From firehose to brief in three steps
            </h2>
            <p className="mt-4 text-muted-foreground">
              Set it up once and let the agent do the reading for you.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} className="relative">
                <span className="text-4xl font-bold tracking-tight text-muted-foreground/30">
                  {s.step}
                </span>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CTA / Pricing anchor */}
      {/* ------------------------------------------------------------------ */}
      <section id="pricing" className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-8 text-center shadow-sm sm:p-12">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Stop scrolling. Start deciding.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Join the desks that let Tickwise read the news so they can focus on
              the thesis.
            </p>

            <ul className="mx-auto mt-6 flex max-w-md flex-col gap-2 text-left text-sm sm:flex-row sm:flex-wrap sm:justify-center">
              {[
                "Unlimited sources",
                "AI materiality scoring",
                "Team workspace",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <Check className="h-4 w-4 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/login"
                className={cn(buttonVariants({ size: "lg" }), "gap-2")}
              >
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" })
                )}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Footer */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Newspaper className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-medium">Tickwise</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Tickwise. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
