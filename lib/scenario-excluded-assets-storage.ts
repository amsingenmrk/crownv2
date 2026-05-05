import { persistJsonToLocalStorage } from "@/lib/local-storage-json"

/** localStorage key prefix; full key is `${EXCLUDED_PREFIX}${pathname}` (e.g. `/scenarios/my-slug`). */
export const EXCLUDED_PREFIX = "glassbox:scenario-excluded-assets:" as const

export const SCENARIO_EXCLUDED_CHANGED_EVENT =
  "glassbox:scenario-excluded-changed" as const

export type ScenarioExcludedChangedDetail = { pathname: string }

export function excludedStorageKeyForScenarioPathname(
  pathname: string | null
): string | null {
  if (pathname == null || !pathname.startsWith("/scenarios/")) return null
  return `${EXCLUDED_PREFIX}${pathname}`
}

export function parseScenarioExcludedAssetIds(raw: string | null): Set<string> {
  if (raw == null || raw === "") return new Set()
  try {
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return new Set()
    return new Set(
      data.filter((x): x is string => typeof x === "string" && x.length > 0)
    )
  } catch {
    return new Set()
  }
}

export function persistScenarioExcludedAssetIds(
  key: string,
  ids: Set<string>
): void {
  persistJsonToLocalStorage(key, ids.size === 0 ? null : [...ids])
}

/** Removes assets from this scenario’s exclusion list so they can appear in that scenario. */
export function includeAssetsInScenarioBySlug(
  slug: string,
  assetIds: readonly string[]
): void {
  if (typeof window === "undefined" || assetIds.length === 0) return
  const pathname = `/scenarios/${slug}`
  const key = `${EXCLUDED_PREFIX}${pathname}`
  const set = parseScenarioExcludedAssetIds(localStorage.getItem(key))
  let modified = false
  for (const id of assetIds) {
    if (set.delete(id)) modified = true
  }
  if (!modified) return
  persistScenarioExcludedAssetIds(key, set)
  window.dispatchEvent(
    new CustomEvent<ScenarioExcludedChangedDetail>(
      SCENARIO_EXCLUDED_CHANGED_EVENT,
      { detail: { pathname } }
    )
  )
}
