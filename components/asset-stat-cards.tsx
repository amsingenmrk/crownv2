import {
  MetricStripCell,
  MetricStripLabel,
  MetricStripSubRow,
  MetricStripSubStack,
  MetricStripValueRow,
  MetricStripValueSuffix,
  metricStripSectionClassName,
} from "@/components/metric-strip"
import { cn } from "@/lib/utils"

export type AssetStatKpi = {
  label: string
  value: string
  /** Appended on the same line as `value`; shown smaller and muted (e.g. % delta). */
  valueSuffix?: string
  subLabel?: string
  subValue?: string
}

// Re-export for callers that need the section class name
export { metricStripSectionClassName as METRIC_STRIP_SECTION_CLASS }

export type AssetStatCardsVariant =
  | "stacking-plan"
  | "modifications"
  | "forecasts"

/** Stacking plan header metrics (per asset view). */
const ASSET_STACKING_PLAN_KPIS: AssetStatKpi[] = [
  { label: "NOI", value: "$6.8M / yr" },
  { label: "Est. Value", value: "$112.0M" },
  { label: "Cap Rate", value: "6.10%" },
]

/** Modifications workspace — scenario / lift vs baseline. */
const MODIFICATIONS_KPIS: AssetStatKpi[] = [
  {
    label: "Average Rent Lift",
    value: "+$2.10 / SF",
    valueSuffix: "(+4.8%)",
  },
  { label: "New Avg Rent", value: "$45.30 / SF" },
  {
    label: "Building Value Lift",
    value: "+$9.4M",
    valueSuffix: "(+8.4%)",
  },
  { label: "New Value", value: "$121.4M" },
  { label: "Opex Impact", value: "+$180K / yr" },
  { label: "NOI Impact", value: "+$620K / yr" },
]

/** Forecasts view — revenue, expenses, exit. */
const FORECASTS_KPIS: AssetStatKpi[] = [
  { label: "Gross Revenue", value: "$9.8M / yr" },
  { label: "OpEx", value: "$3.1M / yr" },
  { label: "NOI", value: "$6.7M / yr" },
  { label: "Asset Value", value: "$122.0M" },
]

const VARIANT_KPIS: Record<AssetStatCardsVariant, AssetStatKpi[]> = {
  "stacking-plan": ASSET_STACKING_PLAN_KPIS,
  modifications: MODIFICATIONS_KPIS,
  forecasts: FORECASTS_KPIS,
}

/** Mobile → tablet grid; `xl` = one horizontal strip (all stats in one row). */
const VARIANT_GRID_CLASS: Record<AssetStatCardsVariant, string> = {
  "stacking-plan": "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  modifications: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-6",
  forecasts: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
}

const VARIANT_ARIA_LABEL: Record<AssetStatCardsVariant, string> = {
  "stacking-plan": "Asset statistics",
  modifications: "Modification impact statistics",
  forecasts: "Forecast statistics",
}

type AssetStatCardsProps = {
  variant?: AssetStatCardsVariant
}

export function AssetStatCards({
  variant = "stacking-plan",
}: AssetStatCardsProps = {}) {
  const kpis = VARIANT_KPIS[variant]

  return (
    <section
      className={cn(metricStripSectionClassName, VARIANT_GRID_CLASS[variant])}
      aria-label={VARIANT_ARIA_LABEL[variant]}
    >
      {kpis.map((kpi) => (
        <MetricStripCell key={kpi.label}>
          <MetricStripLabel>{kpi.label}</MetricStripLabel>
          <MetricStripValueRow>
            <span className="text-foreground">{kpi.value}</span>
            {kpi.valueSuffix != null && kpi.valueSuffix !== "" ? (
              <MetricStripValueSuffix>{kpi.valueSuffix}</MetricStripValueSuffix>
            ) : null}
          </MetricStripValueRow>
          {kpi.subLabel != null && kpi.subValue != null ? (
            <MetricStripSubStack>
              <MetricStripSubRow label={kpi.subLabel} value={kpi.subValue} />
            </MetricStripSubStack>
          ) : null}
        </MetricStripCell>
      ))}
    </section>
  )
}
