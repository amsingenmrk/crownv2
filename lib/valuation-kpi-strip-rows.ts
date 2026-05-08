import type {
  ValuationKpiStripMarketCompare,
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
  field: MetricField
): Record<ValuationConditionId, string> {
  return Object.fromEntries(
    VALUATION_CONDITION_OPTIONS.map((o) => [
      o.id,
      formatMetricField(byCondition[o.id], field),
    ])
  ) as Record<ValuationConditionId, string>
}

function marketCompareForMetrics(
  baseline: ValuationConditionMetrics,
  modified: ValuationConditionMetrics,
  field: MetricField
): ValuationKpiStripMarketCompare {
  const baseFmt = formatMetricField(baseline, field)
  const modFmt = formatMetricField(modified, field)
  if (field === "capRate") {
    const d = modified.capRate - baseline.capRate
    return {
      showScenario: true,
      baseFormatted: baseFmt,
      modifiedFormatted: modFmt,
      deltaLine: formatCapRatePts(d),
      deltaDirection: scenarioDeltaDirection(d),
    }
  }
  const bv = baseline[field]
  const mv = modified[field]
  const d = mv - bv
  return {
    showScenario: true,
    baseFormatted: baseFmt,
    modifiedFormatted: modFmt,
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
    primaryText: formatMetricField(byCondition.market, field),
    conditionValues: conditionValueRecord(byCondition, field),
  }))
}

/** Asset stacking-plan: baseline vs modified modification maps (market headline + deltas). */
export function valuationKpiStripRowsFromBaselineModifiedMaps(
  baseline: Record<ValuationConditionId, ValuationConditionMetrics>,
  modified: Record<ValuationConditionId, ValuationConditionMetrics>,
  hasComparison: boolean
): ValuationKpiStripRowModel[] {
  return KPI_STRIP_FIELDS.map(({ label, field }) => ({
    label,
    primaryText: formatMetricField(
      hasComparison ? modified.market : baseline.market,
      field
    ),
    conditionValues: conditionValueRecord(
      hasComparison ? modified : baseline,
      field
    ),
    marketCompare: hasComparison
      ? marketCompareForMetrics(baseline.market, modified.market, field)
      : undefined,
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
    primaryText: formatMetricField(
      hasTableSelection ? scenario.market : baseline.market,
      field
    ),
    conditionValues: conditionValueRecord(
      hasTableSelection ? scenario : baseline,
      field
    ),
    marketCompare:
      hasTableSelection
        ? marketCompareForMetrics(baseline.market, scenario.market, field)
        : undefined,
  }))
}
