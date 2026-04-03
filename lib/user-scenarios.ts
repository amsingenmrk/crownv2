import { EXCLUDED_PREFIX } from "@/lib/scenario-excluded-assets-storage"

export type UserScenario = { name: string; slug: string }

/** Default scenario; not stored in localStorage. */
export const BUILTIN_SCENARIO = {
  name: "2026 Capital Planning",
  slug: "2026-capital-planning",
} as const

const STORAGE_KEY = "glassbox:user-scenarios"

/** Same-tab updates (localStorage does not fire `storage` in the active window). */
export const USER_SCENARIOS_CHANGED_EVENT = "glassbox:user-scenarios-changed" as const

function clearScenarioRouteLocalStorage(slug: string) {
  if (typeof window === "undefined") return
  const path = `/scenarios/${slug}`
  localStorage.removeItem(`glassbox:scenario-table-selections:${path}`)
  localStorage.removeItem(`${EXCLUDED_PREFIX}${path}`)
}

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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(USER_SCENARIOS_CHANGED_EVENT))
  }
  return next
}

/** Removes a user scenario and its per-route table state. Returns null if slug is builtin or not found. */
export function removeUserScenarioBySlug(slug: string): UserScenario[] | null {
  if (typeof window === "undefined") return null
  if (slug === BUILTIN_SCENARIO.slug) return null
  const list = readUserScenarios()
  const next = list.filter((s) => s.slug !== slug)
  if (next.length === list.length) return null
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  clearScenarioRouteLocalStorage(slug)
  window.dispatchEvent(new Event(USER_SCENARIOS_CHANGED_EVENT))
  return next
}
