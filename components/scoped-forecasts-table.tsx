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
import { ChevronDown, ChevronRight } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { assetHref } from "@/lib/assets"
import type { ForecastChartTab } from "@/lib/forecast-chart-config"
import type {
  ForecastPeriod,
  ForecastStatementRow,
} from "@/lib/forecast-data"
import { isMarketListingRowId } from "@/lib/market-listing-portfolio-row"
import type {
  ScopedForecastResolvedAssetModel,
} from "@/lib/scoped-forecast-rollup"
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

const FIRST_COLUMN_WIDTH_PX = 180
const PERIOD_COLUMN_WIDTH_PX = 108

const firstColumnStyle: React.CSSProperties = {
  width: FIRST_COLUMN_WIDTH_PX,
  minWidth: FIRST_COLUMN_WIDTH_PX,
}

const periodColumnStyle: React.CSSProperties = {
  width: PERIOD_COLUMN_WIDTH_PX,
  minWidth: PERIOD_COLUMN_WIDTH_PX,
}

type ScopedForecastTableRow = {
  id: string
  rowType: "statement" | "asset"
  label: string
  kind: ForecastStatementRow["kind"]
  values: number[]
  href?: string
  metaText?: string
  highlightLabel?: boolean
  highlightValue?: boolean
  startsSection?: boolean
  subRows?: ScopedForecastTableRow[]
}

function assetMetaText(
  entry: ScopedForecastResolvedAssetModel,
  variant: "baseline" | "selected"
) {
  const selectionLabel =
    variant === "baseline"
      ? "Baseline building · Baseline outlook"
      : `${entry.selection.selectedBuildingVersion.name} · ${entry.selection.selectedOutlookSet.name}`
  return `${entry.selection.row.location} · ${selectionLabel}`
}

function filterStatementRowsForMetric(
  rows: ForecastStatementRow[],
  metric: ForecastChartTab | undefined
): ForecastStatementRow[] {
  if (metric == null) return rows
  return rows.filter((row) => row.id === metric)
}

function buildScopedForecastTableRows({
  rows,
  assetModels,
  variant,
}: {
  rows: ForecastStatementRow[]
  assetModels: readonly ScopedForecastResolvedAssetModel[]
  variant: "baseline" | "selected"
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
    subRows: assetModels.map((entry) => {
      const assetRow =
        entry.model.statementRows.find((statementRow) => statementRow.id === row.id) ?? row

      return {
        id: `${row.id}-${entry.model.assetId}`,
        rowType: "asset",
        label: entry.model.assetName,
        kind: assetRow.kind,
        values: assetRow.values,
        href: isMarketListingRowId(entry.selection.row.id)
          ? undefined
          : assetHref(entry.selection.row.id),
        metaText: assetMetaText(entry, variant),
      }
    }),
  }))
}

function lineItemCellContent(row: Row<ScopedForecastTableRow>) {
  const item = row.original

  if (item.rowType === "asset") {
    return (
      <div className="flex min-w-0 flex-col pl-10">
        {item.href != null ? (
          <Link
            href={item.href}
            className="group/asset-link inline-flex w-fit max-w-full flex-col rounded-sm text-left underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="truncate font-medium text-foreground">
              {item.label}
            </span>
            {item.metaText ? (
              <span className="truncate text-xs text-muted-foreground group-hover/asset-link:text-foreground/80">
                {item.metaText}
              </span>
            ) : null}
          </Link>
        ) : (
          <>
            <span className="truncate font-medium text-foreground">{item.label}</span>
            {item.metaText ? (
              <span className="truncate text-xs text-muted-foreground">{item.metaText}</span>
            ) : null}
          </>
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
      >
        {row.getIsExpanded() ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span
          className={cn(
            "truncate font-medium text-foreground",
            item.highlightLabel && "font-semibold"
          )}
        >
          {item.label}
        </span>
      </button>
    )
  }

  return (
    <div className="flex min-w-0 items-center">
      <span
        className={cn(
          "truncate font-medium text-foreground",
          item.highlightLabel && "font-semibold"
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

  return "bg-background"
}

export function ScopedForecastsTable({
  periods,
  rows,
  assetModels,
  variant,
  topAccessory,
  metricFilter,
}: {
  periods: ForecastPeriod[]
  rows: ForecastStatementRow[]
  assetModels: readonly ScopedForecastResolvedAssetModel[]
  variant: "baseline" | "selected"
  topAccessory?: React.ReactNode
  metricFilter?: ForecastChartTab
}) {
  const filteredRows = React.useMemo(
    () => filterStatementRowsForMetric(rows, metricFilter),
    [metricFilter, rows]
  )

  const [expanded, setExpanded] = React.useState<ExpandedState>({
    grossRevenue: true,
  })

  React.useEffect(() => {
    if (metricFilter != null) {
      setExpanded({ [metricFilter]: true })
    }
  }, [metricFilter])

  const data = React.useMemo(
    () =>
      buildScopedForecastTableRows({
        rows: filteredRows,
        assetModels,
        variant,
      }),
    [assetModels, filteredRows, variant]
  )

  const columns = React.useMemo<ColumnDef<ScopedForecastTableRow>[]>(
    () => [
      {
        id: "lineItem",
        header: () => "Line Item",
        cell: ({ row }) => lineItemCellContent(row),
        enableSorting: false,
      },
      ...periods.map<ColumnDef<ScopedForecastTableRow>>((period, index) => ({
        id: `period-${period.label}`,
        header: () => period.label,
        cell: (info) => {
          const item = info.row.original

          return (
            <div
              className={cn(
                "text-right tabular-nums font-medium",
                item.kind === "expense" ? "text-muted-foreground" : "text-foreground",
                item.highlightValue && "font-semibold"
              )}
            >
              {formatStatementValue(item.kind, item.values[index] ?? 0)}
            </div>
          )
        },
        enableSorting: false,
      })),
    ],
    [periods]
  )

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table useReactTable
  const table = useReactTable({
    data,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (row) => row.subRows ?? [],
    getRowId: (row) => row.id,
    autoResetExpanded: false,
  })

  const totalTableMinWidth = FIRST_COLUMN_WIDTH_PX + periods.length * PERIOD_COLUMN_WIDTH_PX

  return (
    <div className="overflow-hidden">
      {topAccessory != null ? (
        <div className="border-b border-border/60 px-4 py-3">{topAccessory}</div>
      ) : null}

      <Table className="table-fixed" style={{ minWidth: `${totalTableMinWidth}px` }}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const isLineItemColumn = header.column.id === "lineItem"

                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      isLineItemColumn
                        ? "sticky left-0 z-20 px-4 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                        : "px-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground",
                      isLineItemColumn && firstColumnSurfaceClassName()
                    )}
                    style={isLineItemColumn ? firstColumnStyle : periodColumnStyle}
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
                const isLineItemColumn = cell.column.id === "lineItem"

                return (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      isLineItemColumn ? "sticky left-0 z-10 px-4" : "px-3",
                      row.original.rowType === "asset" ? "py-3" : "py-2.5",
                      isLineItemColumn && firstColumnSurfaceClassName(row.original)
                    )}
                    style={isLineItemColumn ? firstColumnStyle : periodColumnStyle}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {metricFilter == null ? (
        <div className="border-t border-border bg-muted/10 px-4 py-2 text-xs text-muted-foreground">
          Expand any statement row to inspect building-level contributions for the current selection.
        </div>
      ) : null}
    </div>
  )
}
