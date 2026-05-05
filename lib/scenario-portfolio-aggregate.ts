import {
  parseStoredSets,
  storageKeyForAsset,
} from "@/lib/building-modification-sets-storage"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import { upliftFromModValues } from "@/lib/scenario-modification-uplift"

export type ScenarioPortfolioAggregate = {
  baseValueUsd: number
  scenarioValueUsd: number
  baseNoiUsd: number
  scenarioNoiUsd: number
  baseCapPct: number
  scenarioCapPct: number
  totalRsfSqft: number
  /** At least one visible row has a modification set applied in the table. */
  hasTableSelection: boolean
}

export function computeScenarioPortfolioAggregate(
  rows: PortfolioAssetRow[],
  selections: Record<string, string>,
  readStorage: boolean
): ScenarioPortfolioAggregate {
  let baseV = 0
  let baseN = 0
  let scenV = 0
  let scenN = 0
  let totalRsf = 0
  let hasTableSelection = false

  for (const row of rows) {
    const m = financialMetricsForAssetId(row.id)
    if (m == null) continue
    baseV += m.valueUsd
    baseN += m.noiUsd
    totalRsf += m.rsfSqft

    let vm = 1
    let nm = 1
    const setId = selections[row.id]
    if (setId && readStorage && typeof localStorage !== "undefined") {
      const rec = parseStoredSets(
        localStorage.getItem(storageKeyForAsset(row.id))
      ).find((s) => s.id === setId)
      if (rec != null) {
        const u = upliftFromModValues(rec.values)
        vm = u.valueMult
        nm = u.noiMult
        hasTableSelection = true
      }
    }

    scenV += m.valueUsd * vm
    scenN += m.noiUsd * nm
  }

  const baseCap = baseV > 0 ? (baseN / baseV) * 100 : 0
  const scenCap = scenV > 0 ? (scenN / scenV) * 100 : 0

  return {
    baseValueUsd: baseV,
    scenarioValueUsd: scenV,
    baseNoiUsd: baseN,
    scenarioNoiUsd: scenN,
    baseCapPct: baseCap,
    scenarioCapPct: scenCap,
    totalRsfSqft: totalRsf,
    hasTableSelection,
  }
}
