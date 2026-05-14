import {
  parseStoredSets,
  storageKeyForAsset,
} from "@/lib/building-modification-sets-storage"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import { upliftFromModValues } from "@/lib/scenario-modification-uplift"

/**
 * Demo-model change in implied asset value (USD) when a saved modification set is applied.
 * Mirrors the "value" branch in `ScenarioAssetMetricCell` (`portfolio-assets-columns.tsx`).
 */
export function modificationSetValueDeltaUsd(
  assetId: string,
  selectedSetId: string
): number | null {
  if (selectedSetId === "" || typeof window === "undefined") {
    return null
  }

  const financials = financialMetricsForAssetId(assetId)
  if (financials == null) {
    return null
  }

  const selectedSet = parseStoredSets(
    localStorage.getItem(storageKeyForAsset(assetId))
  ).find((set) => set.id === selectedSetId)
  if (selectedSet == null) {
    return null
  }

  const uplift = upliftFromModValues(selectedSet.values)
  const modifiedValueUsd = financials.valueUsd * uplift.valueMult

  return modifiedValueUsd - financials.valueUsd
}
