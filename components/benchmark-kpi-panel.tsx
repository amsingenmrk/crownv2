"use client"

import * as React from "react"

import { AssetForecastCharts } from "@/components/asset-forecast-charts"
import { ScopedForecastsPortfolioTotalsTable } from "@/components/scoped-forecasts-table"
import type { BenchmarkAreaSnapshot } from "@/lib/benchmark-area-model"
import type { BenchmarkArea } from "@/lib/benchmark-area-search"
import { buildBenchmarkAreaForecastRollup } from "@/lib/benchmark-area-forecast"
import type { ForecastChartTab } from "@/lib/forecast-chart-config"
import { cn } from "@/lib/utils"

export function BenchmarkKpiPanel({
  area,
  snapshot,
  className,
}: {
  area: BenchmarkArea
  snapshot: BenchmarkAreaSnapshot
  className?: string
}) {
  const [metricTab, setMetricTab] = React.useState<ForecastChartTab>("grossRevenue")

  const forecastRollup = React.useMemo(
    () => buildBenchmarkAreaForecastRollup(area),
    [area.id, area.label]
  )

  return (
    <aside
      className={cn(
        "@container flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden",
        className
      )}
      aria-label="Benchmark metrics for map area"
    >
      <div className="shrink-0 space-y-0.5 border-b border-border pb-2.5">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {snapshot.areaLabel}
        </h2>
        <p className="text-xs text-muted-foreground">
          {snapshot.buildingCount === 1
            ? "1 building in view"
            : `${snapshot.buildingCount} buildings in view`}
          {snapshot.fullParticipantCount > 0 &&
          snapshot.fullParticipantCount < snapshot.buildingCount
            ? ` · ${snapshot.fullParticipantCount} full participants`
            : null}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
        <section
          className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          aria-label={`${snapshot.areaLabel} portfolio totals`}
        >
          <div className="border-b border-border/60 px-4 py-3">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Portfolio totals
            </h2>
          </div>
          <ScopedForecastsPortfolioTotalsTable
            key={area.id}
            periods={forecastRollup.expectedModel.periods}
            rows={forecastRollup.expectedModel.statementRows}
            assetModels={[]}
            outlookModels={forecastRollup.outlookModels}
            metricFocus={metricTab}
          />
        </section>

        <AssetForecastCharts
          key={area.id}
          models={forecastRollup.chartModels}
          metricTab={metricTab}
          onMetricTabChange={setMetricTab}
          metricToolbarInCard
        />
      </div>
    </aside>
  )
}
