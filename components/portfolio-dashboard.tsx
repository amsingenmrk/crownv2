"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  parseStoredSets,
  storageKeyForAsset,
} from "@/components/building-modifications-sidebar"
import {
  MetricStripCell,
  MetricStripLabel,
  MetricStripSubRow,
  MetricStripSubStack,
  MetricStripValueRow,
  metricStripSectionClassName,
} from "@/components/metric-strip"
import {
  ScenarioMetricInlinePair,
} from "@/components/portfolio/scenario-comparative-kpis"
import { PortfolioAssetsDataTable } from "@/components/portfolio/portfolio-assets-data-table"
import { useScenarioModificationSelections } from "@/components/scenario-modification-selections-context"
import { PortfolioAssetsViewOptions } from "@/components/portfolio/portfolio-assets-view-options"
import {
  createPortfolioAssetColumns,
  type PortfolioAssetsTableVariant,
} from "@/components/portfolio/portfolio-assets-columns"
import {
  getAssetGroupOverridesSnapshot,
  parseAssetGroupOverrideSnapshot,
  subscribeAssetGroupOverrides,
} from "@/lib/asset-group-overrides"
import {
  ASSETS,
  PORTFOLIO_OVERVIEW_LABEL,
  assetHref,
  getAssetById,
  resolveAssetGroupLabel,
} from "@/lib/assets"
import {
  formatCapRatePts,
  formatPctChange,
  formatUsdDeltaCompact,
  formatUsdPortfolioCompact,
} from "@/lib/scenario-kpi-format"
import { portfolioKpiStripFromRows } from "@/lib/portfolio-kpi-aggregate"
import { computeScenarioPortfolioAggregate } from "@/lib/scenario-portfolio-aggregate"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import {
  getMarketListingPinById,
} from "@/lib/market-search-demo-listings"
import {
  portfolioAssetRowForMarketPin,
} from "@/lib/market-listing-portfolio-row"
import { portfolioAssetRowForAsset } from "@/lib/portfolio-row-for-asset"
import {
  mapPinClassFromStrength,
  normalizedLiftStrength,
} from "@/lib/portfolio-lift"
import {
  defaultPortfolioAssetsTableSorting,
  readPortfolioAssetsTableSorting,
  writePortfolioAssetsTableVisibleOrder,
  writePortfolioAssetsTableSorting,
} from "@/lib/portfolio-assets-table-sorting"
import { cn } from "@/lib/utils"
import type { PortfolioMapboxPin } from "@/components/portfolio-mapbox"
import { usePortfolioAssetCoordinates } from "@/hooks/use-portfolio-asset-coordinates"
import { lngLatForPortfolioAsset } from "@/lib/portfolio-asset-lng-lat"
import { spreadPortfolioMapPinsForDisplay } from "@/lib/portfolio-map-pin-spread"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

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

function scenarioDeltaDirection(d: number): "up" | "down" | "neutral" {
  if (d > 1e-6) return "up"
  if (d < -1e-6) return "down"
  return "neutral"
}

const ALL_PORTFOLIO_GROUPS_VALUE = "all"
const ALL_PORTFOLIO_GROUPS_LABEL = "Entire Portfolio"

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

function portfolioRowMatchesAssetTableSearch(
  row: PortfolioAssetRow,
  q: string
): boolean {
  if (!q) return true
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
    row.status,
    row.lift,
  ]
    .join(" ")
    .toLowerCase()
    .includes(q)
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

const PortfolioMapbox = dynamic(
  () =>
    import("@/lib/configure-mapbox-gl-worker").then(() =>
      import("@/components/portfolio-mapbox").then((m) => m.PortfolioMapbox)
    ),
  { ssr: false }
)

function PortfolioDashboardInner({
  assetsTableVariant,
  scenarioRelaxedAssetFilter = true,
  portfolioScopeId,
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
  portfolioScopeId?: string
}) {
  const pathname = usePathname()
  const assetsHeadingId = React.useId()
  const [assetsMainView, setAssetsMainView] = React.useState<"table" | "map">(
    "table"
  )
  const [assetTableSearch, setAssetTableSearch] = React.useState("")
  /** Portfolio: driven by route (`/portfolio` vs `/portfolio/scopes/...`). Scenarios: always entire portfolio. */
  const effectivePortfolioGroupFilter =
    assetsTableVariant === "portfolio" && portfolioScopeId != null
      ? portfolioScopeId
      : ALL_PORTFOLIO_GROUPS_VALUE

  const assetGroupOverrideSnap = React.useSyncExternalStore(
    subscribeAssetGroupOverrides,
    getAssetGroupOverridesSnapshot,
    () => ""
  )
  const assetGroupData = React.useMemo(
    () => parseAssetGroupOverrideSnapshot(assetGroupOverrideSnap),
    [assetGroupOverrideSnap]
  )

  const portfolioAssetRows = React.useMemo(() => {
    return ASSETS.map((asset, index) =>
      portfolioAssetRowForAsset(
        getAssetById(asset.id, assetGroupData) ?? asset,
        index
      )
    ).sort(
      (a, b) =>
        b.liftPercent - a.liftPercent ||
        a.building.localeCompare(b.building, undefined, { sensitivity: "base" })
    )
  }, [assetGroupData])

  const effectivePortfolioGroupLabel =
    effectivePortfolioGroupFilter === ALL_PORTFOLIO_GROUPS_VALUE
      ? assetsTableVariant === "portfolio"
        ? PORTFOLIO_OVERVIEW_LABEL
        : ALL_PORTFOLIO_GROUPS_LABEL
      : resolveAssetGroupLabel(
          effectivePortfolioGroupFilter,
          assetGroupData.customGroups
        )

  const assetsTableHeading =
    assetsTableVariant === "portfolio" ||
    (assetsTableVariant === "scenarios" &&
      effectivePortfolioGroupFilter === ALL_PORTFOLIO_GROUPS_VALUE)
      ? "Assets"
      : effectivePortfolioGroupLabel

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
      for (const row of portfolioAssetRows) {
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
  }, [
    assetsTableVariant,
    scenarioMembershipMode,
    scenarioRelaxedAssetFilter,
    portfolioAssetRows,
  ])

  const visibleAssetRows = React.useMemo(() => {
    const baseRows =
      effectivePortfolioGroupFilter === ALL_PORTFOLIO_GROUPS_VALUE
        ? portfolioAssetRows
        : portfolioAssetRows.filter(
            (r) => r.groupId === effectivePortfolioGroupFilter
          )

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
              row.status,
              row.lift,
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
    } else if (
      assetsTableVariant === "scenarios" &&
      scenarioMembershipMode === "builtin"
    ) {
      rows = rows.filter((r) => {
        const eligibleOk =
          scenarioEligibleAssetIds == null ||
          scenarioEligibleAssetIds.has(r.id)
        const overlayOk = scenarioIncludedAssetIds.has(r.id)
        if (!eligibleOk && !overlayOk) return false
        if (scenarioExcludedAssetIds.has(r.id)) return false
        return true
      })
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

    if (assetsTableVariant === "scenarios") {
      const existing = new Set(rows.map((r) => r.id))
      const extras: PortfolioAssetRow[] = []

      const tryAppendMarketRow = (id: string, passesScenarioFilter: boolean) => {
        if (!passesScenarioFilter) return
        if (existing.has(id)) return
        const pin = getMarketListingPinById(id)
        if (!pin) return
        const r = portfolioAssetRowForMarketPin(pin)
        if (
          effectivePortfolioGroupFilter !== ALL_PORTFOLIO_GROUPS_VALUE &&
          r.groupId !== effectivePortfolioGroupFilter
        ) {
          return
        }
        if (!portfolioRowMatchesAssetTableSearch(r, q)) return
        extras.push(r)
        existing.add(id)
      }

      if (scenarioMembershipMode === "explicit-inclusion") {
        for (const id of scenarioIncludedAssetIds) {
          tryAppendMarketRow(id, true)
        }
      } else if (scenarioMembershipMode === "builtin") {
        for (const id of scenarioIncludedAssetIds) {
          const eligibleOk =
            scenarioEligibleAssetIds == null ||
            scenarioEligibleAssetIds.has(id)
          const overlayOk = scenarioIncludedAssetIds.has(id)
          const passes =
            (eligibleOk || overlayOk) && !scenarioExcludedAssetIds.has(id)
          tryAppendMarketRow(id, passes)
        }
      }

      if (extras.length > 0) {
        extras.sort((a, b) =>
          a.building.localeCompare(b.building, undefined, {
            sensitivity: "base",
          })
        )
        rows = [...rows, ...extras]
      }
    }

    return rows
  }, [
    assetTableSearch,
    effectivePortfolioGroupFilter,
    portfolioAssetRows,
    assetsTableVariant,
    scenarioEligibleAssetIds,
    scenarioExcludedAssetIds,
    scenarioIncludedAssetIds,
    scenarioMembershipMode,
  ])

  const liftPctExtent = React.useMemo(() => {
    const ps = visibleAssetRows.map((r) => r.liftPercent)
    if (ps.length === 0) return { min: 0, max: 100 }
    return { min: Math.min(...ps), max: Math.max(...ps) }
  }, [visibleAssetRows])

  const liftStrengthForRow = React.useCallback(
    (liftPercent: number) =>
      normalizedLiftStrength(
        liftPercent,
        liftPctExtent.min,
        liftPctExtent.max
      ),
    [liftPctExtent]
  )

  const portfolioKpiStrip = React.useMemo(() => {
    if (assetsTableVariant !== "portfolio") return null
    return portfolioKpiStripFromRows(visibleAssetRows)
  }, [assetsTableVariant, visibleAssetRows])

  const visibleMapPins = React.useMemo(
    () => mapPinsForRows(visibleAssetRows),
    [visibleAssetRows]
  )

  const { mapboxEnabled, coordinates: mapGeocodeCoordinates } =
    usePortfolioAssetCoordinates()

  const portfolioMapboxPins = React.useMemo((): PortfolioMapboxPin[] => {
    const raw = visibleAssetRows.map((row) => {
      const marketPin = getMarketListingPinById(row.id)
      if (marketPin) {
        return {
          id: row.id,
          longitude: marketPin.longitude,
          latitude: marketPin.latitude,
          building: row.building,
          lift: row.lift,
          liftPercent: row.liftPercent,
          liftStrength: liftStrengthForRow(row.liftPercent),
          listingScope: "market" as const,
          imageUrl: marketPin.imageUrl,
          location: row.location,
          value: row.value,
          occPct: row.occPct,
          noi: row.noi,
          capRate: row.capRate,
          wale: row.wale,
        }
      }
      const [longitude, latitude] = lngLatForPortfolioAsset(
        row.id,
        row.groupId,
        mapGeocodeCoordinates
      )
      const asset = getAssetById(row.id)
      return {
        id: row.id,
        longitude,
        latitude,
        building: row.building,
        lift: row.lift,
        liftPercent: row.liftPercent,
        liftStrength: liftStrengthForRow(row.liftPercent),
        assetDetailHref: assetHref(row.id),
        imageUrl: asset?.imageUrl,
        location: row.location,
        value: row.value,
        occPct: row.occPct,
        noi: row.noi,
        capRate: row.capRate,
        wale: row.wale,
      }
    })
    return spreadPortfolioMapPinsForDisplay(raw)
  }, [visibleAssetRows, mapGeocodeCoordinates, liftStrengthForRow])

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const showScopeColumn =
    assetsTableVariant === "portfolio" && portfolioScopeId == null

  const portfolioColumns = React.useMemo(
    () =>
      createPortfolioAssetColumns(assetsTableVariant, liftPctExtent, {
        showScopeColumn,
        customGroups: assetGroupData.customGroups,
      }),
    [
      assetGroupData.customGroups,
      assetsTableVariant,
      liftPctExtent,
      showScopeColumn,
    ]
  )

  const [sorting, setSorting] = React.useState<SortingState>(() =>
    defaultPortfolioAssetsTableSorting(assetsTableVariant)
  )
  const skipNextSortingPersistenceRef = React.useRef(true)
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})

  React.useEffect(() => {
    // Restore browser-persisted sorting only after hydration so the first
    // client render matches the server HTML and avoids row-order mismatches.
    skipNextSortingPersistenceRef.current = true
    setSorting(readPortfolioAssetsTableSorting(pathname, assetsTableVariant))
  }, [assetsTableVariant, pathname])

  React.useEffect(() => {
    if (skipNextSortingPersistenceRef.current) {
      skipNextSortingPersistenceRef.current = false
      return
    }
    writePortfolioAssetsTableSorting(pathname, sorting)
  }, [assetsTableVariant, pathname, sorting])

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

  const visibleRowOrder = React.useMemo(
    () => portfolioTable.getRowModel().rows.map((row) => row.original.id),
    [portfolioTable, sorting, visibleAssetRows]
  )

  React.useEffect(() => {
    writePortfolioAssetsTableVisibleOrder(pathname, visibleRowOrder)
  }, [pathname, visibleRowOrder])

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

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-[24px]">
      {/* KPI row — same strip pattern as asset stat cards */}
      <section
        className={cn(
          metricStripSectionClassName,
          "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
          /* Don’t let flex-1 parents shrink this row; overflow-hidden would clip metrics. */
          "h-fit shrink-0"
        )}
      >
        {assetsTableVariant === "scenarios" && scenarioAggregate != null ? (
          <>
            <MetricStripCell>
              <MetricStripLabel>Est. Value</MetricStripLabel>
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
            </MetricStripCell>
            <MetricStripCell>
              <MetricStripLabel>{KPIS[2]!.label}</MetricStripLabel>
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
            </MetricStripCell>
            <MetricStripCell>
              <MetricStripLabel>{KPIS[3]!.label}</MetricStripLabel>
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
            </MetricStripCell>
            <MetricStripCell>
              <MetricStripLabel>{KPIS[4]!.label}</MetricStripLabel>
              <MetricStripValueRow>
                <span className="text-foreground">{KPIS[4]!.value}</span>
              </MetricStripValueRow>
            </MetricStripCell>
          </>
        ) : portfolioKpiStrip != null ? (
          portfolioKpiStrip.map((kpi) => (
            <MetricStripCell key={kpi.label}>
              <MetricStripLabel>{kpi.label}</MetricStripLabel>
              <MetricStripValueRow>
                <span className="text-foreground">{kpi.value}</span>
              </MetricStripValueRow>
              {kpi.subLabel != null && kpi.subValue != null ? (
                <MetricStripSubStack>
                  <MetricStripSubRow
                    label={kpi.subLabel}
                    value={kpi.subValue}
                  />
                </MetricStripSubStack>
              ) : null}
            </MetricStripCell>
          ))
        ) : (
          KPIS.map((kpi) => (
            <MetricStripCell key={kpi.label}>
              <MetricStripLabel>{kpi.label}</MetricStripLabel>
              <MetricStripValueRow>
                <span className="text-foreground">{kpi.value}</span>
              </MetricStripValueRow>
              {kpi.subLabel != null && kpi.subValue != null ? (
                <MetricStripSubStack>
                  <MetricStripSubRow
                    label={kpi.subLabel}
                    value={kpi.subValue}
                  />
                </MetricStripSubStack>
              ) : null}
            </MetricStripCell>
          ))
        )}
      </section>

      {/* Same assets as sidebar (Office / Industrial / Retail order) */}
      <section
        className={cn(
          "flex min-w-0 flex-col gap-3",
          assetsMainView === "map" && "min-h-0 flex-1"
        )}
        aria-labelledby={assetsHeadingId}
      >
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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
                effectivePortfolioGroupFilter === ALL_PORTFOLIO_GROUPS_VALUE
                  ? `${visibleAssetRows.length} assets in list`
                  : `${visibleAssetRows.length} assets in ${effectivePortfolioGroupLabel}`
              }
            >
              {visibleAssetRows.length}
            </span>
            <ToggleGroup
              value={[assetsMainView]}
              onValueChange={(v) => {
                const next = v[0]
                if (next === "table" || next === "map") {
                  setAssetsMainView(next)
                }
              }}
              aria-label="Switch between table and map"
              className="ml-auto sm:ml-2"
            >
              <ToggleGroupItem value="table">Table</ToggleGroupItem>
              <ToggleGroupItem value="map">Map</ToggleGroupItem>
            </ToggleGroup>
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
            <PortfolioAssetsViewOptions
              table={portfolioTable}
              className="hidden lg:flex"
            />
            <Button className="shrink-0" render={<Link href="/search" />}>
              Add asset
            </Button>
          </div>
        </div>
        <div
          id="portfolio-assets-main-panel"
          className={cn(
            "min-h-0 min-w-0 w-full max-w-full",
            assetsMainView === "map" &&
              "flex min-h-0 flex-1 flex-col overflow-hidden"
          )}
        >
          {assetsMainView === "map" ? (
            <div
              id="portfolio-map-canvas"
              className={cn(
                "relative flex w-full shrink-0 flex-col rounded-xl border border-border bg-muted/60",
                /* Map only: fill viewport below chrome; no dvh cap so the GL canvas matches this box. */
                "h-[calc(100svh-22rem)] min-h-[16rem]",
                "mb-4 md:mb-6"
              )}
            >
              {/* Clip corners here; avoid isolate+overflow on the same box as the GL canvas. */}
              <div className="absolute inset-0 min-h-0 min-w-0 overflow-hidden rounded-[inherit]">
              {mapboxEnabled ? (
                <PortfolioMapbox pins={portfolioMapboxPins} />
              ) : (
                <>
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
                        mapPinClassFromStrength(
                          liftStrengthForRow(pin.liftPercent)
                        )
                      )}
                      style={{ top: pin.top, left: pin.left }}
                      title={`${pin.building} · Potential ${pin.lift}`}
                    />
                  ))}
                </>
              )}
              </div>
            </div>
          ) : (
            <div className="min-w-0 w-full max-w-full overflow-hidden rounded-xl border border-border bg-card p-0 shadow-sm">
              <PortfolioAssetsDataTable
                table={portfolioTable}
                variant={assetsTableVariant}
                liftExtent={liftPctExtent}
                showScopeColumn={showScopeColumn}
                customGroups={assetGroupData.customGroups}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export function PortfolioDashboard({
  assetsTableVariant,
  scenarioRelaxedAssetFilter,
  portfolioScopeId,
}: {
  assetsTableVariant: PortfolioAssetsTableVariant
  scenarioRelaxedAssetFilter?: boolean
  portfolioScopeId?: string
}) {
  return (
    <PortfolioDashboardInner
      assetsTableVariant={assetsTableVariant}
      scenarioRelaxedAssetFilter={scenarioRelaxedAssetFilter}
      portfolioScopeId={portfolioScopeId}
    />
  )
}
