/** localStorage key prefix; full key is `${INCLUDED_PREFIX}${pathname}` (e.g. `/scenarios/my-slug`). */
export const INCLUDED_PREFIX = "glassbox:scenario-included-assets:" as const

/**
 * Once set for a pathname, legacy v1 membership (eligible ∩ ¬excluded) is not recomputed.
 * New scenarios set this on create so an empty inclusion list stays empty.
 */
export const INCLUDED_MIGRATED_PREFIX =
  "glassbox:scenario-included-v1-migrated:" as const

export function markScenarioInclusionMigratedForPathname(pathname: string): void {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(`${INCLUDED_MIGRATED_PREFIX}${pathname}`, "1")
  } catch {
    /* quota / private mode */
  }
}

export function isScenarioInclusionMigratedForPathname(pathname: string): boolean {
  if (typeof localStorage === "undefined") return true
  return localStorage.getItem(`${INCLUDED_MIGRATED_PREFIX}${pathname}`) === "1"
}

export const SCENARIO_INCLUDED_CHANGED_EVENT =
  "glassbox:scenario-included-changed" as const

export type ScenarioIncludedChangedDetail = { pathname: string }

export function includedStorageKeyForScenarioPathname(
  pathname: string | null
): string | null {
  if (pathname == null || !pathname.startsWith("/scenarios/")) return null
  return `${INCLUDED_PREFIX}${pathname}`
}

export function parseScenarioIncludedAssetIds(raw: string | null): Set<string> {
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

export function persistScenarioIncludedAssetIds(
  key: string,
  ids: Set<string>
): void {
  if (typeof localStorage === "undefined") return
  try {
    if (key.startsWith(INCLUDED_PREFIX)) {
      markScenarioInclusionMigratedForPathname(
        key.slice(INCLUDED_PREFIX.length)
      )
    }
    if (ids.size === 0) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify([...ids]))
  } catch {
    /* quota / private mode */
  }
}

/** Merges ids into this user scenario’s inclusion list (persisted). */
export function addAssetsToScenarioIncludedBySlug(
  slug: string,
  assetIds: readonly string[]
): void {
  if (typeof window === "undefined" || assetIds.length === 0) return
  const pathname = `/scenarios/${slug}`
  const key = `${INCLUDED_PREFIX}${pathname}`
  const set = parseScenarioIncludedAssetIds(localStorage.getItem(key))
  let modified = false
  for (const id of assetIds) {
    if (!set.has(id)) {
      set.add(id)
      modified = true
    }
  }
  if (!modified) return
  persistScenarioIncludedAssetIds(key, set)
  window.dispatchEvent(
    new CustomEvent<ScenarioIncludedChangedDetail>(
      SCENARIO_INCLUDED_CHANGED_EVENT,
      { detail: { pathname } }
    )
  )
}
