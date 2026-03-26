"use client"

import * as React from "react"
import {
  ArrowUpRight,
  ChevronRight,
  FileText,
  MapPin,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const STEPS = [
  "Analyze Portfolio",
  "Identify Opportunities",
  "Modify Assets",
  "Review Impact",
] as const

const KPIS = [
  { label: "Portfolio Value", value: "$85.2M" },
  { label: "Avg Occupancy", value: "92%" },
  { label: "Projected Upside", value: "+8.5%" },
  { label: "# High Potential Bldgs", value: "5" },
] as const

type LiftTone = "green" | "yellow" | "red"

const PROPERTIES = [
  {
    building: "Parkview Plaza",
    location: "New York, NY",
    occupancy: "88%",
    rent: "$56 / sqft",
    lift: "+12%",
    liftTone: "green" as LiftTone,
    recommendation: "Renovate Lobby",
  },
  {
    building: "Cedar Heights",
    location: "Chicago, IL",
    occupancy: "79%",
    rent: "$48 / sqft",
    lift: "+9%",
    liftTone: "yellow" as LiftTone,
    recommendation: "Upgrade Amenities",
  },
  {
    building: "Sunset Towers",
    location: "Los Angeles, CA",
    occupancy: "95%",
    rent: "$62 / sqft",
    lift: "+5%",
    liftTone: "green" as LiftTone,
    recommendation: "New Leasing Strategy",
  },
  {
    building: "Riverside Lofts",
    location: "Austin, TX",
    occupancy: "85%",
    rent: "$42 / sqft",
    lift: "+15%",
    liftTone: "yellow" as LiftTone,
    recommendation: "Refresh Units",
  },
  {
    building: "Metro Center",
    location: "Miami, FL",
    occupancy: "91%",
    rent: "$60 / sqft",
    lift: "+3%",
    liftTone: "green" as LiftTone,
    recommendation: "Re-Tenant Space",
  },
] as const

/** Map pin positions (percent) + colors matching wireframe mix */
const MAP_PINS: { top: string; left: string; color: LiftTone }[] = [
  { top: "22%", left: "28%", color: "red" },
  { top: "38%", left: "55%", color: "yellow" },
  { top: "48%", left: "42%", color: "green" },
  { top: "58%", left: "68%", color: "red" },
  { top: "68%", left: "32%", color: "yellow" },
  { top: "72%", left: "58%", color: "green" },
]

function liftPillClass(tone: LiftTone) {
  switch (tone) {
    case "green":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/30"
    case "yellow":
      return "bg-amber-500/15 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500/35"
    case "red":
      return "bg-red-500/15 text-red-800 dark:text-red-300 ring-1 ring-red-500/30"
    default:
      return ""
  }
}

function mapPinClass(tone: LiftTone) {
  switch (tone) {
    case "green":
      return "bg-emerald-500 ring-2 ring-white shadow-sm"
    case "yellow":
      return "bg-amber-400 ring-2 ring-white shadow-sm"
    case "red":
      return "bg-red-500 ring-2 ring-white shadow-sm"
    default:
      return ""
  }
}

function PropertyRow({
  row,
}: {
  row: (typeof PROPERTIES)[number]
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="grid w-full cursor-pointer grid-cols-1 gap-2 border-0 bg-transparent px-4 py-4 text-left transition-colors hover:bg-muted/50 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_0.7fr_0.9fr_0.85fr_minmax(0,1.1fr)] lg:items-center lg:gap-3 lg:py-3">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-90"
            )}
          />
          {row.building}
        </span>
        <span className="text-sm text-muted-foreground lg:text-foreground">
          {row.location}
        </span>
        <span className="text-sm tabular-nums">{row.occupancy}</span>
        <span className="text-sm tabular-nums text-muted-foreground lg:text-foreground">
          {row.rent}
        </span>
        <span>
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
              liftPillClass(row.liftTone)
            )}
          >
            {row.lift}
          </span>
        </span>
        <span>
          <span className="inline-flex rounded-md border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground">
            {row.recommendation}
          </span>
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-border bg-muted/20 px-4 py-3 pl-11 text-sm text-muted-foreground">
          Lease roll summary, recent comps, and underwriting notes for{" "}
          {row.building} appear here.
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function PortfolioDashboard() {
  const [activeStep, setActiveStep] = React.useState(0)
  const [viewMode, setViewMode] = React.useState<"performance" | "opportunity">(
    "opportunity"
  )

  return (
    <div className="relative flex flex-1 flex-col gap-8 pb-28 md:pb-32">
      {/* KPI row */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm"
          >
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {kpi.value}
            </p>
          </div>
        ))}
      </section>

      {/* Stepper */}
      <nav aria-label="Portfolio workflow" className="flex flex-wrap gap-2 md:gap-3">
        {STEPS.map((label, i) => {
          const active = i === activeStep
          return (
            <button
              key={label}
              type="button"
              onClick={() => setActiveStep(i)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors md:px-4 md:py-2",
                active
                  ? "border-foreground/20 bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  active
                    ? "bg-background/20 text-background"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </span>
              <span className="font-medium">{label}</span>
            </button>
          )
        })}
      </nav>

      {/* Map + view toggles */}
      <section className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-foreground">View</p>
          <div className="inline-flex w-full max-w-md rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setViewMode("performance")}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                viewMode === "performance"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              View by Performance
            </button>
            <button
              type="button"
              onClick={() => setViewMode("opportunity")}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                viewMode === "opportunity"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              View by Opportunity
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {viewMode === "opportunity"
              ? "Properties ranked by upside and repositioning potential."
              : "Properties ranked by occupancy, rent, and operating metrics."}
          </p>
        </div>

        <div className="relative min-h-[220px] overflow-hidden rounded-xl border border-border bg-muted/60 lg:min-h-[280px]">
          {/* Simple street grid */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `
                linear-gradient(to right, var(--border) 1px, transparent 1px),
                linear-gradient(to bottom, var(--border) 1px, transparent 1px)
              `,
              backgroundSize: "28px 28px",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-transparent" />
          {MAP_PINS.map((pin, idx) => (
            <span
              key={idx}
              className={cn(
                "absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full",
                mapPinClass(pin.color)
              )}
              style={{ top: pin.top, left: pin.left }}
              title="Property"
            />
          ))}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
            <MapPin className="size-3.5" />
            Portfolio map
          </div>
        </div>
      </section>

      {/* Property table */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Property Overview
        </h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_0.7fr_0.9fr_0.85fr_minmax(0,1.1fr)] gap-3 border-b border-border bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground max-lg:hidden">
            <span>Building</span>
            <span>Location</span>
            <span>Occupancy</span>
            <span>Current Rent</span>
            <span className="inline-flex items-center gap-1">
              Potential Lift
              <ArrowUpRight className="size-3.5 opacity-70" aria-hidden />
            </span>
            <span>Top Recommendation</span>
          </div>

          <ul className="divide-y divide-border">
            {PROPERTIES.map((row) => (
              <li key={row.building}>
                <PropertyRow row={row} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Impact tracker */}
      <aside className="fixed bottom-6 right-6 z-30 w-[min(100vw-2rem,18rem)] rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-zinc-50 shadow-xl dark:border-zinc-600 dark:bg-zinc-950">
        <div className="flex items-center gap-2 border-b border-zinc-700 pb-3 dark:border-zinc-600">
          <FileText className="size-4 text-zinc-400" />
          <h3 className="text-sm font-semibold">Impact Tracker</h3>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <span className="font-medium text-emerald-400">+ $2.1M</span>
            <span className="text-zinc-400"> Portfolio Value</span>
          </li>
          <li>
            <span className="font-medium text-emerald-400">+ 3.2%</span>
            <span className="text-zinc-400"> Rent Lift</span>
          </li>
        </ul>
        <Button
          type="button"
          className="mt-4 h-9 w-full border-0 bg-white text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-100"
        >
          View Changes
        </Button>
      </aside>
    </div>
  )
}
