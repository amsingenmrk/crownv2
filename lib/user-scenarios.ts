export type UserScenario = { name: string; slug: string }

/** Default scenario; not stored in localStorage. */
export const BUILTIN_SCENARIO = {
  name: "2026 Capital Planning",
  slug: "2026-capital-planning",
} as const

const STORAGE_KEY = "glassbox:user-scenarios"

function isUserScenario(v: unknown): v is UserScenario {
  if (v == null || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return typeof o.name === "string" && typeof o.slug === "string"
}

export function readUserScenarios(): UserScenario[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isUserScenario)
  } catch {
    return []
  }
}

export function appendUserScenario(scenario: UserScenario): UserScenario[] {
  const next = [...readUserScenarios(), scenario]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}
