"use client"

import * as React from "react"
import { Aperture, LineChart } from "lucide-react"
import { usePathname } from "next/navigation"
import {
  parseStoredSets,
  storageKeyForAsset,
} from "@/components/building-modifications-sidebar"
import { OccupancySummaryBar } from "@/components/occupancy-summary-bar"
import { ScopedSurfaceNav } from "@/components/scoped-surface-nav"
import {
  getAssetGroupOverridesSnapshot,
  parseAssetGroupOverrideSnapshot,
  subscribeAssetGroupOverrides,
} from "@/lib/asset-group-overrides"
import { ASSETS, getAssetById } from "@/lib/assets"
import {
  SCENARIO_EXCLUDED_CHANGED_EVENT,
  excludedStorageKeyForScenarioPathname,
  parseScenarioExcludedAssetIds,
} from "@/lib/scenario-excluded-assets-storage"
import {
  SCENARIO_INCLUDED_CHANGED_EVENT,
  includedStorageKeyForScenarioPathname,
  parseScenarioIncludedAssetIds,
} from "@/lib/scenario-included-assets-storage"
import { readIncludedAssetIdsWithV1Migration } from "@/lib/scenario-included-assets-migration"
import { getMarketListingPinById } from "@/lib/market-search-demo-listings"
import { portfolioAssetRowForMarketPin } from "@/lib/market-listing-portfolio-row"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import { portfolioAssetRowForAsset } from "@/lib/portfolio-row-for-asset"
import { scenarioMembershipModeFromPathname } from "@/lib/scenario-membership"
import { humanizeScenarioSlug } from "@/lib/scenario-slug"
import {
  BUILTIN_SCENARIO,
  getUserScenariosStoreSnapshot,
  subscribeUserScenarios,
  USER_SCENARIOS_SERVER_SNAPSHOT,
} from "@/lib/user-scenarios"

function scenarioSlugFromPathname(pathname: string | null): string | null {
  if (pathname == null || !pathname.startsWith("/scenarios/")) return null
  const slug = pathname.slice("/scenarios/".length).split("/")[0]
  return slug || null
}

function propertySubtitle(propertyCount: number, scopeCount: number) {
  if (propertyCount === 0) {
    return "No properties in this scenario"
  }

  return `${propertyCount} propert${propertyCount === 1 ? "y" : "ies"} across ${scopeCount} portfolio ${
    scopeCount === 1 ? "scope" : "scopes"
  }`
}

function weightedOccupiedPercentForRows(rows: readonly PortfolioAssetRow[]) {
  let weightedSqftTotal = 0
  let weightedOccupiedTotal = 0
  let rawOccupiedTotal = 0
  let rawCount = 0

  for (const row of rows) {
    const occupiedPercent = Number.parseFloat(row.occPct)
    if (!Number.isFinite(occupiedPercent)) continue

    rawOccupiedTotal += occupiedPercent
    rawCount += 1

    const financials = financialMetricsForAssetId(row.id)
    if (financials == null || financials.rsfSqft <= 0) continue

    weightedSqftTotal += financials.rsfSqft
    weightedOccupiedTotal += financials.rsfSqft * occupiedPercent
  }

  if (weightedSqftTotal > 0) {
    return weightedOccupiedTotal / weightedSqftTotal
  }

  return rawCount > 0 ? rawOccupiedTotal / rawCount : 0
}

function assetIdsWithSavedModificationSets() {
  const ids = new Set<string>()

  if (typeof localStorage === "undefined") {
    return ids
  }

  for (const asset of ASSETS) {
    const sets = parseStoredSets(localStorage.getItem(storageKeyForAsset(asset.id)))
    if (sets.length > 0) {
      ids.add(asset.id)
    }
  }

  return ids
}

export function ScenarioPageHeader() {
  const pathname = usePathname()
  const scenarioSlug = React.useMemo(() => scenarioSlugFromPathname(pathname), [pathname])
  const scenarioMembershipMode = React.useMemo(
    () => scenarioMembershipModeFromPathname(pathname),
    [pathname]
  )

  const userScenarios = React.useSyncExternalStore(
    subscribeUserScenarios,
    getUserScenariosStoreSnapshot,
    () => USER_SCENARIOS_SERVER_SNAPSHOT
  )
  const assetGroupOverrideSnap = React.useSyncExternalStore(
    subscribeAssetGroupOverrides,
    getAssetGroupOverridesSnapshot,
    () => ""
  )
  const assetGroupData = React.useMemo(
    () => parseAssetGroupOverrideSnapshot(assetGroupOverrideSnap),
    [assetGroupOverrideSnap]
  )

  const [scenarioExcludedAssetIds, setScenarioExcludedAssetIds] = React.useState<Set<string>>(
    () => new Set()
  )
  const [scenarioIncludedAssetIds, setScenarioIncludedAssetIds] = React.useState<Set<string>>(
    () => new Set()
  )
  const [scenarioEligibleAssetIds, setScenarioEligibleAssetIds] = React.useState<Set<string>>(
    () => new Set()
  )

  const reloadScenarioState = React.useCallback(() => {
    if (
      typeof localStorage === "undefined" ||
      pathname == null ||
      !pathname.startsWith("/scenarios/")
    ) {
      setScenarioExcludedAssetIds(new Set())
      setScenarioIncludedAssetIds(new Set())
      setScenarioEligibleAssetIds(new Set())
      return
    }

    const excludedKey = excludedStorageKeyForScenarioPathname(pathname)
    const includedKey = includedStorageKeyForScenarioPathname(pathname)

    setScenarioExcludedAssetIds(
      excludedKey != null
        ? parseScenarioExcludedAssetIds(localStorage.getItem(excludedKey))
        : new Set()
    )

    if (scenarioMembershipMode === "explicit-inclusion") {
      setScenarioIncludedAssetIds(readIncludedAssetIdsWithV1Migration(pathname))
    } else if (scenarioMembershipMode === "builtin" && includedKey != null) {
      setScenarioIncludedAssetIds(parseScenarioIncludedAssetIds(localStorage.getItem(includedKey)))
    } else {
      setScenarioIncludedAssetIds(new Set())
    }

    setScenarioEligibleAssetIds(assetIdsWithSavedModificationSets())
  }, [pathname, scenarioMembershipMode])

  React.useLayoutEffect(() => {
    reloadScenarioState()
  }, [reloadScenarioState])

  React.useEffect(() => {
    const refresh = () => reloadScenarioState()
    const onStorage = (event: StorageEvent) => {
      if (event.key == null) return
      if (
        event.key.startsWith("glassbox:scenario-") ||
        event.key.startsWith("glassbox:modification-sets:")
      ) {
        refresh()
      }
    }

    window.addEventListener("storage", onStorage)
    window.addEventListener(SCENARIO_INCLUDED_CHANGED_EVENT, refresh)
    window.addEventListener(SCENARIO_EXCLUDED_CHANGED_EVENT, refresh)
    window.addEventListener("glassbox:modification-sets-changed", refresh)

    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener(SCENARIO_INCLUDED_CHANGED_EVENT, refresh)
      window.removeEventListener(SCENARIO_EXCLUDED_CHANGED_EVENT, refresh)
      window.removeEventListener("glassbox:modification-sets-changed", refresh)
    }
  }, [reloadScenarioState])

  const portfolioRows = React.useMemo(
    () =>
      ASSETS.map((asset, index) =>
        portfolioAssetRowForAsset(getAssetById(asset.id, assetGroupData) ?? asset, index)
      ),
    [assetGroupData]
  )

  const scenarioRows = React.useMemo(() => {
    let rows = portfolioRows

    if (scenarioMembershipMode === "explicit-inclusion") {
      rows = rows.filter((row) => scenarioIncludedAssetIds.has(row.id))
    } else if (scenarioMembershipMode === "builtin") {
      rows = rows.filter((row) => {
        const eligibleOk = scenarioEligibleAssetIds.has(row.id)
        const overlayOk = scenarioIncludedAssetIds.has(row.id)

        if (!eligibleOk && !overlayOk) return false
        if (scenarioExcludedAssetIds.has(row.id)) return false
        return true
      })
    }

    const existingIds = new Set(rows.map((row) => row.id))
    const extras: PortfolioAssetRow[] = []

    if (scenarioMembershipMode === "explicit-inclusion") {
      for (const id of scenarioIncludedAssetIds) {
        if (existingIds.has(id)) continue
        const pin = getMarketListingPinById(id)
        if (pin == null) continue
        extras.push(portfolioAssetRowForMarketPin(pin))
        existingIds.add(id)
      }
    } else if (scenarioMembershipMode === "builtin") {
      for (const id of scenarioIncludedAssetIds) {
        if (scenarioExcludedAssetIds.has(id) || existingIds.has(id)) continue
        const pin = getMarketListingPinById(id)
        if (pin == null) continue
        extras.push(portfolioAssetRowForMarketPin(pin))
        existingIds.add(id)
      }
    }

    return extras.length > 0 ? [...rows, ...extras] : rows
  }, [
    portfolioRows,
    scenarioEligibleAssetIds,
    scenarioExcludedAssetIds,
    scenarioIncludedAssetIds,
    scenarioMembershipMode,
  ])

  const title = React.useMemo(() => {
    if (scenarioSlug == null) return "Scenario"
    if (scenarioSlug === BUILTIN_SCENARIO.slug) return BUILTIN_SCENARIO.name
    return userScenarios.find((scenario) => scenario.slug === scenarioSlug)?.name ??
      humanizeScenarioSlug(scenarioSlug)
  }, [scenarioSlug, userScenarios])

  const subtitle = React.useMemo(() => {
    const scopeCount = new Set(scenarioRows.map((row) => row.groupId)).size
    return propertySubtitle(scenarioRows.length, scopeCount)
  }, [scenarioRows])

  const occupiedPercent = React.useMemo(
    () => weightedOccupiedPercentForRows(scenarioRows),
    [scenarioRows]
  )
  const basePath = scenarioSlug != null ? `/scenarios/${scenarioSlug}` : "/scenarios"
  const navItems = React.useMemo(
    () => [
      { href: basePath, label: "Snapshot", icon: Aperture },
      { href: `${basePath}/forecasts`, label: "Forecasts", icon: LineChart },
    ],
    [basePath]
  )

  return (
    <>
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between">
          <div className="flex min-w-0 items-start">
            <div className="min-w-0 self-center">
              <h2 className="truncate text-xl font-semibold">{title}</h2>
              <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <div className="flex h-full min-h-0 min-w-0 flex-col items-stretch justify-center sm:items-end">
            <OccupancySummaryBar
              occupiedPercent={occupiedPercent}
              className="h-full min-h-0"
            />
          </div>
        </div>
      </div>
      <ScopedSurfaceNav
        items={navItems}
        ariaLabel="Scenario section navigation"
      />
    </>
  )
}
