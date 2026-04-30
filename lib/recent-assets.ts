const STORAGE_KEY = "glassbox-recent-asset-ids"
const MAX_RECENT = 12

function readIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === "string")
  } catch {
    return []
  }
}

function writeIds(ids: string[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    /* ignore quota / private mode */
  }
}

export function recordRecentAsset(assetId: string) {
  const prev = readIds()
  const next = [assetId, ...prev.filter((id) => id !== assetId)].slice(
    0,
    MAX_RECENT
  )
  writeIds(next)
}

export function getRecentAssetIds(): string[] {
  return readIds()
}
