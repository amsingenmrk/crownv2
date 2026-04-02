"use client"

import * as React from "react"
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { Expand, Shrink } from "lucide-react"
import { PortfolioAssetsDataTable } from "@/components/portfolio/portfolio-assets-data-table"
import { PortfolioAssetsViewOptions } from "@/components/portfolio/portfolio-assets-view-options"
import { createPortfolioAssetColumns } from "@/components/portfolio/portfolio-assets-columns"
import {
  ASSETS,
  ASSET_GROUP_SIDEBAR_LABELS,
  type Asset,
  type AssetGroupId,
} from "@/lib/assets"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import {
  mapPinClassFromStrength,
  normalizedLiftStrength,
} from "@/lib/portfolio-lift"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type PortfolioKpi = {
  label: string
  value: string
  subLabel?: string
  subValue?: string
}

const KPIS: PortfolioKpi[] = [
  {
    label: "Est. Value",
    value: "$1.24B",
    subLabel: "Est. Value / SF",
    subValue: "$485 / SF",
  },
  {
    label: "Occupancy",
    value: "91.60%",
    subLabel: "Vacancy",
    subValue: "8.40%",
  },
  {
    label: "NOI",
    value: "$74.2M / yr",
    subLabel: "NOI / SF",
    subValue: "$29.10 / SF",
  },
  { label: "Cap Rate", value: "6.00%" },
  { label: "WALE / WALT", value: "5.8 yrs" },
]

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

function formatRsfShort(sqft: number): string {
  if (sqft >= 1_000_000) {
    const m = sqft / 1_000_000
    const rounded = Math.round(m * 10) / 10
    const s =
      rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1)
    return `${s}M`
  }
  if (sqft >= 1000) {
    return `${Math.round(sqft / 1000)}K`
  }
  return String(sqft)
}

const ASSET_STATUS_LABELS = [
  "Stabilized",
  "Lease-up",
  "Redevelopment",
] as const

function rowForAsset(asset: Asset, index: number): PortfolioAssetRow {
  const seed = seedForAsset(asset, index)
  const liftPct = 3 + (seed % 15)
  const pricePerSfN = 38 + (seed % 68)

  const typeLabel =
    asset.groupId === "office"
      ? "Office"
      : asset.groupId === "industrial"
        ? "Industrial"
        : "Retail"

  const rsfSqft = 120_000 + (seed * 97_331) % 3_800_000
  const valueMills = 180 + (seed * 53) % 2_320
  const value =
    valueMills >= 1000
      ? `$${(valueMills / 1000).toFixed(1)}B`
      : `$${valueMills.toFixed(1)}M`

  const noiTenthM = (seed % 95) / 10
  const noi = noiTenthM < 0.15 ? "$0.0" : `$${noiTenthM.toFixed(1)}M`

  return {
    id: asset.id,
    groupId: asset.groupId,
    building: asset.name,
    location: asset.address,
    typeLabel,
    rsf: formatRsfShort(rsfSqft),
    occPct: `${asset.occupiedPercent}%`,
    pricePerSf: `$${pricePerSfN}`,
    noi,
    value,
    capRate: `${(4.2 + (seed % 28) / 10).toFixed(1)}%`,
    wale: `${(4.5 + (seed % 35) / 10).toFixed(1)}y`,
    debtYield: `${((seed % 85) / 10).toFixed(1)}%`,
    status: ASSET_STATUS_LABELS[seed % ASSET_STATUS_LABELS.length]!,
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

function liftStrengthForRow(liftPercent: number) {
  return normalizedLiftStrength(
    liftPercent,
    LIFT_PCT_EXTENT.min,
    LIFT_PCT_EXTENT.max
  )
}

const ALL_PORTFOLIO_GROUPS_VALUE = "all"
const ALL_PORTFOLIO_GROUPS_LABEL = "All portfolio groups"

const PORTFOLIO_GROUP_SELECT_LABELS: Record<string, React.ReactNode> = {
  [ALL_PORTFOLIO_GROUPS_VALUE]: ALL_PORTFOLIO_GROUPS_LABEL,
  office: ASSET_GROUP_SIDEBAR_LABELS.office,
  industrial: ASSET_GROUP_SIDEBAR_LABELS.industrial,
  retail: ASSET_GROUP_SIDEBAR_LABELS.retail,
}

/** Fixed-width % strings so SSR and client match (avoids hydration drift from float formatting). */
function toCssPercent(n: number): string {
  return `${n.toFixed(4)}%`
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
      top: toCssPercent(topPct),
      left: toCssPercent(leftPct),
    }
  })
}

export function PortfolioDashboard() {
  const assetsHeadingId = React.useId()
  const [mapExpanded, setMapExpanded] = React.useState(false)
  const [assetTableSearch, setAssetTableSearch] = React.useState("")
  const [portfolioGroupFilter, setPortfolioGroupFilter] = React.useState<
    typeof ALL_PORTFOLIO_GROUPS_VALUE | AssetGroupId
  >(ALL_PORTFOLIO_GROUPS_VALUE)

  const assetsTableHeading =
    portfolioGroupFilter === ALL_PORTFOLIO_GROUPS_VALUE
      ? "All assets"
      : ASSET_GROUP_SIDEBAR_LABELS[portfolioGroupFilter]

  const visibleAssetRows = React.useMemo(() => {
    const baseRows =
      portfolioGroupFilter === ALL_PORTFOLIO_GROUPS_VALUE
        ? PORTFOLIO_ASSET_ROWS
        : PORTFOLIO_ASSET_ROWS.filter((r) => r.groupId === portfolioGroupFilter)

    const q = assetTableSearch.trim().toLowerCase()
    if (!q) return baseRows
    return baseRows.filter((row) => {
      return [
        row.building,
        row.location,
        row.typeLabel,
        row.rsf,
        row.occPct,
        row.pricePerSf,
        row.noi,
        row.value,
        row.capRate,
        row.wale,
        row.debtYield,
        row.status,
        row.lift,
        row.recommendation,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    })
  }, [assetTableSearch, portfolioGroupFilter])

  const visibleMapPins = React.useMemo(
    () => mapPinsForRows(visibleAssetRows),
    [visibleAssetRows]
  )

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const portfolioColumns = React.useMemo(
    () => createPortfolioAssetColumns(LIFT_PCT_EXTENT),
    []
  )

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "lift", desc: true },
  ])
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table useReactTable
  const portfolioTable = useReactTable({
    data: visibleAssetRows,
    columns: portfolioColumns,
    state: { rowSelection, sorting, columnVisibility },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: true,
    enableHiding: true,
  })

  React.useEffect(() => {
    const visible = new Set(visibleAssetRows.map((r) => r.id))
    setRowSelection((s) => {
      let changed = false
      const next = { ...s }
      for (const id of Object.keys(next)) {
        if (!visible.has(id)) {
          delete next[id]
          changed = true
        }
      }
      return changed ? next : s
    })
  }, [visibleAssetRows])

  return (
    <div className="relative flex flex-1 flex-col gap-8">
      {/* KPI row */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm"
          >
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {kpi.value}
            </p>
            {kpi.subLabel != null && kpi.subValue != null ? (
              <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">{kpi.subLabel}</p>
                <p className="text-sm font-medium tabular-nums text-foreground">
                  {kpi.subValue}
                </p>
              </div>
            ) : null}
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
          {visibleMapPins.map((pin) => (
            <span
              key={pin.id}
              className={cn(
                "absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full",
                mapPinClassFromStrength(liftStrengthForRow(pin.liftPercent))
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
      <section
        className="flex flex-col gap-3"
        aria-labelledby={assetsHeadingId}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <h2
              id={assetsHeadingId}
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              {assetsTableHeading}
            </h2>
            <span
              className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-muted px-2 text-xs font-medium tabular-nums text-muted-foreground ring-1 ring-border/60"
              aria-label={
                portfolioGroupFilter === ALL_PORTFOLIO_GROUPS_VALUE
                  ? `${visibleAssetRows.length} assets in list`
                  : `${visibleAssetRows.length} assets in ${ASSET_GROUP_SIDEBAR_LABELS[portfolioGroupFilter]}`
              }
            >
              {visibleAssetRows.length}
            </span>
          </div>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:max-w-none sm:justify-end">
            <Input
              type="search"
              placeholder="Search assets…"
              value={assetTableSearch}
              onChange={(e) => setAssetTableSearch(e.target.value)}
              aria-label="Search assets in table"
              className="min-w-0 w-full flex-1 sm:max-w-xs sm:w-auto"
            />
            <Select
              items={PORTFOLIO_GROUP_SELECT_LABELS}
              value={portfolioGroupFilter}
              onValueChange={(v) => {
                if (v == null) return
                if (
                  v === ALL_PORTFOLIO_GROUPS_VALUE ||
                  v === "office" ||
                  v === "industrial" ||
                  v === "retail"
                ) {
                  setPortfolioGroupFilter(v)
                }
              }}
            >
              <SelectTrigger
                className="h-8 w-full min-w-0 shrink-0 sm:min-w-[13rem] sm:w-auto sm:max-w-[16rem]"
                aria-label="Filter assets by portfolio group"
              >
                <SelectValue placeholder={ALL_PORTFOLIO_GROUPS_LABEL} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PORTFOLIO_GROUPS_VALUE}>
                  {ALL_PORTFOLIO_GROUPS_LABEL}
                </SelectItem>
                <SelectItem value="office">
                  {ASSET_GROUP_SIDEBAR_LABELS.office}
                </SelectItem>
                <SelectItem value="industrial">
                  {ASSET_GROUP_SIDEBAR_LABELS.industrial}
                </SelectItem>
                <SelectItem value="retail">
                  {ASSET_GROUP_SIDEBAR_LABELS.retail}
                </SelectItem>
              </SelectContent>
            </Select>
            <PortfolioAssetsViewOptions
              table={portfolioTable}
              className="hidden lg:flex"
            />
            <Button type="button" className="shrink-0">
              Add asset
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <div className="portfolio-assets-table-scroll-inner">
            <PortfolioAssetsDataTable
              table={portfolioTable}
              liftExtent={LIFT_PCT_EXTENT}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
