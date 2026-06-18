"use client"

import * as React from "react"

import { BenchmarkHeaderMapLink } from "@/components/benchmark-header-map-link"
import { TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table"
import {
  BENCHMARK_KPI_DEFINITIONS,
  type BenchmarkBuildingTableRow,
  type BenchmarkKpiDefinition,
  type BenchmarkKpiKey,
} from "@/lib/benchmark-area-model"
import type { BenchmarkArea } from "@/lib/benchmark-area-search"
import { benchmarksPageHref } from "@/lib/benchmark-area-url"
import { COMPARE_ROW_LABEL_COL_PX } from "@/lib/portfolio-compare-model"
import { qualityScoreValueClass } from "@/lib/stacking-plan-visual-tokens"
import { cn } from "@/lib/utils"

const VALUE_COL_MIN_PX = 140

const gridRowStyle = {
  gridColumn: "1 / -1",
  gridTemplateColumns: "subgrid",
  columnGap: "0.75rem",
} as const

function scoreCellClass(
  definition: BenchmarkKpiDefinition,
  value: string
): string | undefined {
  if (definition.format !== "score" || value === "—") return undefined
  const n = Number(value)
  if (!Number.isFinite(n)) return undefined
  return qualityScoreValueClass(n)
}

export function AssetBenchmarksTable({
  assetRow,
  assetName,
  assetPin,
  homeArea,
  regionLabel,
  regionKpis,
  nationalArea,
  nationalLabel,
  nationalKpis,
  className,
}: {
  assetRow: BenchmarkBuildingTableRow | null
  assetName: string
  assetPin: { longitude: number; latitude: number } | null
  homeArea: BenchmarkArea
  regionLabel: string
  regionKpis: Record<BenchmarkKpiKey, string>
  nationalArea: BenchmarkArea
  nationalLabel: string
  nationalKpis: Record<BenchmarkKpiKey, string>
  className?: string
}) {
  const gridTemplateColumns = `${COMPARE_ROW_LABEL_COL_PX}px minmax(${VALUE_COL_MIN_PX}px, 1fr) minmax(${VALUE_COL_MIN_PX}px, 1fr) minmax(${VALUE_COL_MIN_PX}px, 1fr)`
  const tableMinWidth = COMPARE_ROW_LABEL_COL_PX + VALUE_COL_MIN_PX * 3

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
                {assetPin ? (
                  <BenchmarkHeaderMapLink
                    href={benchmarksPageHref(homeArea.id)}
                    label={assetName}
                    pin={assetPin}
                  />
                ) : (
                  <span className="line-clamp-2 font-medium text-foreground">
                    {assetName}
                  </span>
                )}
              </TableHead>
              <TableHead className="h-auto min-w-0 border-0 px-2 py-2 text-left font-normal">
                <BenchmarkHeaderMapLink
                  href={benchmarksPageHref(homeArea.id)}
                  label={regionLabel}
                  area={homeArea}
                />
              </TableHead>
              <TableHead className="h-auto min-w-0 border-0 px-2 py-2 text-left font-normal">
                <BenchmarkHeaderMapLink
                  href={benchmarksPageHref(nationalArea.id)}
                  label={nationalLabel}
                  area={nationalArea}
                />
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
              BENCHMARK_KPI_DEFINITIONS.map((definition) => {
                const assetValue = assetRow.kpis[definition.key]
                const regionValue = regionKpis[definition.key] ?? "—"
                const nationalValue = nationalKpis[definition.key] ?? "—"
                const assetValueClass = scoreCellClass(definition, assetValue)
                const regionValueClass = scoreCellClass(definition, regionValue)
                const nationalValueClass = scoreCellClass(definition, nationalValue)

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
                      {assetValue}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "min-w-0 border-0 px-2 py-2 text-left align-middle text-sm tabular-nums",
                        regionValueClass ?? "text-foreground"
                      )}
                    >
                      {regionValue}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "min-w-0 border-0 px-2 py-2 text-left align-middle text-sm tabular-nums",
                        nationalValueClass ?? "text-foreground"
                      )}
                    >
                      {nationalValue}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </table>
      </div>
    </div>
  )
}
