const STORAGE_KEY = "glassbox:asset-group-overrides"
const CUSTOM_GROUPS_KEY = "glassbox:custom-asset-groups"
const CHANGED = "glassbox:asset-group-overrides-changed"
const CUSTOM_CHANGED = "glassbox:custom-asset-groups-changed"

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

export function readAssetGroupOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw == null || raw === "") return {}
  return parseOverrides(raw)
}

export function readCustomAssetGroups(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(CUSTOM_GROUPS_KEY)
    if (raw == null || raw === "") return {}
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
    if (e.key === STORAGE_KEY || e.key === CUSTOM_GROUPS_KEY) run()
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
  return `${localStorage.getItem(STORAGE_KEY) ?? ""}\0${localStorage.getItem(CUSTOM_GROUPS_KEY) ?? ""}`
}
