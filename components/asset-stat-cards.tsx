export type AssetStatKpi = {
  label: string
  value: string
  subLabel?: string
  subValue?: string
}

export type AssetStatCardsVariant =
  | "stacking-plan"
  | "modifications"
  | "forecasts"

/** Stacking plan header metrics (per asset view). */
const ASSET_STACKING_PLAN_KPIS: AssetStatKpi[] = [
  {
    label: "Occupancy",
    value: "87.00%",
    subLabel: "Vacancy",
    subValue: "13.00%",
  },
  { label: "In-Place Rent", value: "$42.50 / SF" },
  {
    label: "Predicted Rent",
    value: "$46.00 / SF",
    subLabel: "Predicted vs In-Place",
    subValue: "+$3.50 / SF (+8.2%)",
  },
  { label: "NOI", value: "$6.8M / yr" },
  { label: "Est. Value", value: "$112.0M" },
  { label: "Cap Rate", value: "6.10%" },
  { label: "WALE / WALT", value: "5.4 yrs" },
]

/** Modifications workspace — scenario / lift vs baseline. */
const MODIFICATIONS_KPIS: AssetStatKpi[] = [
  { label: "Average Rent Lift", value: "+$2.10 / SF (+4.8%)" },
  { label: "New Avg Rent", value: "$45.30 / SF" },
  { label: "Building Value Lift", value: "+$9.4M (+8.4%)" },
  { label: "New Value", value: "$121.4M" },
  { label: "Opex Impact", value: "+$180K / yr" },
  { label: "NOI Impact", value: "+$620K / yr" },
]

/** Forecasts view — revenue, expenses, exit. */
const FORECASTS_KPIS: AssetStatKpi[] = [
  { label: "Gross Revenue", value: "$9.8M / yr" },
  { label: "OpEx", value: "$3.1M / yr" },
  { label: "NOI", value: "$6.7M / yr" },
  { label: "Sale Price", value: "$122.0M" },
]

const VARIANT_KPIS: Record<AssetStatCardsVariant, AssetStatKpi[]> = {
  "stacking-plan": ASSET_STACKING_PLAN_KPIS,
  modifications: MODIFICATIONS_KPIS,
  forecasts: FORECASTS_KPIS,
}

const VARIANT_SECTION_CLASS: Record<AssetStatCardsVariant, string> = {
  "stacking-plan": "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
  modifications: "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
  forecasts: "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
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
      className={VARIANT_SECTION_CLASS[variant]}
      aria-label={VARIANT_ARIA_LABEL[variant]}
    >
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="min-w-0 rounded-xl border border-border bg-card px-5 py-4 shadow-sm"
        >
          <p className="text-sm text-muted-foreground">{kpi.label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {kpi.value}
          </p>
          {kpi.subLabel != null && kpi.subValue != null ? (
            <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">{kpi.subLabel}</p>
              <p className="text-sm font-medium tabular-nums text-foreground">
                {kpi.subValue}
              </p>
            </div>
          ) : null}
        </div>
      ))}
    </section>
  )
}
