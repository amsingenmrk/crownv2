import type { ValuationConditionId } from "@/lib/valuation-condition-config"

export type ValuationKpiStripMarketCompare = {
  showScenario: boolean
  baseFormatted: string
  modifiedFormatted: string
  deltaLine?: string
  pctLine?: string
  deltaDirection?: "up" | "down" | "neutral"
}

export type ValuationKpiStripRowModel = {
  label: string
  /** Shown when `marketCompare` is absent (single headline). */
  primaryText: string
  primarySuffix?: string
  conditionValues: Record<ValuationConditionId, string>
  marketCompare?: ValuationKpiStripMarketCompare
}
