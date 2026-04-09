import type {
  ForecastEconomicOutlookScenario,
  ForecastScenarioId,
} from "@/lib/forecast-data"

export type ForecastOutlookSet = {
  id: string
  name: string
  outlooks: ForecastEconomicOutlookScenario[]
  includedOutlookIds: ForecastScenarioId[]
  activeOutlookId: ForecastScenarioId
  savedAt: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function forecastScenarioStorageKey(assetId: string) {
  return `glassbox:forecast-scenarios:${assetId}`
}

export function forecastOutlookSetStorageKey(assetId: string) {
  return `glassbox:forecast-outlook-sets:${assetId}`
}

export function cloneScenario(
  scenario: ForecastEconomicOutlookScenario
): ForecastEconomicOutlookScenario {
  return {
    ...scenario,
    macroPeriods: scenario.macroPeriods.map((period) => ({
      ...period,
    })),
  }
}

export function cloneScenarios(
  scenarios: ForecastEconomicOutlookScenario[]
): ForecastEconomicOutlookScenario[] {
  return scenarios.map(cloneScenario)
}

function normalizeScenario(
  raw: unknown,
  fallback: ForecastEconomicOutlookScenario
): ForecastEconomicOutlookScenario | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return null
  }

  const record = raw as Record<string, unknown>
  const id = typeof record.id === "string" && record.id.trim() !== "" ? record.id : fallback.id
  const name =
    typeof record.name === "string" && record.name.trim() !== ""
      ? record.name.trim()
      : fallback.name
  const isPreset = typeof record.isPreset === "boolean" ? record.isPreset : fallback.isPreset
  const rawPeriods = Array.isArray(record.macroPeriods) ? record.macroPeriods : []

  return {
    id,
    name,
    isPreset,
    macroPeriods: fallback.macroPeriods.map((templatePeriod, index) => {
      const rawPeriod =
        rawPeriods[index] != null &&
        typeof rawPeriods[index] === "object" &&
        !Array.isArray(rawPeriods[index])
          ? (rawPeriods[index] as Record<string, unknown>)
          : {}

      return {
        ...templatePeriod,
        inflationPct:
          typeof rawPeriod.inflationPct === "number"
            ? clamp(rawPeriod.inflationPct, 0, 8)
            : templatePeriod.inflationPct,
        treasuryRatePct:
          typeof rawPeriod.treasuryRatePct === "number"
            ? clamp(rawPeriod.treasuryRatePct, 0, 10)
            : templatePeriod.treasuryRatePct,
        submarketOccupancyPct:
          typeof rawPeriod.submarketOccupancyPct === "number"
            ? clamp(rawPeriod.submarketOccupancyPct, 50, 100)
            : templatePeriod.submarketOccupancyPct,
      }
    }),
  }
}

function scenarioFallbackById(
  defaults: ForecastEconomicOutlookScenario[],
  scenarioId?: string | null
) {
  return (
    (scenarioId != null ? defaults.find((scenario) => scenario.id === scenarioId) : null) ??
    defaults[0] ??
    null
  )
}

export function parseStoredForecastScenarios(
  raw: string | null,
  fallback: ForecastEconomicOutlookScenario[]
): ForecastEconomicOutlookScenario[] {
  if (raw == null || raw === "") return cloneScenarios(fallback)

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return cloneScenarios(fallback)

    const normalized = parsed
      .map((entry) => {
        const entryId =
          entry != null &&
          typeof entry === "object" &&
          !Array.isArray(entry) &&
          typeof (entry as Record<string, unknown>).id === "string"
            ? ((entry as Record<string, unknown>).id as string)
            : null
        const template = scenarioFallbackById(fallback, entryId)
        return template != null ? normalizeScenario(entry, template) : null
      })
      .filter((entry): entry is ForecastEconomicOutlookScenario => entry != null)

    return normalized.length > 0 ? normalized : cloneScenarios(fallback)
  } catch {
    return cloneScenarios(fallback)
  }
}

export function parseStoredForecastOutlookSets(
  raw: string | null,
  defaults: ForecastEconomicOutlookScenario[]
): ForecastOutlookSet[] {
  if (raw == null || raw === "") return []

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((entry) => {
        if (entry == null || typeof entry !== "object" || Array.isArray(entry)) {
          return null
        }

        const record = entry as Record<string, unknown>
        const id =
          typeof record.id === "string" && record.id.trim() !== ""
            ? record.id
            : crypto.randomUUID()
        const name =
          typeof record.name === "string" && record.name.trim() !== ""
            ? record.name.trim()
            : "Untitled outlook set"
        const savedAt = typeof record.savedAt === "number" ? record.savedAt : Date.now()
        const rawOutlooks = Array.isArray(record.outlooks) ? record.outlooks : []

        const outlooks = rawOutlooks
          .map((outlook) => {
            const outlookId =
              outlook != null &&
              typeof outlook === "object" &&
              !Array.isArray(outlook) &&
              typeof (outlook as Record<string, unknown>).id === "string"
                ? ((outlook as Record<string, unknown>).id as string)
                : null
            const template = scenarioFallbackById(defaults, outlookId)
            return template != null ? normalizeScenario(outlook, template) : null
          })
          .filter((outlook): outlook is ForecastEconomicOutlookScenario => outlook != null)

        if (outlooks.length === 0) return null

        const activeOutlookId =
          typeof record.activeOutlookId === "string" &&
          outlooks.some((outlook) => outlook.id === record.activeOutlookId)
            ? record.activeOutlookId
            : outlooks[0]!.id
        const includedOutlookIds = Array.isArray(record.includedOutlookIds)
          ? record.includedOutlookIds.filter(
              (id): id is string =>
                typeof id === "string" && outlooks.some((outlook) => outlook.id === id)
            )
          : []

        return {
          id,
          name,
          savedAt,
          activeOutlookId,
          includedOutlookIds:
            includedOutlookIds.length > 0 ? includedOutlookIds : [activeOutlookId],
          outlooks,
        }
      })
      .filter((entry): entry is ForecastOutlookSet => entry != null)
  } catch {
    return []
  }
}

export function readForecastScenariosFromStorage(
  assetId: string,
  defaults: ForecastEconomicOutlookScenario[]
): ForecastEconomicOutlookScenario[] {
  if (typeof localStorage === "undefined") {
    return parseStoredForecastScenarios(null, defaults)
  }
  return parseStoredForecastScenarios(
    localStorage.getItem(forecastScenarioStorageKey(assetId)),
    defaults
  )
}
