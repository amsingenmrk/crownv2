"use client"

import * as React from "react"

import {
  BenchmarkHeaderMapLink,
  BenchmarkHeaderMapPreview,
} from "@/components/benchmark-header-map-link"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table"
import {
  BENCHMARK_KPI_DEFINITIONS,
  type BenchmarkBuildingTableRow,
  type BenchmarkKpiDisplayValue,
  type BenchmarkKpiDefinition,
  type BenchmarkKpiKey,
} from "@/lib/benchmark-area-model"
import type { BenchmarkArea } from "@/lib/benchmark-area-search"
import { benchmarksPageHref } from "@/lib/benchmark-area-url"
import { COMPARE_ROW_LABEL_COL_PX } from "@/lib/portfolio-compare-model"
import { qualityScoreValueClass } from "@/lib/stacking-plan-visual-tokens"
import { cn } from "@/lib/utils"

const VALUE_COL_MIN_PX = 140
const HEADER_MAP_FIXED_HEIGHT_CLASS = "h-[12.75rem]"

const gridRowStyle = {
  gridColumn: "1 / -1",
  gridTemplateColumns: "subgrid",
  columnGap: "0.75rem",
} as const

export type BenchmarkComparisonOption = { id: string; label: string }

function scoreCellClass(
  definition: BenchmarkKpiDefinition,
  value: string
): string | undefined {
  if (definition.format !== "score" || value === "—") return undefined
  const n = Number(value)
  if (!Number.isFinite(n)) return undefined
  return qualityScoreValueClass(n)
}

function percentileBadge(
  percentile: number | null | undefined
): { label: string; toneClassName: string } | null {
  if (percentile == null || !Number.isFinite(percentile)) return null
  const rounded = Math.round(percentile)
  const clamped = Math.max(0, Math.min(100, rounded))
  const suffix =
    rounded % 10 === 1 && rounded % 100 !== 11
      ? "st"
      : rounded % 10 === 2 && rounded % 100 !== 12
        ? "nd"
        : rounded % 10 === 3 && rounded % 100 !== 13
          ? "rd"
          : "th"

  return {
    label: `${rounded}${suffix} percentile`,
    toneClassName: qualityScoreValueClass(clamped),
  }
}

function BenchmarkColumnSelect({
  value,
  options,
  onValueChange,
  ariaLabel,
}: {
  value: string
  options: BenchmarkComparisonOption[]
  onValueChange: (value: string) => void
  ariaLabel: string
}) {
  const disabled = options.length === 0
  const selectedLabel =
    options.find((option) => option.id === value)?.label ?? "Select benchmark"

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string" && next !== "") {
          onValueChange(next)
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger
        size="sm"
        className="h-7 w-full min-w-0 border-transparent bg-transparent px-0 text-left font-medium shadow-none hover:bg-accent/60 focus:ring-1"
        aria-label={ariaLabel}
      >
        <SelectValue placeholder="Select benchmark">{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function AssetBenchmarksTable({
  assetRow,
  assetName,
  assetPin,
  lowArea,
  lowLabel,
  lowKpis,
  lowPercentiles,
  marketArea,
  marketLabel,
  marketKpis,
  marketPercentiles,
  comparisonOptions,
  lowSelectionId,
  onLowSelectionChange,
  marketSelectionId,
  onMarketSelectionChange,
  className,
}: {
  assetRow: BenchmarkBuildingTableRow | null
  assetName: string
  assetPin: { longitude: number; latitude: number } | null
  lowArea: BenchmarkArea
  lowLabel: string
  lowKpis: Record<BenchmarkKpiKey, BenchmarkKpiDisplayValue>
  lowPercentiles: Record<BenchmarkKpiKey, number | null>
  marketArea: BenchmarkArea
  marketLabel: string
  marketKpis: Record<BenchmarkKpiKey, BenchmarkKpiDisplayValue>
  marketPercentiles: Record<BenchmarkKpiKey, number | null>
  comparisonOptions: BenchmarkComparisonOption[]
  lowSelectionId: string
  onLowSelectionChange: (id: string) => void
  marketSelectionId: string
  onMarketSelectionChange: (id: string) => void
  className?: string
}) {
  const gridTemplateColumns = `${COMPARE_ROW_LABEL_COL_PX}px minmax(${VALUE_COL_MIN_PX}px, 1fr) minmax(${VALUE_COL_MIN_PX}px, 1fr) minmax(${VALUE_COL_MIN_PX}px, 1fr)`
  const tableMinWidth = COMPARE_ROW_LABEL_COL_PX + VALUE_COL_MIN_PX * 3
  const pickerOptions = React.useMemo(() => {
    const items = [...comparisonOptions]
    const seen = new Set(items.map((option) => option.id))
    if (!seen.has(lowSelectionId)) {
      items.push({ id: lowSelectionId, label: lowLabel })
      seen.add(lowSelectionId)
    }
    if (!seen.has(marketSelectionId)) {
      items.push({ id: marketSelectionId, label: marketLabel })
    }
    return items
  }, [
    comparisonOptions,
    lowLabel,
    lowSelectionId,
    marketLabel,
    marketSelectionId,
  ])
  const definitions = BENCHMARK_KPI_DEFINITIONS.filter(
    (definition) => definition.key !== "observedCapRate"
  )
  const groupedDefinitions = [
    {
      id: "fundamentals" as const,
      title: "Fundamentals",
      definitions: definitions.filter((definition) => definition.section === "fundamentals"),
    },
    {
      id: "rents" as const,
      title: "Rents",
      definitions: definitions.filter((definition) => definition.section === "rents"),
    },
    {
      id: "scores" as const,
      title: "Scores",
      definitions: definitions.filter((definition) => definition.section === "scores"),
    },
  ].filter((group) => group.definitions.length > 0)

  return (
    <div className={cn("min-w-0", className)}>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table
          className="grid w-full px-0 caption-bottom text-sm"
          style={{
            gridTemplateColumns,
            minWidth: Math.max(tableMinWidth, 360),
          }}
        >
          <TableBody className="contents [&_tr:last-child]:border-b-0">
            <TableRow
              className="grid items-start border-b border-border bg-muted/50 hover:bg-muted/50"
              style={gridRowStyle}
            >
              <TableHead className="h-auto border-0 px-2 py-2 text-left font-medium text-foreground">
                {/* KPI label column — empty header like compare */}
              </TableHead>
              <TableHead className="h-auto min-w-0 border-0 px-2 py-2 text-left font-normal">
                <div className="grid grid-rows-[auto_1.75rem] gap-1.5">
                  {assetPin ? (
                    <BenchmarkHeaderMapPreview
                      label={assetName}
                      pin={assetPin}
                      showLabel={false}
                      mapHeightClassName={HEADER_MAP_FIXED_HEIGHT_CLASS}
                    />
                  ) : (
                    <div
                      className={cn(
                        "relative w-full rounded-md border border-border/80 bg-muted/25",
                        HEADER_MAP_FIXED_HEIGHT_CLASS
                      )}
                    />
                  )}
                  <div className="flex h-7 items-center">
                    <span className="truncate font-medium text-foreground">{assetName}</span>
                  </div>
                </div>
              </TableHead>
              <TableHead className="h-auto min-w-0 border-0 px-2 py-2 text-left font-normal">
                <div className="grid grid-rows-[auto_1.75rem] gap-1.5">
                  <BenchmarkHeaderMapLink
                    href={benchmarksPageHref(lowArea.id)}
                    label={lowLabel}
                    area={lowArea}
                    pin={assetPin ?? undefined}
                    hideLabel
                    mapHeightClassName={HEADER_MAP_FIXED_HEIGHT_CLASS}
                  />
                  <div className="flex h-7 w-full items-center">
                    <BenchmarkColumnSelect
                      value={lowSelectionId}
                      options={pickerOptions}
                      onValueChange={onLowSelectionChange}
                      ariaLabel="Select left benchmark column"
                    />
                  </div>
                </div>
              </TableHead>
              <TableHead className="h-auto min-w-0 border-0 px-2 py-2 text-left font-normal">
                <div className="grid grid-rows-[auto_1.75rem] gap-1.5">
                  <BenchmarkHeaderMapLink
                    href={benchmarksPageHref(marketArea.id)}
                    label={marketLabel}
                    area={marketArea}
                    pin={assetPin ?? undefined}
                    hideLabel
                    mapHeightClassName={HEADER_MAP_FIXED_HEIGHT_CLASS}
                  />
                  <div className="flex h-7 w-full items-center">
                    <BenchmarkColumnSelect
                      value={marketSelectionId}
                      options={pickerOptions}
                      onValueChange={onMarketSelectionChange}
                      ariaLabel="Select right benchmark column"
                    />
                  </div>
                </div>
              </TableHead>
            </TableRow>

            {assetRow == null ? (
              <TableRow
                className="grid items-center border-b border-border hover:bg-muted/50"
                style={gridRowStyle}
              >
                <TableCell
                  style={{ gridColumn: "1 / -1" }}
                  className="border-0 px-2 py-6 text-center text-sm text-muted-foreground"
                >
                  Benchmark data is not available for this asset.
                </TableCell>
              </TableRow>
            ) : (
              groupedDefinitions.flatMap((group, groupIndex) => {
                const sectionHeaderRow = (
                  <TableRow
                    key={`section-${group.id}`}
                    className="grid items-center hover:bg-transparent"
                    style={gridRowStyle}
                  >
                    <TableCell
                      style={{ gridColumn: "1 / -1" }}
                      className={cn(
                        "border-0 px-2 pb-1 pt-3 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground",
                        groupIndex > 0 && "border-t border-border/60"
                      )}
                    >
                      {group.title}
                    </TableCell>
                  </TableRow>
                )

                const kpiRows = group.definitions.map((definition) => {
                  const emptyValue: BenchmarkKpiDisplayValue = { value: "—" }
                  const assetValue = assetRow.kpis[definition.key] ?? emptyValue
                  const lowValue = lowKpis[definition.key] ?? emptyValue
                  const marketValue = marketKpis[definition.key] ?? emptyValue
                  const lowPercentile = percentileBadge(lowPercentiles[definition.key])
                  const marketPercentile = percentileBadge(
                    marketPercentiles[definition.key]
                  )
                  const assetValueClass = scoreCellClass(definition, assetValue.value)
                  const lowValueClass = scoreCellClass(definition, lowValue.value)
                  const marketValueClass = scoreCellClass(definition, marketValue.value)
                  const showAssetRange =
                    definition.key !== "occupancy" && assetValue.supportingRange != null

                  return (
                    <TableRow
                      key={definition.key}
                      className="grid items-center border-b border-border hover:bg-muted/50"
                      style={gridRowStyle}
                    >
                      <TableCell className="min-w-0 border-0 px-2 py-2 text-left align-middle font-medium">
                        {definition.label}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "min-w-0 border-0 px-2 py-2 text-left align-middle text-sm tabular-nums",
                          assetValueClass ?? "text-foreground"
                        )}
                      >
                        <div>
                          <div>{assetValue.value}</div>
                          {showAssetRange ? (
                            <div className="mt-0.5 text-[11px] text-muted-foreground">
                              ({assetValue.supportingRange})
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "min-w-0 border-0 px-2 py-2 text-left align-middle text-sm tabular-nums",
                          lowValueClass ?? "text-foreground"
                        )}
                      >
                        <div>
                          <div className="inline-flex items-center gap-1.5">
                            <span>{lowValue.value}</span>
                            {lowPercentile ? (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium",
                                  lowPercentile.toneClassName
                                )}
                              >
                                <span className="tabular-nums">{lowPercentile.label}</span>
                              </span>
                            ) : null}
                          </div>
                          {lowValue.supportingRange ? (
                            <div className="mt-0.5 text-[11px] text-muted-foreground">
                              ({lowValue.supportingRange})
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "min-w-0 border-0 px-2 py-2 text-left align-middle text-sm tabular-nums",
                          marketValueClass ?? "text-foreground"
                        )}
                      >
                        <div>
                          <div className="inline-flex items-center gap-1.5">
                            <span>{marketValue.value}</span>
                            {marketPercentile ? (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium",
                                  marketPercentile.toneClassName
                                )}
                              >
                                <span className="tabular-nums">{marketPercentile.label}</span>
                              </span>
                            ) : null}
                          </div>
                          {marketValue.supportingRange ? (
                            <div className="mt-0.5 text-[11px] text-muted-foreground">
                              ({marketValue.supportingRange})
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })

                return [sectionHeaderRow, ...kpiRows]
              })
            )}
          </TableBody>
        </table>
      </div>
    </div>
  )
}
