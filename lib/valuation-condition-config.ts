export type ValuationConditionId =
  | "grossPotential"
  | "stabilized"
  | "market"
  | "inPlace"
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
      "Shows the KPI strip at a full-occupancy, market-rent ceiling case to frame top-end revenue, expense, NOI, value, and cap rate potential.",
  },
  {
    id: "stabilized",
    label: "Stabilized",
    description:
      "Shows the KPI strip at a healthy steady-state operating level with normal frictional vacancy across revenue, expense, NOI, value, and cap rate.",
  },
  {
    id: "market",
    label: "Market",
    description:
      "Shows the KPI strip as the asset is viewed in today’s market, in its current condition, across the operating and valuation metrics.",
  },
  {
    id: "inPlace",
    label: "In-Place",
    description:
      "Shows the KPI strip from cash flow actually in place today, without leasing vacant space to market, for a current-income and downside view.",
  },
  {
    id: "markToMarket",
    label: "Mark-to-Market",
    description:
      "Shows the KPI strip as if current leases were repriced to market today, surfacing embedded rollover upside or downside across the KPI row.",
  },
] as const

export function isValuationConditionId(
  value: string
): value is ValuationConditionId {
  return VALUATION_CONDITION_OPTIONS.some((option) => option.id === value)
}
