"use client"

import * as React from "react"
import Link from "next/link"
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type Row,
} from "@tanstack/react-table"
import { ChevronDown, ChevronRight, Telescope, Wrench } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AssetModificationSetSelect } from "@/components/portfolio/asset-modification-set-select"
import { assetForecastHref } from "@/lib/assets"
import type { ForecastChartTab } from "@/lib/forecast-chart-config"
import type {
  ForecastPeriod,
  ForecastStatementRow,
} from "@/lib/forecast-data"
import { isMarketListingRowId } from "@/lib/market-listing-portfolio-row"
import type {
  ScopedForecastPortfolioOutlookModel,
  ScopedForecastResolvedAssetModel,
} from "@/lib/scoped-forecast-rollup"
import {
  SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID,
  type ScopedForecastAssetSelection,
} from "@/lib/scoped-forecast"
import {
  modificationItemsRecord,
  modificationSelectLabelFromOption,
  modificationSelectPlaceholder,
  outlookSetItemsRecord,
  outlookSetSelectLabel,
  outlookSetSelectPlaceholder,
} from "@/lib/scoped-forecast-select-labels"
import { cn } from "@/lib/utils"

/** Compact USD without `Intl` compact notation — Node and browsers disagree on e.g. `$1.0M` vs `$1M`. */
function formatUsdAbsPositive(abs: number): string {
  if (abs >= 1_000_000_000) {
    const x = abs / 1_000_000_000
    return `$${compactUnitPart(x)}B`
  }
  if (abs >= 1_000_000) {
    const x = abs / 1_000_000
    return `$${compactUnitPart(x)}M`
  }
  if (abs >= 1_000) {
    const x = abs / 1_000
    return `$${compactUnitPart(x)}K`
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(abs)
}

function compactUnitPart(x: number): string {
  const rounded = Math.round(x * 10) / 10
  const whole = Math.round(rounded)
  if (Math.abs(rounded - whole) < 1e-9) {
    return String(whole)
  }
  return rounded.toFixed(1)
}

function formatUsdSigned(value: number): string {
  const core = formatUsdAbsPositive(Math.abs(value))
  if (value < 0) return `-${core}`
  return core
}

function formatStatementValue(kind: ForecastStatementRow["kind"], value: number) {
  if (kind === "percent") {
    return `${value.toFixed(2)}%`
  }

  if (kind === "expense") {
    return `(${formatUsdAbsPositive(Math.abs(value))})`
  }

  return formatUsdSigned(value)
}

/** Statement rows rolled up across buildings for the scoped portfolio table footer. */
const PORTFOLIO_SUMMARY_ROW_IDS = [
  "grossRevenue",
  "opex",
  "noi",
  "salePrice",
  "capRate",
] as const

function sumStatementAcrossAssets(
  assetModels: readonly ScopedForecastResolvedAssetModel[],
  rowId: string,
  periodCount: number
): number[] {
  return Array.from({ length: periodCount }, (_, periodIndex) =>
    assetModels.reduce((sum, entry) => {
      const row = entry.model.statementRows.find((r) => r.id === rowId)
      return sum + (row?.values[periodIndex] ?? 0)
    }, 0)
  )
}

/** Asset-value–weighted average cap rate per period (falls back to simple mean when total value is 0). */
function valueWeightedCapRateSeries(
  assetModels: readonly ScopedForecastResolvedAssetModel[],
  periodCount: number
): number[] {
  return Array.from({ length: periodCount }, (_, periodIndex) => {
    let weighted = 0
    let totalValue = 0
    for (const entry of assetModels) {
      const cap =
        entry.model.statementRows.find((r) => r.id === "capRate")?.values[periodIndex] ?? 0
      const value =
        entry.model.statementRows.find((r) => r.id === "salePrice")?.values[periodIndex] ?? 0
      weighted += cap * value
      totalValue += value
    }
    if (totalValue <= 0) {
      const n = assetModels.length
      if (n === 0) return 0
      const simple =
        assetModels.reduce(
          (s, e) =>
            s + (e.model.statementRows.find((r) => r.id === "capRate")?.values[periodIndex] ?? 0),
          0
        ) / n
      return Number(simple.toFixed(2))
    }
    return Number((weighted / totalValue).toFixed(2))
  })
}

function buildPortfolioQuarterlySummaryRows(
  statementRows: ForecastStatementRow[],
  assetModels: readonly ScopedForecastResolvedAssetModel[]
): ForecastStatementRow[] {
  const periodCount = assetModels[0]?.model.periods.length ?? 0
  if (periodCount === 0 || assetModels.length === 0) return []

  const meta = new Map(statementRows.map((r) => [r.id, r]))
  const gross = sumStatementAcrossAssets(assetModels, "grossRevenue", periodCount)
  const opex = sumStatementAcrossAssets(assetModels, "opex", periodCount)
  const noi = sumStatementAcrossAssets(assetModels, "noi", periodCount)
  const salePrice = sumStatementAcrossAssets(assetModels, "salePrice", periodCount)
  const capRates = valueWeightedCapRateSeries(assetModels, periodCount)

  const valuesById: Record<(typeof PORTFOLIO_SUMMARY_ROW_IDS)[number], number[]> = {
    grossRevenue: gross,
    opex,
    noi,
    salePrice,
    capRate: capRates,
  }

  return PORTFOLIO_SUMMARY_ROW_IDS.map((id) => {
    const template = meta.get(id)
    return {
      id: `portfolio-total-${id}`,
      label: template?.label ?? id,
      kind: template?.kind ?? "currency",
      values: valuesById[id],
    }
  })
}

function buildPortfolioQuarterlySummaryRootRows(
  statementRows: ForecastStatementRow[],
  assetModels: readonly ScopedForecastResolvedAssetModel[]
): ScopedForecastTableRow[] {
  const summaryRows = buildPortfolioQuarterlySummaryRows(statementRows, assetModels)
  const statementRowById = new Map(statementRows.map((row) => [row.id, row]))

  return PORTFOLIO_SUMMARY_ROW_IDS.map((id) => {
    const summaryRow = summaryRows.find((row) => row.id === `portfolio-total-${id}`)
    const sourceRow = statementRowById.get(id)

    return {
      id: summaryRow?.id ?? `portfolio-total-${id}`,
      rowType: "statement",
      label: summaryRow?.label ?? sourceRow?.label ?? id,
      kind: summaryRow?.kind ?? sourceRow?.kind ?? "currency",
      values: summaryRow?.values ?? [],
      highlightLabel: id === "salePrice",
      highlightValue: id === "salePrice",
      startsSection: id === "salePrice",
    }
  })
}

function statementValuesForTotalHorizon(row: ScopedForecastTableRow): number[] {
  return singleColumnValuesForTotalHorizon(row.kind, row.id, row.values)
}

function convertScopedForecastTableRowForTotalHorizon(
  row: ScopedForecastTableRow
): ScopedForecastTableRow {
  return {
    ...row,
    values: statementValuesForTotalHorizon(row),
    subRows: row.subRows?.map(convertScopedForecastTableRowForTotalHorizon),
  }
}

function rowsForTotalHorizonIfNeeded(
  rows: ScopedForecastTableRow[],
  periodGranularity: ForecastStatementPeriodGranularity
): ScopedForecastTableRow[] {
  return periodGranularity === "quarterly"
    ? rows
    : rows.map(convertScopedForecastTableRowForTotalHorizon)
}

function assetSubRowsForPortfolioOutlookStatement({
  statementRow,
  assetModels,
  outlookId,
}: {
  statementRow: ForecastStatementRow
  assetModels: readonly ScopedForecastResolvedAssetModel[]
  outlookId: string
}): ScopedForecastTableRow[] {
  return assetModels.map((entry) => {
    const assetRow =
      entry.model.statementRows.find(
        (candidateStatementRow) => candidateStatementRow.id === statementRow.id
      ) ?? statementRow

    return {
      id: `${statementRow.id}-${outlookId}-${entry.model.assetId}`,
      rowType: "asset",
      assetId: entry.model.assetId,
      label: entry.model.assetName,
      kind: assetRow.kind,
      values: assetRow.values,
      href: isMarketListingRowId(entry.selection.row.id)
        ? undefined
        : assetForecastHref(entry.selection.row.id),
    }
  })
}

function buildPortfolioOutlookBreakdownRootRows(
  rows: ForecastStatementRow[]
): ScopedForecastTableRow[] {
  return rows.map((row) => ({
    id: row.id,
    rowType: "statement",
    metricId: row.id,
    label: row.label,
    kind: row.kind,
    values: row.values,
    highlightLabel: row.id === "salePrice",
    highlightValue: row.id === "salePrice",
    startsSection: row.id === "salePrice",
  }))
}

function buildPortfolioOutlookRowsForMetric({
  statementRow,
  outlookModels,
  periodGranularity,
}: {
  statementRow: ForecastStatementRow
  outlookModels: readonly ScopedForecastPortfolioOutlookModel[]
  periodGranularity: ForecastStatementPeriodGranularity
}): ScopedForecastTableRow[] {
  const rows = outlookModels.map((outlookModel) => {
    const outlookRow =
      outlookModel.portfolioModel.statementRows.find(
        (candidateStatementRow) => candidateStatementRow.id === statementRow.id
      ) ?? statementRow

    return {
      id: `${statementRow.id}-${outlookModel.scenarioId}`,
      rowType: "outlook" as const,
      metricId: statementRow.id,
      scenarioId: outlookModel.scenarioId,
      label: `${outlookModel.portfolioModel.scenario.name} (${outlookModel.probabilityPct}%)`,
      kind: outlookRow.kind,
      values: outlookRow.values,
      highlightLabel: statementRow.id === "salePrice",
      highlightValue: statementRow.id === "salePrice",
    }
  })

  return rowsForTotalHorizonIfNeeded(rows, periodGranularity)
}

function buildPortfolioAssetRowsForMetric({
  statementRow,
  assetModels,
  periodGranularity,
}: {
  statementRow: ForecastStatementRow
  assetModels: readonly ScopedForecastResolvedAssetModel[]
  periodGranularity: ForecastStatementPeriodGranularity
}): ScopedForecastTableRow[] {
  return rowsForTotalHorizonIfNeeded(
    assetSubRowsForStatementRow(statementRow, assetModels),
    periodGranularity
  )
}

function buildPortfolioAssetRowsForOutlookMetric({
  statementRow,
  assetModels,
  outlookId,
  periodGranularity,
}: {
  statementRow: ForecastStatementRow
  assetModels: readonly ScopedForecastResolvedAssetModel[]
  outlookId: string
  periodGranularity: ForecastStatementPeriodGranularity
}): ScopedForecastTableRow[] {
  return rowsForTotalHorizonIfNeeded(
    assetSubRowsForPortfolioOutlookStatement({
      statementRow,
      assetModels,
      outlookId,
    }),
    periodGranularity
  )
}

/** Wide enough for full building names (aligns with portfolio snapshot `building` grid track intent). */
const FIRST_COLUMN_WIDTH_PX = 280
const SELECTOR_COLUMN_WIDTH_PX = 128
const PERIOD_COLUMN_WIDTH_PX = 108

const firstColumnStyle: React.CSSProperties = {
  width: FIRST_COLUMN_WIDTH_PX,
  minWidth: FIRST_COLUMN_WIDTH_PX,
}

const modificationsColumnStyle: React.CSSProperties = {
  width: SELECTOR_COLUMN_WIDTH_PX,
  minWidth: SELECTOR_COLUMN_WIDTH_PX,
  left: FIRST_COLUMN_WIDTH_PX,
}

const outlookColumnStyle: React.CSSProperties = {
  width: SELECTOR_COLUMN_WIDTH_PX,
  minWidth: SELECTOR_COLUMN_WIDTH_PX,
  left: FIRST_COLUMN_WIDTH_PX + SELECTOR_COLUMN_WIDTH_PX,
}

const periodColumnStyle: React.CSSProperties = {
  width: PERIOD_COLUMN_WIDTH_PX,
  minWidth: PERIOD_COLUMN_WIDTH_PX,
}

const selectedScopedForecastSelectorTriggerClassName =
  "border-violet-500/45 bg-violet-500/[0.09] font-medium text-violet-800 shadow-sm hover:bg-violet-500/[0.12] hover:border-violet-500/55 focus-visible:border-violet-500 focus-visible:ring-violet-500/25 dark:border-violet-400/40 dark:bg-violet-500/[0.14] dark:text-violet-200 dark:hover:bg-violet-500/20 dark:hover:border-violet-400/55 dark:focus-visible:border-violet-400 dark:focus-visible:ring-violet-400/30 [&_svg]:text-violet-600 dark:[&_svg]:text-violet-400"

function portfolioTotalsMetricIdFromRowId(rowId: string): ForecastChartTab | undefined {
  return forecastChartTabFromRootRowId(rowId) ?? statementMetricIdFromTableRowId(rowId)
}

function collectPortfolioTotalsRowIdToRootId({
  roots,
  hasOutlookBreakdown,
  assetModels,
  outlookModels,
}: {
  roots: ScopedForecastTableRow[]
  hasOutlookBreakdown: boolean
  assetModels: readonly ScopedForecastResolvedAssetModel[]
  outlookModels: readonly ScopedForecastPortfolioOutlookModel[]
}): Map<string, string> {
  const map = new Map<string, string>()

  for (const root of roots) {
    map.set(root.id, root.id)
    const metricId = portfolioTotalsMetricIdFromRowId(root.id)
    if (metricId == null) continue

    if (hasOutlookBreakdown) {
      for (const outlookModel of outlookModels) {
        const outlookRowId = `${metricId}-${outlookModel.scenarioId}`
        map.set(outlookRowId, root.id)
        for (const assetModel of outlookModel.assetModels) {
          map.set(
            `${metricId}-${outlookModel.scenarioId}-${assetModel.model.assetId}`,
            root.id
          )
        }
      }
      continue
    }

    for (const assetModel of assetModels) {
      map.set(`${metricId}-${assetModel.model.assetId}`, root.id)
    }
  }

  return map
}

function resolvePortfolioTotalsRootRowIdForMetric(
  metricFocus: ForecastChartTab,
  roots: ScopedForecastTableRow[]
): string | null {
  const portfolioPrefixed = `portfolio-total-${metricFocus}`
  if (roots.some((r) => r.id === portfolioPrefixed)) return portfolioPrefixed
  if (roots.some((r) => r.id === metricFocus)) return metricFocus
  return null
}

function forecastChartTabFromRootRowId(rootId: string): ForecastChartTab | null {
  if (rootId.startsWith("portfolio-total-")) {
    const suffix = rootId.slice("portfolio-total-".length)
    if ((PORTFOLIO_SUMMARY_ROW_IDS as readonly string[]).includes(suffix)) {
      return suffix as ForecastChartTab
    }
  }
  if ((PORTFOLIO_SUMMARY_ROW_IDS as readonly string[]).includes(rootId)) {
    return rootId as ForecastChartTab
  }
  return null
}

function forecastChartTabFromExpandedRecord(
  expanded: Record<string, boolean>,
  rowIdToRootId: Map<string, string>
): ForecastChartTab | null {
  for (const [rowId, open] of Object.entries(expanded)) {
    if (!open) continue
    const rootId = rowIdToRootId.get(rowId) ?? rowId
    const tab = forecastChartTabFromRootRowId(rootId)
    if (tab != null) return tab
  }
  return null
}

function expandedStateToRecord(state: ExpandedState): Record<string, boolean> {
  if (state === true) return {}
  return { ...(state ?? {}) }
}

function applyExpandedUpdater(
  updater: ExpandedState | ((old: ExpandedState) => ExpandedState),
  old: ExpandedState
): ExpandedState {
  return typeof updater === "function" ? updater(old) : updater
}

/** At most one top-level line item expanded; nested rows stay under that root. */
function collapseExpandedToSingleRoot(
  next: Record<string, boolean>,
  prev: Record<string, boolean>,
  rowIdToRootId: Map<string, string>
): Record<string, boolean> {
  const rootsWithOpenRows = new Set<string>()
  for (const [rowId, open] of Object.entries(next)) {
    if (!open) continue
    const root = rowIdToRootId.get(rowId)
    if (root != null) rootsWithOpenRows.add(root)
  }
  if (rootsWithOpenRows.size <= 1) return next

  const newlyOpenRowIds: string[] = []
  for (const [rowId, open] of Object.entries(next)) {
    if (open && !prev[rowId]) newlyOpenRowIds.push(rowId)
  }
  let winnerRoot: string | undefined
  for (let i = newlyOpenRowIds.length - 1; i >= 0; i -= 1) {
    const id = newlyOpenRowIds[i]
    if (id == null) continue
    const root = rowIdToRootId.get(id)
    if (root != null) {
      winnerRoot = root
      break
    }
  }
  if (winnerRoot == null) {
    winnerRoot = [...rootsWithOpenRows][rootsWithOpenRows.size - 1]
  }

  const out: Record<string, boolean> = {}
  for (const [rowId, open] of Object.entries(next)) {
    if (!open) continue
    if (rowIdToRootId.get(rowId) === winnerRoot) out[rowId] = true
  }
  return out
}

/** Portfolio-level quarterly roll-up; can be rendered below the statement table or elsewhere (e.g. under the chart). */
export function ScopedForecastsPortfolioTotalsTable({
  periods,
  rows,
  assetModels,
  outlookModels,
  resolveOutlookAssetModels,
  outlookAssetCount,
  metricFocus,
  periodGranularity = "quarterly",
  singleRootExpansion = false,
  onExpandedRootMetricChange,
}: {
  periods: ForecastPeriod[]
  rows: ForecastStatementRow[]
  assetModels: readonly ScopedForecastResolvedAssetModel[]
  outlookModels?: readonly ScopedForecastPortfolioOutlookModel[]
  resolveOutlookAssetModels?: (
    scenarioId: ScopedForecastPortfolioOutlookModel["scenarioId"]
  ) => readonly ScopedForecastResolvedAssetModel[]
  outlookAssetCount?: number
  metricFocus?: ForecastChartTab
  periodGranularity?: ForecastStatementPeriodGranularity
  /** When true, expanding one statement line collapses other top-level sections (accordion). */
  singleRootExpansion?: boolean
  /** When expansion implies a different chart metric than `metricFocus`, e.g. user opened another line. */
  onExpandedRootMetricChange?: (tab: ForecastChartTab) => void
}) {
  const hasOutlookBreakdown =
    outlookModels != null && outlookModels.length > 0
  const hasDeferredOutlookDetails =
    hasOutlookBreakdown &&
    resolveOutlookAssetModels != null &&
    (outlookAssetCount ?? 0) > 0
  const [expanded, setExpanded] = React.useState<ExpandedState>({})
  const resolvedOutlookModels = outlookModels ?? []
  const statementRowsById = React.useMemo(
    () => new Map(rows.map((row) => [row.id, row])),
    [rows]
  )
  const outlookModelsById = React.useMemo(
    () => new Map(resolvedOutlookModels.map((model) => [model.scenarioId, model])),
    [resolvedOutlookModels]
  )

  const tableRows = React.useMemo(() => {
    if (hasOutlookBreakdown) {
      return rowsForTotalHorizonIfNeeded(
        buildPortfolioOutlookBreakdownRootRows(rows),
        periodGranularity
      )
    }

    return rowsForTotalHorizonIfNeeded(
      buildPortfolioQuarterlySummaryRootRows(rows, assetModels),
      periodGranularity
    )
  }, [assetModels, hasOutlookBreakdown, outlookModels, periodGranularity, rows])

  const rowIdToRootId = React.useMemo(
    () =>
      collectPortfolioTotalsRowIdToRootId({
        roots: tableRows,
        hasOutlookBreakdown,
        assetModels,
        outlookModels: resolvedOutlookModels,
      }),
    [assetModels, hasOutlookBreakdown, resolvedOutlookModels, tableRows]
  )

  React.useEffect(() => {
    if (metricFocus == null) return
    const rootRowId = resolvePortfolioTotalsRootRowIdForMetric(metricFocus, tableRows)
    if (rootRowId == null) return
    if (singleRootExpansion) {
      setExpanded({ [rootRowId]: true })
      return
    }
    setExpanded((current) => ({
      ...expandedStateToRecord(current),
      [rootRowId]: true,
    }))
  }, [metricFocus, singleRootExpansion, tableRows])

  React.useEffect(() => {
    if (!singleRootExpansion || onExpandedRootMetricChange == null) return
    const tab = forecastChartTabFromExpandedRecord(
      expandedStateToRecord(expanded),
      rowIdToRootId
    )
    if (tab == null || tab === metricFocus) return
    onExpandedRootMetricChange(tab)
  }, [
    expanded,
    metricFocus,
    onExpandedRootMetricChange,
    rowIdToRootId,
    singleRootExpansion,
  ])

  const displayPeriods = React.useMemo((): ForecastPeriod[] => {
    if (periodGranularity === "quarterly") return periods
    const anchor = periods[0]
    return [
      {
        index: 0,
        label: "2 Year Total",
        quarter: anchor?.quarter ?? 0,
        year: anchor?.year ?? 0,
        startDate: anchor?.startDate ?? "",
      },
    ]
  }, [periodGranularity, periods])

  const hasExpandableRows = React.useMemo(
    () =>
      hasOutlookBreakdown
        ? resolvedOutlookModels.length > 0
        : assetModels.length > 0,
    [assetModels.length, hasOutlookBreakdown, resolvedOutlookModels.length]
  )

  const handleExpandedChange = React.useMemo(() => {
    if (!hasExpandableRows) return undefined
    if (!singleRootExpansion) return setExpanded
    return (updater: ExpandedState | ((old: ExpandedState) => ExpandedState)) => {
      setExpanded((old) => {
        const prev = expandedStateToRecord(old)
        const next = applyExpandedUpdater(updater, old)
        if (next === true) return true
        return collapseExpandedToSingleRoot(
          next as Record<string, boolean>,
          prev,
          rowIdToRootId
        )
      })
    }
  }, [hasExpandableRows, rowIdToRootId, singleRootExpansion])

  const getPortfolioTotalsSubRows = React.useCallback(
    (row: ScopedForecastTableRow) => {
      if (!hasExpandableRows) return undefined

      const metricId = row.metricId ?? portfolioTotalsMetricIdFromRowId(row.id)
      const statementRow =
        (metricId != null ? statementRowsById.get(metricId) : undefined) ??
        (row.rowType === "statement" ? statementRowsById.get(row.id) : undefined)
      if (statementRow == null) return undefined

      if (row.rowType === "statement") {
        if (hasOutlookBreakdown) {
          return buildPortfolioOutlookRowsForMetric({
            statementRow,
            outlookModels: resolvedOutlookModels,
            periodGranularity,
          })
        }

        return buildPortfolioAssetRowsForMetric({
          statementRow,
          assetModels,
          periodGranularity,
        })
      }

      if (row.rowType === "outlook") {
        const outlookId =
          row.scenarioId ??
          (metricId != null
            ? (row.id.slice(
                `${metricId}-`.length
              ) as ScopedForecastPortfolioOutlookModel["scenarioId"])
            : undefined)
        if (outlookId == null) return undefined
        const outlookModel = outlookModelsById.get(
          outlookId
        )
        const detailAssetModels =
          outlookModel == null
            ? []
            : (resolveOutlookAssetModels?.(outlookModel.scenarioId) ??
              outlookModel.assetModels)
        if (detailAssetModels.length === 0) {
          return undefined
        }

        return buildPortfolioAssetRowsForOutlookMetric({
          statementRow,
          assetModels: detailAssetModels,
          outlookId:
            outlookModel?.scenarioId ??
            (outlookId as ScopedForecastPortfolioOutlookModel["scenarioId"]),
          periodGranularity,
        })
      }

      return undefined
    },
    [
      assetModels,
      hasExpandableRows,
      hasOutlookBreakdown,
      outlookModelsById,
      periodGranularity,
      resolvedOutlookModels,
      statementRowsById,
    ]
  )

  const getPortfolioTotalsRowCanExpand = React.useCallback(
    (row: Row<ScopedForecastTableRow>) => {
      const item = row.original
      if (item.rowType === "asset") return false

      if (item.rowType === "outlook") {
        const outlookId =
          item.scenarioId ??
          (() => {
            const metricId = item.metricId ?? statementMetricIdFromTableRowId(item.id)
            if (metricId == null) return undefined
            return item.id.slice(
              `${metricId}-`.length
            ) as ScopedForecastPortfolioOutlookModel["scenarioId"]
          })()
        if (outlookId == null) return false
        if (hasDeferredOutlookDetails) return true
        return (
          outlookModelsById.get(
            outlookId
          )?.assetModels.length ?? 0
        ) > 0
      }

      return hasOutlookBreakdown
        ? resolvedOutlookModels.length > 0
        : assetModels.length > 0
    },
    [
      assetModels.length,
      hasDeferredOutlookDetails,
      hasOutlookBreakdown,
      outlookModelsById,
      resolvedOutlookModels.length,
    ]
  )

  const columns = React.useMemo<ColumnDef<ScopedForecastTableRow>[]>(
    () => [
      {
        id: "lineItem",
        header: () => "Line Item",
        cell: ({ row }) => lineItemCellContent(row),
        enableSorting: false,
      },
      ...displayPeriods.map<ColumnDef<ScopedForecastTableRow>>((period, index) => ({
        id: `period-${period.label}`,
        header: () => period.label,
        cell: (info) => {
          const item = info.row.original
          return (
            <div
              className={cn(
                "text-right tabular-nums text-foreground",
                isScopedForecastTotalRow(item) ? "font-semibold" : "font-normal",
              )}
            >
              {formatStatementValue(item.kind, item.values[index] ?? 0)}
            </div>
          )
        },
        enableSorting: false,
      })),
    ],
    [displayPeriods]
  )

  const totalTableMinWidth =
    FIRST_COLUMN_WIDTH_PX + displayPeriods.length * PERIOD_COLUMN_WIDTH_PX

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table useReactTable
  const table = useReactTable({
    data: tableRows,
    columns,
    state: hasExpandableRows ? { expanded } : {},
    onExpandedChange: handleExpandedChange,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: hasExpandableRows ? getPortfolioTotalsSubRows : undefined,
    getRowCanExpand: hasExpandableRows ? getPortfolioTotalsRowCanExpand : undefined,
    getRowId: (row) => row.id,
    autoResetExpanded: false,
  })

  if (tableRows.length === 0) return null

  return (
    <div className={cn(!hasOutlookBreakdown && "border-t border-border/80")}>
      <Table className="table-fixed" style={{ minWidth: `${totalTableMinWidth}px` }}>
        <TableHeader>
          <TableRow className="forecast-sticky-header-row border-b border-border hover:bg-transparent">
            <TableHead
              scope="col"
              className="sticky left-0 z-20 h-auto min-w-0 px-2 py-2 text-left text-sm font-medium text-foreground"
              style={firstColumnStyle}
            >
              Line Item
            </TableHead>
            {displayPeriods.map((period) => (
              <TableHead
                key={`summary-h-${period.label}`}
                scope="col"
                className="h-auto min-w-0 px-3 py-2 text-right text-sm font-medium text-foreground"
                style={periodColumnStyle}
              >
                {period.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className={rowClassName(row.original)}>
              <TableCell
                className={cn(
                  "sticky left-0 z-20 px-2",
                  row.original.rowType === "asset" ? "py-3" : "py-2.5",
                  firstColumnSurfaceClassName(row.original)
                )}
                style={firstColumnStyle}
              >
                {lineItemCellContent(row)}
              </TableCell>
              {displayPeriods.map((period, index) => (
                <TableCell
                  key={`${row.id}-${period.label}`}
                  className="px-3 py-2.5"
                  style={periodColumnStyle}
                >
                  <div
                    className={cn(
                      "text-right tabular-nums text-foreground",
                      isScopedForecastTotalRow(row.original)
                        ? "font-semibold"
                        : "font-normal",
                    )}
                  >
                    {formatStatementValue(
                      row.original.kind,
                      row.original.values[index] ?? 0
                    )}
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasOutlookBreakdown ? (
        <div className="border-t border-border bg-muted/10 px-4 py-2 text-xs text-muted-foreground">
          Expand a line item to inspect outlook totals, then expand an outlook to
          inspect asset-level contributions.
        </div>
      ) : hasExpandableRows ? (
        <div className="border-t border-border bg-muted/10 px-4 py-2 text-xs text-muted-foreground">
          Expand a line item to inspect asset-level contributions. Click an asset to open
          its forecast page.
        </div>
      ) : null}
    </div>
  )
}

type ScopedForecastTableRow = {
  id: string
  rowType: "statement" | "outlook" | "asset"
  /** Canonical statement metric id for this row (avoids parsing id patterns during expansion). */
  metricId?: ForecastStatementRow["id"]
  /** Outlook id for `outlook` rows (avoids parsing id patterns during nested expansion). */
  scenarioId?: ScopedForecastPortfolioOutlookModel["scenarioId"]
  /** Set for asset rows — drives Modifications / Outlook column dropdowns. */
  assetId?: string
  label: string
  kind: ForecastStatementRow["kind"]
  values: number[]
  /** When set (total-horizon pivot), value cells use this kind per column index instead of `kind`. */
  periodCellKinds?: ForecastStatementRow["kind"][]
  href?: string
  isSummaryRow?: boolean
  highlightLabel?: boolean
  highlightValue?: boolean
  startsSection?: boolean
  subRows?: ScopedForecastTableRow[]
}

/** Portfolio / outlook roll-up rows (not per-asset contributions). */
function isScopedForecastTotalRow(item: ScopedForecastTableRow): boolean {
  return (
    item.rowType === "statement" ||
    item.rowType === "outlook" ||
    item.isSummaryRow === true
  )
}

/** Column order for total-horizon pivot (one column per metric, one row per asset + portfolio). */
const TOTAL_HORIZON_PIVOT_METRICS: readonly ForecastChartTab[] = [
  "grossRevenue",
  "opex",
  "noi",
  "salePrice",
  "capRate",
]

function statementRowForMetric(
  statementRows: ForecastStatementRow[],
  metricId: ForecastChartTab
): ForecastStatementRow | undefined {
  return statementRows.find((r) => r.id === metricId)
}

function buildTotalHorizonAssetPivotRows({
  statementRows,
  assetModels,
}: {
  statementRows: ForecastStatementRow[]
  assetModels: readonly ScopedForecastResolvedAssetModel[]
}): ScopedForecastTableRow[] {
  const portfolioValues = TOTAL_HORIZON_PIVOT_METRICS.map((metricId) => {
    const stmt = statementRowForMetric(statementRows, metricId)
    if (stmt == null) return 0
    return singleColumnValuesForTotalHorizon(stmt.kind, stmt.id, stmt.values)[0] ?? 0
  })
  const portfolioKinds = TOTAL_HORIZON_PIVOT_METRICS.map(
    (metricId) => statementRowForMetric(statementRows, metricId)?.kind ?? "currency"
  )

  const out: ScopedForecastTableRow[] = [
    {
      id: "portfolio-horizon-pivot",
      rowType: "statement",
      label: "Portfolio",
      kind: "currency",
      values: portfolioValues,
      periodCellKinds: portfolioKinds,
    },
  ]

  for (const entry of assetModels) {
    const values = TOTAL_HORIZON_PIVOT_METRICS.map((metricId) => {
      const stmt = entry.model.statementRows.find((r) => r.id === metricId)
      if (stmt == null) return 0
      return singleColumnValuesForTotalHorizon(stmt.kind, stmt.id, stmt.values)[0] ?? 0
    })
    const kinds = TOTAL_HORIZON_PIVOT_METRICS.map((metricId) => {
      const stmt = entry.model.statementRows.find((r) => r.id === metricId)
      return stmt?.kind ?? "currency"
    })
    out.push({
      id: `horizon-pivot-${entry.model.assetId}`,
      rowType: "asset",
      assetId: entry.model.assetId,
      label: entry.model.assetName,
      kind: "currency",
      values,
      periodCellKinds: kinds,
      href: isMarketListingRowId(entry.selection.row.id)
        ? undefined
        : assetForecastHref(entry.selection.row.id),
    })
  }

  return out
}

export type ForecastStatementPeriodGranularity = "quarterly" | "total"

const STATEMENT_PERIOD_GRANULARITY_ITEMS: Record<
  ForecastStatementPeriodGranularity,
  string
> = {
  total: "2 Year Total",
  quarterly: "Quarterly",
}

/** Total vs quarterly columns — shared by {@link ScopedForecastsTable} and parent section headers. */
export function StatementPeriodGranularitySelect({
  value,
  onValueChange,
}: {
  value: ForecastStatementPeriodGranularity
  onValueChange: (next: ForecastStatementPeriodGranularity) => void
}) {
  return (
    <Select
      items={STATEMENT_PERIOD_GRANULARITY_ITEMS}
      value={value}
      onValueChange={(next) => {
        if (next === "quarterly" || next === "total") {
          onValueChange(next)
        }
      }}
    >
      <SelectTrigger
        size="sm"
        className="min-w-[9.5rem] justify-between"
        aria-label="Statement columns: two-year total horizon or quarterly"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" side="bottom">
        <SelectItem value="total">2 Year Total</SelectItem>
        <SelectItem value="quarterly">Quarterly</SelectItem>
      </SelectContent>
    </Select>
  )
}

const FORECAST_TABLE_METRIC_IDS = [
  "grossRevenue",
  "opex",
  "noi",
  "salePrice",
  "capRate",
] as const

function statementMetricIdFromTableRowId(
  tableRowId: string
): (typeof FORECAST_TABLE_METRIC_IDS)[number] | undefined {
  for (const id of FORECAST_TABLE_METRIC_IDS) {
    if (
      tableRowId === id ||
      tableRowId.startsWith(`${id}-`) ||
      tableRowId === `portfolio-total-${id}` ||
      tableRowId.startsWith(`portfolio-total-${id}-`)
    ) {
      return id
    }
  }
  return undefined
}

/**
 * Single-column horizon view: flow lines (revenue, OpEx, NOI) sum quarters;
 * point-in-time lines (asset value, cap rate) use the last forecast period.
 */
function singleColumnValuesForTotalHorizon(
  kind: ForecastStatementRow["kind"],
  tableRowId: string,
  values: readonly number[]
): number[] {
  if (values.length === 0) return [0]
  const metric = statementMetricIdFromTableRowId(tableRowId)

  if (metric === "salePrice" || metric === "capRate") {
    return [values[values.length - 1] ?? 0]
  }

  if (kind === "percent") {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    return [Number(mean.toFixed(2))]
  }

  const sum = values.reduce((acc, v) => acc + v, 0)
  return [sum]
}

function filterStatementRowsForMetric(
  rows: ForecastStatementRow[],
  metric: ForecastChartTab | undefined
): ForecastStatementRow[] {
  if (metric == null) return rows
  return rows.filter((row) => row.id === metric)
}

function assetSubRowsForStatementRow(
  row: ForecastStatementRow,
  assetModels: readonly ScopedForecastResolvedAssetModel[]
): ScopedForecastTableRow[] {
  return assetModels.map((entry) => {
    const assetRow =
      entry.model.statementRows.find((statementRow) => statementRow.id === row.id) ?? row

    return {
      id: `${row.id}-${entry.model.assetId}`,
      rowType: "asset" as const,
      assetId: entry.model.assetId,
      label: entry.model.assetName,
      kind: assetRow.kind,
      values: assetRow.values,
      href: isMarketListingRowId(entry.selection.row.id)
        ? undefined
        : assetForecastHref(entry.selection.row.id),
    }
  })
}

function buildScopedForecastTableRows({
  rows,
  assetModels,
  filteredMetricSummaryLabel,
}: {
  rows: ForecastStatementRow[]
  assetModels: readonly ScopedForecastResolvedAssetModel[]
  filteredMetricSummaryLabel?: string
}): ScopedForecastTableRow[] {
  const useFilteredMetricSummaryLabel =
    filteredMetricSummaryLabel != null && rows.length === 1
  const out: ScopedForecastTableRow[] = []
  for (const row of rows) {
    if (row.id === "grossRevenue") {
      out.push({
        id: row.id,
        rowType: "statement",
        label: useFilteredMetricSummaryLabel ? filteredMetricSummaryLabel : row.label,
        kind: row.kind,
        values: row.values,
        highlightLabel: false,
        highlightValue: false,
        isSummaryRow: useFilteredMetricSummaryLabel,
        startsSection: false,
        subRows: assetSubRowsForStatementRow(row, assetModels),
      })
      continue
    }
    out.push({
      id: row.id,
      rowType: "statement",
      label: useFilteredMetricSummaryLabel ? filteredMetricSummaryLabel : row.label,
      kind: row.kind,
      values: row.values,
      highlightLabel: row.id === "salePrice",
      highlightValue: row.id === "salePrice",
      isSummaryRow: useFilteredMetricSummaryLabel,
      startsSection: row.id === "salePrice",
      subRows: assetSubRowsForStatementRow(row, assetModels),
    })
  }
  return out
}

/** Statement row + per-asset rows at the same depth (no expand/collapse). */
function buildFlatScopedForecastTableRows({
  rows,
  assetModels,
  filteredMetricSummaryLabel,
}: {
  rows: ForecastStatementRow[]
  assetModels: readonly ScopedForecastResolvedAssetModel[]
  filteredMetricSummaryLabel?: string
}): ScopedForecastTableRow[] {
  const useFilteredMetricSummaryLabel =
    filteredMetricSummaryLabel != null && rows.length === 1
  const out: ScopedForecastTableRow[] = []
  for (const row of rows) {
    if (row.id === "grossRevenue") {
      out.push({
        id: row.id,
        rowType: "statement",
        label: useFilteredMetricSummaryLabel ? filteredMetricSummaryLabel : row.label,
        kind: row.kind,
        values: row.values,
        highlightLabel: false,
        highlightValue: false,
        isSummaryRow: useFilteredMetricSummaryLabel,
        startsSection: false,
      })
      out.push(...assetSubRowsForStatementRow(row, assetModels))
      continue
    }
    out.push({
      id: row.id,
      rowType: "statement",
      label: useFilteredMetricSummaryLabel ? filteredMetricSummaryLabel : row.label,
      kind: row.kind,
      values: row.values,
      highlightLabel: row.id === "salePrice",
      highlightValue: row.id === "salePrice",
      isSummaryRow: useFilteredMetricSummaryLabel,
      startsSection: row.id === "salePrice",
    })
    out.push(...assetSubRowsForStatementRow(row, assetModels))
  }
  return out
}

/** Matches expand-row control: `size-4` chevron (16px) + `gap-2` (8px) before label text. */
const LINE_ITEM_DEPTH_INDENT_PX = 24

function lineItemCellContent(row: Row<ScopedForecastTableRow>) {
  const item = row.original
  const indentationStyle =
    row.depth === 0
      ? undefined
      : { paddingLeft: `${row.depth * LINE_ITEM_DEPTH_INDENT_PX}px` }
  const summaryLabelClassName = item.isSummaryRow
    ? "whitespace-normal leading-snug"
    : "truncate"
  const accessibleLabel = item.isSummaryRow ? item.label.replace(":", "") : item.label

  if (item.rowType === "asset") {
    return (
      <div className="flex min-w-0" style={indentationStyle}>
        {item.href != null ? (
          <Link
            href={item.href}
            className="group/asset-link block min-w-0 max-w-full whitespace-normal break-words rounded-sm text-left font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {item.label}
          </Link>
        ) : (
          <span className="block min-w-0 whitespace-normal break-words font-medium text-foreground">
            {item.label}
          </span>
        )}
      </div>
    )
  }

  if (row.getCanExpand()) {
    return (
      <button
        type="button"
        onClick={row.getToggleExpandedHandler()}
        className={cn(
          "flex w-full min-w-0 gap-2 text-left",
          item.isSummaryRow ? "items-start" : "items-center"
        )}
        aria-label={`${row.getIsExpanded() ? "Collapse" : "Expand"} ${accessibleLabel}`}
        style={indentationStyle}
      >
        {row.getIsExpanded() ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span
          className={cn(
            summaryLabelClassName,
            item.rowType === "outlook" ? "text-muted-foreground" : "text-foreground",
            isScopedForecastTotalRow(item) ? "font-semibold" : "font-medium",
          )}
        >
          {item.label}
        </span>
      </button>
    )
  }

  return (
    <div className="flex min-w-0 items-center" style={indentationStyle}>
      <span
        className={cn(
          summaryLabelClassName,
          item.rowType === "outlook" ? "text-muted-foreground" : "text-foreground",
          isScopedForecastTotalRow(item) ? "font-semibold" : "font-medium",
        )}
      >
        {item.label}
      </span>
    </div>
  )
}

function rowClassName(item: ScopedForecastTableRow) {
  if (item.isSummaryRow) {
    return "group border-b border-border bg-background hover:bg-muted/25"
  }

  if (item.rowType === "asset") {
    return "group border-b border-border bg-muted/20 hover:bg-muted/25"
  }

  if (item.rowType === "outlook") {
    return "group border-b border-border bg-muted/10 hover:bg-muted/15"
  }

  return cn(
    "group border-b border-border",
    "hover:bg-transparent",
    item.startsSection && "border-t border-border/80"
  )
}

function firstColumnSurfaceClassName(item?: ScopedForecastTableRow) {
  if (item == null) {
    return "bg-card"
  }

  if (item.isSummaryRow) {
    return "forecast-sticky-line-summary"
  }

  if (item.rowType === "asset") {
    return "forecast-sticky-line-asset"
  }

  if (item.rowType === "outlook") {
    return "forecast-sticky-line-outlook"
  }

  return "bg-background"
}

/** Sticky Modifications / Outlook columns — match line-item column surfaces. */
function selectorColumnsSurfaceClassName(item?: ScopedForecastTableRow) {
  if (item == null) {
    return "bg-card"
  }

  if (item.isSummaryRow) {
    return "forecast-sticky-line-summary"
  }

  if (item.rowType === "asset") {
    return "forecast-sticky-line-asset"
  }

  if (item.rowType === "outlook") {
    return "forecast-sticky-line-outlook"
  }

  return "bg-background"
}

export function ScopedForecastsTable({
  periods,
  rows,
  assetModels,
  topAccessory,
  metricFilter,
  filteredMetricSummaryLabel,
  assetContributionsDisplay = "nested",
  assetSelections,
  onSelectBuildingVersion,
  onSelectOutlookSet,
  portfolioTotalsPlacement = "belowStatement",
  statementToolbar = "default",
  periodGranularity: periodGranularityProp,
  onPeriodGranularityChange,
  useScenarioOverviewModificationSelect,
}: {
  periods: ForecastPeriod[]
  rows: ForecastStatementRow[]
  assetModels: readonly ScopedForecastResolvedAssetModel[]
  topAccessory?: React.ReactNode
  metricFilter?: ForecastChartTab
  /** Optional label override for the single filtered statement row shown above asset rows. */
  filteredMetricSummaryLabel?: string
  /**
   * `nested`: statement rows expand to show per-asset rows (default).
   * `flat`: statement row plus asset rows as a single flat list (no expand/collapse).
   */
  assetContributionsDisplay?: "nested" | "flat"
  /** When set with handlers, adds Modifications and Outlook columns (per-building dropdowns). */
  assetSelections?: readonly ScopedForecastAssetSelection[]
  onSelectBuildingVersion?: (assetId: string, nextId: string) => void
  onSelectOutlookSet?: (assetId: string, nextId: string) => void
  /**
   * `belowStatement`: render the portfolio quarterly totals table under this grid (default).
   * `none`: omit it here so the parent can render it elsewhere (e.g. below the chart).
   */
  portfolioTotalsPlacement?: "belowStatement" | "none"
  /**
   * `default`: title + total/quarterly control above the grid.
   * `none`: omit that chrome — parent renders it (see `StatementPeriodGranularitySelect`).
   */
  statementToolbar?: "default" | "none"
  /** Controlled quarterly / total horizon (pair with `onPeriodGranularityChange`). */
  periodGranularity?: ForecastStatementPeriodGranularity
  onPeriodGranularityChange?: (next: ForecastStatementPeriodGranularity) => void
  /**
   * When true, Modifications uses the same control as the scenario overview table
   * (saved sets + violet selected styling) and shares selection via scenario context.
   */
  useScenarioOverviewModificationSelect?: boolean
}) {
  const flatAssetContributions = assetContributionsDisplay === "flat"
  const useScenarioOverviewModificationSelectProp =
    useScenarioOverviewModificationSelect ?? false

  const showSelectorColumns =
    assetSelections != null &&
    assetSelections.length > 0 &&
    onSelectBuildingVersion != null &&
    onSelectOutlookSet != null

  const selectionByAssetId = React.useMemo(() => {
    if (assetSelections == null || assetSelections.length === 0) {
      return new Map<string, ScopedForecastAssetSelection>()
    }
    return new Map(assetSelections.map((s) => [s.row.id, s]))
  }, [assetSelections])

  const filteredRows = React.useMemo(
    () => filterStatementRowsForMetric(rows, metricFilter),
    [metricFilter, rows]
  )

  const [internalPeriodGranularity, setInternalPeriodGranularity] =
    React.useState<ForecastStatementPeriodGranularity>("total")

  const periodGranularity =
    periodGranularityProp ?? internalPeriodGranularity

  const setPeriodGranularity = React.useCallback(
    (next: ForecastStatementPeriodGranularity) => {
      onPeriodGranularityChange?.(next)
      if (periodGranularityProp === undefined) {
        setInternalPeriodGranularity(next)
      }
    },
    [onPeriodGranularityChange, periodGranularityProp]
  )

  const isTotalHorizonPivot = periodGranularity === "total"

  const [expanded, setExpanded] = React.useState<ExpandedState>({})
  const metricFilterExpansionInitializedRef = React.useRef(false)

  React.useEffect(() => {
    if (flatAssetContributions || isTotalHorizonPivot) return
    if (metricFilter != null) {
      setExpanded((current) => {
        const normalizedCurrent = current === true ? {} : current
        const hadExpandedRows = Object.values(normalizedCurrent).some(Boolean)

        if (!metricFilterExpansionInitializedRef.current) {
          metricFilterExpansionInitializedRef.current = true
          return { [metricFilter]: true }
        }

        return hadExpandedRows ? { [metricFilter]: true } : {}
      })
    }
  }, [flatAssetContributions, isTotalHorizonPivot, metricFilter])

  const getSubRows = React.useCallback(
    (row: ScopedForecastTableRow) => {
      if (flatAssetContributions || isTotalHorizonPivot) return undefined
      return row.subRows ?? undefined
    },
    [flatAssetContributions, isTotalHorizonPivot]
  )

  const data = React.useMemo(
    () =>
      flatAssetContributions
        ? buildFlatScopedForecastTableRows({
            rows: filteredRows,
            assetModels,
            filteredMetricSummaryLabel,
          })
        : buildScopedForecastTableRows({
            rows: filteredRows,
            assetModels,
            filteredMetricSummaryLabel,
          }),
    [assetModels, filteredRows, filteredMetricSummaryLabel, flatAssetContributions]
  )

  const displayPeriods = React.useMemo((): ForecastPeriod[] => {
    if (periodGranularity === "quarterly") return periods
    const anchor = periods[0]
    return [
      {
        index: 0,
        label: "2 Year Total",
        quarter: anchor?.quarter ?? 0,
        year: anchor?.year ?? 0,
        startDate: anchor?.startDate ?? "",
      },
    ]
  }, [periodGranularity, periods])

  const tableData = React.useMemo(() => {
    if (periodGranularity === "quarterly") return data
    return buildTotalHorizonAssetPivotRows({ statementRows: rows, assetModels })
  }, [assetModels, data, periodGranularity, rows])

  const columns = React.useMemo<ColumnDef<ScopedForecastTableRow>[]>(() => {
    const selectorColumns: ColumnDef<ScopedForecastTableRow>[] = showSelectorColumns
      ? [
          {
            id: "modifications",
            header: () => (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Wrench
                  className="size-3.5 shrink-0 opacity-80"
                  aria-hidden
                />
                Modifications
              </span>
            ),
            cell: ({ row }) => {
              const item = row.original
              if (item.rowType !== "asset" || item.assetId == null) {
                return <span className="text-muted-foreground">—</span>
              }
              const selection = selectionByAssetId.get(item.assetId)
              if (selection == null) return null
              if (useScenarioOverviewModificationSelectProp) {
                return (
                  <AssetModificationSetSelect
                    assetId={item.assetId}
                    building={item.label}
                    matchOutlookRowSelect
                  />
                )
              }
              return (
                <Select
                  items={modificationItemsRecord(selection.buildingVersionOptions)}
                  value={selection.selectedBuildingVersionId}
                  onValueChange={(value) => {
                    if (value == null) return
                    onSelectBuildingVersion(item.assetId!, value)
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="h-7 w-full max-w-[7.25rem] text-[0.75rem]"
                    aria-label={`${selection.row.building} modification set`}
                  >
                    <SelectValue placeholder={modificationSelectPlaceholder()} />
                  </SelectTrigger>
                  <SelectContent>
                    {selection.buildingVersionOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {modificationSelectLabelFromOption(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            },
            enableSorting: false,
          },
          {
            id: "outlook",
            header: () => (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Telescope
                  className="size-3.5 shrink-0 opacity-80"
                  aria-hidden
                />
                Outlook
              </span>
            ),
            cell: ({ row }) => {
              const item = row.original
              if (item.rowType !== "asset" || item.assetId == null) {
                return <span className="text-muted-foreground">—</span>
              }
              const selection = selectionByAssetId.get(item.assetId)
              if (selection == null) return null
              const isOutlookChangedFromBaseline =
                selection.selectedOutlookSetId !== SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID
              return (
                <Select
                  items={outlookSetItemsRecord(selection.outlookSetOptions)}
                  value={selection.selectedOutlookSetId}
                  onValueChange={(value) => {
                    if (value == null) return
                    onSelectOutlookSet(item.assetId!, value)
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className={cn(
                      "h-7 w-full max-w-[7.25rem] text-[0.75rem]",
                      isOutlookChangedFromBaseline &&
                        selectedScopedForecastSelectorTriggerClassName
                    )}
                    aria-label={`${selection.row.building} outlook set`}
                  >
                    <SelectValue placeholder={outlookSetSelectPlaceholder()} />
                  </SelectTrigger>
                  <SelectContent>
                    {selection.outlookSetOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {outlookSetSelectLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            },
            enableSorting: false,
          },
        ]
      : []

    const lineItemColumn: ColumnDef<ScopedForecastTableRow> = {
      id: "lineItem",
      header: () => "Asset",
      cell: ({ row }) => lineItemCellContent(row),
      enableSorting: false,
    }

    if (isTotalHorizonPivot) {
      return [
        lineItemColumn,
        ...selectorColumns,
        ...TOTAL_HORIZON_PIVOT_METRICS.map<ColumnDef<ScopedForecastTableRow>>(
          (metricId, index) => ({
            id: `pivot-${metricId}`,
            header: () => statementRowForMetric(rows, metricId)?.label ?? metricId,
            cell: (info) => {
              const item = info.row.original
              const kind = item.periodCellKinds?.[index] ?? item.kind
              return (
                <div
                  className={cn(
                    "text-right tabular-nums",
                    isScopedForecastTotalRow(item) ? "font-semibold" : "font-normal",
                    kind === "expense" ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {formatStatementValue(kind, item.values[index] ?? 0)}
                </div>
              )
            },
            enableSorting: false,
          })
        ),
      ]
    }

    return [
      lineItemColumn,
      ...selectorColumns,
      ...displayPeriods.map<ColumnDef<ScopedForecastTableRow>>((period, index) => ({
        id: `period-${period.label}`,
        header: () => period.label,
        cell: (info) => {
          const item = info.row.original
          const kind = item.periodCellKinds?.[index] ?? item.kind

          return (
            <div
              className={cn(
                "text-right tabular-nums",
                isScopedForecastTotalRow(item) ? "font-semibold" : "font-normal",
                kind === "expense" ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {formatStatementValue(kind, item.values[index] ?? 0)}
            </div>
          )
        },
        enableSorting: false,
      })),
    ]
  }, [
    displayPeriods,
    isTotalHorizonPivot,
    onSelectBuildingVersion,
    onSelectOutlookSet,
    rows,
    selectionByAssetId,
    showSelectorColumns,
    useScenarioOverviewModificationSelectProp,
  ])

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table useReactTable
  const table = useReactTable({
    data: tableData,
    columns,
    state: flatAssetContributions || isTotalHorizonPivot ? {} : { expanded },
    onExpandedChange:
      flatAssetContributions || isTotalHorizonPivot ? undefined : setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows,
    getRowId: (row) => row.id,
    autoResetExpanded: false,
  })

  const valueColumnCount = isTotalHorizonPivot
    ? TOTAL_HORIZON_PIVOT_METRICS.length
    : displayPeriods.length

  const totalTableMinWidth =
    FIRST_COLUMN_WIDTH_PX +
    (showSelectorColumns ? 2 * SELECTOR_COLUMN_WIDTH_PX : 0) +
    valueColumnCount * PERIOD_COLUMN_WIDTH_PX

  return (
    <div className="overflow-hidden">
      {statementToolbar === "default" ? (
        <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h2 className="text-base font-semibold tracking-tight text-foreground">Asset Forecast</h2>
          <StatementPeriodGranularitySelect
            value={periodGranularity}
            onValueChange={setPeriodGranularity}
          />
        </div>
      ) : null}

      <Table className="table-fixed" style={{ minWidth: `${totalTableMinWidth}px` }}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-b-2 border-border bg-muted hover:bg-muted/90"
            >
              {headerGroup.headers.map((header) => {
                const colId = header.column.id
                const isLineItemColumn = colId === "lineItem"
                const isModificationsColumn = colId === "modifications"
                const isOutlookColumn = colId === "outlook"

                return (
                  <TableHead
                    key={header.id}
                    scope="col"
                    className={cn(
                      "h-auto min-w-0 bg-muted py-2 align-middle text-sm font-medium text-foreground",
                      isLineItemColumn && "sticky left-0 z-20 px-2 text-left",
                      isModificationsColumn &&
                        "sticky z-[19] border-r border-border px-2 text-left",
                      isOutlookColumn &&
                        "sticky z-[18] border-r border-border px-2 text-left",
                      !isLineItemColumn &&
                        !isModificationsColumn &&
                        !isOutlookColumn &&
                        "px-2 text-right"
                    )}
                    style={
                      isLineItemColumn
                        ? firstColumnStyle
                        : isModificationsColumn
                          ? modificationsColumnStyle
                          : isOutlookColumn
                            ? outlookColumnStyle
                            : periodColumnStyle
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className={rowClassName(row.original)}>
              {row.getVisibleCells().map((cell) => {
                const colId = cell.column.id
                const isLineItemColumn = colId === "lineItem"
                const isModificationsColumn = colId === "modifications"
                const isOutlookColumn = colId === "outlook"

                return (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      isLineItemColumn && "sticky left-0 z-20 px-2",
                      isModificationsColumn &&
                        "sticky z-[19] border-r border-border px-2 py-2",
                      isOutlookColumn &&
                        "sticky z-[18] border-r border-border px-2 py-2",
                      !isLineItemColumn &&
                        !isModificationsColumn &&
                        !isOutlookColumn &&
                        "px-2",
                      row.original.rowType === "asset" &&
                        !isModificationsColumn &&
                        !isOutlookColumn
                        ? "py-2"
                        : !isModificationsColumn && !isOutlookColumn
                          ? "py-2"
                          : undefined,
                      isLineItemColumn && firstColumnSurfaceClassName(row.original),
                      (isModificationsColumn || isOutlookColumn) &&
                        selectorColumnsSurfaceClassName(row.original)
                    )}
                    style={
                      isLineItemColumn
                        ? firstColumnStyle
                        : isModificationsColumn
                          ? modificationsColumnStyle
                          : isOutlookColumn
                            ? outlookColumnStyle
                            : periodColumnStyle
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {portfolioTotalsPlacement === "belowStatement" ? (
        <ScopedForecastsPortfolioTotalsTable
          periods={periods}
          rows={rows}
          assetModels={assetModels}
        />
      ) : null}

      {metricFilter == null && !flatAssetContributions ? (
        <div className="border-t border-border bg-muted/10 px-4 py-2 text-xs text-muted-foreground">
          Expand any statement row to inspect building-level contributions for the current selection.
        </div>
      ) : null}
      {topAccessory != null ? (
        <div className="border-b border-border/60 px-4 py-3">{topAccessory}</div>
      ) : null}
    </div>
  )
}
