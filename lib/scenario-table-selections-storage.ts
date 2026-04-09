const SELECTIONS_PREFIX = "glassbox:scenario-table-selections:" as const

export function scenarioTableSelectionsKey(pathname: string): string {
  return `${SELECTIONS_PREFIX}${pathname}`
}

export type ScenarioTableSelections = Record<string, string>

export function parseScenarioTableSelectionsRaw(
  raw: string | null
): ScenarioTableSelections {
  if (raw == null || raw === "") return {}
  try {
    const data = JSON.parse(raw) as unknown
    if (data == null || typeof data !== "object" || Array.isArray(data)) {
      return {}
    }
    const out: ScenarioTableSelections = {}
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      if (typeof v === "string" && v.length > 0) out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

export function readScenarioTableSelections(pathname: string): ScenarioTableSelections {
  if (typeof localStorage === "undefined") return {}
  const raw = localStorage.getItem(scenarioTableSelectionsKey(pathname))
  return parseScenarioTableSelectionsRaw(raw)
}
