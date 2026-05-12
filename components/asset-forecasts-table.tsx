"use client"

import * as React from "react"
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

const FIRST_COLUMN_WIDTH_PX = 264
const PERIOD_COLUMN_WIDTH_PX = 116

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

type FlatForecastTableRow = ForecastTableRow & {
  depth: number
  canExpand: boolean
  isExpanded: boolean
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

function flattenForecastRows(
  rows: ForecastTableRow[],
  expanded: Record<string, boolean>,
  depth = 0
): FlatForecastTableRow[] {
  const out: FlatForecastTableRow[] = []
  for (const row of rows) {
    const canExpand = (row.subRows?.length ?? 0) > 0
    const isExpanded = Boolean(expanded[row.id])
    out.push({
      ...row,
      depth,
      canExpand,
      isExpanded,
    })
    if (canExpand && isExpanded) {
      out.push(...flattenForecastRows(row.subRows ?? [], expanded, depth + 1))
    }
  }
  return out
}

function lineItemLabelClassName(item: ForecastTableRow) {
  if (item.rowType === "suite") {
    return "text-foreground font-medium"
  }

  if (item.highlightLabel) {
    return "text-foreground font-semibold"
  }

  return "text-foreground font-medium"
}

function lineItemMetaClassName(item: ForecastTableRow) {
  if (item.rowType === "floor") {
    return "text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground"
  }
  return "text-xs text-muted-foreground"
}

function renderLineItemCell({
  row,
  onToggle,
}: {
  row: FlatForecastTableRow
  onToggle: (rowId: string) => void
}) {
  const indentationPx = row.depth * 24
  const icon = row.isExpanded ? (
    <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
  ) : (
    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
  )

  if (row.canExpand) {
    return (
      <button
        type="button"
        onClick={() => onToggle(row.id)}
        className="flex w-full min-w-0 gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label={`${row.isExpanded ? "Collapse" : "Expand"} ${row.label}`}
        style={{ paddingLeft: `${indentationPx}px` }}
      >
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {icon}
          <div className="min-w-0">
            <div className={cn("truncate leading-snug", lineItemLabelClassName(row))}>
              {row.label}
            </div>
            {row.metaText ? (
              <div className={cn("mt-0.5 truncate leading-snug", lineItemMetaClassName(row))}>
                {row.metaText}
              </div>
            ) : null}
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="min-w-0" style={{ paddingLeft: `${indentationPx + 24}px` }}>
      <div className={cn("truncate leading-snug", lineItemLabelClassName(row))}>
        {row.label}
      </div>
      {row.metaText ? (
        <div className={cn("mt-0.5 truncate leading-snug", lineItemMetaClassName(row))}>
          {row.metaText}
        </div>
      ) : null}
    </div>
  )
}

function valueTextClassName(item: ForecastTableRow) {
  return cn(
    "text-right tabular-nums text-foreground",
    item.highlightValue ? "font-semibold text-foreground" : "font-medium",
    item.kind === "expense" ? "text-muted-foreground" : "text-foreground"
  )
}

function rowClassName(item: ForecastTableRow) {
  return cn(
    "group border-b border-border",
    item.rowType === "floor" && "bg-muted/10 hover:bg-muted/15",
    item.rowType === "suite" && "bg-muted/20 hover:bg-muted/25",
    item.rowType === "statement" && "hover:bg-transparent",
    item.startsSection && "border-t border-border/80"
  )
}

function firstColumnSurfaceClassName(item: ForecastTableRow) {
  if (item.rowType === "floor") {
    return "forecast-sticky-line-floor"
  }
  if (item.rowType === "suite") {
    return "forecast-sticky-line-suite"
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
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})

  const data = React.useMemo(
    () => buildForecastTableRows(rows, revenueBreakdown),
    [revenueBreakdown, rows]
  )

  const visibleRows = React.useMemo(
    () => flattenForecastRows(data, expanded),
    [data, expanded]
  )

  const toggleExpanded = React.useCallback((rowId: string) => {
    setExpanded((prev) => ({ ...prev, [rowId]: !prev[rowId] }))
  }, [])

  const totalTableMinWidth = FIRST_COLUMN_WIDTH_PX + periods.length * PERIOD_COLUMN_WIDTH_PX

  return (
    <div className="overflow-hidden">
      {topAccessory != null ? (
        <div className="border-b border-border/60 px-4 py-3">{topAccessory}</div>
      ) : null}

      <Table className="table-fixed" style={{ minWidth: `${totalTableMinWidth}px` }}>
        <colgroup>
          <col style={firstColumnStyle} />
          {periods.map((period) => (
            <col key={period.label} style={periodColumnStyle} />
          ))}
        </colgroup>
        <TableHeader>
          <TableRow className="border-b-2 border-border bg-muted hover:bg-muted/90">
            <TableHead
              scope="col"
              className="sticky left-0 z-20 h-auto min-w-0 bg-muted px-2 py-2 text-left text-sm font-medium text-foreground"
              style={firstColumnStyle}
            >
              Line Item
            </TableHead>
            {periods.map((period) => (
              <TableHead
                key={period.label}
                scope="col"
                className="h-auto min-w-0 bg-muted px-2 py-2 text-right text-sm font-medium text-foreground"
                style={periodColumnStyle}
              >
                {period.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((row) => (
            <TableRow key={row.id} className={rowClassName(row)}>
              <TableCell
                className={cn(
                  "sticky left-0 z-20 px-2 py-2",
                  firstColumnSurfaceClassName(row)
                )}
                style={firstColumnStyle}
              >
                {renderLineItemCell({ row, onToggle: toggleExpanded })}
              </TableCell>
              {periods.map((period, index) => (
                <TableCell
                  key={`${row.id}-${period.label}`}
                  className="px-2 py-2"
                  style={periodColumnStyle}
                >
                  <div className={valueTextClassName(row)}>
                    {formatStatementValue(row.kind, row.values[index] ?? 0)}
                  </div>
                </TableCell>
              ))}
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
