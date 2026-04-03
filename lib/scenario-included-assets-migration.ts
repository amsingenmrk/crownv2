import { ASSETS } from "@/lib/assets"
import {
  parseStoredSets,
  storageKeyForAsset,
} from "@/components/building-modifications-sidebar"
import {
  EXCLUDED_PREFIX,
  parseScenarioExcludedAssetIds,
} from "@/lib/scenario-excluded-assets-storage"
import {
  INCLUDED_PREFIX,
  isScenarioInclusionMigratedForPathname,
  parseScenarioIncludedAssetIds,
  persistScenarioIncludedAssetIds,
} from "@/lib/scenario-included-assets-storage"

function assetIdsWithSavedModificationSets(): Set<string> {
  const out = new Set<string>()
  if (typeof localStorage === "undefined") return out
  for (const a of ASSETS) {
    const sets = parseStoredSets(localStorage.getItem(storageKeyForAsset(a.id)))
    if (sets.length >= 1) out.add(a.id)
  }
  return out
}

/** Pre–explicit-inclusion behavior: rows = { assets with ≥1 mod set } ∖ excluded. */
function legacyIncludedForUserScenarioPathname(pathname: string): Set<string> {
  if (typeof localStorage === "undefined") return new Set()
  const eligible = assetIdsWithSavedModificationSets()
  const excluded = parseScenarioExcludedAssetIds(
    localStorage.getItem(`${EXCLUDED_PREFIX}${pathname}`)
  )
  const next = new Set<string>()
  for (const id of eligible) {
    if (!excluded.has(id)) next.add(id)
  }
  return next
}

/**
 * Reads persisted inclusion, or once copies legacy v1 visibility into inclusion storage.
 */
export function readIncludedAssetIdsWithV1Migration(pathname: string): Set<string> {
  if (typeof localStorage === "undefined") return new Set()
  const inKey = `${INCLUDED_PREFIX}${pathname}`

  if (isScenarioInclusionMigratedForPathname(pathname)) {
    return parseScenarioIncludedAssetIds(localStorage.getItem(inKey))
  }

  const existing = parseScenarioIncludedAssetIds(localStorage.getItem(inKey))
  if (existing.size > 0) {
    persistScenarioIncludedAssetIds(inKey, existing)
    return existing
  }

  const legacy = legacyIncludedForUserScenarioPathname(pathname)
  persistScenarioIncludedAssetIds(inKey, legacy)
  return legacy
}
