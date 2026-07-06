"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { useInitialAssetGroupOverrideSnapshot } from "@/components/app-shell-environment"
import {
  parseStoredSets,
  storageKeyForAsset,
} from "@/lib/building-modification-sets-storage"
import { PortfolioAssetsDataTable } from "@/components/portfolio/portfolio-assets-data-table"
import { useScenarioModificationSelections } from "@/components/scenario-modification-selections-context"
import { ValuationKpiMetricStrip } from "@/components/valuation-kpi-metric-strip"
import { PortfolioAssetsViewOptions } from "@/components/portfolio/portfolio-assets-view-options"
import {
  createPortfolioAssetColumns,
  type PortfolioAssetsTableVariant,
} from "@/components/portfolio/portfolio-assets-columns"
import {
  getAssetGroupOverridesSnapshot,
  parseAssetGroupOverrideSnapshot,
  resolveAssetGroupIds,
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
  ensureCompetitiveMembershipSeeded,
  getCompetitiveGroupSnapshot,
  parseCompetitiveGroupSnapshot,
  resolveCompetitiveGroupIdsForAsset,
  subscribeCompetitiveGroups,
} from "@/lib/competitive-group-overrides"
import {
  aggregatePortfolioValuationByCondition,
} from "@/lib/portfolio-kpi-aggregate"
import {
  computeScenarioPortfolioMetricsByConditionPair,
} from "@/lib/scenario-portfolio-aggregate"
import {
  emptyValuationConditionMetricMap,
  valuationKpiStripRowsFromScenarioConditionPair,
  valuationKpiStripRowsFromSingleConditionMap,
} from "@/lib/valuation-kpi-strip-rows"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import { otherRealAssetPortfolioRows } from "@/lib/other-assets"
import { getMarketListingPinById } from "@/lib/market-search-demo-listings"
import { getOtherRealAssetById } from "@/lib/real-properties/other-assets"
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
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const ALL_PORTFOLIO_GROUPS_VALUE = "all"
const ALL_PORTFOLIO_GROUPS_LABEL = "All portfolio groups"
const OTHER_ASSETS_OVERVIEW_LABEL = "Other Assets"
const ALL_COMPETITIVE_GROUPS_VALUE = "all"

function measurePortfolioDashboardStep<T>(label: string, compute: () => T): T {
  if (
    typeof window === "undefined" ||
    typeof performance === "undefined" ||
    process.env.NODE_ENV === "production"
  ) {
    return compute()
  }

  const startedAt = performance.now()
  const result = compute()
  const elapsedMs = performance.now() - startedAt
  console.info(`[portfolio-perf] ${label}: ${elapsedMs.toFixed(1)}ms`)
  return result
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
  competitiveGroupId,
  pathnameOverride,
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
  competitiveGroupId?: string
  pathnameOverride?: string
}) {
  const livePathname = usePathname()
  const pathname = pathnameOverride ?? livePathname
  const assetsHeadingId = React.useId()
  const initialAssetGroupOverrideSnapshot = useInitialAssetGroupOverrideSnapshot()
  const [assetsMainView, setAssetsMainView] = React.useState<"table" | "map">(
    "table"
  )
  const [assetTableSearch, setAssetTableSearch] = React.useState("")
  /** Portfolio: driven by route (`/portfolio` vs `/portfolio/scopes/...`). */
  const effectivePortfolioGroupFilter =
    assetsTableVariant === "portfolio" && portfolioScopeId != null
      ? portfolioScopeId
      : ALL_PORTFOLIO_GROUPS_VALUE
  const effectiveCompetitiveGroupFilter =
    assetsTableVariant === "other-assets" && competitiveGroupId != null
      ? competitiveGroupId
      : ALL_COMPETITIVE_GROUPS_VALUE

  const assetGroupOverrideSnap = React.useSyncExternalStore(
    subscribeAssetGroupOverrides,
    getAssetGroupOverridesSnapshot,
    () => initialAssetGroupOverrideSnapshot
  )
  const assetGroupData = React.useMemo(
    () => parseAssetGroupOverrideSnapshot(assetGroupOverrideSnap),
    [assetGroupOverrideSnap]
  )
  const competitiveGroupSnap = React.useSyncExternalStore(
    subscribeCompetitiveGroups,
    getCompetitiveGroupSnapshot,
    () => ""
  )
  const competitiveGroupData = React.useMemo(
    () => parseCompetitiveGroupSnapshot(competitiveGroupSnap),
    [competitiveGroupSnap]
  )

  React.useEffect(() => {
    if (assetsTableVariant === "other-assets") {
      ensureCompetitiveMembershipSeeded()
    }
  }, [assetsTableVariant])

  const portfolioAssetRows = React.useMemo(() => {
    const ownedRows = ASSETS.filter(
      (asset) => !assetGroupData.standalonePropertyNavIds.has(asset.id)
    )
      .map((asset, index) =>
        portfolioAssetRowForAsset(
          getAssetById(asset.id, assetGroupData) ?? asset,
          index
        )
      )
    const promotedRows = [...assetGroupData.promotedProspectiveAssetIds].flatMap(
      (assetId) => {
        const pin = getMarketListingPinById(assetId)
        if (pin == null) return []
        const baseRow = portfolioAssetRowForMarketPin(pin)
        const groupIds = resolveAssetGroupIds(
          assetId,
          baseRow.groupId,
          assetGroupData.overrides
        )
        return [{ ...baseRow, groupId: groupIds[0] ?? baseRow.groupId, groupIds }]
      }
    )
    return [...ownedRows, ...promotedRows]
      .sort(
      (a, b) =>
        b.liftPercent - a.liftPercent ||
        a.building.localeCompare(b.building, undefined, { sensitivity: "base" })
      )
  }, [assetGroupData])

  const competitiveGroupLabels = React.useMemo(() => {
    return competitiveGroupData.groupLabels
  }, [competitiveGroupData.groupLabels])

  const otherAssetRows = React.useMemo(() => {
    if (assetsTableVariant !== "other-assets") return []
    const movedPortfolioRows = ASSETS.filter((asset) =>
      assetGroupData.standalonePropertyNavIds.has(asset.id)
    ).map((asset, index) => {
      const baseRow = portfolioAssetRowForAsset(
        getAssetById(asset.id, assetGroupData) ?? asset,
        index
      )
      const groupIds = resolveCompetitiveGroupIdsForAsset(
        asset.id,
        competitiveGroupData.membershipOverrides,
        {
          customGroups: competitiveGroupData.customGroups,
          removedAssetIds: competitiveGroupData.removedAssetIds,
          removedSeededGroupIds: competitiveGroupData.removedSeededGroupIds,
        }
      )
      return {
        ...baseRow,
        groupId: groupIds[0] ?? baseRow.groupId,
        groupIds,
      }
    })
    const otherRealRows = otherRealAssetPortfolioRows(competitiveGroupData)
    return [...movedPortfolioRows, ...otherRealRows]
      .sort(
        (a, b) =>
          b.liftPercent - a.liftPercent ||
          a.building.localeCompare(b.building, undefined, { sensitivity: "base" })
      )
  }, [
    assetsTableVariant,
    assetGroupData,
    competitiveGroupData.customGroups,
    competitiveGroupData.membershipOverrides,
    competitiveGroupData.removedAssetIds,
    competitiveGroupData.removedSeededGroupIds,
  ])

  const effectiveGroupLabel = React.useMemo(() => {
    if (assetsTableVariant === "other-assets") {
      if (effectiveCompetitiveGroupFilter === ALL_COMPETITIVE_GROUPS_VALUE) {
        return OTHER_ASSETS_OVERVIEW_LABEL
      }
      return (
        competitiveGroupLabels[effectiveCompetitiveGroupFilter] ??
        effectiveCompetitiveGroupFilter
      )
    }
    return effectivePortfolioGroupFilter === ALL_PORTFOLIO_GROUPS_VALUE
      ? assetsTableVariant === "portfolio"
        ? PORTFOLIO_OVERVIEW_LABEL
        : ALL_PORTFOLIO_GROUPS_LABEL
      : resolveAssetGroupLabel(
          effectivePortfolioGroupFilter,
          assetGroupData.customGroups
        )
  }, [
    assetGroupData.customGroups,
    assetsTableVariant,
    competitiveGroupLabels,
    effectiveCompetitiveGroupFilter,
    effectivePortfolioGroupFilter,
  ])

  const assetsTableHeading =
    assetsTableVariant === "portfolio" ||
    assetsTableVariant === "other-assets" ||
    (assetsTableVariant === "scenarios" &&
      effectivePortfolioGroupFilter === ALL_PORTFOLIO_GROUPS_VALUE)
      ? "Assets"
      : effectiveGroupLabel

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
      assetsTableVariant === "other-assets"
        ? effectiveCompetitiveGroupFilter === ALL_COMPETITIVE_GROUPS_VALUE
          ? otherAssetRows
          : otherAssetRows.filter((r) =>
              r.groupIds.includes(effectiveCompetitiveGroupFilter)
            )
        : effectivePortfolioGroupFilter === ALL_PORTFOLIO_GROUPS_VALUE
          ? portfolioAssetRows
          : portfolioAssetRows.filter(
              (r) => r.groupIds.includes(effectivePortfolioGroupFilter)
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
          r.groupIds.includes(effectivePortfolioGroupFilter)
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
    assetsTableVariant,
    effectiveCompetitiveGroupFilter,
    effectivePortfolioGroupFilter,
    otherAssetRows,
    portfolioAssetRows,
    scenarioEligibleAssetIds,
    scenarioExcludedAssetIds,
    scenarioIncludedAssetIds,
    scenarioMembershipMode,
  ])

  const [scenarioModSetsTick, setScenarioModSetsTick] = React.useState(0)

  React.useEffect(() => {
    const bump = () => setScenarioModSetsTick((n) => n + 1)
    window.addEventListener("glassbox:modification-sets-changed", bump)
    return () =>
      window.removeEventListener("glassbox:modification-sets-changed", bump)
  }, [])

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

  const portfolioKpiStripRows = React.useMemo(() => {
    if (
      assetsTableVariant !== "portfolio" &&
      assetsTableVariant !== "other-assets"
    ) {
      return null
    }
    const byCondition = measurePortfolioDashboardStep(
      `${effectiveGroupLabel} dashboard KPI strip`,
      () =>
        aggregatePortfolioValuationByCondition(visibleAssetRows) ??
        emptyValuationConditionMetricMap()
    )
    return valuationKpiStripRowsFromSingleConditionMap(byCondition)
  }, [assetsTableVariant, effectiveGroupLabel, visibleAssetRows])

  const scenarioKpiStripRows = React.useMemo(() => {
    if (assetsTableVariant !== "scenarios") return null
    void scenarioModSetsTick
    const { baselineByCondition, scenarioByCondition, hasTableSelection } =
      computeScenarioPortfolioMetricsByConditionPair(
        visibleAssetRows,
        selections,
        typeof window !== "undefined"
      )
    return valuationKpiStripRowsFromScenarioConditionPair(
      baselineByCondition,
      scenarioByCondition,
      hasTableSelection
    )
  }, [
    assetsTableVariant,
    visibleAssetRows,
    selections,
    scenarioModSetsTick,
  ])

  const shouldPrepareMap = assetsMainView === "map"
  const visibleMapPins = React.useMemo(
    () => (shouldPrepareMap ? mapPinsForRows(visibleAssetRows) : []),
    [shouldPrepareMap, visibleAssetRows]
  )

  const { mapboxEnabled, coordinates: mapGeocodeCoordinates } =
    usePortfolioAssetCoordinates(shouldPrepareMap)

  const portfolioMapboxPins = React.useMemo((): PortfolioMapboxPin[] => {
    if (!shouldPrepareMap) return []
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
          assetDetailHref: assetHref(row.id),
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
      const asset =
        getAssetById(row.id) ?? getOtherRealAssetById(row.id) ?? undefined
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
  }, [shouldPrepareMap, visibleAssetRows, mapGeocodeCoordinates, liftStrengthForRow])

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const showScopeColumn =
    (assetsTableVariant === "portfolio" && portfolioScopeId == null) ||
    (assetsTableVariant === "other-assets" && competitiveGroupId == null)

  const portfolioColumns = React.useMemo(
    () =>
      createPortfolioAssetColumns(assetsTableVariant, liftPctExtent, {
        showScopeColumn,
      }),
    [assetsTableVariant, liftPctExtent, showScopeColumn]
  )

  const [sorting, setSorting] = React.useState<SortingState>(() =>
    defaultPortfolioAssetsTableSorting(assetsTableVariant)
  )
  const sortingHydrationKey = React.useMemo(
    () => `${assetsTableVariant}\0${pathname}`,
    [assetsTableVariant, pathname]
  )
  const skipNextSortingPersistenceRef = React.useRef(true)
  const [sortingReadyKey, setSortingReadyKey] = React.useState<string | null>(
    null
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const sortingReady = sortingReadyKey === sortingHydrationKey

  React.useEffect(() => {
    // Restore browser-persisted sorting after hydration, but do not block the
    // initial table paint while that preference is being applied.
    skipNextSortingPersistenceRef.current = true
    setSorting(readPortfolioAssetsTableSorting(pathname, assetsTableVariant))
    setSortingReadyKey(sortingHydrationKey)
  }, [assetsTableVariant, pathname, sortingHydrationKey])

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
    [portfolioTable]
  )

  React.useEffect(() => {
    if (!sortingReady) return
    writePortfolioAssetsTableVisibleOrder(pathname, visibleRowOrder)
  }, [pathname, sortingReady, visibleRowOrder])

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
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-[24px]">
      {((assetsTableVariant === "portfolio" ||
        assetsTableVariant === "other-assets") &&
        portfolioKpiStripRows != null) ||
      (assetsTableVariant === "scenarios" && scenarioKpiStripRows != null) ? (
        <ValuationKpiMetricStrip
          ariaLabel={
            assetsTableVariant === "scenarios"
              ? "Scenario portfolio KPI strip (valuation conditions)"
              : "Portfolio KPI strip (valuation conditions)"
          }
          rows={
            assetsTableVariant === "scenarios"
              ? scenarioKpiStripRows!
              : portfolioKpiStripRows!
          }
          className="h-fit shrink-0"
        />
      ) : null}

      {/* Same assets as sidebar (Office / Industrial / Retail order) */}
      <section
        className={cn(
          "flex min-w-0 flex-col gap-3",
          assetsMainView === "map" && "min-h-0 flex-1"
        )}
        aria-labelledby={assetsHeadingId}
      >
        <div className="flex shrink-0 flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
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
                (assetsTableVariant === "other-assets" &&
                  effectiveCompetitiveGroupFilter ===
                    ALL_COMPETITIVE_GROUPS_VALUE) ||
                (assetsTableVariant !== "other-assets" &&
                  effectivePortfolioGroupFilter === ALL_PORTFOLIO_GROUPS_VALUE)
                  ? `${visibleAssetRows.length} assets in list`
                  : `${visibleAssetRows.length} assets in ${effectiveGroupLabel}`
              }
            >
              {visibleAssetRows.length}
            </span>
            <ToggleGroup
              value={[assetsMainView]}
              onValueChange={(v) => {
                const next = v?.[0]
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
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 md:w-auto md:max-w-none md:justify-end">
            <Input
              type="search"
              placeholder="Search assets…"
              value={assetTableSearch}
              onChange={(e) => setAssetTableSearch(e.target.value)}
              aria-label="Search assets in table"
              className="min-w-0 w-full flex-1 md:w-auto md:max-w-xs"
            />
            <PortfolioAssetsViewOptions
              table={portfolioTable}
              className="hidden lg:flex"
            />
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
                "h-[min(58svh,28rem)] min-h-[18rem] sm:h-[calc(100svh-22rem)] sm:min-h-[16rem]",
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
                portfolioScopeId={portfolioScopeId}
                competitiveGroupId={competitiveGroupId}
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
  competitiveGroupId,
  pathnameOverride,
}: {
  assetsTableVariant: PortfolioAssetsTableVariant
  scenarioRelaxedAssetFilter?: boolean
  portfolioScopeId?: string
  competitiveGroupId?: string
  pathnameOverride?: string
}) {
  return (
    <PortfolioDashboardInner
      assetsTableVariant={assetsTableVariant}
      scenarioRelaxedAssetFilter={scenarioRelaxedAssetFilter}
      portfolioScopeId={portfolioScopeId}
      competitiveGroupId={competitiveGroupId}
      pathnameOverride={pathnameOverride}
    />
  )
}
