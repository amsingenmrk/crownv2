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
  ASSET_GROUP_SIDEBAR_LABELS,
  ASSETS,
  SEEDED_PORTFOLIO_GROUP_IDS,
  PORTFOLIO_OVERVIEW_LABEL,
  assetIsInPortfolioGroup,
  getAssetById,
  portfolioScopeIdFromRouteParam,
  resolvePortfolioScopeDescription,
} from "@/lib/assets"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import { stackingPlanSpaceCountForAsset } from "@/lib/stacking-plan-data"

function measurePortfolioHeaderStep<T>(label: string, compute: () => T): T {
  if (
    typeof window === "undefined" ||
    typeof performance === "undefined" ||
    process.env.NODE_ENV === "production"
  ) {
    return compute()
  }

  const startedAt = performance.now()
  const result = compute()
  const elapsedMs = performance.now() - startedAt
  console.info(`[portfolio-perf] ${label}: ${elapsedMs.toFixed(1)}ms`)
  return result
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
  }, [assetGroupData, effectiveAssets, portfolioScopeId])

  const title = React.useMemo(() => {
    if (portfolioScopeId == null) return PORTFOLIO_OVERVIEW_LABEL
    if (
      (SEEDED_PORTFOLIO_GROUP_IDS as readonly string[]).includes(portfolioScopeId)
    ) {
      const seededId = portfolioScopeId as keyof typeof ASSET_GROUP_SIDEBAR_LABELS
      return (
        assetGroupData.fundLabelOverrides[portfolioScopeId]?.trim() ||
        ASSET_GROUP_SIDEBAR_LABELS[seededId]
      )
    }
    return assetGroupData.customGroups[portfolioScopeId] ?? portfolioScopeId
  }, [assetGroupData.customGroups, assetGroupData.fundLabelOverrides, portfolioScopeId])

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

  const headerClusterMetrics = React.useMemo(
    () =>
      measurePortfolioHeaderStep(
        `${portfolioScopeId ?? "__portfolio__"} header cluster`,
        () => {
          let weightedSqftTotal = 0
          let weightedOccupiedTotal = 0
          let totalRsfSqft = 0
          let stackingSpaceTotal = 0
          let waleSum = 0
          let waleCount = 0

          for (const asset of scopedAssets) {
            const financials = financialMetricsForAssetId(asset.id)
            if (financials != null && financials.rsfSqft > 0) {
              weightedSqftTotal += financials.rsfSqft
              weightedOccupiedTotal +=
                financials.rsfSqft * financials.occupancyPct
              totalRsfSqft += financials.rsfSqft

              if (
                Number.isFinite(financials.waleYears) &&
                financials.waleYears > 0
              ) {
                waleSum += financials.waleYears
                waleCount += 1
              }
            }

            stackingSpaceTotal += stackingPlanSpaceCountForAsset(asset.id, asset)
          }

          return {
            occupiedPercent:
              weightedSqftTotal > 0
                ? weightedOccupiedTotal / weightedSqftTotal
                : 0,
            totalRsfSqft,
            stackingSpaceTotal,
            waleYears: waleCount > 0 ? waleSum / waleCount : null,
          }
        }
      ),
    [portfolioScopeId, scopedAssets]
  )

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
  const forecastsHref = `${basePath}/forecasts`

  React.useEffect(() => {
    void router.prefetch(forecastsHref)
  }, [forecastsHref, router])

  if (portfolioScopeId != null && !isKnownPortfolioScope) {
    return null
  }

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
              totalRsfSqft={headerClusterMetrics.totalRsfSqft}
              assetCount={scopedAssets.length}
              spaceCount={headerClusterMetrics.stackingSpaceTotal}
              occupiedPercent={headerClusterMetrics.occupiedPercent}
              waleYears={headerClusterMetrics.waleYears}
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
