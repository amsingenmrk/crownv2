"use client"

import * as React from "react"
import { LayoutDashboard, LineChart } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { HeaderRsfOccupancyCluster } from "@/components/header-rsf-occupancy-cluster"
import { ScopedSurfaceNav } from "@/components/scoped-surface-nav"
import {
  ensureCompetitiveMembershipSeeded,
  getCompetitiveGroupSnapshot,
  isSeededCompetitiveGroupId,
  parseCompetitiveGroupSnapshot,
  subscribeCompetitiveGroups,
} from "@/lib/competitive-group-overrides"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import { scopedOtherRealAssets } from "@/lib/other-assets"
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

  const customGroups = React.useMemo(
    () =>
      Object.entries(competitiveData.customGroups)
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
        ),
    [competitiveData.customGroups]
  )

  const isKnownGroup = React.useMemo(
    () =>
      groupParam == null ||
      Object.hasOwn(competitiveData.customGroups, groupParam),
    [competitiveData.customGroups, groupParam]
  )

  React.useEffect(() => {
    if (groupParam == null) return
    if (isSeededCompetitiveGroupId(groupParam) || !isKnownGroup) {
      router.replace("/other-assets")
    }
  }, [groupParam, isKnownGroup, router])

  const scopedAssets = React.useMemo(
    () => scopedOtherRealAssets(competitiveData, groupParam),
    [
      competitiveData.customGroups,
      competitiveData.membershipOverrides,
      competitiveData.removedAssetIds,
      competitiveData.removedSeededGroupIds,
      groupParam,
    ]
  )

  const title = React.useMemo(() => {
    if (groupParam == null) return OTHER_ASSETS_LABEL
    return (
      customGroups.find((group) => group.id === groupParam)?.label ?? groupParam
    )
  }, [customGroups, groupParam])

  const scopeDescription = React.useMemo(() => {
    if (groupParam == null) return null
    return competitiveData.groupDescriptions[groupParam] ?? null
  }, [competitiveData.groupDescriptions, groupParam])

  const overviewSubtitle = React.useMemo(() => {
    if (groupParam != null) return null
    const n = scopedAssets.length
    return n === 1 ? "1 prospective asset" : `${n} prospective assets`
  }, [groupParam, scopedAssets.length])

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

            stackingSpaceTotal += stackingPlanSpaceCountForAsset(asset.id)
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
    [groupParam, scopedAssets]
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
              {overviewSubtitle != null ? (
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
        ariaLabel="Other Assets section navigation"
      />
    </>
  )
}
