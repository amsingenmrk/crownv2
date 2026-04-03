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
import {
  parseStoredSets,
  storageKeyForAsset,
} from "@/components/building-modifications-sidebar"
import { ScenarioMetricInlinePair } from "@/components/portfolio/scenario-comparative-kpis"
import { PortfolioAssetsDataTable } from "@/components/portfolio/portfolio-assets-data-table"
import {
  ScenarioModificationSelectionsProvider,
  useScenarioModificationSelections,
} from "@/components/scenario-modification-selections-context"
import { PortfolioAssetsViewOptions } from "@/components/portfolio/portfolio-assets-view-options"
import {
  createPortfolioAssetColumns,
  type PortfolioAssetsTableVariant,
} from "@/components/portfolio/portfolio-assets-columns"
import {
  ASSETS,
  ASSET_GROUP_SIDEBAR_LABELS,
  type Asset,
  type AssetGroupId,
} from "@/lib/assets"
import {
  formatCapRatePts,
  formatPctChange,
  formatUsdDeltaCompact,
  formatUsdPerSf,
  formatUsdPortfolioCompact,
} from "@/lib/scenario-kpi-format"
import { computeScenarioPortfolioAggregate } from "@/lib/scenario-portfolio-aggregate"
import {
  portfolioValueNoiCapFromSeed,
  seedForAsset,
} from "@/lib/portfolio-asset-financials"
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
  const fin = portfolioValueNoiCapFromSeed(seed)
  const liftPct = 3 + (seed % 15)

  const typeLabel =
    asset.groupId === "office"
      ? "Office"
      : asset.groupId === "industrial"
        ? "Industrial"
        : "Retail"

  const value =
    fin.valueMills >= 1000
      ? `$${(fin.valueMills / 1000).toFixed(1)}B`
      : `$${fin.valueMills.toFixed(1)}M`

  const noi =
    fin.noiTenthM < 0.15 ? "$0.0" : `$${fin.noiTenthM.toFixed(1)}M`

  return {
    id: asset.id,
    groupId: asset.groupId,
    building: asset.name,
    location: asset.address,
    ownership: "Owned",
    typeLabel,
    rsf: formatRsfShort(fin.rsfSqft),
    occPct: `${asset.occupiedPercent}%`,
    pricePerSf: `$${fin.pricePerSfN}`,
    noi,
    value,
    capRate: `${fin.capRatePct.toFixed(1)}%`,
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

function scenarioDeltaDirection(d: number): "up" | "down" | "neutral" {
  if (d > 1e-6) return "up"
  if (d < -1e-6) return "down"
  return "neutral"
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
function assetHasSavedModificationSets(assetId: string): boolean {
  const sets = parseStoredSets(
    localStorage.getItem(storageKeyForAsset(assetId))
  )
  return sets.length >= 1
}

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

function PortfolioDashboardInner({
  assetsTableVariant,
  scenarioRelaxedAssetFilter = true,
}: {
  assetsTableVariant: PortfolioAssetsTableVariant
  /**
   * Built-in scenario (`/scenarios/2026-capital-planning`) only: when `true` and no
   * asset has saved modification sets, the table skips the “has mod sets” filter and
   * shows the full list (legacy empty-storage behavior). Pass `false` on the built-in
   * route so the table always lists only assets with ≥1 saved set. User scenarios use
   * an explicit inclusion list instead of this flag.
   */
  scenarioRelaxedAssetFilter?: boolean
}) {
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

  /**
   * Built-in scenario only: `Set` of asset ids with ≥1 saved modification set.
   * `null` = skip that filter when `scenarioRelaxedAssetFilter` is true and no saved
   * sets exist. User scenarios use `scenarioIncludedAssetIds` from context instead.
   */
  const [scenarioEligibleAssetIds, setScenarioEligibleAssetIds] =
    React.useState<Set<string> | null>(null)

  const {
    selections,
    scenarioExcludedAssetIds,
    scenarioIncludedAssetIds,
    scenarioMembershipMode,
  } = useScenarioModificationSelections()

  React.useLayoutEffect(() => {
    if (assetsTableVariant !== "scenarios") {
      setScenarioEligibleAssetIds(null)
      return
    }
    if (scenarioMembershipMode === "explicit-inclusion") {
      setScenarioEligibleAssetIds(null)
      return
    }

    function computeEligibleIds(): Set<string> {
      const ids = new Set<string>()
      for (const row of PORTFOLIO_ASSET_ROWS) {
        if (assetHasSavedModificationSets(row.id)) ids.add(row.id)
      }
      return ids
    }

    function applyEligibleFromStorage() {
      const ids = computeEligibleIds()
      const relax =
        scenarioRelaxedAssetFilter !== false && ids.size === 0
      setScenarioEligibleAssetIds(relax ? null : ids)
    }

    applyEligibleFromStorage()

    const refresh = () => applyEligibleFromStorage()

    const onStorage = (e: StorageEvent) => {
      if (
        e.key != null &&
        e.key.startsWith("glassbox:modification-sets:")
      ) {
        refresh()
      }
    }
    window.addEventListener("storage", onStorage)
    window.addEventListener("glassbox:modification-sets-changed", refresh)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("glassbox:modification-sets-changed", refresh)
    }
  }, [assetsTableVariant, scenarioMembershipMode, scenarioRelaxedAssetFilter])

  const visibleAssetRows = React.useMemo(() => {
    const baseRows =
      portfolioGroupFilter === ALL_PORTFOLIO_GROUPS_VALUE
        ? PORTFOLIO_ASSET_ROWS
        : PORTFOLIO_ASSET_ROWS.filter((r) => r.groupId === portfolioGroupFilter)

    const q = assetTableSearch.trim().toLowerCase()
    let rows =
      !q
        ? baseRows
        : baseRows.filter((row) => {
            return [
              row.building,
              row.location,
              row.ownership,
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

    if (
      assetsTableVariant === "scenarios" &&
      scenarioMembershipMode === "explicit-inclusion"
    ) {
      rows = rows.filter((r) => scenarioIncludedAssetIds.has(r.id))
    } else {
      if (assetsTableVariant === "scenarios" && scenarioEligibleAssetIds != null) {
        rows = rows.filter((r) => scenarioEligibleAssetIds.has(r.id))
      }

      if (
        assetsTableVariant === "scenarios" &&
        scenarioExcludedAssetIds.size > 0
      ) {
        rows = rows.filter((r) => !scenarioExcludedAssetIds.has(r.id))
      }
    }

    return rows
  }, [
    assetTableSearch,
    portfolioGroupFilter,
    assetsTableVariant,
    scenarioEligibleAssetIds,
    scenarioExcludedAssetIds,
    scenarioIncludedAssetIds,
    scenarioMembershipMode,
  ])

  const visibleMapPins = React.useMemo(
    () => mapPinsForRows(visibleAssetRows),
    [visibleAssetRows]
  )

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const portfolioColumns = React.useMemo(
    () => createPortfolioAssetColumns(assetsTableVariant, LIFT_PCT_EXTENT),
    [assetsTableVariant]
  )

  const [sorting, setSorting] = React.useState<SortingState>(() =>
    assetsTableVariant === "portfolio"
      ? [{ id: "lift", desc: true }]
      : [{ id: "building", desc: false }]
  )
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

  const [scenarioModSetsTick, setScenarioModSetsTick] = React.useState(0)

  React.useEffect(() => {
    const bump = () => setScenarioModSetsTick((n) => n + 1)
    window.addEventListener("glassbox:modification-sets-changed", bump)
    return () =>
      window.removeEventListener("glassbox:modification-sets-changed", bump)
  }, [])

  const scenarioAggregate = React.useMemo(() => {
    if (assetsTableVariant !== "scenarios") return null
    void scenarioModSetsTick
    return computeScenarioPortfolioAggregate(
      visibleAssetRows,
      selections,
      typeof window !== "undefined"
    )
  }, [
    assetsTableVariant,
    visibleAssetRows,
    selections,
    scenarioModSetsTick,
  ])

  const kpiCardClass =
    "rounded-xl border border-border bg-card px-5 py-4 shadow-sm"

  return (
    <div className="relative flex flex-1 flex-col gap-8">
      {/* KPI row */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {assetsTableVariant === "scenarios" && scenarioAggregate != null ? (
          <>
            <div className={kpiCardClass}>
              <p className="text-sm text-muted-foreground">Est. Value</p>
              <ScenarioMetricInlinePair
                baseFormatted={formatUsdPortfolioCompact(
                  scenarioAggregate.baseValueUsd
                )}
                scenarioFormatted={formatUsdPortfolioCompact(
                  scenarioAggregate.scenarioValueUsd
                )}
                showScenario={scenarioAggregate.hasTableSelection}
                deltaLine={
                  scenarioAggregate.hasTableSelection
                    ? `${formatUsdDeltaCompact(
                        scenarioAggregate.scenarioValueUsd -
                          scenarioAggregate.baseValueUsd
                      )}`
                    : undefined
                }
                pctLine={
                  scenarioAggregate.hasTableSelection
                    ? formatPctChange(
                        scenarioAggregate.baseValueUsd,
                        scenarioAggregate.scenarioValueUsd
                      )
                    : undefined
                }
                deltaDirection={
                  scenarioAggregate.hasTableSelection
                    ? scenarioDeltaDirection(
                        scenarioAggregate.scenarioValueUsd -
                          scenarioAggregate.baseValueUsd
                      )
                    : undefined
                }
              />
              {scenarioAggregate.totalRsfSqft > 0 ? (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Est. Value / SF
                    </p>
                    <p className="text-sm font-medium tabular-nums text-foreground">
                      {formatUsdPerSf(
                        scenarioAggregate.baseValueUsd,
                        scenarioAggregate.totalRsfSqft
                      )}
                    </p>
                  </div>
                  {scenarioAggregate.hasTableSelection ? (
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-xs font-medium text-violet-700 dark:text-violet-300">
                        Scenario est. value / SF
                      </p>
                      <p className="text-sm font-semibold tabular-nums text-violet-700 dark:text-violet-300">
                        {formatUsdPerSf(
                          scenarioAggregate.scenarioValueUsd,
                          scenarioAggregate.totalRsfSqft
                        )}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className={kpiCardClass}>
              <p className="text-sm text-muted-foreground">
                {KPIS[1]!.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {KPIS[1]!.value}
              </p>
              {KPIS[1]!.subLabel != null && KPIS[1]!.subValue != null ? (
                <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">
                    {KPIS[1]!.subLabel}
                  </p>
                  <p className="text-sm font-medium tabular-nums text-foreground">
                    {KPIS[1]!.subValue}
                  </p>
                </div>
              ) : null}
            </div>
            <div className={kpiCardClass}>
              <p className="text-sm text-muted-foreground">{KPIS[2]!.label}</p>
              <ScenarioMetricInlinePair
                baseFormatted={formatUsdPortfolioCompact(
                  scenarioAggregate.baseNoiUsd
                )}
                scenarioFormatted={formatUsdPortfolioCompact(
                  scenarioAggregate.scenarioNoiUsd
                )}
                showScenario={scenarioAggregate.hasTableSelection}
                deltaLine={
                  scenarioAggregate.hasTableSelection
                    ? `${formatUsdDeltaCompact(
                        scenarioAggregate.scenarioNoiUsd -
                          scenarioAggregate.baseNoiUsd
                      )}`
                    : undefined
                }
                pctLine={
                  scenarioAggregate.hasTableSelection
                    ? formatPctChange(
                        scenarioAggregate.baseNoiUsd,
                        scenarioAggregate.scenarioNoiUsd
                      )
                    : undefined
                }
                deltaDirection={
                  scenarioAggregate.hasTableSelection
                    ? scenarioDeltaDirection(
                        scenarioAggregate.scenarioNoiUsd -
                          scenarioAggregate.baseNoiUsd
                      )
                    : undefined
                }
              />
              {scenarioAggregate.totalRsfSqft > 0 ? (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xs text-muted-foreground">NOI / SF</p>
                    <p className="text-sm font-medium tabular-nums text-foreground">
                      {formatUsdPerSf(
                        scenarioAggregate.baseNoiUsd,
                        scenarioAggregate.totalRsfSqft
                      )}
                    </p>
                  </div>
                  {scenarioAggregate.hasTableSelection ? (
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-xs font-medium text-violet-700 dark:text-violet-300">
                        Scenario NOI / SF
                      </p>
                      <p className="text-sm font-semibold tabular-nums text-violet-700 dark:text-violet-300">
                        {formatUsdPerSf(
                          scenarioAggregate.scenarioNoiUsd,
                          scenarioAggregate.totalRsfSqft
                        )}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className={kpiCardClass}>
              <p className="text-sm text-muted-foreground">{KPIS[3]!.label}</p>
              <ScenarioMetricInlinePair
                baseFormatted={`${scenarioAggregate.baseCapPct.toFixed(2)}%`}
                scenarioFormatted={`${scenarioAggregate.scenarioCapPct.toFixed(2)}%`}
                showScenario={scenarioAggregate.hasTableSelection}
                deltaLine={
                  scenarioAggregate.hasTableSelection
                    ? `${formatCapRatePts(
                        scenarioAggregate.scenarioCapPct -
                          scenarioAggregate.baseCapPct
                      )}`
                    : undefined
                }
                pctLine={
                  scenarioAggregate.hasTableSelection
                    ? formatPctChange(
                        scenarioAggregate.baseCapPct,
                        scenarioAggregate.scenarioCapPct
                      )
                    : undefined
                }
                deltaDirection={
                  scenarioAggregate.hasTableSelection
                    ? scenarioDeltaDirection(
                        scenarioAggregate.scenarioCapPct -
                          scenarioAggregate.baseCapPct
                      )
                    : undefined
                }
              />
            </div>
            <div className={kpiCardClass}>
              <p className="text-sm text-muted-foreground">
                {KPIS[4]!.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {KPIS[4]!.value}
              </p>
            </div>
          </>
        ) : (
          KPIS.map((kpi) => (
            <div key={kpi.label} className={kpiCardClass}>
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
          ))
        )}
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
          <div
            className="absolute inset-0 w-full bg-gradient-to-br from-muted/20 to-transparent"
            aria-hidden
          />
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
              variant={assetsTableVariant}
              liftExtent={LIFT_PCT_EXTENT}
            />
          </div>
        </div>
      </section>
    </div>
  )
}

export function PortfolioDashboard({
  assetsTableVariant,
  scenarioRelaxedAssetFilter,
}: {
  assetsTableVariant: PortfolioAssetsTableVariant
  scenarioRelaxedAssetFilter?: boolean
}) {
  return (
    <ScenarioModificationSelectionsProvider>
      <PortfolioDashboardInner
        assetsTableVariant={assetsTableVariant}
        scenarioRelaxedAssetFilter={scenarioRelaxedAssetFilter}
      />
    </ScenarioModificationSelectionsProvider>
  )
}
