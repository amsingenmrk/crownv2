"use client"

import * as React from "react"

import { AssetForecastCharts } from "@/components/asset-forecast-charts"
import type {
  BenchmarkKpiDisplayValue,
  BenchmarkKpiKey,
} from "@/lib/benchmark-area-model"
import type { ForecastChartTab } from "@/lib/forecast-chart-config"
import {
  buildDefaultForecastScenarios,
  buildForecastPeriods,
  scenarioEffectsForPeriod,
  type AssetForecastModel,
} from "@/lib/forecast-data"

type ProjectionColumn = {
  id: string
  label: string
  kpis: Record<BenchmarkKpiKey, BenchmarkKpiDisplayValue>
}

const ALLOWED_PROJECTION_TABS = ["intrinsicRent", "capRate"] as const

function parseCurrencyPsf(value: BenchmarkKpiDisplayValue | undefined): number | null {
  if (!value || value.value === "—") return null
  const parsed = Number(value.value.replace(/[$,/A-Z\s]+/g, ""))
  return Number.isFinite(parsed) ? parsed : null
}

function parsePercent(value: BenchmarkKpiDisplayValue | undefined): number | null {
  if (!value || value.value === "—") return null
  const parsed = Number(value.value.replace("%", "").trim())
  return Number.isFinite(parsed) ? parsed : null
}

function buildProjectionModel(
  column: ProjectionColumn,
  index: number
): AssetForecastModel {
  const baseline = buildDefaultForecastScenarios()[0]!
  const periods = buildForecastPeriods()
  const intrinsicRentBase = parseCurrencyPsf(column.kpis.intrinsicRent) ?? 0
  const capRateBase = parsePercent(column.kpis.intrinsicCapRate) ?? 0
  const scenario = {
    ...baseline,
    id: `asset-benchmark-${index}`,
    name: column.label,
  }

  const intrinsicRent = periods.map((period) => {
    const macro =
      baseline.macroPeriods[
        Math.min(period.index, baseline.macroPeriods.length - 1)
      ]!
    const effects = scenarioEffectsForPeriod(macro)
    return Number(
      (intrinsicRentBase * Math.pow(effects.rentFactor, period.index)).toFixed(2)
    )
  })

  const capRate = periods.map((period) => {
    const macro =
      baseline.macroPeriods[
        Math.min(period.index, baseline.macroPeriods.length - 1)
      ]!
    const effects = scenarioEffectsForPeriod(macro)
    return Number(
      Math.max(0, capRateBase + effects.exitCapAdjustmentPct).toFixed(2)
    )
  })

  return {
    assetId: column.id,
    assetName: column.label,
    scenario,
    assumptions: {
      markToMarketEnabled: true,
      timeToLeaseMonths: 9,
      occupancyTargetPct: 88,
      defaultRenewalProbabilityPct: 62,
      exitCapRatePct: capRate[capRate.length - 1] ?? capRateBase,
    },
    periods,
    statementRows: [
      {
        id: "intrinsicRent",
        label: "Intrinsic Rent",
        kind: "rentPsf",
        values: intrinsicRent,
      },
      {
        id: "capRate",
        label: "Cap Rate",
        kind: "percent",
        values: capRate,
      },
    ],
    revenueBreakdown: [],
    summary: {
      currentOccupancyPct: parsePercent(column.kpis.occupancy) ?? 0,
      targetOccupancyPct: 88,
      currentAnnualRevenue: 0,
      currentAnnualOpex: 0,
      currentAnnualNoi: 0,
      exitCapRatePct: capRate[capRate.length - 1] ?? capRateBase,
    },
  }
}

export function AssetBenchmarkProjectionCharts({
  columns,
}: {
  columns: ProjectionColumn[]
}) {
  const [metricTab, setMetricTab] =
    React.useState<ForecastChartTab>("intrinsicRent")
  const models = React.useMemo(
    () => columns.map((column, index) => buildProjectionModel(column, index)),
    [columns]
  )

  return (
    <AssetForecastCharts
      models={models}
      metricTab={metricTab}
      onMetricTabChange={setMetricTab}
      allowedMetricTabs={ALLOWED_PROJECTION_TABS}
      metricToolbarInCard
      toolbarVariant="compare"
      metricToolbarAriaLabel="Asset benchmark projection metric"
      lineOnly
      debugLabel="asset-benchmark-projections"
    />
  )
}
