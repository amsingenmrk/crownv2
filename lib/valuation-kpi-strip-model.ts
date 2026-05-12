import type { ValuationConditionId } from "@/lib/valuation-condition-config"

export type ValuationKpiStripCellCompare = {
  deltaLine?: string
  pctLine?: string
  deltaDirection?: "up" | "down" | "neutral"
}

export type ValuationKpiStripConditionCell = {
  value: string
  compare?: ValuationKpiStripCellCompare
}

export type ValuationKpiStripRowModel = {
  label: string
  rowSuffix?: string
  conditionValues: Record<ValuationConditionId, ValuationKpiStripConditionCell>
}
