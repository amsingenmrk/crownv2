export type ValuationConditionId =
  | "grossPotential"
  | "stabilized"
  | "market"
  | "markToMarket"

export type ValuationConditionOption = {
  id: ValuationConditionId
  label: string
  description: string
}

export const DEFAULT_VALUATION_CONDITION_ID: ValuationConditionId = "market"

export const VALUATION_CONDITION_OPTIONS: readonly ValuationConditionOption[] = [
  {
    id: "grossPotential",
    label: "Gross Potential",
    description:
      "Full occupancy at market rent—a ceiling case for revenue, expense, NOI, value, and cap rate.",
  },
  {
    id: "stabilized",
    label: "Stabilized",
    description:
      "Steady-state operations with normal frictional vacancy across revenue, expense, NOI, value, and cap rate.",
  },
  {
    id: "market",
    label: "Market",
    description:
      "How the asset reads in today’s market at its current condition—operating and valuation metrics together.",
  },
  {
    id: "markToMarket",
    label: "Mark-to-Market",
    description:
      "Current leases repriced to market today—highlights embedded rollover upside or downside across the row.",
  },
] as const

export function isValuationConditionId(
  value: string
): value is ValuationConditionId {
  return VALUATION_CONDITION_OPTIONS.some((option) => option.id === value)
}
