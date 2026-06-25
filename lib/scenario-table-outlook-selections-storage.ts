import { scenarioModificationsTableStoragePathname } from "@/lib/scenario-table-selections-storage"

const OUTLOOK_PREFIX = "glassbox:scenario-table-outlook-selections:" as const

export type ScenarioTableOutlookSelections = Record<string, string>

export function scenarioTableOutlookSelectionsKey(pathname: string): string {
  return `${OUTLOOK_PREFIX}${pathname}`
}

export function parseScenarioTableOutlookSelectionsRaw(
  raw: string | null
): ScenarioTableOutlookSelections {
  if (raw == null || raw === "") return {}
  try {
    const data = JSON.parse(raw) as unknown
    if (data == null || typeof data !== "object" || Array.isArray(data)) {
      return {}
    }
    const out: ScenarioTableOutlookSelections = {}
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      if (typeof v === "string" && v.length > 0) out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

export function readScenarioTableOutlookSelections(
  pathname: string
): ScenarioTableOutlookSelections {
  if (typeof localStorage === "undefined") return {}
  const keyPath =
    scenarioModificationsTableStoragePathname(pathname) ?? pathname
  migrateLegacyScenarioTableOutlookSelectionsSubrouteKey(pathname, keyPath)
  const raw = localStorage.getItem(scenarioTableOutlookSelectionsKey(keyPath))
  return parseScenarioTableOutlookSelectionsRaw(raw)
}

function persistScenarioTableOutlookSelections(
  key: string,
  selections: ScenarioTableOutlookSelections
): void {
  try {
    if (Object.keys(selections).length === 0) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(selections))
  } catch {
    /* quota / private mode */
  }
}

function migrateLegacyScenarioTableOutlookSelectionsSubrouteKey(
  pathname: string,
  storagePathname: string
): void {
  if (pathname === storagePathname || typeof localStorage === "undefined") {
    return
  }

  const legacyKey = scenarioTableOutlookSelectionsKey(pathname)
  const legacyRaw = localStorage.getItem(legacyKey)
  if (legacyRaw == null) return

  const canonicalKey = scenarioTableOutlookSelectionsKey(storagePathname)
  const merged = {
    ...parseScenarioTableOutlookSelectionsRaw(legacyRaw),
    ...parseScenarioTableOutlookSelectionsRaw(
      localStorage.getItem(canonicalKey)
    ),
  }
  persistScenarioTableOutlookSelections(canonicalKey, merged)
  localStorage.removeItem(legacyKey)
}
