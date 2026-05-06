import {
  parseStoredSets,
  storageKeyForAsset,
} from "@/lib/building-modification-sets-storage"
import { INITIAL_MOD_VALUES } from "@/lib/building-modifications"
import {
  buildDefaultForecastScenarios,
  defaultForecastAssumptionsForAsset,
} from "@/lib/forecast-data"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import { getSampleStackingPlanData } from "@/lib/stacking-plan-data"
import {
  aggregateValuationConditionMetrics,
  buildValuationConditionMetricMap,
  type ValuationConditionMetrics,
} from "@/lib/valuation-condition-metrics"
import {
  DEFAULT_VALUATION_CONDITION_ID,
  type ValuationConditionId,
} from "@/lib/valuation-condition-config"

export type ScenarioPortfolioAggregate = {
  baseRevenueUsd: number
  scenarioRevenueUsd: number
  baseOpexUsd: number
  scenarioOpexUsd: number
  baseNoiUsd: number
  scenarioNoiUsd: number
  baseValueUsd: number
  scenarioValueUsd: number
  baseCapPct: number
  scenarioCapPct: number
  totalRsfSqft: number
  /** At least one visible row has a modification set applied in the table. */
  hasTableSelection: boolean
}

export function computeScenarioPortfolioAggregate(
  rows: PortfolioAssetRow[],
  selections: Record<string, string>,
  readStorage: boolean,
  valuationCondition: ValuationConditionId = DEFAULT_VALUATION_CONDITION_ID
): ScenarioPortfolioAggregate {
  let totalRsf = 0
  let hasTableSelection = false
  const baselineScenario = buildDefaultForecastScenarios()[0]

  if (baselineScenario == null) {
    return {
      baseRevenueUsd: 0,
      scenarioRevenueUsd: 0,
      baseOpexUsd: 0,
      scenarioOpexUsd: 0,
      baseNoiUsd: 0,
      scenarioNoiUsd: 0,
      baseValueUsd: 0,
      scenarioValueUsd: 0,
      baseCapPct: 0,
      scenarioCapPct: 0,
      totalRsfSqft: 0,
      hasTableSelection: false,
    }
  }

  const baselineMetrics: ValuationConditionMetrics[] = []
  const scenarioMetrics: ValuationConditionMetrics[] = []

  for (const row of rows) {
    const m = financialMetricsForAssetId(row.id)
    if (m == null) continue
    totalRsf += m.rsfSqft

    const assumptions = defaultForecastAssumptionsForAsset(row.id)
    const dataset = getSampleStackingPlanData(row.id)
    const baselineMetricMap = buildValuationConditionMetricMap({
      assetId: row.id,
      dataset,
      assumptions,
      scenario: baselineScenario,
      baseCapRatePct: m.capRatePct,
      modValues: INITIAL_MOD_VALUES,
    })

    let scenarioModValues = INITIAL_MOD_VALUES
    const setId = selections[row.id]
    if (setId && readStorage && typeof localStorage !== "undefined") {
      const rec = parseStoredSets(
        localStorage.getItem(storageKeyForAsset(row.id))
      ).find((s) => s.id === setId)
      if (rec != null) {
        scenarioModValues = rec.values
        hasTableSelection = true
      }
    }

    const scenarioMetricMap = buildValuationConditionMetricMap({
      assetId: row.id,
      dataset,
      assumptions,
      scenario: baselineScenario,
      baseCapRatePct: m.capRatePct,
      modValues: scenarioModValues,
    })

    baselineMetrics.push(baselineMetricMap[valuationCondition])
    scenarioMetrics.push(scenarioMetricMap[valuationCondition])
  }

  const baseAggregate = aggregateValuationConditionMetrics(baselineMetrics)
  const scenarioAggregate = aggregateValuationConditionMetrics(scenarioMetrics)

  return {
    baseRevenueUsd: baseAggregate.grossRevenue,
    scenarioRevenueUsd: scenarioAggregate.grossRevenue,
    baseOpexUsd: baseAggregate.opex,
    scenarioOpexUsd: scenarioAggregate.opex,
    baseNoiUsd: baseAggregate.noi,
    scenarioNoiUsd: scenarioAggregate.noi,
    baseValueUsd: baseAggregate.assetValue,
    scenarioValueUsd: scenarioAggregate.assetValue,
    baseCapPct: baseAggregate.capRate,
    scenarioCapPct: scenarioAggregate.capRate,
    totalRsfSqft: totalRsf,
    hasTableSelection,
  }
}
