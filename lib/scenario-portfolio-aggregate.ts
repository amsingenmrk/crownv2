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
  VALUATION_CONDITION_OPTIONS,
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

/** Baseline vs table-selected modification scenario, aggregated per valuation condition. */
export function computeScenarioPortfolioMetricsByConditionPair(
  rows: PortfolioAssetRow[],
  selections: Record<string, string>,
  readStorage: boolean
): {
  baselineByCondition: Record<ValuationConditionId, ValuationConditionMetrics>
  scenarioByCondition: Record<ValuationConditionId, ValuationConditionMetrics>
  hasTableSelection: boolean
} {
  const empty = (): ValuationConditionMetrics => ({
    grossRevenue: 0,
    opex: 0,
    noi: 0,
    assetValue: 0,
    capRate: 0,
  })
  const baselineLists = Object.fromEntries(
    VALUATION_CONDITION_OPTIONS.map((o) => [o.id, [] as ValuationConditionMetrics[]])
  ) as Record<ValuationConditionId, ValuationConditionMetrics[]>
  const scenarioLists = Object.fromEntries(
    VALUATION_CONDITION_OPTIONS.map((o) => [o.id, [] as ValuationConditionMetrics[]])
  ) as Record<ValuationConditionId, ValuationConditionMetrics[]>

  let hasTableSelection = false
  const baselineScenario = buildDefaultForecastScenarios()[0]

  if (baselineScenario == null) {
    const baselineByCondition = Object.fromEntries(
      VALUATION_CONDITION_OPTIONS.map((o) => [o.id, empty()])
    ) as Record<ValuationConditionId, ValuationConditionMetrics>
    const scenarioByCondition = { ...baselineByCondition }
    return { baselineByCondition, scenarioByCondition, hasTableSelection: false }
  }

  for (const row of rows) {
    const m = financialMetricsForAssetId(row.id)
    if (m == null) continue

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

    for (const condition of VALUATION_CONDITION_OPTIONS.map((o) => o.id)) {
      baselineLists[condition].push(baselineMetricMap[condition])
      scenarioLists[condition].push(scenarioMetricMap[condition])
    }
  }

  const baselineByCondition = Object.fromEntries(
    VALUATION_CONDITION_OPTIONS.map((o) => [
      o.id,
      aggregateValuationConditionMetrics(baselineLists[o.id]),
    ])
  ) as Record<ValuationConditionId, ValuationConditionMetrics>

  const scenarioByCondition = Object.fromEntries(
    VALUATION_CONDITION_OPTIONS.map((o) => [
      o.id,
      aggregateValuationConditionMetrics(scenarioLists[o.id]),
    ])
  ) as Record<ValuationConditionId, ValuationConditionMetrics>

  return { baselineByCondition, scenarioByCondition, hasTableSelection }
}
