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
  const keyPath = scenarioModificationsTableStoragePathname(pathname) ?? pathname
  const raw = localStorage.getItem(scenarioTableOutlookSelectionsKey(keyPath))
  return parseScenarioTableOutlookSelectionsRaw(raw)
}
