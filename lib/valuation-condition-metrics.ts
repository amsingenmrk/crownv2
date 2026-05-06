import { INITIAL_MOD_VALUES, type ModValues } from "@/lib/building-modifications"
import {
  defaultContractRateForVacancy,
  deriveBaseAnnualOpex,
  deriveLeaseUpShare,
  scenarioEffectsForPeriod,
  type ForecastAssumptions,
  type ForecastEconomicOutlookScenario,
} from "@/lib/forecast-data"
import { upliftFromModValues } from "@/lib/scenario-modification-uplift"
import type { StackingPlanDataset } from "@/lib/stacking-plan-data"
import type { ValuationConditionId } from "@/lib/valuation-condition-config"

export type ValuationConditionMetrics = {
  grossRevenue: number
  opex: number
  noi: number
  assetValue: number
  capRate: number
}

const ALL_VALUATION_CONDITIONS: readonly ValuationConditionId[] = [
  "grossPotential",
  "stabilized",
  "market",
  "inPlace",
  "markToMarket",
] as const

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function emptyMetrics(): ValuationConditionMetrics {
  return {
    grossRevenue: 0,
    opex: 0,
    noi: 0,
    assetValue: 0,
    capRate: 0,
  }
}

function metricsForRevenue({
  assetId,
  annualRevenue,
  baseCapRatePct,
  modValues,
}: {
  assetId: string
  annualRevenue: number
  baseCapRatePct: number
  modValues: ModValues
}): ValuationConditionMetrics {
  const revenueBeforeMods = Math.max(0, annualRevenue)
  const { noiMult, annualOpexDeltaUsd } = upliftFromModValues(modValues)
  const baseOpex = deriveBaseAnnualOpex(assetId, revenueBeforeMods)
  const baseNoi = revenueBeforeMods - baseOpex
  const grossRevenue =
    revenueBeforeMods + Math.max(0, baseNoi) * (noiMult - 1)
  const opex = Math.max(
    0,
    deriveBaseAnnualOpex(assetId, grossRevenue) + annualOpexDeltaUsd
  )
  const noi = grossRevenue - opex
  const capRate = clamp(baseCapRatePct, 4, 8)
  const assetValue =
    capRate > 0 ? Math.max(0, noi) / (capRate / 100) : 0

  return {
    grossRevenue,
    opex,
    noi,
    assetValue,
    capRate,
  }
}

export function buildValuationConditionMetricMap({
  assetId,
  dataset,
  assumptions,
  scenario,
  baseCapRatePct,
  modValues = INITIAL_MOD_VALUES,
}: {
  assetId: string
  dataset: StackingPlanDataset
  assumptions: ForecastAssumptions
  scenario: ForecastEconomicOutlookScenario
  baseCapRatePct: number
  modValues?: ModValues
}): Record<ValuationConditionId, ValuationConditionMetrics> {
  const currentMacroPeriod = scenario.macroPeriods[0]
  const effects =
    currentMacroPeriod != null
      ? scenarioEffectsForPeriod(currentMacroPeriod)
      : {
          rentFactor: 1,
          releaseFactor: 1,
          opexFactor: 1,
          occupancyTargetAdjustmentPct: 0,
          exitCapAdjustmentPct: 0,
        }
  const currentOccupancyPct = dataset.summary.overallOccupancyPercent
  const effectiveTargetOccupancyPct = clamp(
    assumptions.occupancyTargetPct + effects.occupancyTargetAdjustmentPct,
    65,
    99
  )
  const leaseUpShare = deriveLeaseUpShare(
    currentOccupancyPct,
    effectiveTargetOccupancyPct
  )

  let fullPotentialRevenueUsd = 0
  let inPlaceRevenueUsd = 0
  let markToMarketOccupiedRevenueUsd = 0
  let vacantPotentialRevenueUsd = 0

  for (const floor of dataset.floors) {
    for (const tenant of floor.tenants) {
      const contractRate =
        tenant.contractRatePsfValue ?? defaultContractRateForVacancy(tenant)
      const predictedRate =
        tenant.predictedRentPsfValue ?? contractRate * 1.08
      const contractAnnualRevenue =
        tenant.sqft * contractRate * effects.rentFactor
      const predictedAnnualRevenue =
        tenant.sqft * predictedRate * effects.rentFactor

      fullPotentialRevenueUsd += predictedAnnualRevenue

      if (tenant.isVacant) {
        vacantPotentialRevenueUsd += predictedAnnualRevenue
        continue
      }

      inPlaceRevenueUsd += contractAnnualRevenue
      markToMarketOccupiedRevenueUsd += predictedAnnualRevenue
    }
  }

  const marketVacancyCreditUsd =
    vacantPotentialRevenueUsd * leaseUpShare * effects.releaseFactor
  const stabilizedRevenueUsd =
    fullPotentialRevenueUsd * (effectiveTargetOccupancyPct / 100)

  const annualRevenueByCondition: Record<ValuationConditionId, number> = {
    grossPotential: fullPotentialRevenueUsd,
    stabilized: stabilizedRevenueUsd,
    market: inPlaceRevenueUsd + marketVacancyCreditUsd,
    inPlace: inPlaceRevenueUsd,
    markToMarket: markToMarketOccupiedRevenueUsd + marketVacancyCreditUsd,
  }

  return Object.fromEntries(
    ALL_VALUATION_CONDITIONS.map((condition) => [
      condition,
      metricsForRevenue({
        assetId,
        annualRevenue: annualRevenueByCondition[condition],
        baseCapRatePct,
        modValues,
      }),
    ])
  ) as Record<ValuationConditionId, ValuationConditionMetrics>
}

export function aggregateValuationConditionMetrics(
  metricsList: readonly ValuationConditionMetrics[]
): ValuationConditionMetrics {
  if (metricsList.length === 0) return emptyMetrics()

  const grossRevenue = metricsList.reduce(
    (sum, metrics) => sum + metrics.grossRevenue,
    0
  )
  const opex = metricsList.reduce((sum, metrics) => sum + metrics.opex, 0)
  const noi = metricsList.reduce((sum, metrics) => sum + metrics.noi, 0)
  const assetValue = metricsList.reduce(
    (sum, metrics) => sum + metrics.assetValue,
    0
  )

  return {
    grossRevenue,
    opex,
    noi,
    assetValue,
    capRate: assetValue > 0 ? Number(((noi / assetValue) * 100).toFixed(2)) : 0,
  }
}

export function probabilityWeightedValuationConditionMetrics({
  metrics,
  weights,
}: {
  metrics: readonly ValuationConditionMetrics[]
  weights: readonly number[]
}): ValuationConditionMetrics {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  if (metrics.length === 0 || totalWeight <= 0) return emptyMetrics()

  const weightedRevenue =
    metrics.reduce(
      (sum, entry, index) => sum + entry.grossRevenue * (weights[index] ?? 0),
      0
    ) / totalWeight
  const weightedOpex =
    metrics.reduce(
      (sum, entry, index) => sum + entry.opex * (weights[index] ?? 0),
      0
    ) / totalWeight
  const weightedNoi =
    metrics.reduce(
      (sum, entry, index) => sum + entry.noi * (weights[index] ?? 0),
      0
    ) / totalWeight
  const weightedValue =
    metrics.reduce(
      (sum, entry, index) => sum + entry.assetValue * (weights[index] ?? 0),
      0
    ) / totalWeight

  return {
    grossRevenue: Number(weightedRevenue.toFixed(2)),
    opex: Number(weightedOpex.toFixed(2)),
    noi: Number(weightedNoi.toFixed(2)),
    assetValue: Number(weightedValue.toFixed(2)),
    capRate:
      weightedValue > 0
        ? Number(((weightedNoi / weightedValue) * 100).toFixed(2))
        : 0,
  }
}

type MetricLike = {
  grossRevenue: number
  opex: number
  noi: number
  assetValue: number
  capRate: number
}

function scaleDisplayedMetricValue({
  displayedValue,
  marketValue,
  selectedValue,
}: {
  displayedValue: number
  marketValue: number
  selectedValue: number
}) {
  if (Math.abs(marketValue) <= 1e-6) {
    return selectedValue
  }
  return displayedValue * (selectedValue / marketValue)
}

export function scaleDisplayedMetricsForValuationCondition({
  displayedMetrics,
  marketAnnualMetrics,
  selectedAnnualMetrics,
}: {
  displayedMetrics: MetricLike
  marketAnnualMetrics: ValuationConditionMetrics
  selectedAnnualMetrics: ValuationConditionMetrics
}): MetricLike {
  return {
    grossRevenue: scaleDisplayedMetricValue({
      displayedValue: displayedMetrics.grossRevenue,
      marketValue: marketAnnualMetrics.grossRevenue,
      selectedValue: selectedAnnualMetrics.grossRevenue,
    }),
    opex: scaleDisplayedMetricValue({
      displayedValue: displayedMetrics.opex,
      marketValue: marketAnnualMetrics.opex,
      selectedValue: selectedAnnualMetrics.opex,
    }),
    noi: scaleDisplayedMetricValue({
      displayedValue: displayedMetrics.noi,
      marketValue: marketAnnualMetrics.noi,
      selectedValue: selectedAnnualMetrics.noi,
    }),
    assetValue: scaleDisplayedMetricValue({
      displayedValue: displayedMetrics.assetValue,
      marketValue: marketAnnualMetrics.assetValue,
      selectedValue: selectedAnnualMetrics.assetValue,
    }),
    capRate: selectedAnnualMetrics.capRate,
  }
}
