import {
  parseStoredSets,
  storageKeyForAsset,
} from "@/lib/building-modification-sets-storage"
import {
  ASSETS,
  getAssetById,
} from "@/lib/assets"
import {
  getMarketListingPinById,
} from "@/lib/market-search-demo-listings"
import {
  portfolioAssetRowForMarketPin,
} from "@/lib/market-listing-portfolio-row"
import { portfolioAssetRowForAsset } from "@/lib/portfolio-row-for-asset"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import { readIncludedAssetIdsWithV1Migration } from "@/lib/scenario-included-assets-migration"
import {
  EXCLUDED_PREFIX,
  parseScenarioExcludedAssetIds,
} from "@/lib/scenario-excluded-assets-storage"
import {
  INCLUDED_PREFIX,
  parseScenarioIncludedAssetIds,
} from "@/lib/scenario-included-assets-storage"
import {
  scenarioMembershipModeFromPathname,
  scenarioPathFromSlug,
} from "@/lib/scenario-membership"
import { readScenarioTableSelections } from "@/lib/scenario-table-selections-storage"
import { BUILTIN_SCENARIO } from "@/lib/user-scenarios"

function storageGetItem(ignoreLocalStorage: boolean, key: string): string | null {
  if (ignoreLocalStorage || typeof localStorage === "undefined") return null
  return localStorage.getItem(key)
}

function assetHasSavedModificationSets(
  assetId: string,
  ignoreLocalStorage: boolean
): boolean {
  const raw = storageGetItem(ignoreLocalStorage, storageKeyForAsset(assetId))
  const sets = parseStoredSets(raw)
  return sets.length >= 1
}

function computeScenarioEligibleAssetIds(
  portfolioAssetRows: PortfolioAssetRow[],
  scenarioRelaxedAssetFilter: boolean,
  ignoreLocalStorage: boolean
): Set<string> | null {
  const ids = new Set<string>()
  for (const row of portfolioAssetRows) {
    if (assetHasSavedModificationSets(row.id, ignoreLocalStorage)) ids.add(row.id)
  }
  const relax = scenarioRelaxedAssetFilter !== false && ids.size === 0
  return relax ? null : ids
}

export type ScenarioComparePortfolioRowsOptions = {
  /**
   * When true, skip all `localStorage` reads (same as SSR). Use on the client until
   * after mount so the first paint matches server HTML and avoids hydration mismatches.
   */
  ignoreLocalStorage?: boolean
}

/**
 * Portfolio rows visible in a scenario workspace with no group filter and no search
 * (matches `PortfolioDashboardInner` scenario table intent for KPI aggregation).
 */
export function scenarioComparePortfolioRows(
  slug: string,
  portfolioAssetRows: PortfolioAssetRow[],
  options?: ScenarioComparePortfolioRowsOptions
): PortfolioAssetRow[] {
  const ignoreLocalStorage = options?.ignoreLocalStorage === true

  const pathname = scenarioPathFromSlug(slug)
  const scenarioMembershipMode = scenarioMembershipModeFromPathname(pathname)
  const scenarioRelaxedAssetFilter = slug !== BUILTIN_SCENARIO.slug

  const scenarioEligibleAssetIds = computeScenarioEligibleAssetIds(
    portfolioAssetRows,
    scenarioRelaxedAssetFilter,
    ignoreLocalStorage
  )

  const scenarioExcludedAssetIds = parseScenarioExcludedAssetIds(
    storageGetItem(ignoreLocalStorage, `${EXCLUDED_PREFIX}${pathname}`)
  )

  let scenarioIncludedAssetIds: Set<string>
  if (scenarioMembershipMode === "explicit-inclusion") {
    scenarioIncludedAssetIds = ignoreLocalStorage
      ? new Set()
      : readIncludedAssetIdsWithV1Migration(pathname)
  } else if (scenarioMembershipMode === "builtin") {
    scenarioIncludedAssetIds = parseScenarioIncludedAssetIds(
      storageGetItem(ignoreLocalStorage, `${INCLUDED_PREFIX}${pathname}`)
    )
  } else {
    scenarioIncludedAssetIds = new Set()
  }

  let rows = [...portfolioAssetRows]

  if (scenarioMembershipMode === "explicit-inclusion") {
    rows = rows.filter((r) => scenarioIncludedAssetIds.has(r.id))
  } else if (scenarioMembershipMode === "builtin") {
    rows = rows.filter((r) => {
      const eligibleOk =
        scenarioEligibleAssetIds == null ||
        scenarioEligibleAssetIds.has(r.id)
      const overlayOk = scenarioIncludedAssetIds.has(r.id)
      if (!eligibleOk && !overlayOk) return false
      if (scenarioExcludedAssetIds.has(r.id)) return false
      return true
    })
  } else {
    if (scenarioEligibleAssetIds != null) {
      rows = rows.filter((r) => scenarioEligibleAssetIds.has(r.id))
    }
    if (scenarioExcludedAssetIds.size > 0) {
      rows = rows.filter((r) => !scenarioExcludedAssetIds.has(r.id))
    }
  }

  const existing = new Set(rows.map((r) => r.id))
  const extras: PortfolioAssetRow[] = []

  const tryAppendMarketRow = (id: string, passesScenarioFilter: boolean) => {
    if (!passesScenarioFilter) return
    if (existing.has(id)) return
    const pin = getMarketListingPinById(id)
    if (!pin) return
    const r = portfolioAssetRowForMarketPin(pin)
    extras.push(r)
    existing.add(id)
  }

  if (scenarioMembershipMode === "explicit-inclusion") {
    for (const id of scenarioIncludedAssetIds) {
      tryAppendMarketRow(id, true)
    }
  } else if (scenarioMembershipMode === "builtin") {
    for (const id of scenarioIncludedAssetIds) {
      const eligibleOk =
        scenarioEligibleAssetIds == null || scenarioEligibleAssetIds.has(id)
      const overlayOk = scenarioIncludedAssetIds.has(id)
      const passes =
        (eligibleOk || overlayOk) && !scenarioExcludedAssetIds.has(id)
      tryAppendMarketRow(id, passes)
    }
  }

  if (extras.length > 0) {
    extras.sort((a, b) =>
      a.building.localeCompare(b.building, undefined, {
        sensitivity: "base",
      })
    )
    rows = [...rows, ...extras]
  }

  return rows
}

export function scenarioCompareSelectionsForSlug(slug: string): Record<
  string,
  string
> {
  const pathname = scenarioPathFromSlug(slug)
  return readScenarioTableSelections(pathname)
}

/** Base portfolio rows (all assets), same ordering as dashboard. */
export function allPortfolioAssetRowsBase(): PortfolioAssetRow[] {
  return ASSETS.map((asset, index) =>
    portfolioAssetRowForAsset(getAssetById(asset.id) ?? asset, index)
  ).sort(
    (a, b) =>
      b.liftPercent - a.liftPercent ||
      a.building.localeCompare(b.building, undefined, { sensitivity: "base" })
  )
}
