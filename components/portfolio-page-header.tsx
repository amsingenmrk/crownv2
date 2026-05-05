"use client"

import * as React from "react"
import { LayoutDashboard, LineChart } from "lucide-react"
import { useParams } from "next/navigation"
import { HeaderRsfOccupancyCluster } from "@/components/header-rsf-occupancy-cluster"
import { ScopedSurfaceNav } from "@/components/scoped-surface-nav"
import {
  getAssetGroupOverridesSnapshot,
  parseAssetGroupOverrideSnapshot,
  subscribeAssetGroupOverrides,
} from "@/lib/asset-group-overrides"
import {
  ASSETS,
  BUILT_IN_ASSET_GROUP_IDS,
  PORTFOLIO_OVERVIEW_LABEL,
  getAssetById,
  portfolioScopeIdFromRouteParam,
  resolveAssetGroupLabel,
} from "@/lib/assets"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import { stackingPlanSpaceCountForAsset } from "@/lib/stacking-plan-data"

function headerSubtitleForPortfolio({
  portfolioScopeId,
  assetCount,
  scopeCount,
}: {
  portfolioScopeId: string | null
  assetCount: number
  scopeCount: number
}) {
  if (portfolioScopeId != null) {
    const scopeNoun = BUILT_IN_ASSET_GROUP_IDS.includes(
      portfolioScopeId as (typeof BUILT_IN_ASSET_GROUP_IDS)[number]
    )
      ? "fund"
      : "portfolio scope"
    return `${assetCount} asset${assetCount === 1 ? "" : "s"} in this ${scopeNoun}`
  }

  return `${assetCount} asset${assetCount === 1 ? "" : "s"} across ${scopeCount} portfolio ${
    scopeCount === 1 ? "scope" : "scopes"
  }`
}

function weightedOccupiedPercentForAssets(
  assets: readonly ReturnType<typeof getAssetById>[]
) {
  let weightedSqftTotal = 0
  let weightedOccupiedTotal = 0
  let rawOccupiedTotal = 0
  let rawCount = 0

  for (const asset of assets) {
    if (asset == null) continue
    rawOccupiedTotal += asset.occupiedPercent
    rawCount += 1

    const financials = financialMetricsForAssetId(asset.id)
    if (financials == null || financials.rsfSqft <= 0) continue

    weightedSqftTotal += financials.rsfSqft
    weightedOccupiedTotal += financials.rsfSqft * asset.occupiedPercent
  }

  if (weightedSqftTotal > 0) {
    return weightedOccupiedTotal / weightedSqftTotal
  }

  return rawCount > 0 ? rawOccupiedTotal / rawCount : 0
}

export function PortfolioPageHeader() {
  const params = useParams()
  const scopeParam = typeof params?.scopeId === "string" ? params.scopeId : null
  const portfolioScopeId = React.useMemo(
    () => (scopeParam ? portfolioScopeIdFromRouteParam(scopeParam) : null),
    [scopeParam]
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

  const effectiveAssets = React.useMemo(
    () => ASSETS.map((asset) => getAssetById(asset.id, assetGroupData) ?? asset),
    [assetGroupData]
  )

  const scopedAssets = React.useMemo(() => {
    if (portfolioScopeId == null) return effectiveAssets
    return effectiveAssets.filter((asset) => asset.groupId === portfolioScopeId)
  }, [effectiveAssets, portfolioScopeId])

  const title = React.useMemo(() => {
    if (portfolioScopeId == null) return PORTFOLIO_OVERVIEW_LABEL
    return resolveAssetGroupLabel(portfolioScopeId, assetGroupData.customGroups)
  }, [assetGroupData.customGroups, portfolioScopeId])

  const subtitle = React.useMemo(() => {
    const scopeCount = new Set(effectiveAssets.map((asset) => asset.groupId)).size
    return headerSubtitleForPortfolio({
      portfolioScopeId,
      assetCount: scopedAssets.length,
      scopeCount,
    })
  }, [effectiveAssets, portfolioScopeId, scopedAssets.length])

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
            <div className="min-w-0 self-center">
              <h2 className="truncate text-xl font-semibold">{title}</h2>
              <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <div className="flex h-full min-h-0 min-w-0 flex-col items-stretch justify-center sm:items-end">
            <HeaderRsfOccupancyCluster
              totalRsfSqft={totalRsfSqft}
              assetCount={scopedAssets.length}
              spaceCount={stackingSpaceTotal}
              occupiedPercent={occupiedPercent}
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
