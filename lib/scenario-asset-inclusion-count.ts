import {
  parseStoredSets,
  storageKeyForAsset,
} from "@/lib/building-modification-sets-storage"
import { ASSETS } from "@/lib/assets"
import {
  EXCLUDED_PREFIX,
  parseScenarioExcludedAssetIds,
} from "@/lib/scenario-excluded-assets-storage"
import { readIncludedAssetIdsWithV1Migration } from "@/lib/scenario-included-assets-migration"
import {
  INCLUDED_PREFIX,
  parseScenarioIncludedAssetIds,
} from "@/lib/scenario-included-assets-storage"
import {
  BUILTIN_SCENARIO,
  readUserScenarios,
} from "@/lib/user-scenarios"

function assetHasSavedModificationSets(assetId: string): boolean {
  if (typeof localStorage === "undefined") return false
  return (
    parseStoredSets(localStorage.getItem(storageKeyForAsset(assetId)))
      .length >= 1
  )
}

/**
 * Mirrors built-in scenario row visibility in `PortfolioDashboard` (relaxed filter when no mod sets).
 */
function assetIncludedInBuiltinScenario(assetId: string): boolean {
  if (typeof localStorage === "undefined") return false
  const pathname = `/scenarios/${BUILTIN_SCENARIO.slug}`
  const excluded = parseScenarioExcludedAssetIds(
    localStorage.getItem(`${EXCLUDED_PREFIX}${pathname}`)
  )
  const includedOverlay = parseScenarioIncludedAssetIds(
    localStorage.getItem(`${INCLUDED_PREFIX}${pathname}`)
  )

  const eligibleIds = new Set<string>()
  for (const a of ASSETS) {
    if (assetHasSavedModificationSets(a.id)) eligibleIds.add(a.id)
  }
  const scenarioEligibleAssetIds =
    eligibleIds.size === 0 ? null : eligibleIds

  const eligibleOk =
    scenarioEligibleAssetIds == null ||
    scenarioEligibleAssetIds.has(assetId)
  const overlayOk = includedOverlay.has(assetId)
  if (!eligibleOk && !overlayOk) return false
  if (excluded.has(assetId)) return false
  return true
}

/**
 * Number of scenarios (built-in + user) that currently include this asset id in localStorage.
 */
export function countScenariosIncludingAssetId(assetId: string): number {
  if (typeof window === "undefined") return 0
  let n = 0
  if (assetIncludedInBuiltinScenario(assetId)) n += 1
  for (const s of readUserScenarios()) {
    if (s.slug === BUILTIN_SCENARIO.slug) continue
    const pathname = `/scenarios/${s.slug}`
    if (readIncludedAssetIdsWithV1Migration(pathname).has(assetId)) n += 1
  }
  return n
}
