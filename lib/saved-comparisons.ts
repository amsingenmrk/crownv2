export type SavedComparison = {
  id: string
  name: string
  updatedAt: string
  slotKeys: string[]
}

const STORAGE_KEY = "glassbox:saved-comparisons"

export const SAVED_COMPARISONS_CHANGED_EVENT =
  "glassbox:saved-comparisons-changed" as const

export const SAVED_COMPARISONS_SERVER_SNAPSHOT: SavedComparison[] = []

function isSavedComparison(v: unknown): v is SavedComparison {
  if (v == null || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  if (typeof o.id !== "string" || typeof o.name !== "string") return false
  if (typeof o.updatedAt !== "string") return false
  if (!Array.isArray(o.slotKeys)) return false
  return o.slotKeys.every((k) => typeof k === "string")
}

export function readSavedComparisons(): SavedComparison[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isSavedComparison)
  } catch {
    return []
  }
}

let storeSnapshotRaw: string | null | undefined
let storeSnapshotList: SavedComparison[] = SAVED_COMPARISONS_SERVER_SNAPSHOT

export function getSavedComparisonsStoreSnapshot(): SavedComparison[] {
  if (typeof window === "undefined") return SAVED_COMPARISONS_SERVER_SNAPSHOT
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === storeSnapshotRaw) return storeSnapshotList
    storeSnapshotRaw = raw
    if (!raw) {
      storeSnapshotList = SAVED_COMPARISONS_SERVER_SNAPSHOT
      return storeSnapshotList
    }
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      storeSnapshotList = SAVED_COMPARISONS_SERVER_SNAPSHOT
      return storeSnapshotList
    }
    storeSnapshotList = parsed.filter(isSavedComparison)
    return storeSnapshotList
  } catch {
    storeSnapshotList = SAVED_COMPARISONS_SERVER_SNAPSHOT
    return storeSnapshotList
  }
}

export function subscribeSavedComparisons(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onStoreChange()
  }
  window.addEventListener(SAVED_COMPARISONS_CHANGED_EVENT, onStoreChange)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(SAVED_COMPARISONS_CHANGED_EVENT, onStoreChange)
    window.removeEventListener("storage", onStorage)
  }
}

export function getSavedComparisonById(id: string): SavedComparison | null {
  return readSavedComparisons().find((c) => c.id === id) ?? null
}

function writeAll(list: SavedComparison[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    window.dispatchEvent(new Event(SAVED_COMPARISONS_CHANGED_EVENT))
  } catch {
    /* quota */
  }
}

export function createSavedComparison(
  name: string,
  slotKeys: string[]
): SavedComparison | null {
  if (typeof window === "undefined") return null
  const trimmed = name.trim()
  if (!trimmed) return null
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const now = new Date().toISOString()
  const row: SavedComparison = {
    id,
    name: trimmed,
    updatedAt: now,
    slotKeys: [...slotKeys],
  }
  const next = [...readSavedComparisons(), row]
  writeAll(next)
  return row
}

export function updateSavedComparison(
  id: string,
  patch: Partial<Pick<SavedComparison, "name" | "slotKeys">>
): SavedComparison[] | null {
  if (typeof window === "undefined") return null
  const list = readSavedComparisons()
  const idx = list.findIndex((c) => c.id === id)
  if (idx < 0) return null
  const prev = list[idx]!
  const next = list.slice()
  const name =
    patch.name !== undefined ? patch.name.trim() : prev.name
  if (patch.name !== undefined && !name) return null
  next[idx] = {
    ...prev,
    name,
    slotKeys:
      patch.slotKeys !== undefined ? [...patch.slotKeys] : prev.slotKeys,
    updatedAt: new Date().toISOString(),
  }
  writeAll(next)
  return next
}

export function removeSavedComparison(id: string): SavedComparison[] | null {
  if (typeof window === "undefined") return null
  const list = readSavedComparisons()
  const next = list.filter((c) => c.id !== id)
  if (next.length === list.length) return null
  writeAll(next)
  return next
}
