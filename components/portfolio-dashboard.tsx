"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  ChevronRight,
  Expand,
  Shrink,
} from "lucide-react"
import { ASSETS, assetHref, type Asset } from "@/lib/assets"
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

type PortfolioAssetRow = {
  id: string
  building: string
  location: string
  occupancy: string
  rent: string
  lift: string
  /** Numeric lift for sorting (same basis as `lift` label). */
  liftPercent: number
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
    recommendation: RECOMMENDATIONS[seed % RECOMMENDATIONS.length]!,
  }
}

const PORTFOLIO_ASSET_ROWS: PortfolioAssetRow[] = ASSETS.map(rowForAsset).sort(
  (a, b) =>
    b.liftPercent - a.liftPercent ||
    a.building.localeCompare(b.building, undefined, { sensitivity: "base" })
)

const LIFT_PCT_EXTENT = (() => {
  const ps = PORTFOLIO_ASSET_ROWS.map((r) => r.liftPercent)
  return { min: Math.min(...ps), max: Math.max(...ps) }
})()

/** 0 = lowest lift in portfolio, 1 = highest (violet scale uses this). */
function normalizedLiftStrength(liftPercent: number): number {
  const { min, max } = LIFT_PCT_EXTENT
  if (max <= min) return 1
  return (liftPercent - min) / (max - min)
}

/** Table pill: deeper, more saturated violet as potential lift rises; faint when low. */
function liftPillClassFromStrength(t: number) {
  if (t >= 0.85) {
    return cn(
      "bg-violet-600 text-white shadow-sm ring-2 ring-violet-400/90",
      "dark:bg-violet-500 dark:ring-violet-300/75"
    )
  }
  if (t >= 0.55) {
    return cn(
      "bg-violet-500 text-violet-50 ring-1 ring-violet-500/60",
      "dark:bg-violet-600 dark:text-white dark:ring-violet-400/45"
    )
  }
  if (t >= 0.3) {
    return cn(
      "bg-violet-500/25 text-violet-900 ring-1 ring-violet-500/35",
      "dark:bg-violet-500/35 dark:text-violet-100 dark:ring-violet-400/30"
    )
  }
  return cn(
    "bg-violet-500/[0.09] text-violet-700/70 ring-1 ring-violet-400/22",
    "dark:bg-violet-500/[0.14] dark:text-violet-300/60 dark:ring-violet-500/18"
  )
}

/** Map dot: same violet scale as pills. */
function mapPinClassFromStrength(t: number) {
  if (t >= 0.85) {
    return "bg-violet-600 ring-2 ring-white shadow-md dark:bg-violet-500"
  }
  if (t >= 0.55) {
    return "bg-violet-500 ring-2 ring-white shadow-sm dark:bg-violet-400"
  }
  if (t >= 0.3) {
    return "bg-violet-400/90 ring-2 ring-white/95 dark:bg-violet-400/75"
  }
  return "bg-violet-300/50 ring-2 ring-white/90 dark:bg-violet-500/35"
}

/** One map dot per asset; position spirals from center; color = lift strength. */
function mapPinsForRows(rows: PortfolioAssetRow[]) {
  const n = rows.length
  const golden = Math.PI * (3 - Math.sqrt(5))
  return rows.map((row, i) => {
    const r = 0.4 * Math.sqrt((i + 0.5) / Math.max(n, 1))
    const theta = i * golden
    const x = 0.5 + r * Math.cos(theta)
    const y = 0.5 + r * Math.sin(theta)
    const leftPct = Math.min(94, Math.max(6, x * 100))
    const topPct = Math.min(89, Math.max(11, y * 100))
    return {
      id: row.id,
      building: row.building,
      lift: row.lift,
      liftPercent: row.liftPercent,
      top: `${topPct}%`,
      left: `${leftPct}%`,
    }
  })
}

const PORTFOLIO_MAP_PINS = mapPinsForRows(PORTFOLIO_ASSET_ROWS)

/** Shared with table header; all columns flex with `minmax(0, …fr)` — no fixed widths. */
const ASSETS_TABLE_LG_GRID =
  "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.75fr)_minmax(0,0.65fr)_minmax(0,0.82fr)_minmax(0,0.72fr)_minmax(0,0.95fr)]"

function PropertyRow({ row }: { row: PortfolioAssetRow }) {
  const [open, setOpen] = React.useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          "grid w-full cursor-pointer grid-cols-1 gap-2 border-0 bg-transparent px-4 py-4 text-left text-sm transition-colors hover:bg-muted/50 lg:items-center lg:gap-3 lg:py-3",
          ASSETS_TABLE_LG_GRID
        )}
      >
        <span className="flex items-center gap-2 font-semibold text-foreground">
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-90"
            )}
          />
          {row.building}
        </span>
        <span className="min-w-0 text-sm text-muted-foreground lg:text-foreground">
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
              liftPillClassFromStrength(normalizedLiftStrength(row.liftPercent))
            )}
          >
            {row.lift}
          </span>
        </span>
        <span className="min-w-0" onClick={(e) => e.stopPropagation()}>
          <Link
            href={assetHref(row.id)}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex rounded-md border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {row.recommendation}
          </Link>
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
  const [mapExpanded, setMapExpanded] = React.useState(false)
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
        <div
          id="portfolio-map-canvas"
          className={cn(
            "relative w-full overflow-hidden rounded-xl border border-border bg-muted/60 transition-[min-height] duration-300 ease-out",
            mapExpanded
              ? "min-h-[550px] lg:min-h-[700px]"
              : "min-h-[220px] lg:min-h-[280px]"
          )}
        >
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
          {PORTFOLIO_MAP_PINS.map((pin) => (
            <span
              key={pin.id}
              className={cn(
                "absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full",
                mapPinClassFromStrength(
                  normalizedLiftStrength(pin.liftPercent)
                )
              )}
              style={{ top: pin.top, left: pin.left }}
              title={`${pin.building} · Potential lift ${pin.lift}`}
            />
          ))}
          <button
            type="button"
            aria-expanded={mapExpanded}
            aria-controls="portfolio-map-canvas"
            onClick={() => setMapExpanded((v) => !v)}
            className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md border border-border/60 bg-background/90 px-2 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground"
          >
            {mapExpanded ? (
              <Shrink className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <Expand className="size-3.5 shrink-0" aria-hidden />
            )}
            {mapExpanded ? "Collapse Map" : "Expand Map"}
          </button>
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
              className="min-w-0 flex-1 sm:max-w-xs"
            />
            <Button type="button" className="shrink-0">
              Add asset
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <div
            className={cn(
              "grid gap-3 border-b border-border bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground max-lg:hidden",
              ASSETS_TABLE_LG_GRID
            )}
          >
            <span>Asset</span>
            <span>Location</span>
            <span>Occupancy</span>
            <span>Current Rent</span>
            <span className="inline-flex items-center gap-1 text-violet-700 dark:text-violet-300">
              Potential Lift
              <ArrowUpRight
                className="size-3.5 text-violet-600 opacity-90 dark:text-violet-400"
                aria-hidden
              />
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
