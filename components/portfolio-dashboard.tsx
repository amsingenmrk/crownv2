"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, Expand, Shrink } from "lucide-react"
import {
  parseStoredSets,
  storageKeyForAsset,
  type ModificationSetRecord,
} from "@/components/building-modifications-sidebar"
import {
  ASSETS,
  ASSET_GROUP_SIDEBAR_LABELS,
  assetHref,
  type Asset,
  type AssetGroupId,
} from "@/lib/assets"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TableHead, TableHeader, TableRow } from "@/components/ui/table"

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

type PortfolioAssetRow = {
  id: string
  groupId: AssetGroupId
  building: string
  location: string
  typeLabel: string
  rsf: string
  occPct: string
  pricePerSf: string
  noi: string
  value: string
  capRate: string
  wale: string
  debtYield: string
  status: string
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

const ALL_PORTFOLIO_GROUPS_VALUE = "all"
const ALL_PORTFOLIO_GROUPS_LABEL = "All portfolio groups"

const PORTFOLIO_GROUP_SELECT_LABELS: Record<string, React.ReactNode> = {
  [ALL_PORTFOLIO_GROUPS_VALUE]: ALL_PORTFOLIO_GROUPS_LABEL,
  office: ASSET_GROUP_SIDEBAR_LABELS.office,
  industrial: ASSET_GROUP_SIDEBAR_LABELS.industrial,
  retail: ASSET_GROUP_SIDEBAR_LABELS.retail,
}

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

/**
 * Asset + underwriting-style columns + lift / mods.
 * Wide layout — parent uses horizontal scroll on small viewports.
 */
const ASSETS_TABLE_LG_GRID =
  "lg:grid-cols-[minmax(2.75rem,2.75rem)_minmax(11rem,1fr)_minmax(0,4.5rem)_minmax(0,3.25rem)_minmax(0,3.25rem)_minmax(0,3.25rem)_minmax(0,3.5rem)_minmax(0,4.25rem)_minmax(0,3rem)_minmax(0,3.25rem)_minmax(0,4.5rem)_minmax(8.5rem,12rem)_minmax(8rem,10.5rem)]"

const NO_TABLE_MOD_PRESET_VALUE = "__no_table_mod_preset__"

function useSavedModificationSets(assetId: string) {
  const storageKey = storageKeyForAsset(assetId)
  const [sets, setSets] = React.useState<ModificationSetRecord[]>([])

  const reload = React.useCallback(() => {
    setSets(parseStoredSets(localStorage.getItem(storageKey)))
  }, [storageKey])

  React.useEffect(() => {
    reload()
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey) reload()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [storageKey, reload])

  const sortedSets = React.useMemo(
    () => [...sets].sort((a, b) => a.name.localeCompare(b.name)),
    [sets]
  )

  return { sortedSets, reload }
}

function AssetModificationSetSelect({
  assetId,
  building,
}: {
  assetId: string
  building: string
}) {
  const { sortedSets, reload } = useSavedModificationSets(assetId)
  const [value, setValue] = React.useState("")

  const modificationSetItemLabels = React.useMemo(() => {
    const labels: Record<string, React.ReactNode> = {
      [NO_TABLE_MOD_PRESET_VALUE]: "Select a saved set…",
    }
    for (const s of sortedSets) {
      labels[s.id] = s.name
    }
    return labels
  }, [sortedSets])

  return (
    <span
      className="block min-w-0 w-full max-w-full"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Select
        items={modificationSetItemLabels}
        value={value === "" ? NO_TABLE_MOD_PRESET_VALUE : value}
        onValueChange={(v) =>
          setValue(
            v == null || v === NO_TABLE_MOD_PRESET_VALUE ? "" : v
          )
        }
        onOpenChange={(open) => {
          if (open) reload()
        }}
      >
        <SelectTrigger
          className="w-full max-w-full min-w-0"
          aria-label={`Modifications saved set for ${building}`}
        >
          <SelectValue placeholder="Select a saved set…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_TABLE_MOD_PRESET_VALUE}>
            Select a saved set…
          </SelectItem>
          {sortedSets.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  )
}

function PropertyRow({
  row,
  selected,
  onSelectedChange,
}: {
  row: PortfolioAssetRow
  selected: boolean
  onSelectedChange: (next: boolean) => void
}) {
  const router = useRouter()
  const href = assetHref(row.id)

  return (
    <div
      role="link"
      tabIndex={0}
      className={cn(
        "grid w-full cursor-pointer grid-cols-1 gap-2 px-4 py-4 text-left text-sm outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:items-center lg:gap-3 lg:py-3",
        ASSETS_TABLE_LG_GRID
      )}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          router.push(href)
        }
      }}
      aria-label={`Open ${row.building}, ${row.location}`}
    >
      <span
        className="flex items-center"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelectedChange(checked)}
          aria-label={`Select ${row.building}`}
        />
      </span>
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex flex-col gap-0.5">
          <span className="font-semibold leading-snug text-foreground">
            {row.building}
          </span>
          <span className="text-xs leading-snug text-muted-foreground">
            {row.location}
          </span>
        </div>
      </div>
      <span className="text-sm">{row.typeLabel}</span>
      <span className="text-sm tabular-nums lg:text-end">{row.rsf}</span>
      <span className="text-sm tabular-nums lg:text-end">{row.occPct}</span>
      <span className="text-sm tabular-nums lg:text-end">{row.pricePerSf}</span>
      <span className="text-sm tabular-nums lg:text-end">{row.noi}</span>
      <span className="text-sm tabular-nums lg:text-end">{row.value}</span>
      <span className="text-sm tabular-nums lg:text-end">{row.capRate}</span>
      <span className="text-sm tabular-nums lg:text-end">{row.wale}</span>
      <span className="text-sm tabular-nums lg:text-end">{row.debtYield}</span>
      <span className="flex lg:justify-end">
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
            liftPillClassFromStrength(normalizedLiftStrength(row.liftPercent))
          )}
        >
          {row.lift}
        </span>
      </span>
      <span className="block min-w-0">
        <AssetModificationSetSelect assetId={row.id} building={row.building} />
      </span>
    </div>
  )
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
    let rows =
      portfolioGroupFilter === ALL_PORTFOLIO_GROUPS_VALUE
        ? PORTFOLIO_ASSET_ROWS
        : PORTFOLIO_ASSET_ROWS.filter((r) => r.groupId === portfolioGroupFilter)

    const q = assetTableSearch.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => {
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

  const [selectedIds, setSelectedIds] = React.useState<Record<string, boolean>>(
    {}
  )

  React.useEffect(() => {
    const visible = new Set(visibleAssetRows.map((r) => r.id))
    setSelectedIds((s) => {
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

  const selectedCount = React.useMemo(
    () =>
      visibleAssetRows.reduce((n, r) => n + (selectedIds[r.id] ? 1 : 0), 0),
    [visibleAssetRows, selectedIds]
  )

  const allVisibleSelected =
    visibleAssetRows.length > 0 &&
    visibleAssetRows.every((r) => selectedIds[r.id])
  const someVisibleSelected = visibleAssetRows.some((r) => selectedIds[r.id])
  const headerIndeterminate =
    someVisibleSelected && !allVisibleSelected

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
          <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:w-auto sm:max-w-xl">
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
        <div className="overflow-x-auto rounded-xl border border-border">
          <div className="min-w-[1290px]">
            <div className="flex flex-col gap-2 border-b border-border bg-background px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <p className="text-sm text-muted-foreground">
                {visibleAssetRows.length}{" "}
                {visibleAssetRows.length === 1 ? "Asset" : "Assets"}
                {selectedCount > 0 ? (
                  <span className="text-foreground">
                    {" "}
                    · {selectedCount} selected
                  </span>
                ) : null}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-border text-muted-foreground hover:text-foreground"
                  disabled={selectedCount === 0}
                >
                  Add to Scenario
                </Button>
              </div>
            </div>
            <table className="hidden w-full caption-bottom text-sm max-lg:hidden lg:table">
              <TableHeader>
                <TableRow
                  className={cn(
                    "grid items-center gap-3 border-border bg-muted/50 px-4 hover:bg-muted/50",
                    ASSETS_TABLE_LG_GRID
                  )}
                >
                  <TableHead scope="col" className="h-auto w-11 px-0 py-3">
                    <Checkbox
                      checked={allVisibleSelected}
                      indeterminate={headerIndeterminate}
                      disabled={visibleAssetRows.length === 0}
                      onCheckedChange={(checked) => {
                        setSelectedIds((s) => {
                          const next = { ...s }
                          if (checked) {
                            for (const r of visibleAssetRows) {
                              next[r.id] = true
                            }
                          } else {
                            for (const r of visibleAssetRows) {
                              delete next[r.id]
                            }
                          }
                          return next
                        })
                      }}
                      aria-label="Select all assets in view"
                    />
                  </TableHead>
                  <TableHead scope="col" className="h-auto px-0 py-3 font-medium">
                    Asset
                  </TableHead>
                  <TableHead scope="col" className="h-auto px-0 py-3 font-medium">
                    Type
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="h-auto px-0 py-3 text-right font-medium"
                  >
                    RSF
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="h-auto px-0 py-3 text-right font-medium"
                  >
                    Occ%
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="h-auto px-0 py-3 text-right font-medium"
                  >
                    $/SF
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="h-auto px-0 py-3 text-right font-medium"
                  >
                    NOI
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="h-auto px-0 py-3 text-right font-medium"
                  >
                    Value
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="h-auto px-0 py-3 text-right font-medium"
                  >
                    Cap
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="h-auto px-0 py-3 text-right font-medium"
                  >
                    WALE
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="h-auto px-0 py-3 text-right font-medium"
                  >
                    Debt Yield
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="h-auto px-0 py-3 text-right font-medium"
                  >
                    <span className="inline-flex items-center justify-end gap-1 text-violet-700 dark:text-violet-300">
                      Potential Lift
                      <ArrowUpRight
                        className="size-3.5 text-violet-600 opacity-90 dark:text-violet-400"
                        aria-hidden
                      />
                    </span>
                  </TableHead>
                  <TableHead scope="col" className="h-auto px-0 py-3 font-medium">
                    Modifications
                  </TableHead>
                </TableRow>
              </TableHeader>
            </table>

            <ul className="divide-y divide-border">
            {visibleAssetRows.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                No assets in this view.
              </li>
            ) : (
              visibleAssetRows.map((row) => (
                <li key={row.id}>
                  <PropertyRow
                    row={row}
                    selected={Boolean(selectedIds[row.id])}
                    onSelectedChange={(next) => {
                      setSelectedIds((s) => {
                        const clone = { ...s }
                        if (next) clone[row.id] = true
                        else delete clone[row.id]
                        return clone
                      })
                    }}
                  />
                </li>
              ))
            )}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
