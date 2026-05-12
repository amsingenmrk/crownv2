import type {
  ValuationKpiStripCellCompare,
  ValuationKpiStripRowModel,
} from "@/lib/valuation-kpi-strip-model"
import {
  formatCapRatePts,
  formatPctChange,
  formatUsdDeltaCompact,
  formatUsdPortfolioCompact,
  scenarioDeltaDirection,
} from "@/lib/scenario-kpi-format"
import {
  VALUATION_CONDITION_OPTIONS,
  type ValuationConditionId,
} from "@/lib/valuation-condition-config"
import type { ValuationConditionMetrics } from "@/lib/valuation-condition-metrics"

type MetricField = "grossRevenue" | "opex" | "noi" | "assetValue" | "capRate"

function formatMetricField(
  m: ValuationConditionMetrics,
  field: MetricField
): string {
  switch (field) {
    case "grossRevenue":
    case "opex":
    case "noi":
      return `${formatUsdPortfolioCompact(m[field])} / yr`
    case "assetValue":
      return formatUsdPortfolioCompact(m.assetValue)
    case "capRate":
      return `${m.capRate.toFixed(2)}%`
  }
}

function conditionValueRecord(
  byCondition: Record<ValuationConditionId, ValuationConditionMetrics>,
  field: MetricField,
  comparisonByCondition?: Record<ValuationConditionId, ValuationConditionMetrics>
): ValuationKpiStripRowModel["conditionValues"] {
  return Object.fromEntries(
    VALUATION_CONDITION_OPTIONS.map((o) => {
      const currentMetrics = byCondition[o.id]
      const comparisonMetrics = comparisonByCondition?.[o.id]
      return [
        o.id,
        {
          value: formatMetricField(currentMetrics, field),
          compare:
            comparisonMetrics != null && o.id !== "inPlace"
              ? conditionCompareForMetrics(comparisonMetrics, currentMetrics, field)
              : undefined,
        },
      ] as const
    })
  ) as ValuationKpiStripRowModel["conditionValues"]
}

function conditionCompareForMetrics(
  baseline: ValuationConditionMetrics,
  modified: ValuationConditionMetrics,
  field: MetricField
): ValuationKpiStripCellCompare {
  if (field === "capRate") {
    const d = modified.capRate - baseline.capRate
    return {
      deltaLine: formatCapRatePts(d),
      deltaDirection: scenarioDeltaDirection(d),
    }
  }
  const bv = baseline[field]
  const mv = modified[field]
  const d = mv - bv
  return {
    deltaLine: formatUsdDeltaCompact(d),
    pctLine: formatPctChange(bv, mv),
    deltaDirection: scenarioDeltaDirection(d),
  }
}

function emptyValuationConditionMetrics(): ValuationConditionMetrics {
  return {
    grossRevenue: 0,
    opex: 0,
    noi: 0,
    assetValue: 0,
    capRate: 0,
  }
}

/** Fallback when there are no visible rows (dashboard strip still renders). */
export function emptyValuationConditionMetricMap(): Record<
  ValuationConditionId,
  ValuationConditionMetrics
> {
  return Object.fromEntries(
    VALUATION_CONDITION_OPTIONS.map((o) => [o.id, emptyValuationConditionMetrics()])
  ) as Record<ValuationConditionId, ValuationConditionMetrics>
}

const KPI_STRIP_FIELDS: readonly { label: string; field: MetricField }[] = [
  { label: "Gross Revenue", field: "grossRevenue" },
  { label: "OpEx", field: "opex" },
  { label: "NOI", field: "noi" },
  { label: "Asset Value", field: "assetValue" },
  { label: "Cap Rate", field: "capRate" },
] as const

/** Portfolio / asset overview: one valuation map per condition (no modification compare). */
export function valuationKpiStripRowsFromSingleConditionMap(
  byCondition: Record<ValuationConditionId, ValuationConditionMetrics>
): ValuationKpiStripRowModel[] {
  return KPI_STRIP_FIELDS.map(({ label, field }) => ({
    label,
    conditionValues: conditionValueRecord(byCondition, field),
  }))
}

/** Asset stacking-plan: baseline vs modified modification maps with per-condition deltas. */
export function valuationKpiStripRowsFromBaselineModifiedMaps(
  baseline: Record<ValuationConditionId, ValuationConditionMetrics>,
  modified: Record<ValuationConditionId, ValuationConditionMetrics>,
  hasComparison: boolean
): ValuationKpiStripRowModel[] {
  return KPI_STRIP_FIELDS.map(({ label, field }) => ({
    label,
    conditionValues: conditionValueRecord(
      hasComparison ? modified : baseline,
      field,
      hasComparison ? baseline : undefined
    ),
  }))
}

/** Scenario portfolio: baseline vs scenario aggregate per condition. */
export function valuationKpiStripRowsFromScenarioConditionPair(
  baseline: Record<ValuationConditionId, ValuationConditionMetrics>,
  scenario: Record<ValuationConditionId, ValuationConditionMetrics>,
  hasTableSelection: boolean
): ValuationKpiStripRowModel[] {
  return KPI_STRIP_FIELDS.map(({ label, field }) => ({
    label,
    conditionValues: conditionValueRecord(
      hasTableSelection ? scenario : baseline,
      field,
      hasTableSelection ? baseline : undefined
    ),
  }))
}
