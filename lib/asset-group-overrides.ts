const STORAGE_KEY = "glassbox:asset-group-overrides"
const CUSTOM_GROUPS_KEY = "glassbox:custom-asset-groups"
/** Optional display names for built-in funds (`office` / `industrial` / `retail`). */
const FUND_DISPLAY_LABELS_KEY = "glassbox:fund-display-labels"
const CHANGED = "glassbox:asset-group-overrides-changed"
const CUSTOM_CHANGED = "glassbox:custom-asset-groups-changed"

const BUILT_IN_GROUP_IDS = new Set(["office", "industrial", "retail"])

const RESERVED_GROUP_IDS = new Set([
  "office",
  "industrial",
  "retail",
  "all",
  "",
])

function parseOverrides(raw: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        typeof k === "string" &&
        k.length > 0 &&
        k.length < 200 &&
        typeof v === "string" &&
        v.length > 0 &&
        v.length < 200
      ) {
        out[k] = v
      }
    }
    return out
  } catch {
    return {}
  }
}

export function parseCustomAssetGroups(raw: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        typeof k === "string" &&
        k.length > 0 &&
        k.length < 128 &&
        typeof v === "string" &&
        v.length > 0 &&
        v.length < 200
      ) {
        out[k] = v
      }
    }
    return out
  } catch {
    return {}
  }
}

export function readAssetGroupOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw == null || raw === "") return {}
  return parseOverrides(raw)
}

export function readCustomAssetGroups(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const raw = localStorage.getItem(CUSTOM_GROUPS_KEY)
  if (raw == null || raw === "") return {}
  return parseCustomAssetGroups(raw)
}

function parseFundDisplayLabels(raw: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        typeof k === "string" &&
        BUILT_IN_GROUP_IDS.has(k) &&
        typeof v === "string" &&
        v.length > 0 &&
        v.length < 200
      ) {
        out[k] = v
      }
    }
    return out
  } catch {
    return {}
  }
}

export function readFundDisplayLabels(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const raw = localStorage.getItem(FUND_DISPLAY_LABELS_KEY)
  if (raw == null || raw === "") return {}
  return parseFundDisplayLabels(raw)
}

/**
 * Sets the displayed name for a built-in fund scope (`office`, `industrial`, `retail`).
 */
export function updateFundDisplayLabelByGroupId(
  groupId: string,
  newName: string
): boolean {
  if (typeof window === "undefined") return false
  if (!BUILT_IN_GROUP_IDS.has(groupId)) return false
  const trimmed = newName.trim()
  if (!trimmed) return false
  const current = readFundDisplayLabels()
  const next = { ...current, [groupId]: trimmed }
  localStorage.setItem(FUND_DISPLAY_LABELS_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(CHANGED))
  return true
}

export function parseAssetGroupOverrideSnapshot(snapshot: string): {
  overrides: Record<string, string>
  customGroups: Record<string, string>
  fundLabelOverrides: Record<string, string>
} {
  const parts = snapshot.split("\0")
  const overridesRaw = parts[0] ?? ""
  const customGroupsRaw = parts[1] ?? ""
  const fundLabelsRaw = parts[2] ?? ""

  return {
    overrides: overridesRaw ? parseOverrides(overridesRaw) : {},
    customGroups: customGroupsRaw ? parseCustomAssetGroups(customGroupsRaw) : {},
    fundLabelOverrides: fundLabelsRaw ? parseFundDisplayLabels(fundLabelsRaw) : {},
  }
}

function slugifyForGroupId(text: string): string {
  const s = text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
  return s.length > 0 ? s.slice(0, 48) : "group"
}

/**
 * Creates a new custom asset group and persists its display label.
 * IDs are prefixed with `grp-` so they do not collide with built-in groups.
 */
export function addCustomAssetGroup(
  displayName: string
): { id: string; label: string } | null {
  if (typeof window === "undefined") return null
  const trimmed = displayName.trim()
  if (!trimmed) return null

  const existing = readCustomAssetGroups()
  const base = `grp-${slugifyForGroupId(trimmed)}`
  let id = base
  let n = 0
  while (existing[id] != null || RESERVED_GROUP_IDS.has(id)) {
    n += 1
    id = `${base}-${n}`
  }

  const next = { ...existing, [id]: trimmed }
  localStorage.setItem(CUSTOM_GROUPS_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(CUSTOM_CHANGED))
  window.dispatchEvent(new Event(CHANGED))
  return { id, label: trimmed }
}

function isCustomGroupId(
  groupId: string,
  customGroups: Record<string, string>
): boolean {
  return Object.hasOwn(customGroups, groupId)
}

function writeAssetGroupOverrides(overrides: Record<string, string>): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  window.dispatchEvent(new Event(CHANGED))
}

/**
 * Renames a user-defined portfolio scope (custom asset group) in place. Built-in
 * `office` / `industrial` / `retail` scopes are not stored here and cannot be
 * updated via this helper.
 */
export function updateCustomAssetGroupNameById(
  groupId: string,
  newName: string
): boolean {
  if (typeof window === "undefined") return false
  const trimmed = newName.trim()
  if (!trimmed) return false
  const custom = readCustomAssetGroups()
  if (!isCustomGroupId(groupId, custom)) return false
  if (custom[groupId] === trimmed) return true
  const next = { ...custom, [groupId]: trimmed }
  localStorage.setItem(CUSTOM_GROUPS_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(CUSTOM_CHANGED))
  window.dispatchEvent(new Event(CHANGED))
  return true
}

/**
 * Deletes a custom portfolio scope: removes the label, drops overrides that
 * moved assets into this group (assets revert to their default fund group), and
 * reassigns any overrides pointing at this id away (none remain for the id).
 */
export function removeCustomAssetGroupById(groupId: string): boolean {
  if (typeof window === "undefined") return false
  const custom = readCustomAssetGroups()
  if (!isCustomGroupId(groupId, custom)) return false
  const { [groupId]: _, ...rest } = custom
  localStorage.setItem(CUSTOM_GROUPS_KEY, JSON.stringify(rest))
  window.dispatchEvent(new Event(CUSTOM_CHANGED))
  const overrides = readAssetGroupOverrides()
  const nextOverrides: Record<string, string> = {}
  for (const [assetId, gid] of Object.entries(overrides)) {
    if (gid === groupId) continue
    nextOverrides[assetId] = gid
  }
  writeAssetGroupOverrides(nextOverrides)
  return true
}

/**
 * New custom group with the same member assets as the source (same override
 * edges), suitable for a “Copy of …” portfolio scope. Built-in scopes cannot
 * be duplicated.
 */
export function duplicateCustomAssetGroupFromId(
  sourceGroupId: string
): { id: string; label: string } | null {
  if (typeof window === "undefined") return null
  const custom = readCustomAssetGroups()
  const sourceLabel = custom[sourceGroupId]
  if (sourceLabel == null) return null
  const duplicateName = `Copy of ${sourceLabel}`
  const created = addCustomAssetGroup(duplicateName)
  if (created == null) return null
  const overrides = readAssetGroupOverrides()
  const nextOverrides = { ...overrides }
  for (const [assetId, gid] of Object.entries(overrides)) {
    if (gid === sourceGroupId) nextOverrides[assetId] = created.id
  }
  writeAssetGroupOverrides(nextOverrides)
  return created
}

export function setAssetGroupOverride(assetId: string, groupId: string): void {
  if (typeof window === "undefined") return
  const next = { ...readAssetGroupOverrides(), [assetId]: groupId }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(CHANGED))
}

export function subscribeAssetGroupOverrides(
  onStoreChange: () => void
): () => void {
  if (typeof window === "undefined") return () => {}
  const run = () => onStoreChange()
  window.addEventListener(CHANGED, run)
  window.addEventListener(CUSTOM_CHANGED, run)
  const onStorage = (e: StorageEvent) => {
    if (
      e.key === STORAGE_KEY ||
      e.key === CUSTOM_GROUPS_KEY ||
      e.key === FUND_DISPLAY_LABELS_KEY
    ) {
      run()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(CHANGED, run)
    window.removeEventListener(CUSTOM_CHANGED, run)
    window.removeEventListener("storage", onStorage)
  }
}

export function getAssetGroupOverridesSnapshot(): string {
  if (typeof window === "undefined") return ""
  return `${localStorage.getItem(STORAGE_KEY) ?? ""}\0${localStorage.getItem(CUSTOM_GROUPS_KEY) ?? ""}\0${localStorage.getItem(FUND_DISPLAY_LABELS_KEY) ?? ""}`
}
