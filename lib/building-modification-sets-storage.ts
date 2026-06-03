import {
  INITIAL_MOD_VALUES,
  MOD_IDS,
  normalizeModificationOptionValue,
  type ModValues,
} from "@/lib/building-modifications"

export type ModificationSetRecord = {
  id: string
  name: string
  values: ModValues
  savedAt: number
}

export function storageKeyForAsset(assetId: string) {
  return `glassbox:modification-sets:${assetId}`
}

function parseModValues(raw: unknown): ModValues | null {
  if (raw === null || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const next: ModValues = { ...INITIAL_MOD_VALUES }
  for (const id of MOD_IDS) {
    const v = o[id]
    if (v !== undefined && typeof v !== "string") return null
    if (typeof v === "string") {
      next[id] = normalizeModificationOptionValue(id, v)
    }
  }
  return next
}

export function parseStoredSets(raw: string | null): ModificationSetRecord[] {
  if (!raw) return []
  try {
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return []
    const out: ModificationSetRecord[] = []
    for (const item of data) {
      if (item === null || typeof item !== "object") continue
      const row = item as Record<string, unknown>
      if (typeof row.id !== "string" || typeof row.name !== "string") continue
      const rowValues = parseModValues(row.values)
      if (!rowValues) continue
      const savedAt = typeof row.savedAt === "number" ? row.savedAt : Date.now()
      out.push({
        id: row.id,
        name: row.name.trim() || "Untitled",
        values: rowValues,
        savedAt,
      })
    }
    return out
  } catch {
    return []
  }
}
