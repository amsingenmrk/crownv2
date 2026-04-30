import { scenarioPathFromSlug } from "@/lib/scenario-membership"

export const SCENARIO_PROPERTIES_STORAGE_PREFIX =
  "glassbox:scenario-properties:" as const

export const SCENARIO_INCLUDED_PROPERTIES_CHANGED_EVENT =
  "glassbox:scenario-included-properties-changed" as const

export type ScenarioTrackedProperty = {
  assetId: string
  tenantId: string
}

export type ScenarioIncludedPropertiesChangedDetail = { pathname: string }

export function scenarioPropertiesStorageKey(pathname: string): string {
  return `${SCENARIO_PROPERTIES_STORAGE_PREFIX}${pathname}`
}

function isTrackedProperty(v: unknown): v is ScenarioTrackedProperty {
  if (v == null || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return (
    typeof o.assetId === "string" &&
    o.assetId.length > 0 &&
    typeof o.tenantId === "string" &&
    o.tenantId.length > 0
  )
}

export function readScenarioIncludedProperties(pathname: string): ScenarioTrackedProperty[] {
  if (typeof localStorage === "undefined") return []
  try {
    const raw = localStorage.getItem(scenarioPropertiesStorageKey(pathname))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isTrackedProperty)
  } catch {
    return []
  }
}

export function readScenarioIncludedPropertiesBySlug(
  slug: string
): ScenarioTrackedProperty[] {
  return readScenarioIncludedProperties(scenarioPathFromSlug(slug))
}

export function persistScenarioIncludedProperties(
  pathname: string,
  items: ScenarioTrackedProperty[]
): void {
  if (typeof localStorage === "undefined") return
  const key = scenarioPropertiesStorageKey(pathname)
  try {
    if (items.length === 0) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(items))
    window.dispatchEvent(
      new CustomEvent<ScenarioIncludedPropertiesChangedDetail>(
        SCENARIO_INCLUDED_PROPERTIES_CHANGED_EVENT,
        { detail: { pathname } }
      )
    )
  } catch {
    /* quota */
  }
}

export function addScenarioIncludedProperty(
  slug: string,
  item: ScenarioTrackedProperty
): ScenarioTrackedProperty[] {
  const pathname = scenarioPathFromSlug(slug)
  const cur = readScenarioIncludedProperties(pathname)
  if (cur.some((x) => x.assetId === item.assetId && x.tenantId === item.tenantId)) {
    return cur
  }
  const next = [...cur, item]
  persistScenarioIncludedProperties(pathname, next)
  return next
}

export function removeScenarioIncludedProperty(
  slug: string,
  item: ScenarioTrackedProperty
): ScenarioTrackedProperty[] {
  const pathname = scenarioPathFromSlug(slug)
  const next = readScenarioIncludedProperties(pathname).filter(
    (x) => !(x.assetId === item.assetId && x.tenantId === item.tenantId)
  )
  persistScenarioIncludedProperties(pathname, next)
  return next
}

export function isPropertyTrackedInScenario(
  slug: string,
  item: ScenarioTrackedProperty
): boolean {
  return readScenarioIncludedPropertiesBySlug(slug).some(
    (x) => x.assetId === item.assetId && x.tenantId === item.tenantId
  )
}

export function subscribeScenarioIncludedProperties(
  onChange: () => void
): () => void {
  if (typeof window === "undefined") return () => {}
  const onStorage = (e: StorageEvent) => {
    if (e.key != null && e.key.startsWith(SCENARIO_PROPERTIES_STORAGE_PREFIX))
      onChange()
  }
  window.addEventListener(SCENARIO_INCLUDED_PROPERTIES_CHANGED_EVENT, onChange)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(
      SCENARIO_INCLUDED_PROPERTIES_CHANGED_EVENT,
      onChange
    )
    window.removeEventListener("storage", onStorage)
  }
}
