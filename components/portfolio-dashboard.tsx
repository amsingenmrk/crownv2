"use client"

import * as React from "react"
import {
  ArrowUpRight,
  ChevronRight,
  MapPin,
} from "lucide-react"
import { ASSETS, type Asset } from "@/lib/assets"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"

const KPIS = [
  { label: "Portfolio Value", value: "$85.2M" },
  { label: "Avg Occupancy", value: "92%" },
  { label: "Projected Upside", value: "+8.5%" },
  { label: "# High Potential Bldgs", value: "5" },
] as const

type LiftTone = "green" | "yellow" | "red"

type PortfolioAssetRow = {
  id: string
  building: string
  location: string
  occupancy: string
  rent: string
  lift: string
  /** Numeric lift for sorting (same basis as `lift` label). */
  liftPercent: number
  liftTone: LiftTone
  recommendation: string
}

const RECOMMENDATIONS = [
  "Renovate Lobby",
  "Upgrade Amenities",
  "New Leasing Strategy",
  "Refresh Units",
  "Re-Tenant Space",
] as const

function seedForAsset(asset: Asset, index: number): number {
  return (
    asset.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) +
    index * 31
  )
}

function rowForAsset(asset: Asset, index: number): PortfolioAssetRow {
  const seed = seedForAsset(asset, index)
  const tones: LiftTone[] = ["green", "yellow", "red"]
  const liftPct = 3 + (seed % 15)
  const rentBase = 38 + (seed % 28)
  return {
    id: asset.id,
    building: asset.name,
    location: asset.address,
    occupancy: `${asset.occupiedPercent}%`,
    rent: `$${rentBase} / sqft`,
    lift: `+${liftPct}%`,
    liftPercent: liftPct,
    liftTone: tones[seed % tones.length]!,
    recommendation: RECOMMENDATIONS[seed % RECOMMENDATIONS.length]!,
  }
}

const PORTFOLIO_ASSET_ROWS: PortfolioAssetRow[] = ASSETS.map(rowForAsset).sort(
  (a, b) =>
    b.liftPercent - a.liftPercent ||
    a.building.localeCompare(b.building, undefined, { sensitivity: "base" })
)

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

function PropertyRow({ row }: { row: PortfolioAssetRow }) {
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
  const [assetTableSearch, setAssetTableSearch] = React.useState("")
  const visibleAssetRows = React.useMemo(() => {
    const q = assetTableSearch.trim().toLowerCase()
    if (!q) return PORTFOLIO_ASSET_ROWS
    return PORTFOLIO_ASSET_ROWS.filter(
      (row) =>
        row.building.toLowerCase().includes(q) ||
        row.location.toLowerCase().includes(q) ||
        row.recommendation.toLowerCase().includes(q) ||
        row.rent.toLowerCase().includes(q) ||
        row.lift.toLowerCase().includes(q)
    )
  }, [assetTableSearch])

  return (
    <div className="relative flex flex-1 flex-col gap-8">
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

      {/* Map */}
      <section className="w-full">
        <div className="relative w-full min-h-[220px] overflow-hidden rounded-xl border border-border bg-muted/60 lg:min-h-[280px]">
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
          <div className="absolute inset-0 w-full bg-gradient-to-br from-muted/20 to-transparent" />
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

      {/* Same assets as sidebar (Office / Industrial / Retail order) */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Assets
          </h2>
          <div className="flex w-full min-w-0 items-center justify-end gap-2 sm:w-auto sm:max-w-xl">
            <Input
              type="search"
              placeholder="Search assets…"
              value={assetTableSearch}
              onChange={(e) => setAssetTableSearch(e.target.value)}
              aria-label="Search assets in table"
              className="h-9 min-w-0 flex-1 sm:max-w-xs"
            />
            <Button type="button" size="sm" className="h-9 shrink-0">
              Add asset
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_0.7fr_0.9fr_0.85fr_minmax(0,1.1fr)] gap-3 border-b border-border bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground max-lg:hidden">
            <span>Asset</span>
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
            {visibleAssetRows.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                No assets match your search.
              </li>
            ) : (
              visibleAssetRows.map((row) => (
                <li key={row.id}>
                  <PropertyRow row={row} />
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </div>
  )
}
