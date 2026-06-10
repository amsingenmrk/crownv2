"use client"

import * as React from "react"
import { LayoutDashboard, LineChart } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useInitialAssetGroupOverrideSnapshot } from "@/components/app-shell-environment"
import { HeaderRsfOccupancyCluster } from "@/components/header-rsf-occupancy-cluster"
import { ScopedSurfaceNav } from "@/components/scoped-surface-nav"
import {
  getAssetGroupOverridesSnapshot,
  parseAssetGroupOverrideSnapshot,
  subscribeAssetGroupOverrides,
} from "@/lib/asset-group-overrides"
import {
  ASSETS,
  SEEDED_PORTFOLIO_GROUP_IDS,
  PORTFOLIO_OVERVIEW_LABEL,
  assetIsInPortfolioGroup,
  getAssetById,
  portfolioScopeIdFromRouteParam,
  resolveAssetGroupLabel,
  resolvePortfolioScopeDescription,
} from "@/lib/assets"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import { aggregatePortfolioRows } from "@/lib/portfolio-kpi-aggregate"
import { portfolioAssetRowForAsset } from "@/lib/portfolio-row-for-asset"
import { stackingPlanSpaceCountForAsset } from "@/lib/stacking-plan-data"

function weightedOccupiedPercentForAssets(
  assets: readonly ReturnType<typeof getAssetById>[]
) {
  let weightedSqftTotal = 0
  let weightedOccupiedTotal = 0

  for (const asset of assets) {
    if (asset == null) continue

    const financials = financialMetricsForAssetId(asset.id)
    if (financials == null || financials.rsfSqft <= 0) continue

    weightedSqftTotal += financials.rsfSqft
    weightedOccupiedTotal += financials.rsfSqft * financials.occupancyPct
  }

  return weightedSqftTotal > 0 ? weightedOccupiedTotal / weightedSqftTotal : 0
}

export function PortfolioPageHeader() {
  const params = useParams()
  const router = useRouter()
  const initialAssetGroupOverrideSnapshot = useInitialAssetGroupOverrideSnapshot()
  const scopeParam = typeof params?.scopeId === "string" ? params.scopeId : null
  const portfolioScopeId = React.useMemo(
    () => (scopeParam ? portfolioScopeIdFromRouteParam(scopeParam) : null),
    [scopeParam]
  )

  const assetGroupOverrideSnap = React.useSyncExternalStore(
    subscribeAssetGroupOverrides,
    getAssetGroupOverridesSnapshot,
    () => initialAssetGroupOverrideSnapshot
  )
  const assetGroupData = React.useMemo(
    () => parseAssetGroupOverrideSnapshot(assetGroupOverrideSnap),
    [assetGroupOverrideSnap]
  )

  const isKnownPortfolioScope = React.useMemo(() => {
    if (portfolioScopeId == null) return true
    return (
      ((SEEDED_PORTFOLIO_GROUP_IDS as readonly string[]).includes(portfolioScopeId) &&
        !assetGroupData.removedPortfolioGroupIds.has(portfolioScopeId)) ||
      Object.hasOwn(assetGroupData.customGroups, portfolioScopeId)
    )
  }, [
    assetGroupData.customGroups,
    assetGroupData.removedPortfolioGroupIds,
    portfolioScopeId,
  ])

  React.useEffect(() => {
    if (portfolioScopeId != null && !isKnownPortfolioScope) {
      router.replace("/portfolio")
    }
  }, [isKnownPortfolioScope, portfolioScopeId, router])

  if (portfolioScopeId != null && !isKnownPortfolioScope) {
    return null
  }

  const effectiveAssets = React.useMemo(
    () =>
      ASSETS.filter(
        (asset) => !assetGroupData.standalonePropertyNavIds.has(asset.id)
      ).map((asset) => getAssetById(asset.id, assetGroupData) ?? asset),
    [assetGroupData]
  )

  const scopedAssets = React.useMemo(() => {
    if (portfolioScopeId == null) return effectiveAssets
    return effectiveAssets.filter((asset) =>
      assetIsInPortfolioGroup(asset.id, portfolioScopeId, assetGroupData)
    )
  }, [effectiveAssets, portfolioScopeId])

  const scopedPortfolioRows = React.useMemo(() => {
    const rows = ASSETS.filter(
      (asset) => !assetGroupData.standalonePropertyNavIds.has(asset.id)
    ).map((asset, index) =>
      portfolioAssetRowForAsset(getAssetById(asset.id, assetGroupData) ?? asset, index)
    )
    if (portfolioScopeId == null) return rows
    return rows.filter((row) => row.groupIds.includes(portfolioScopeId))
  }, [assetGroupData, portfolioScopeId])

  const scopedPortfolioAggregate = React.useMemo(
    () => aggregatePortfolioRows(scopedPortfolioRows),
    [scopedPortfolioRows]
  )

  const title = React.useMemo(() => {
    if (portfolioScopeId == null) return PORTFOLIO_OVERVIEW_LABEL
    return resolveAssetGroupLabel(portfolioScopeId, assetGroupData.customGroups)
  }, [assetGroupData.customGroups, portfolioScopeId])

  const scopeDescription = React.useMemo(
    () =>
      resolvePortfolioScopeDescription(
        portfolioScopeId,
        assetGroupData.customGroupDescriptions,
        assetGroupData.fundDescriptionOverrides
      ),
    [
      assetGroupData.customGroupDescriptions,
      assetGroupData.fundDescriptionOverrides,
      portfolioScopeId,
    ]
  )

  const overviewPortfolioSubtitle = React.useMemo(() => {
    const n =
      SEEDED_PORTFOLIO_GROUP_IDS.filter(
        (groupId) => !assetGroupData.removedPortfolioGroupIds.has(groupId)
      ).length +
      Object.keys(assetGroupData.customGroups).length
    return n === 1 ? "1 portfolio group" : `${n} portfolio groups`
  }, [assetGroupData.customGroups, assetGroupData.removedPortfolioGroupIds])

  const occupiedPercent = React.useMemo(
    () => weightedOccupiedPercentForAssets(scopedAssets),
    [scopedAssets]
  )

  const totalRsfSqft = React.useMemo(() => {
    let t = 0
    for (const asset of scopedAssets) {
      const fin = financialMetricsForAssetId(asset.id)
      if (fin != null && fin.rsfSqft > 0) t += fin.rsfSqft
    }
    return t
  }, [scopedAssets])

  const stackingSpaceTotal = React.useMemo(() => {
    let t = 0
    for (const asset of scopedAssets) {
      const resolved = getAssetById(asset.id, assetGroupData) ?? asset
      t += stackingPlanSpaceCountForAsset(asset.id, resolved)
    }
    return t
  }, [scopedAssets, assetGroupData])

  const basePath = scopeParam
    ? `/portfolio/scopes/${encodeURIComponent(scopeParam)}`
    : "/portfolio"
  const navItems = React.useMemo(
    () => [
      { href: basePath, label: "Overview", icon: LayoutDashboard },
      { href: `${basePath}/forecasts`, label: "Forecasts", icon: LineChart },
    ],
    [basePath]
  )

  return (
    <>
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between">
          <div className="flex min-w-0 items-start">
            <div className="min-w-0 self-center space-y-1">
              <h2 className="truncate text-xl font-semibold">{title}</h2>
              {portfolioScopeId == null ? (
                <p className="line-clamp-3 text-sm leading-snug text-muted-foreground">
                  {overviewPortfolioSubtitle}
                </p>
              ) : scopeDescription ? (
                <p className="line-clamp-3 text-sm leading-snug text-muted-foreground">
                  {scopeDescription}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex h-full min-h-0 min-w-0 flex-col items-stretch justify-center sm:items-end">
            <HeaderRsfOccupancyCluster
              totalRsfSqft={totalRsfSqft}
              assetCount={scopedAssets.length}
              spaceCount={stackingSpaceTotal}
              occupiedPercent={occupiedPercent}
              waleYears={scopedPortfolioAggregate?.avgWaleYears ?? null}
            />
          </div>
        </div>
      </div>
      <ScopedSurfaceNav
        items={navItems}
        ariaLabel="Portfolio section navigation"
      />
    </>
  )
}
