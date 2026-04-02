import type { ModValues } from "@/components/building-modifications-sidebar"

const MOD_KEYS: (keyof ModValues)[] = [
  "gym",
  "bar",
  "cafe",
  "restaurant",
  "leed",
]

/**
 * Deterministic uplift from saved modification choices (demo model).
 * Each configured modification adds weighted basis points to value and NOI.
 */
export function upliftFromModValues(values: ModValues): {
  valueMult: number
  noiMult: number
} {
  let valueBps = 0
  let noiBps = 0
  for (const k of MOD_KEYS) {
    const v = values[k]
    if (v == null || v === "") continue
    const h = `${k}:${v}`
      .split("")
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    valueBps += 28 + (h % 60)
    noiBps += 38 + (h % 85)
  }
  return {
    valueMult: 1 + valueBps / 10_000,
    noiMult: 1 + noiBps / 10_000,
  }
}
