"use client"

import * as React from "react"
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
import type {
  ForecastPeriod,
  ForecastRevenueFloorRow,
  ForecastRevenueSpaceRow,
  ForecastStatementRow,
} from "@/lib/forecast-data"
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

type ForecastTableRow = {
  id: string
  rowType: "statement" | "floor" | "suite"
  label: string
  kind: ForecastStatementRow["kind"]
  values: number[]
  metaText?: string
  highlightLabel?: boolean
  highlightValue?: boolean
  startsSection?: boolean
  subRows?: ForecastTableRow[]
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

function suiteMetaText(space: ForecastRevenueSpaceRow) {
  return `${space.tenantName}${space.isVacant ? " · Available" : ""}`
}

function buildRevenueFloorRows(
  revenueBreakdown: ForecastRevenueFloorRow[]
): ForecastTableRow[] {
  return revenueBreakdown.map((floor) => ({
    id: floor.id,
    rowType: "floor",
    label: floor.label,
    kind: "currency",
    values: floor.values,
    metaText: `${floor.sqft.toLocaleString("en-US")} SF`,
    subRows: floor.spaces.map((space) => ({
      id: space.id,
      rowType: "suite",
      label: space.suite,
      kind: "currency",
      values: space.values,
      metaText: suiteMetaText(space),
    })),
  }))
}

function buildForecastTableRows(
  rows: ForecastStatementRow[],
  revenueBreakdown: ForecastRevenueFloorRow[]
): ForecastTableRow[] {
  const revenueRows = buildRevenueFloorRows(revenueBreakdown)

  return rows.map((row) => ({
    id: row.id,
    rowType: "statement",
    label: row.label,
    kind: row.kind,
    values: row.values,
    highlightLabel: row.id === "salePrice",
    highlightValue: row.id === "salePrice",
    startsSection: row.id === "salePrice",
    subRows: row.id === "grossRevenue" ? revenueRows : undefined,
  }))
}

function lineItemCellContent(row: Row<ForecastTableRow>) {
  const item = row.original

  if (item.rowType === "suite") {
    return (
      <div className="flex min-w-0 flex-col pl-10">
        <span className="truncate font-medium text-foreground">{item.label}</span>
        {item.metaText ? (
          <span className="truncate text-xs text-muted-foreground">{item.metaText}</span>
        ) : null}
      </div>
    )
  }

  if (row.getCanExpand()) {
    return (
      <button
        type="button"
        onClick={row.getToggleExpandedHandler()}
        className={cn(
          "flex w-full min-w-0 items-center gap-2 text-left",
          item.rowType === "floor" && "pl-4"
        )}
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
        {item.metaText ? (
          <span className="shrink-0 text-xs text-muted-foreground">{item.metaText}</span>
        ) : null}
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

function rowClassName(item: ForecastTableRow) {
  if (item.rowType === "floor") {
    return "group bg-muted/25 hover:bg-muted/30"
  }

  if (item.rowType === "suite") {
    return "group bg-background/80 hover:bg-muted/15"
  }

  return cn(
    "group",
    "hover:bg-transparent",
    item.startsSection && "border-t border-border/80"
  )
}

function firstColumnSurfaceClassName(item?: ForecastTableRow) {
  if (item == null) {
    return "bg-card"
  }

  if (item.rowType === "floor") {
    return "bg-muted/25 group-hover:bg-muted/30"
  }

  if (item.rowType === "suite") {
    return "bg-background/80 group-hover:bg-muted/15"
  }

  return "bg-background"
}

export function AssetForecastsTable({
  periods,
  rows,
  revenueBreakdown,
  topAccessory,
}: {
  periods: ForecastPeriod[]
  rows: ForecastStatementRow[]
  revenueBreakdown: ForecastRevenueFloorRow[]
  topAccessory?: React.ReactNode
}) {
  const [expanded, setExpanded] = React.useState<ExpandedState>({})

  const data = React.useMemo(
    () => buildForecastTableRows(rows, revenueBreakdown),
    [revenueBreakdown, rows]
  )

  const columns = React.useMemo<ColumnDef<ForecastTableRow>[]>(
    () => [
      {
        id: "lineItem",
        header: () => "Line Item",
        cell: ({ row }) => lineItemCellContent(row),
        enableSorting: false,
      },
      ...periods.map<ColumnDef<ForecastTableRow>>((period, index) => ({
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

      <Table
        className="table-fixed"
        style={{ minWidth: `${totalTableMinWidth}px` }}
      >
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
                      isLineItemColumn
                        ? "sticky left-0 z-10 px-4"
                        : "px-3",
                      row.original.rowType === "suite" ? "py-3" : "py-2.5",
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

      <div className="border-t border-border bg-muted/10 px-4 py-2 text-xs text-muted-foreground">
        Expand <span className="font-medium text-foreground">Gross Revenue</span> to inspect
        floor and suite-level revenue build-up.
      </div>
    </div>
  )
}
