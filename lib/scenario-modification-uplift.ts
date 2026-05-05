import type { ModValues } from "@/lib/building-modifications"

const MOD_KEYS: (keyof ModValues)[] = [
  "gym",
  "bar",
  "cafe",
  "restaurant",
  "leed",
]

const MOD_BASE_OPEX_USD: Record<keyof ModValues, number> = {
  gym: 85_000,
  bar: 72_000,
  cafe: 54_000,
  restaurant: 96_000,
  leed: 38_000,
}

const MOD_VARIABLE_OPEX_USD: Record<keyof ModValues, number> = {
  gym: 70_000,
  bar: 52_000,
  cafe: 36_000,
  restaurant: 78_000,
  leed: 28_000,
}

/**
 * Deterministic uplift from saved modification choices (demo model).
 * Each configured modification adds weighted basis points to value and NOI.
 */
export function upliftFromModValues(values: ModValues): {
  valueMult: number
  noiMult: number
  annualOpexDeltaUsd: number
} {
  let valueBps = 0
  let noiBps = 0
  let annualOpexDeltaUsd = 0
  for (const k of MOD_KEYS) {
    const v = values[k]
    if (v == null || v === "") continue
    const h = `${k}:${v}`
      .split("")
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    valueBps += 28 + (h % 60)
    noiBps += 38 + (h % 85)
    annualOpexDeltaUsd += MOD_BASE_OPEX_USD[k] + (h % MOD_VARIABLE_OPEX_USD[k])
  }
  return {
    valueMult: 1 + valueBps / 10_000,
    noiMult: 1 + noiBps / 10_000,
    annualOpexDeltaUsd,
  }
}
