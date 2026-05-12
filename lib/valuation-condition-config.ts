export type ValuationConditionId =
  | "inPlace"
  | "grossPotential"
  | "markToMarket"

export type ValuationConditionOption = {
  id: ValuationConditionId
  label: string
  description: string
}

export const DEFAULT_VALUATION_CONDITION_ID: ValuationConditionId = "inPlace"

export const VALUATION_CONDITION_OPTIONS: readonly ValuationConditionOption[] = [
  {
    id: "inPlace",
    label: "In-Place",
    description:
      "Current contractual in-place operations only, without lease-up credit from vacant space or mark-to-market repricing.",
  },
  {
    id: "markToMarket",
    label: "Mark-to-Market",
    description:
      "Current leases repriced to market today, plus market lease-up credit on vacant space.",
  },
  {
    id: "grossPotential",
    label: "Gross Potential",
    description:
      "Full occupancy at market rent—a ceiling case for revenue, expense, NOI, value, and cap rate.",
  },
] as const

export function isValuationConditionId(
  value: string
): value is ValuationConditionId {
  return VALUATION_CONDITION_OPTIONS.some((option) => option.id === value)
}
