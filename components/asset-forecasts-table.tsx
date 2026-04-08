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
  ForecastStatementRow,
} from "@/lib/forecast-data"
import { cn } from "@/lib/utils"

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
})

function formatStatementValue(kind: ForecastStatementRow["kind"], value: number) {
  if (kind === "percent") {
    return `${value.toFixed(2)}%`
  }

  if (kind === "expense") {
    return `(${compactCurrencyFormatter.format(Math.abs(value))})`
  }

  return compactCurrencyFormatter.format(value)
}

function RevenueFloorRow({
  floor,
  periods,
  expanded,
  onToggle,
}: {
  floor: ForecastRevenueFloorRow
  periods: ForecastPeriod[]
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <TableRow className="bg-muted/20 hover:bg-muted/25">
        <TableCell className="sticky left-0 z-10 bg-muted/20 px-4">
          <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center gap-2 pl-4 text-left"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${floor.label}`}
          >
            {expanded ? (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )}
            <span className="font-medium text-foreground">{floor.label}</span>
            <span className="text-xs text-muted-foreground">
              {floor.sqft.toLocaleString()} SF
            </span>
          </button>
        </TableCell>
        {periods.map((period, index) => (
          <TableCell
            key={`${floor.id}-${period.label}`}
            className="text-right tabular-nums text-foreground"
          >
            {compactCurrencyFormatter.format(floor.values[index] ?? 0)}
          </TableCell>
        ))}
      </TableRow>
      {expanded
        ? floor.spaces.map((space) => (
            <TableRow key={space.id} className="bg-background/70 hover:bg-muted/20">
              <TableCell className="sticky left-0 z-10 bg-background/70 px-4">
                <div className="flex flex-col pl-11">
                  <span className="font-medium text-foreground">{space.suite}</span>
                  <span className="text-xs text-muted-foreground">
                    {space.tenantName}
                    {space.isVacant ? " · Available" : ""}
                  </span>
                </div>
              </TableCell>
              {periods.map((period, index) => (
                <TableCell
                  key={`${space.id}-${period.label}`}
                  className="text-right tabular-nums text-muted-foreground"
                >
                  {compactCurrencyFormatter.format(space.values[index] ?? 0)}
                </TableCell>
              ))}
            </TableRow>
          ))
        : null}
    </>
  )
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
  const [revenueExpanded, setRevenueExpanded] = React.useState(false)
  const [expandedFloors, setExpandedFloors] = React.useState<Record<string, boolean>>({})

  const toggleFloor = React.useCallback((floorId: string) => {
    setExpandedFloors((prev) => ({
      ...prev,
      [floorId]: !prev[floorId],
    }))
  }, [])

  React.useEffect(() => {
    if (!revenueExpanded) {
      setExpandedFloors({})
    }
  }, [revenueExpanded])

  return (
    <div className="overflow-hidden">
      {topAccessory != null ? (
        <div className="border-b border-border/60 px-4 py-3">
          {topAccessory}
        </div>
      ) : null}
      <Table className="min-w-[1040px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="sticky left-0 z-20 min-w-[220px] bg-card px-4">
              Line Item
            </TableHead>
            {periods.map((period) => (
              <TableHead
                key={period.label}
                className="bg-card px-3 text-right tabular-nums text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
              >
                {period.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isRevenueRow = row.id === "grossRevenue"
            return (
              <React.Fragment key={row.id}>
                <TableRow className={cn(isRevenueRow ? "bg-background" : "")}>
                  <TableCell className="sticky left-0 z-10 bg-background px-4">
                    {isRevenueRow ? (
                      <button
                        type="button"
                        onClick={() => setRevenueExpanded((prev) => !prev)}
                        className="flex items-center gap-2 text-left"
                        aria-label={`${revenueExpanded ? "Collapse" : "Expand"} ${row.label}`}
                      >
                        {revenueExpanded ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                        <span className="font-medium text-foreground">{row.label}</span>
                      </button>
                    ) : (
                      <span className="font-medium text-foreground">{row.label}</span>
                    )}
                  </TableCell>
                  {periods.map((period, index) => (
                    <TableCell
                      key={`${row.id}-${period.label}`}
                      className={cn(
                        "text-right tabular-nums font-medium",
                        row.kind === "expense" ? "text-muted-foreground" : "text-foreground"
                      )}
                    >
                      {formatStatementValue(row.kind, row.values[index] ?? 0)}
                    </TableCell>
                  ))}
                </TableRow>
                {isRevenueRow && revenueExpanded
                  ? revenueBreakdown.map((floor) => (
                      <RevenueFloorRow
                        key={floor.id}
                        floor={floor}
                        periods={periods}
                        expanded={expandedFloors[floor.id] === true}
                        onToggle={() => toggleFloor(floor.id)}
                      />
                    ))
                  : null}
              </React.Fragment>
            )
          })}
        </TableBody>
      </Table>
      <div className="border-t border-border bg-muted/10 px-4 py-2 text-xs text-muted-foreground">
        Expand <span className="font-medium text-foreground">Gross Revenue</span> to inspect
        floor and suite-level revenue build-up.
      </div>
    </div>
  )
}
