"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight } from "lucide-react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { assetForecastHref } from "@/lib/assets"
import type { ForecastChartTab } from "@/lib/forecast-chart-config"
import type { ForecastPeriod, ForecastStatementRow } from "@/lib/forecast-data"
import { isMarketListingRowId } from "@/lib/market-listing-portfolio-row"
import type { ScopedForecastResolvedAssetModel } from "@/lib/scoped-forecast-rollup"
import { cn } from "@/lib/utils"

const SCENARIO_FORECAST_METRIC_IDS = [
  "grossRevenue",
  "opex",
  "noi",
  "salePrice",
  "capRate",
] as const

type ScenarioForecastMetricId = (typeof SCENARIO_FORECAST_METRIC_IDS)[number]

type ScenarioForecastAssetRow = {
  id: string
  label: string
  kind: ForecastStatementRow["kind"]
  values: number[]
  href?: string
}

type ScenarioForecastMetricRow = {
  metricId: ScenarioForecastMetricId
  label: string
  kind: ForecastStatementRow["kind"]
  values: number[]
  assetRows: ScenarioForecastAssetRow[]
  startsSection?: boolean
}

const FIRST_COLUMN_WIDTH_PX = 280
const PERIOD_COLUMN_WIDTH_PX = 108

const firstColumnStyle: React.CSSProperties = {
  width: FIRST_COLUMN_WIDTH_PX,
  minWidth: FIRST_COLUMN_WIDTH_PX,
}

const periodColumnStyle: React.CSSProperties = {
  width: PERIOD_COLUMN_WIDTH_PX,
  minWidth: PERIOD_COLUMN_WIDTH_PX,
}

function compactUnitPart(x: number): string {
  const rounded = Math.round(x * 10) / 10
  const whole = Math.round(rounded)
  if (Math.abs(rounded - whole) < 1e-9) {
    return String(whole)
  }
  return rounded.toFixed(1)
}

function formatUsdAbsPositive(abs: number): string {
  if (abs >= 1_000_000_000) {
    return `$${compactUnitPart(abs / 1_000_000_000)}B`
  }
  if (abs >= 1_000_000) {
    return `$${compactUnitPart(abs / 1_000_000)}M`
  }
  if (abs >= 1_000) {
    return `$${compactUnitPart(abs / 1_000)}K`
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(abs)
}

function formatUsdSigned(value: number): string {
  const core = formatUsdAbsPositive(Math.abs(value))
  return value < 0 ? `-${core}` : core
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

function isScenarioForecastMetricId(
  value: ForecastChartTab | null | undefined
): value is ScenarioForecastMetricId {
  return value != null && (SCENARIO_FORECAST_METRIC_IDS as readonly string[]).includes(value)
}

function resolveExpandedMetricId(
  metricFocus: ForecastChartTab | undefined,
  metricRows: readonly ScenarioForecastMetricRow[]
): ScenarioForecastMetricId | null {
  if (isScenarioForecastMetricId(metricFocus)) {
    const focusedRowExists = metricRows.some((row) => row.metricId === metricFocus)
    if (focusedRowExists) {
      return metricFocus
    }
  }
  return metricRows[0]?.metricId ?? null
}

function buildScenarioForecastMetricRows({
  rows,
  assetModels,
}: {
  rows: readonly ForecastStatementRow[]
  assetModels: readonly ScopedForecastResolvedAssetModel[]
}): ScenarioForecastMetricRow[] {
  return SCENARIO_FORECAST_METRIC_IDS.flatMap((metricId) => {
    const statementRow = rows.find((row) => row.id === metricId)
    if (statementRow == null) {
      return []
    }

    const assetRows = assetModels.map<ScenarioForecastAssetRow>((entry) => {
      const assetStatementRow =
        entry.model.statementRows.find((row) => row.id === metricId) ?? statementRow

      return {
        id: `${metricId}-${entry.model.assetId}`,
        label: entry.model.assetName,
        kind: assetStatementRow.kind,
        values: assetStatementRow.values,
        href: isMarketListingRowId(entry.selection.row.id)
          ? undefined
          : assetForecastHref(entry.selection.row.id),
      }
    })

    return [
      {
        metricId,
        label: statementRow.label,
        kind: statementRow.kind,
        values: statementRow.values,
        assetRows,
        startsSection: metricId === "salePrice",
      },
    ]
  })
}

function metricRowSurfaceClassName(isExpanded: boolean) {
  return isExpanded ? "forecast-sticky-line-asset" : "forecast-sticky-line-metric-collapsed"
}

export function ScenarioAssetForecastsTable({
  periods,
  rows,
  assetModels,
  metricFocus,
  onExpandedMetricChange,
}: {
  periods: readonly ForecastPeriod[]
  rows: readonly ForecastStatementRow[]
  assetModels: readonly ScopedForecastResolvedAssetModel[]
  metricFocus?: ForecastChartTab
  onExpandedMetricChange?: (tab: ForecastChartTab) => void
}) {
  const metricRows = React.useMemo(
    () => buildScenarioForecastMetricRows({ rows, assetModels }),
    [assetModels, rows]
  )

  const [expandedMetricId, setExpandedMetricId] = React.useState<ScenarioForecastMetricId | null>(() =>
    resolveExpandedMetricId(metricFocus, metricRows)
  )

  React.useEffect(() => {
    const nextExpanded = resolveExpandedMetricId(metricFocus, metricRows)
    setExpandedMetricId((current) => {
      if (current === nextExpanded) return current
      return nextExpanded
    })
  }, [metricFocus, metricRows])

  const totalTableMinWidth = FIRST_COLUMN_WIDTH_PX + periods.length * PERIOD_COLUMN_WIDTH_PX

  const handleMetricToggle = React.useCallback(
    (metricId: ScenarioForecastMetricId) => {
      const next = expandedMetricId === metricId ? null : metricId
      setExpandedMetricId(next)
      if (next != null && next !== metricFocus) {
        onExpandedMetricChange?.(next)
      }
    },
    [expandedMetricId, metricFocus, onExpandedMetricChange]
  )

  if (metricRows.length === 0) return null

  return (
    <div className="border-t border-border/80">
      <div className="overflow-x-auto">
        <Table className="table-fixed" style={{ minWidth: `${totalTableMinWidth}px` }}>
          <TableHeader>
            <TableRow className="forecast-sticky-header-row border-b border-border hover:bg-transparent">
              <TableHead
                scope="col"
                className="sticky left-0 z-20 h-auto min-w-0 border-r border-border/60 px-2 py-2 text-left text-sm font-medium text-foreground"
                style={firstColumnStyle}
              >
                Line Item
              </TableHead>
              {periods.map((period) => (
                <TableHead
                  key={period.index}
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
            {metricRows.flatMap((metricRow) => {
              const isExpanded = expandedMetricId === metricRow.metricId
              const metricSurface = metricRowSurfaceClassName(isExpanded)

              return [
                <TableRow
                  key={metricRow.metricId}
                  className={cn(
                    "group border-b border-border hover:bg-transparent",
                    metricRow.startsSection && "border-t border-border/80"
                  )}
                >
                  <TableCell
                    className={cn(
                      "sticky left-0 z-20 border-r border-border/60 px-2 py-2.5",
                      metricSurface
                    )}
                    style={firstColumnStyle}
                  >
                    <button
                      type="button"
                      onClick={() => handleMetricToggle(metricRow.metricId)}
                      className="flex w-full min-w-0 items-center gap-2 text-left"
                      aria-expanded={isExpanded}
                      aria-controls={`scenario-forecast-assets-${metricRow.metricId}`}
                    >
                      {isExpanded ? (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate font-semibold text-foreground">
                        {metricRow.label}
                      </span>
                    </button>
                  </TableCell>
                  {periods.map((period, index) => (
                    <TableCell
                      key={`${metricRow.metricId}-${period.index}`}
                      className="px-3 py-2.5"
                      style={periodColumnStyle}
                    >
                      <div className="text-right font-semibold tabular-nums text-foreground">
                        {formatStatementValue(metricRow.kind, metricRow.values[index] ?? 0)}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>,
                ...(isExpanded
                  ? metricRow.assetRows.map((assetRow, assetIndex) => (
                      <TableRow
                        key={assetRow.id}
                        id={
                          assetIndex === 0
                            ? `scenario-forecast-assets-${metricRow.metricId}`
                            : undefined
                        }
                        className="group border-b border-border bg-muted/15 hover:bg-muted/25"
                      >
                        <TableCell
                          className="forecast-sticky-line-nested sticky left-0 z-20 border-r border-border/60 px-2 py-3"
                          style={firstColumnStyle}
                        >
                          <div className="pl-6">
                            {assetRow.href != null ? (
                              <Link
                                href={assetRow.href}
                                className="block min-w-0 rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              >
                                <span className="block whitespace-normal break-words">
                                  {assetRow.label}
                                </span>
                              </Link>
                            ) : (
                              <span className="block whitespace-normal break-words font-medium text-foreground">
                                {assetRow.label}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        {periods.map((period, index) => (
                          <TableCell
                            key={`${assetRow.id}-${period.index}`}
                            className="px-3 py-3"
                            style={periodColumnStyle}
                          >
                            <div
                              className={cn(
                                "text-right font-normal tabular-nums",
                                assetRow.kind === "expense"
                                  ? "text-muted-foreground"
                                  : "text-foreground"
                              )}
                            >
                              {formatStatementValue(assetRow.kind, assetRow.values[index] ?? 0)}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : []),
              ]
            })}
          </TableBody>
        </Table>
      </div>

      <div className="border-t border-border bg-muted/10 px-4 py-2 text-xs text-muted-foreground">
        Expand a line item to inspect asset-level contributions. Click an asset to open
        its forecast page.
      </div>
    </div>
  )
}
