import {
  EXCLUDED_PREFIX,
  SCENARIO_EXCLUDED_CHANGED_EVENT,
  type ScenarioExcludedChangedDetail,
} from "@/lib/scenario-excluded-assets-storage"
import {
  INCLUDED_MIGRATED_PREFIX,
  INCLUDED_PREFIX,
  markScenarioInclusionMigratedForPathname,
  SCENARIO_INCLUDED_CHANGED_EVENT,
  type ScenarioIncludedChangedDetail,
} from "@/lib/scenario-included-assets-storage"
import { scenarioPropertiesStorageKey } from "@/lib/scenario-included-properties-storage"
import {
  humanizeScenarioSlug,
  slugifyScenarioName,
  uniqueScenarioSlug,
} from "@/lib/scenario-slug"

export type UserScenario = { name: string; slug: string; description?: string }

/** Default scenario; not stored in localStorage. */
export const BUILTIN_SCENARIO = {
  name: "2026 Capital Planning",
  slug: "2026-capital-planning",
  description: "2026 base case: rents, capex timing, and exits across the book.",
} as const

const STORAGE_KEY = "glassbox:user-scenarios"
/** Optional display name/description for the built-in scenario only (slug stays fixed). */
export const BUILTIN_SCENARIO_DISPLAY_STORAGE_KEY =
  "glassbox:builtin-scenario-display"

/** Same-tab updates when built-in scenario display overrides change. */
export const BUILTIN_SCENARIO_DISPLAY_CHANGED_EVENT =
  "glassbox:builtin-scenario-display-changed" as const

/** Stable empty list for `useSyncExternalStore` server / hydration snapshot. */
export const USER_SCENARIOS_SERVER_SNAPSHOT: UserScenario[] = []

/** Same-tab updates (localStorage does not fire `storage` in the active window). */
export const USER_SCENARIOS_CHANGED_EVENT = "glassbox:user-scenarios-changed" as const

type BuiltinScenarioDisplay = { name?: string; description?: string }

function parseBuiltinScenarioDisplay(raw: string): BuiltinScenarioDisplay {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const o = parsed as Record<string, unknown>
    const out: BuiltinScenarioDisplay = {}
    if (typeof o.name === "string" && o.name.trim().length > 0 && o.name.length < 200) {
      out.name = o.name.trim()
    }
    if (
      typeof o.description === "string" &&
      o.description.length > 0 &&
      o.description.length <= 600
    ) {
      out.description = o.description
    }
    return out
  } catch {
    return {}
  }
}

export function readBuiltinScenarioDisplay(): BuiltinScenarioDisplay {
  if (typeof window === "undefined") return {}
  const raw = localStorage.getItem(BUILTIN_SCENARIO_DISPLAY_STORAGE_KEY)
  if (raw == null || raw === "") return {}
  return parseBuiltinScenarioDisplay(raw)
}

/**
 * Persists display name and description for the built-in scenario (URL slug unchanged).
 * Values matching the shipped defaults clear the corresponding override.
 */
export function updateBuiltinScenarioDisplay(updates: {
  name: string
  description: string
}): boolean {
  if (typeof window === "undefined") return false
  const nameTrim = updates.name.trim()
  if (!nameTrim) return false
  const descTrim = updates.description.trim().slice(0, 600)
  const next: BuiltinScenarioDisplay = {}
  if (nameTrim !== BUILTIN_SCENARIO.name.trim()) {
    next.name = nameTrim
  }
  if (
    descTrim.length > 0 &&
    descTrim !== BUILTIN_SCENARIO.description.trim()
  ) {
    next.description = descTrim
  }
  if (Object.keys(next).length === 0) {
    localStorage.removeItem(BUILTIN_SCENARIO_DISPLAY_STORAGE_KEY)
  } else {
    localStorage.setItem(BUILTIN_SCENARIO_DISPLAY_STORAGE_KEY, JSON.stringify(next))
  }
  window.dispatchEvent(new Event(BUILTIN_SCENARIO_DISPLAY_CHANGED_EVENT))
  return true
}

/** Title shown in chrome for a scenario route (built-in overrides + user scenarios). */
export function scenarioDisplayTitleForSlug(
  slug: string,
  userScenarios: readonly UserScenario[]
): string {
  if (slug === BUILTIN_SCENARIO.slug) {
    const n = readBuiltinScenarioDisplay().name?.trim()
    return n && n.length > 0 ? n : BUILTIN_SCENARIO.name
  }
  const row = userScenarios.find((s) => s.slug === slug)
  return row?.name ?? humanizeScenarioSlug(slug)
}

function userScenariosListStorageRaw(): string {
  return localStorage.getItem(STORAGE_KEY) ?? ""
}

function builtinScenarioDisplayStorageRaw(): string {
  return localStorage.getItem(BUILTIN_SCENARIO_DISPLAY_STORAGE_KEY) ?? ""
}

function scenarioPathFromSlug(slug: string): string {
  return `/scenarios/${slug}`
}

function clearScenarioRouteLocalStorage(slug: string) {
  if (typeof window === "undefined") return
  const path = scenarioPathFromSlug(slug)
  localStorage.removeItem(`glassbox:scenario-table-selections:${path}`)
  localStorage.removeItem(`${EXCLUDED_PREFIX}${path}`)
  localStorage.removeItem(`${INCLUDED_PREFIX}${path}`)
  localStorage.removeItem(`${INCLUDED_MIGRATED_PREFIX}${path}`)
  localStorage.removeItem(scenarioPropertiesStorageKey(path))
}

function copyScenarioRouteLocalStorage(
  sourcePath: string,
  destPath: string
): void {
  if (typeof window === "undefined") return
  const pairs: [string, string][] = [
    [
      `glassbox:scenario-table-selections:${sourcePath}`,
      `glassbox:scenario-table-selections:${destPath}`,
    ],
    [`${EXCLUDED_PREFIX}${sourcePath}`, `${EXCLUDED_PREFIX}${destPath}`],
    [`${INCLUDED_PREFIX}${sourcePath}`, `${INCLUDED_PREFIX}${destPath}`],
    [
      `${INCLUDED_MIGRATED_PREFIX}${sourcePath}`,
      `${INCLUDED_MIGRATED_PREFIX}${destPath}`,
    ],
    [
      scenarioPropertiesStorageKey(sourcePath),
      scenarioPropertiesStorageKey(destPath),
    ],
  ]
  for (const [srcKey, destKey] of pairs) {
    const v = localStorage.getItem(srcKey)
    if (v != null) localStorage.setItem(destKey, v)
  }
}

function isUserScenario(v: unknown): v is UserScenario {
  if (v == null || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  if (typeof o.name !== "string" || typeof o.slug !== "string") return false
  if (o.description !== undefined && typeof o.description !== "string") {
    return false
  }
  return true
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

let storeSnapshotRaw: string | null | undefined
let storeSnapshotList: UserScenario[] = USER_SCENARIOS_SERVER_SNAPSHOT

/**
 * Snapshot for `useSyncExternalStore`: referentially stable while localStorage
 * value is unchanged (required by React).
 */
export function getUserScenariosStoreSnapshot(): UserScenario[] {
  if (typeof window === "undefined") return USER_SCENARIOS_SERVER_SNAPSHOT
  try {
    const cacheKey = `${userScenariosListStorageRaw()}\u0001${builtinScenarioDisplayStorageRaw()}`
    if (cacheKey === storeSnapshotRaw) return storeSnapshotList
    storeSnapshotRaw = cacheKey
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      storeSnapshotList = USER_SCENARIOS_SERVER_SNAPSHOT
      return storeSnapshotList
    }
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      storeSnapshotList = USER_SCENARIOS_SERVER_SNAPSHOT
      return storeSnapshotList
    }
    storeSnapshotList = parsed.filter(isUserScenario)
    return storeSnapshotList
  } catch {
    storeSnapshotList = USER_SCENARIOS_SERVER_SNAPSHOT
    return storeSnapshotList
  }
}

/** Subscribe to user scenario list changes (localStorage + same-tab events). */
export function subscribeUserScenarios(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  const onBuiltinDisplay = () => onStoreChange()
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === BUILTIN_SCENARIO_DISPLAY_STORAGE_KEY) {
      onStoreChange()
    }
  }
  window.addEventListener(USER_SCENARIOS_CHANGED_EVENT, onStoreChange)
  window.addEventListener(BUILTIN_SCENARIO_DISPLAY_CHANGED_EVENT, onBuiltinDisplay)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(USER_SCENARIOS_CHANGED_EVENT, onStoreChange)
    window.removeEventListener(
      BUILTIN_SCENARIO_DISPLAY_CHANGED_EVENT,
      onBuiltinDisplay
    )
    window.removeEventListener("storage", onStorage)
  }
}

export function appendUserScenario(scenario: UserScenario): UserScenario[] {
  const next = [...readUserScenarios(), scenario]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  if (typeof window !== "undefined") {
    markScenarioInclusionMigratedForPathname(scenarioPathFromSlug(scenario.slug))
    window.dispatchEvent(new Event(USER_SCENARIOS_CHANGED_EVENT))
  }
  return next
}

/**
 * Creates a user scenario by copying table selection, exclusions, and inclusions
 * from an existing scenario (built-in or user). Navigates the caller via returned slug.
 */
export function duplicateScenarioFromSourceSlug(
  sourceSlug: string
): UserScenario | null {
  if (typeof window === "undefined") return null

  const sourcePath = scenarioPathFromSlug(sourceSlug)
  let sourceDisplayName: string
  let sourceDescription: string | undefined
  if (sourceSlug === BUILTIN_SCENARIO.slug) {
    sourceDisplayName = scenarioDisplayTitleForSlug(
      sourceSlug,
      readUserScenarios()
    )
    sourceDescription =
      scenarioDescriptionForDisplay(sourceSlug, readUserScenarios()) ??
      undefined
  } else {
    const u = readUserScenarios().find((s) => s.slug === sourceSlug)
    sourceDisplayName = u?.name ?? humanizeScenarioSlug(sourceSlug)
    sourceDescription = u?.description
  }

  const duplicateName = `Copy of ${sourceDisplayName}`
  const base = slugifyScenarioName(duplicateName)
  const reserved = new Set<string>([
    BUILTIN_SCENARIO.slug,
    ...readUserScenarios().map((s) => s.slug),
  ])
  const newSlug = uniqueScenarioSlug(base, reserved)
  const scenario: UserScenario = {
    name: duplicateName,
    slug: newSlug,
    ...(sourceDescription != null && sourceDescription.trim() !== ""
      ? { description: sourceDescription.trim() }
      : {}),
  }
  const destPath = scenarioPathFromSlug(newSlug)

  copyScenarioRouteLocalStorage(sourcePath, destPath)

  if (localStorage.getItem(`${INCLUDED_MIGRATED_PREFIX}${destPath}`) == null) {
    markScenarioInclusionMigratedForPathname(destPath)
  }

  const next = [...readUserScenarios(), scenario]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(USER_SCENARIOS_CHANGED_EVENT))
  window.dispatchEvent(
    new CustomEvent<ScenarioExcludedChangedDetail>(
      SCENARIO_EXCLUDED_CHANGED_EVENT,
      { detail: { pathname: destPath } }
    )
  )
  window.dispatchEvent(
    new CustomEvent<ScenarioIncludedChangedDetail>(
      SCENARIO_INCLUDED_CHANGED_EVENT,
      { detail: { pathname: destPath } }
    )
  )

  return scenario
}

/**
 * Updates a user scenario’s name and optionally description. Slug and URL stay the same.
 * Omit `description` to leave the stored description unchanged. Pass `description: ""` to clear it.
 * Returns null if builtin or not found.
 */
export function updateUserScenarioBySlug(
  slug: string,
  updates: { name: string; description?: string }
): UserScenario[] | null {
  if (typeof window === "undefined") return null
  if (slug === BUILTIN_SCENARIO.slug) return null
  const trimmedName = updates.name.trim()
  if (!trimmedName) return null
  const list = readUserScenarios()
  const idx = list.findIndex((s) => s.slug === slug)
  if (idx === -1) return null
  const prev = list[idx]!
  const prevDesc = prev.description?.trim() ?? ""
  const descProvided = Object.hasOwn(updates, "description")
  const nextDesc = descProvided
    ? (updates.description ?? "").trim().slice(0, 600)
    : null

  const nextRow: UserScenario = { slug: prev.slug, name: trimmedName }
  if (nextDesc !== null) {
    if (nextDesc.length > 0) nextRow.description = nextDesc
  } else if (prevDesc.length > 0) {
    nextRow.description = prevDesc
  }

  const descUnchanged = nextDesc !== null ? prevDesc === nextDesc : true
  if (prev.name === trimmedName && descUnchanged) {
    return list
  }

  const next = list.slice()
  next[idx] = nextRow
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(USER_SCENARIOS_CHANGED_EVENT))
  return next
}

/** @deprecated Prefer {@link updateUserScenarioBySlug} when editing description too. */
export function updateUserScenarioNameBySlug(
  slug: string,
  newName: string
): UserScenario[] | null {
  return updateUserScenarioBySlug(slug, { name: newName })
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

/** Muted subtitle under scenario title in headers (built-in + user-stored). */
export function scenarioDescriptionForDisplay(
  scenarioSlug: string | null,
  userScenarios: readonly UserScenario[]
): string | null {
  if (scenarioSlug == null) return null
  if (scenarioSlug === BUILTIN_SCENARIO.slug) {
    const o = readBuiltinScenarioDisplay().description?.trim()
    if (o && o.length > 0) return o
    return BUILTIN_SCENARIO.description
  }
  const row = userScenarios.find((s) => s.slug === scenarioSlug)
  const d = row?.description?.trim()
  return d ? d : null
}
