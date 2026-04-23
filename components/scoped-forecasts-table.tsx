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
import type { ScopedForecastAssetSelection } from "@/lib/scoped-forecast"
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

function buildPortfolioOutlookBreakdownRows({
  rows,
  outlookModels,
}: {
  rows: ForecastStatementRow[]
  outlookModels: readonly ScopedForecastPortfolioOutlookModel[]
}): ScopedForecastTableRow[] {
  return rows.map((row) => ({
    id: row.id,
    rowType: "statement",
    label: row.label,
    kind: row.kind,
    values: row.values,
    highlightLabel: row.id === "salePrice",
    highlightValue: row.id === "salePrice",
    startsSection: row.id === "salePrice",
    subRows: outlookModels.map((outlookModel) => {
      const outlookRow =
        outlookModel.portfolioModel.statementRows.find(
          (statementRow) => statementRow.id === row.id
        ) ?? row

      return {
        id: `${row.id}-${outlookModel.scenarioId}`,
        rowType: "outlook",
        label: `${outlookModel.portfolioModel.scenario.name} (${outlookModel.probabilityPct}%)`,
        kind: outlookRow.kind,
        values: outlookRow.values,
        highlightLabel: row.id === "salePrice",
        highlightValue: row.id === "salePrice",
        subRows: assetSubRowsForPortfolioOutlookStatement({
          statementRow: row,
          assetModels: outlookModel.assetModels,
          outlookId: outlookModel.scenarioId,
        }),
      } satisfies ScopedForecastTableRow
    }),
  }))
}

const FIRST_COLUMN_WIDTH_PX = 180
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

/** Portfolio-level quarterly roll-up; can be rendered below the statement table or elsewhere (e.g. under the chart). */
export function ScopedForecastsPortfolioTotalsTable({
  periods,
  rows,
  assetModels,
  outlookModels,
  metricFocus,
  periodGranularity = "quarterly",
}: {
  periods: ForecastPeriod[]
  rows: ForecastStatementRow[]
  assetModels: readonly ScopedForecastResolvedAssetModel[]
  outlookModels?: readonly ScopedForecastPortfolioOutlookModel[]
  metricFocus?: ForecastChartTab
  periodGranularity?: ForecastStatementPeriodGranularity
}) {
  const hasOutlookBreakdown =
    outlookModels != null && outlookModels.length > 0
  const [expanded, setExpanded] = React.useState<ExpandedState>({})

  React.useEffect(() => {
    if (!hasOutlookBreakdown || metricFocus == null) return
    setExpanded((current) => ({
      ...(current === true ? {} : current),
      [metricFocus]: true,
    }))
  }, [hasOutlookBreakdown, metricFocus])

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

  const tableRows = React.useMemo(() => {
    if (hasOutlookBreakdown) {
      const nestedRows = buildPortfolioOutlookBreakdownRows({
        rows,
        outlookModels: outlookModels ?? [],
      })
      return periodGranularity === "quarterly"
        ? nestedRows
        : nestedRows.map(convertScopedForecastTableRowForTotalHorizon)
    }

    return buildPortfolioQuarterlySummaryRows(rows, assetModels).map((row) => ({
      id: row.id,
      rowType: "statement" as const,
      label: row.label,
      kind: row.kind,
      values:
        periodGranularity === "quarterly"
          ? row.values
          : singleColumnValuesForTotalHorizon(row.kind, row.id, row.values),
      highlightLabel: row.id === "salePrice",
      highlightValue: row.id === "salePrice",
      startsSection: row.id === "salePrice",
    }))
  }, [assetModels, hasOutlookBreakdown, outlookModels, periodGranularity, rows])

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
                "text-right tabular-nums",
                item.highlightValue ? "font-semibold" : "font-normal",
                item.kind === "expense" ? "text-muted-foreground" : "text-foreground"
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
    state: hasOutlookBreakdown ? { expanded } : {},
    onExpandedChange: hasOutlookBreakdown ? setExpanded : undefined,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: hasOutlookBreakdown
      ? (row: ScopedForecastTableRow) => row.subRows ?? undefined
      : undefined,
    getRowId: (row) => row.id,
    autoResetExpanded: false,
  })

  if (tableRows.length === 0) return null

  return (
    <div className={cn(!hasOutlookBreakdown && "border-t border-border/80")}>
      <Table className="table-fixed" style={{ minWidth: `${totalTableMinWidth}px` }}>
        <TableHeader>
          <TableRow className="border-b border-border bg-muted/80 hover:bg-muted/80">
            <TableHead
              scope="col"
              className="sticky left-0 z-20 h-auto min-w-0 border-r border-border/60 bg-muted/80 px-4 py-2 text-left text-sm font-medium text-foreground"
              style={firstColumnStyle}
            >
              Line Item
            </TableHead>
            {displayPeriods.map((period) => (
              <TableHead
                key={`summary-h-${period.label}`}
                scope="col"
                className="h-auto min-w-0 bg-muted/80 px-3 py-2 text-right text-sm font-medium text-foreground"
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
                  "sticky left-0 z-10 border-r border-border/60 px-4",
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
                      "text-right tabular-nums",
                      row.original.highlightValue ? "font-semibold" : "font-normal",
                      row.original.kind === "expense"
                        ? "text-muted-foreground"
                        : "text-foreground"
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
      ) : null}
    </div>
  )
}

type ScopedForecastTableRow = {
  id: string
  rowType: "statement" | "outlook" | "asset"
  /** Set for asset rows — drives Modifications / Outlook column dropdowns. */
  assetId?: string
  label: string
  kind: ForecastStatementRow["kind"]
  values: number[]
  /** When set (total-horizon pivot), value cells use this kind per column index instead of `kind`. */
  periodCellKinds?: ForecastStatementRow["kind"][]
  href?: string
  highlightLabel?: boolean
  highlightValue?: boolean
  startsSection?: boolean
  subRows?: ScopedForecastTableRow[]
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
    if (tableRowId === id || tableRowId.startsWith(`${id}-`)) {
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
}: {
  rows: ForecastStatementRow[]
  assetModels: readonly ScopedForecastResolvedAssetModel[]
}): ScopedForecastTableRow[] {
  const out: ScopedForecastTableRow[] = []
  for (const row of rows) {
    if (row.id === "grossRevenue") {
      out.push({
        id: row.id,
        rowType: "statement",
        label: row.label,
        kind: row.kind,
        values: row.values,
        highlightLabel: false,
        highlightValue: false,
        startsSection: false,
        subRows: assetSubRowsForStatementRow(row, assetModels),
      })
      continue
    }
    out.push({
      id: row.id,
      rowType: "statement",
      label: row.label,
      kind: row.kind,
      values: row.values,
      highlightLabel: row.id === "salePrice",
      highlightValue: row.id === "salePrice",
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
}: {
  rows: ForecastStatementRow[]
  assetModels: readonly ScopedForecastResolvedAssetModel[]
}): ScopedForecastTableRow[] {
  const out: ScopedForecastTableRow[] = []
  for (const row of rows) {
    if (row.id === "grossRevenue") {
      out.push({
        id: row.id,
        rowType: "statement",
        label: row.label,
        kind: row.kind,
        values: row.values,
        highlightLabel: false,
        highlightValue: false,
        startsSection: false,
      })
      out.push(...assetSubRowsForStatementRow(row, assetModels))
      continue
    }
    out.push({
      id: row.id,
      rowType: "statement",
      label: row.label,
      kind: row.kind,
      values: row.values,
      highlightLabel: row.id === "salePrice",
      highlightValue: row.id === "salePrice",
      startsSection: row.id === "salePrice",
    })
    out.push(...assetSubRowsForStatementRow(row, assetModels))
  }
  return out
}

function lineItemCellContent(row: Row<ScopedForecastTableRow>) {
  const item = row.original
  const firstRowWeight = row.index === 0 ? "font-semibold" : "font-medium"
  const indentationStyle =
    row.depth === 0 ? undefined : { paddingLeft: `${row.depth * 16}px` }

  if (item.rowType === "asset") {
    return (
      <div className="flex min-w-0" style={indentationStyle}>
        {item.href != null ? (
          <Link
            href={item.href}
            className={cn(
              "group/asset-link inline-flex min-w-0 max-w-full truncate rounded-sm text-left text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              firstRowWeight
            )}
          >
            {item.label}
          </Link>
        ) : (
          <span className={cn("truncate text-foreground", firstRowWeight)}>{item.label}</span>
        )}
      </div>
    )
  }

  if (row.getCanExpand()) {
    return (
      <button
        type="button"
        onClick={row.getToggleExpandedHandler()}
        className="flex w-full min-w-0 items-center gap-2 text-left"
        aria-label={`${row.getIsExpanded() ? "Collapse" : "Expand"} ${item.label}`}
        style={indentationStyle}
      >
        {row.getIsExpanded() ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span
          className={cn(
            "truncate",
            item.rowType === "outlook" ? "text-muted-foreground" : "text-foreground",
            row.index === 0 || item.highlightLabel ? "font-semibold" : "font-medium"
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
          "truncate",
          item.rowType === "outlook" ? "text-muted-foreground" : "text-foreground",
          row.index === 0 || item.highlightLabel ? "font-semibold" : "font-medium"
        )}
      >
        {item.label}
      </span>
    </div>
  )
}

function rowClassName(item: ScopedForecastTableRow) {
  if (item.rowType === "asset") {
    return "group bg-muted/20 hover:bg-muted/25"
  }

  if (item.rowType === "outlook") {
    return "group bg-muted/10 hover:bg-muted/15"
  }

  return cn(
    "group",
    "hover:bg-transparent",
    item.startsSection && "border-t border-border/80"
  )
}

function firstColumnSurfaceClassName(item?: ScopedForecastTableRow) {
  if (item == null) {
    return "bg-card"
  }

  if (item.rowType === "asset") {
    return "bg-muted/20 group-hover:bg-muted/25"
  }

  if (item.rowType === "outlook") {
    return "bg-muted/10 group-hover:bg-muted/15"
  }

  return "bg-background"
}

/** Sticky Modifications / Outlook columns — match line-item column surfaces. */
function selectorColumnsSurfaceClassName(item?: ScopedForecastTableRow) {
  if (item == null) {
    return "bg-card"
  }

  if (item.rowType === "asset") {
    return "bg-muted/20 group-hover:bg-muted/25"
  }

  if (item.rowType === "outlook") {
    return "bg-muted/10 group-hover:bg-muted/15"
  }

  return "bg-background"
}

export function ScopedForecastsTable({
  periods,
  rows,
  assetModels,
  topAccessory,
  metricFilter,
  assetContributionsDisplay = "nested",
  assetSelections,
  onSelectBuildingVersion,
  onSelectOutlookSet,
  portfolioTotalsPlacement = "belowStatement",
  statementToolbar = "default",
  periodGranularity: periodGranularityProp,
  onPeriodGranularityChange,
}: {
  periods: ForecastPeriod[]
  rows: ForecastStatementRow[]
  assetModels: readonly ScopedForecastResolvedAssetModel[]
  topAccessory?: React.ReactNode
  metricFilter?: ForecastChartTab
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
}) {
  const flatAssetContributions = assetContributionsDisplay === "flat"

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

  React.useEffect(() => {
    if (flatAssetContributions || isTotalHorizonPivot) return
    if (metricFilter != null) {
      setExpanded({ [metricFilter]: true })
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
          })
        : buildScopedForecastTableRows({
            rows: filteredRows,
            assetModels,
          }),
    [assetModels, filteredRows, flatAssetContributions]
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
                    className="h-7 w-full max-w-[7.25rem] text-[0.75rem]"
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
              const isFirstRow = info.row.index === 0
              const kind = item.periodCellKinds?.[index] ?? item.kind
              return (
                <div
                  className={cn(
                    "text-right tabular-nums",
                    isFirstRow ? "font-semibold" : "font-normal",
                    kind === "expense" ? "text-muted-foreground" : "text-foreground"
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
          const isFirstRow = info.row.index === 0
          const kind = item.periodCellKinds?.[index] ?? item.kind

          return (
            <div
              className={cn(
                "text-right tabular-nums",
                isFirstRow ? "font-semibold" : "font-normal",
                kind === "expense" ? "text-muted-foreground" : "text-foreground"
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
                      isLineItemColumn &&
                        "sticky left-0 z-20 border-r border-border/60 px-4 text-left",
                      isModificationsColumn &&
                        "sticky z-[19] border-r border-border/60 px-2 text-left",
                      isOutlookColumn &&
                        "sticky z-[18] border-r border-border/60 px-2 text-left",
                      !isLineItemColumn &&
                        !isModificationsColumn &&
                        !isOutlookColumn &&
                        "px-3 text-right"
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
                      isLineItemColumn && "sticky left-0 z-10 border-r border-border/60 px-4",
                      isModificationsColumn &&
                        "sticky z-[9] border-r border-border/60 px-2 py-1.5",
                      isOutlookColumn && "sticky z-[8] border-r border-border/60 px-2 py-1.5",
                      !isLineItemColumn &&
                        !isModificationsColumn &&
                        !isOutlookColumn &&
                        "px-3",
                      row.original.rowType === "asset" &&
                        !isModificationsColumn &&
                        !isOutlookColumn
                        ? "py-3"
                        : !isModificationsColumn && !isOutlookColumn
                          ? "py-2.5"
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
