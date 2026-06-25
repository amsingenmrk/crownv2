"use client"

import * as React from "react"
import { LayoutDashboard, LineChart } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { HeaderRsfOccupancyCluster } from "@/components/header-rsf-occupancy-cluster"
import { ScopedSurfaceNav } from "@/components/scoped-surface-nav"
import {
  COMPETITIVE_SEEDED_GROUPS,
  ensureCompetitiveMembershipSeeded,
  getCompetitiveGroupSnapshot,
  parseCompetitiveGroupSnapshot,
  resolveCompetitiveGroupIdsForAsset,
  subscribeCompetitiveGroups,
} from "@/lib/competitive-group-overrides"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import {
  MARKET_SEARCH_LISTING_COUNT,
  marketSearchDemoPinsBase,
} from "@/lib/market-search-demo-listings"
import { stackingPlanSpaceCountForAsset } from "@/lib/stacking-plan-data"

const OTHER_ASSETS_LABEL = "Other Assets"

function measureOtherAssetsHeaderStep<T>(label: string, compute: () => T): T {
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
  console.info(`[other-assets-perf] ${label}: ${elapsedMs.toFixed(1)}ms`)
  return result
}

export function OtherAssetsPageHeader() {
  const params = useParams()
  const router = useRouter()
  const groupParam =
    typeof params?.groupId === "string" ? decodeURIComponent(params.groupId) : null

  React.useEffect(() => {
    ensureCompetitiveMembershipSeeded()
  }, [])

  const competitiveSnap = React.useSyncExternalStore(
    subscribeCompetitiveGroups,
    getCompetitiveGroupSnapshot,
    () => ""
  )
  const competitiveData = React.useMemo(
    () => parseCompetitiveGroupSnapshot(competitiveSnap),
    [competitiveSnap]
  )

  const groups = React.useMemo(
    () => [
      ...COMPETITIVE_SEEDED_GROUPS.filter(
        (group) => !competitiveData.removedSeededGroupIds.has(group.id)
      ).map((group) => ({
        id: group.id,
        label: competitiveData.groupLabels[group.id] ?? group.label,
      })),
      ...Object.entries(competitiveData.customGroups)
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
        ),
    ],
    [
      competitiveData.customGroups,
      competitiveData.groupLabels,
      competitiveData.removedSeededGroupIds,
    ]
  )

  const isKnownGroup = React.useMemo(
    () => groupParam == null || groups.some((group) => group.id === groupParam),
    [groupParam, groups]
  )

  React.useEffect(() => {
    if (groupParam != null && !isKnownGroup) {
      router.replace("/other-assets")
    }
  }, [groupParam, isKnownGroup, router])

  const marketPins = React.useMemo(
    () => marketSearchDemoPinsBase(MARKET_SEARCH_LISTING_COUNT),
    []
  )

  const scopedPins = React.useMemo(() => {
    const visiblePins = marketPins.filter(
      (pin) => !competitiveData.removedAssetIds.has(pin.id)
    )
    if (groupParam == null) return visiblePins
    return visiblePins.filter((pin) =>
      resolveCompetitiveGroupIdsForAsset(
        pin.id,
        competitiveData.membershipOverrides,
        {
          customGroups: competitiveData.customGroups,
          removedAssetIds: competitiveData.removedAssetIds,
          removedSeededGroupIds: competitiveData.removedSeededGroupIds,
        }
      ).includes(groupParam)
    )
  }, [
    competitiveData.customGroups,
    competitiveData.membershipOverrides,
    competitiveData.removedAssetIds,
    competitiveData.removedSeededGroupIds,
    groupParam,
    marketPins,
  ])

  const title = React.useMemo(() => {
    if (groupParam == null) return OTHER_ASSETS_LABEL
    return groups.find((group) => group.id === groupParam)?.label ?? groupParam
  }, [groupParam, groups])

  const scopeDescription = React.useMemo(() => {
    if (groupParam == null) return null
    return competitiveData.groupDescriptions[groupParam] ?? null
  }, [competitiveData.groupDescriptions, groupParam])

  const overviewSubtitle = React.useMemo(() => {
    const n = groups.length
    return n === 1 ? "1 competitive group" : `${n} competitive groups`
  }, [groups.length])

  const headerClusterMetrics = React.useMemo(
    () =>
      measureOtherAssetsHeaderStep(
        `${groupParam ?? "__other_assets__"} header cluster`,
        () => {
          let weightedSqftTotal = 0
          let weightedOccupiedTotal = 0
          let totalRsfSqft = 0
          let stackingSpaceTotal = 0
          let waleSum = 0
          let waleCount = 0

          for (const pin of scopedPins) {
            const financials = financialMetricsForAssetId(pin.id)
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

            stackingSpaceTotal += stackingPlanSpaceCountForAsset(pin.id)
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
    [groupParam, scopedPins]
  )

  const basePath =
    groupParam == null
      ? "/other-assets"
      : `/other-assets/groups/${encodeURIComponent(groupParam)}`
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

  return (
    <>
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between">
          <div className="flex min-w-0 items-start">
            <div className="min-w-0 self-center space-y-1">
              <h2 className="truncate text-xl font-semibold">{title}</h2>
              {groupParam == null ? (
                <p className="line-clamp-3 text-sm leading-snug text-muted-foreground">
                  {overviewSubtitle}
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
              assetCount={scopedPins.length}
              spaceCount={headerClusterMetrics.stackingSpaceTotal}
              occupiedPercent={headerClusterMetrics.occupiedPercent}
              waleYears={headerClusterMetrics.waleYears}
            />
          </div>
        </div>
      </div>
      <ScopedSurfaceNav
        items={navItems}
        ariaLabel="Other Assets section navigation"
      />
    </>
  )
}
