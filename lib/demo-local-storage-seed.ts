import { ASSETS } from "@/lib/assets"

const SEED_VERSION_KEY = "glassbox:demo-seed-version" as const
/** Bump when demo snapshot content changes; re-runs seed only for fresh storage (see logic). */
const SEED_VERSION = "1" as const

const MOD_SETS_PREFIX = "glassbox:modification-sets:" as const

/** Matches `ModValues` in `building-modifications-sidebar` (valid option ids). */
const DEMO_PLANNING_VALUES = {
  gym: "yoga-pilates",
  bar: "traditional-pubs",
  cafe: "grab-and-go",
  restaurant: "fast-casual",
  leed: "leed-silver",
} as const

function hasAnyNonEmptyModificationSetKeys(): boolean {
  if (typeof localStorage === "undefined") return false
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k == null || !k.startsWith(MOD_SETS_PREFIX)) continue
    const raw = localStorage.getItem(k)
    if (raw == null || raw === "" || raw === "[]") continue
    try {
      const data = JSON.parse(raw) as unknown
      if (Array.isArray(data) && data.length > 0) return true
    } catch {
      continue
    }
  }
  return false
}

/**
 * Ensures first-time visitors (e.g. Vercel with empty `localStorage`) see the same kind of
 * populated scenario/portfolio as a local dev session with saved sets. Skips when:
 * - `NEXT_PUBLIC_DISABLE_DEMO_SEED=true`
 * - This browser already recorded the current seed version
 * - Any asset already has a non-empty modification-sets array (existing user data)
 */
export function seedDemoLocalStorageIfNeeded(): void {
  if (typeof window === "undefined") return
  if (process.env.NEXT_PUBLIC_DISABLE_DEMO_SEED === "true") return

  try {
    if (localStorage.getItem(SEED_VERSION_KEY) === SEED_VERSION) return

    if (hasAnyNonEmptyModificationSetKeys()) {
      localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION)
      return
    }

    const savedAt = Date.now()
    for (const asset of ASSETS) {
      const key = `${MOD_SETS_PREFIX}${asset.id}`
      const record = {
        id: `demo-${asset.id}`,
        name: "Planning baseline",
        values: { ...DEMO_PLANNING_VALUES },
        savedAt,
      }
      localStorage.setItem(key, JSON.stringify([record]))
    }

    localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION)
    window.dispatchEvent(new Event("glassbox:modification-sets-changed"))
  } catch {
    /* quota / private mode */
  }
}
