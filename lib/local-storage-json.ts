/**
 * Shared helpers for reading structured JSON from `localStorage` with safe fallbacks.
 */

export function readJsonArrayFromLocalStorage<T>(
  key: string,
  isItem: (v: unknown) => v is T
): T[] {
  if (typeof localStorage === "undefined") return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isItem)
  } catch {
    return []
  }
}

export function persistJsonToLocalStorage(
  key: string,
  value: unknown | null,
  onAfterWrite?: () => void
): void {
  if (typeof localStorage === "undefined") return
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
    onAfterWrite?.()
  } catch {
    /* quota */
  }
}
