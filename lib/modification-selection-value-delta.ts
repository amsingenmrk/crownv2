import {
  INITIAL_MOD_VALUES,
  type ModValues,
} from "@/lib/building-modifications"
import {
  parseStoredSets,
  storageKeyForAsset,
} from "@/lib/building-modification-sets-storage"
import {
  buildDefaultForecastScenarios,
  defaultForecastAssumptionsForAsset,
} from "@/lib/forecast-data"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import {
  formatCapRatePts,
  formatUsdDeltaCompact,
  formatUsdPerSfDelta,
} from "@/lib/scenario-kpi-format"
import { getSampleStackingPlanData } from "@/lib/stacking-plan-data"
import { DEFAULT_VALUATION_CONDITION_ID } from "@/lib/valuation-condition-config"
import { buildValuationConditionMetricMap } from "@/lib/valuation-condition-metrics"

export type ModificationSelectionMetricKey =
  | "pricePerSf"
  | "revenue"
  | "opex"
  | "noi"
  | "value"
  | "capRate"

type MetricSnapshot = {
  pricePerSf: number
  revenue: number
  opex: number
  noi: number
  value: number
  capRate: number
  rsfSqft: number
}

function selectedModValuesForAsset(
  assetId: string,
  selectedSetId: string
): ModValues | null {
  if (selectedSetId === "" || typeof window === "undefined") {
    return null
  }

  const selectedSet = parseStoredSets(
    localStorage.getItem(storageKeyForAsset(assetId))
  ).find((set) => set.id === selectedSetId)

  return selectedSet?.values ?? null
}

function metricSnapshotForAsset(
  assetId: string,
  modValues: ModValues
): MetricSnapshot | null {
  const dataset = getSampleStackingPlanData(assetId)
  const scenario = buildDefaultForecastScenarios()[0]
  if (scenario == null) {
    return null
  }

  const assumptions = defaultForecastAssumptionsForAsset(assetId, dataset)
  const financials = financialMetricsForAssetId(assetId)
  const baseCapRatePct = financials?.capRatePct ?? assumptions.exitCapRatePct
  const metricMap = buildValuationConditionMetricMap({
    assetId,
    dataset,
    assumptions,
    scenario,
    baseCapRatePct,
    modValues,
  })
  const inPlaceMetrics = metricMap[DEFAULT_VALUATION_CONDITION_ID]
  const rsfSqft = Math.max(dataset.summary.totalSqft, 0)

  return {
    pricePerSf: rsfSqft > 0 ? inPlaceMetrics.assetValue / rsfSqft : 0,
    revenue: inPlaceMetrics.grossRevenue,
    opex: inPlaceMetrics.opex,
    noi: inPlaceMetrics.noi,
    value: inPlaceMetrics.assetValue,
    capRate: inPlaceMetrics.capRate,
    rsfSqft,
  }
}

export function modificationSetMetricDelta(
  assetId: string,
  selectedSetId: string,
  metricKey: ModificationSelectionMetricKey
): { value: number; text: string } | null {
  const modValues = selectedModValuesForAsset(assetId, selectedSetId)
  if (modValues == null) {
    return null
  }

  const baseline = metricSnapshotForAsset(assetId, INITIAL_MOD_VALUES)
  const modified = metricSnapshotForAsset(assetId, modValues)
  if (baseline == null || modified == null) {
    return null
  }

  switch (metricKey) {
    case "pricePerSf":
      return {
        value: modified.pricePerSf - baseline.pricePerSf,
        text: formatUsdPerSfDelta(
          baseline.value,
          modified.value,
          Math.max(baseline.rsfSqft, modified.rsfSqft)
        ),
      }
    case "revenue":
      return {
        value: modified.revenue - baseline.revenue,
        text: formatUsdDeltaCompact(modified.revenue - baseline.revenue),
      }
    case "opex":
      return {
        value: modified.opex - baseline.opex,
        text: formatUsdDeltaCompact(modified.opex - baseline.opex),
      }
    case "noi":
      return {
        value: modified.noi - baseline.noi,
        text: formatUsdDeltaCompact(modified.noi - baseline.noi),
      }
    case "value":
      return {
        value: modified.value - baseline.value,
        text: formatUsdDeltaCompact(modified.value - baseline.value),
      }
    case "capRate":
      return {
        value: modified.capRate - baseline.capRate,
        text: formatCapRatePts(modified.capRate - baseline.capRate),
      }
  }
}

/**
 * Delta in implied asset value (USD) when a saved modification set is applied.
 * Uses the same in-place valuation metric path as the KPI strips.
 */
export function modificationSetValueDeltaUsd(
  assetId: string,
  selectedSetId: string
): number | null {
  return modificationSetMetricDelta(assetId, selectedSetId, "value")?.value ?? null
}
