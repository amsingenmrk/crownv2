import { cn } from "@/lib/utils"

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

/** Mobile → tablet grid; `xl` = one horizontal strip (all stats in one row). */
const VARIANT_GRID_CLASS: Record<AssetStatCardsVariant, string> = {
  "stacking-plan": "grid-cols-1 sm:grid-cols-2 xl:grid-cols-7",
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
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-border shadow-sm",
        "grid gap-px",
        VARIANT_GRID_CLASS[variant]
      )}
      aria-label={VARIANT_ARIA_LABEL[variant]}
    >
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="min-w-0 bg-card px-3 py-2.5 sm:px-3.5 sm:py-3 xl:px-3 xl:py-2.5"
        >
          <p className="text-[11px] font-medium leading-tight text-muted-foreground">
            {kpi.label}
          </p>
          <p className="mt-0.5 text-base font-semibold leading-tight tracking-tight text-foreground tabular-nums xl:text-[0.95rem]">
            {kpi.value}
          </p>
          {kpi.subLabel != null && kpi.subValue != null ? (
            <div className="mt-1.5 border-t border-border/70 pt-1.5">
              <p className="text-[10px] leading-tight text-muted-foreground">
                {kpi.subLabel}
              </p>
              <p className="mt-0.5 text-xs font-medium leading-tight tabular-nums text-foreground">
                {kpi.subValue}
              </p>
            </div>
          ) : null}
        </div>
      ))}
    </section>
  )
}
