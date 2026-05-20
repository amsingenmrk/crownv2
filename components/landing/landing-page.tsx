import Image from "next/image"
import Link from "next/link"
import {
  BarChart3,
  Building2,
  GitCompare,
  Layers,
  Search,
  Sparkles,
} from "lucide-react"

import { LandingContactCta } from "@/components/landing/landing-contact-cta"
import { LandingContactForm } from "@/components/landing/landing-contact-form"
import { LandingLogInLink } from "@/components/landing/landing-log-in-link"
import { cn } from "@/lib/utils"

const FEATURES = [
  {
    icon: Building2,
    title: "Portfolio intelligence",
    description:
      "See holdings, scopes, and performance in one place. Placeholder copy for your value proposition.",
  },
  {
    icon: Layers,
    title: "Stacking & modifications",
    description:
      "Model floors, tenants, and lease changes at the building level before you commit capital.",
  },
  {
    icon: BarChart3,
    title: "Forecasts & scenarios",
    description:
      "Run capital-planning scenarios and compare outcomes across assets and time horizons.",
  },
  {
    icon: Search,
    title: "Search & discovery",
    description:
      "Find assets quickly across your portfolio with filters tuned for institutional workflows.",
  },
  {
    icon: GitCompare,
    title: "Side-by-side compare",
    description:
      "Benchmark properties and saved comparisons to support investment committee decisions.",
  },
  {
    icon: Sparkles,
    title: "Transparent modeling",
    description:
      "Glassbox surfaces assumptions and drivers so teams can align on what the numbers mean.",
  },
] as const

export function LandingPage() {
  return (
    <div className="landing-page flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-card shadow-sm ring-1 ring-border/60">
              <Image
                src="/newmark_symbol_light.svg"
                alt=""
                width={28}
                height={28}
                className="size-7"
                aria-hidden
              />
            </div>
            <p className="text-sm font-semibold tracking-tight">Glassbox</p>
          </Link>
          <nav className="flex items-center gap-2">
            <LandingLogInLink />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/60">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,var(--color-blue-100),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,color-mix(in_oklch,var(--color-blue-600)_25%,transparent),transparent)]"
          />
          <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
            <p className="mb-4 text-sm font-medium text-primary">
              Institutional real estate analytics
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Clarity for portfolio, property, and capital decisions
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground text-pretty sm:text-xl">
              Glassbox brings portfolio views, building-level stacking, scenarios,
              and forecasts into a single workspace—so your team can model,
              compare, and explain outcomes with confidence.
            </p>
            <div className="mt-10">
              <LandingContactCta />
            </div>

            <figure className="mt-16 sm:mt-20">
              <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xl ring-1 ring-border/60">
                <Image
                  src="/landing-portfolio-screenshot.png"
                  alt="Glassbox portfolio dashboard with asset KPIs, valuation summary, and property table"
                  width={1440}
                  height={900}
                  className="h-auto w-full"
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1152px"
                />
              </div>
              <figcaption className="mt-4 text-center text-sm text-muted-foreground">
                Entire portfolio view—assets, occupancy, and valuation at a glance.
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Built for how CRE teams actually work
            </h2>
            <p className="mt-3 text-muted-foreground">
              From portfolio roll-ups to building-level detail—model, compare, and
              explain outcomes with the same workspace your analysts use every day.
            </p>
          </div>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <li
                key={feature.title}
                className={cn(
                  "rounded-xl border border-border/80 bg-card p-6 shadow-sm",
                  "transition-colors hover:border-border hover:bg-card/80"
                )}
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="size-5" aria-hidden />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="mx-auto max-w-xl">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Contact for pricing
              </h2>
              <p className="mt-3 text-muted-foreground">
                Tell us about your portfolio and we&apos;ll follow up with
                pricing and next steps.
              </p>
              <div className="mt-8 rounded-xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
                <LandingContactForm />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Glassbox. All rights reserved.</p>
          <p>Demo environment</p>
        </div>
      </footer>
    </div>
  )
}