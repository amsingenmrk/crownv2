"use client"

import * as React from "react"

import { ValuationKpiMetricStrip } from "@/components/valuation-kpi-metric-strip"
import { INITIAL_MOD_VALUES, type ModValues } from "@/lib/building-modifications"
import {
  buildDefaultForecastScenarios,
  defaultForecastAssumptionsForAsset,
} from "@/lib/forecast-data"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import { getSampleStackingPlanData } from "@/lib/stacking-plan-data"
import { buildValuationConditionMetricMap } from "@/lib/valuation-condition-metrics"
import { valuationKpiStripRowsFromBaselineModifiedMaps } from "@/lib/valuation-kpi-strip-rows"

export function AssetOverviewKpiStrip({
  assetId,
  compareModValues,
}: {
  assetId: string
  compareModValues?: ModValues
}) {
  const hasComparison = React.useMemo(
    () =>
      compareModValues != null &&
      Object.values(compareModValues).some((value) => value.trim() !== ""),
    [compareModValues]
  )

  const stripRows = React.useMemo(() => {
    const baselineScenario = buildDefaultForecastScenarios()[0]
    if (baselineScenario == null) {
      return null
    }

    const assumptions = defaultForecastAssumptionsForAsset(assetId)
    const financials = financialMetricsForAssetId(assetId)
    const baseCapRatePct = financials?.capRatePct ?? assumptions.exitCapRatePct
    const dataset = getSampleStackingPlanData(assetId)

    const baselineMetricMap = buildValuationConditionMetricMap({
      assetId,
      dataset,
      assumptions,
      scenario: baselineScenario,
      baseCapRatePct,
      modValues: INITIAL_MOD_VALUES,
    })
    const modifiedMetricMap = buildValuationConditionMetricMap({
      assetId,
      dataset,
      assumptions,
      scenario: baselineScenario,
      baseCapRatePct,
      modValues: compareModValues ?? INITIAL_MOD_VALUES,
    })

    return valuationKpiStripRowsFromBaselineModifiedMaps(
      baselineMetricMap,
      modifiedMetricMap,
      hasComparison
    )
  }, [assetId, compareModValues, hasComparison])

  if (stripRows == null) return null

  return (
    <ValuationKpiMetricStrip
      ariaLabel="Asset overview KPI strip (valuation conditions)"
      rows={stripRows}
      className="h-fit shrink-0"
    />
  )
}
