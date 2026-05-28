import type { ValuationConditionId } from "@/lib/valuation-condition-config"

export type ValuationConditionDeltaField =
  | "grossRevenue"
  | "opex"
  | "noi"
  | "assetValue"
  | "capRate"

/**
 * In-place valuation is anchored to the current rent roll, so only cap-rate /
 * value underwriting effects should surface as modification deltas there.
 */
export function shouldShowValuationConditionDelta(
  conditionId: ValuationConditionId,
  field: ValuationConditionDeltaField
): boolean {
  return conditionId !== "inPlace" || field === "assetValue" || field === "capRate"
}
