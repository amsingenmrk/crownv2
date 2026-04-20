"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ForecastPeriod, ForecastStatementRow } from "@/lib/forecast-data"
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
  label: string
  kind: ForecastStatementRow["kind"]
  values: number[]
  highlightLabel?: boolean
  highlightValue?: boolean
  startsSection?: boolean
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

function buildForecastTableRows(rows: ForecastStatementRow[]): ForecastTableRow[] {
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    kind: row.kind,
    values: row.values,
    highlightLabel: row.id === "salePrice",
    highlightValue: row.id === "salePrice",
    startsSection: row.id === "salePrice",
  }))
}

function lineItemCellContent(item: ForecastTableRow) {
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

  return "bg-background"
}

export function AssetForecastsTable({
  periods,
  rows,
  topAccessory,
}: {
  periods: ForecastPeriod[]
  rows: ForecastStatementRow[]
  topAccessory?: React.ReactNode
}) {
  const data = React.useMemo(() => buildForecastTableRows(rows), [rows])

  const columns = React.useMemo<ColumnDef<ForecastTableRow>[]>(
    () => [
      {
        id: "lineItem",
        header: () => "Line Item",
        cell: ({ row }) => lineItemCellContent(row.original),
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
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
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
                      isLineItemColumn ? "sticky left-0 z-10 px-4" : "px-3",
                      "py-2.5",
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
    </div>
  )
}
