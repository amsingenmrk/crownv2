"use client"

import * as React from "react"
import { useRouter, usePathname, useParams } from "next/navigation"
import { BarChart3, Layers, Wrench, LineChart } from "lucide-react"
import { AssetLeasingAssumptionsStat } from "@/components/asset-leasing-assumptions-stat"
import { OccupancySummaryBar } from "@/components/occupancy-summary-bar"
import { cn } from "@/lib/utils"
import { ASSETS, getAssetById } from "@/lib/assets"
import {
  getAssetGroupOverridesSnapshot,
  parseAssetGroupOverrideSnapshot,
  subscribeAssetGroupOverrides,
} from "@/lib/asset-group-overrides"
import { portfolioAssetRowForAsset } from "@/lib/portfolio-row-for-asset"
import { stackingPlanSpaceCountForAsset } from "@/lib/stacking-plan-data"
import { getMarketListingPinById } from "@/lib/market-search-demo-listings"
import { portfolioAssetRowForMarketPin } from "@/lib/market-listing-portfolio-row"

export const ASSET_TAB_PATHS = [
  { pathSegment: "stacking-plan", label: "Stacking Plan", icon: Layers },
  { pathSegment: "modifications", label: "Modifications", icon: Wrench },
  { pathSegment: "forecasts", label: "Forecasts", icon: LineChart },
  { pathSegment: "benchmarks", label: "Benchmarks", icon: BarChart3 },
] as const

function parseOccPct(text: string | null | undefined): number {
  if (!text) return 0
  const n = Number(String(text).replace("%", "").trim())
  return Number.isFinite(n) ? n : 0
}

export function AssetDetailHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const assetGroupSnapshot = React.useSyncExternalStore(
    subscribeAssetGroupOverrides,
    getAssetGroupOverridesSnapshot,
    () => ""
  )
  const assetGroupData = React.useMemo(
    () => parseAssetGroupOverrideSnapshot(assetGroupSnapshot),
    [assetGroupSnapshot]
  )
  const id = typeof params?.id === "string" ? params.id : null
  const asset = React.useMemo(
    () => (id ? getAssetById(id, assetGroupData) : null),
    [assetGroupData, id]
  )
  const marketPin = React.useMemo(
    () => (id ? getMarketListingPinById(id) : null),
    [id]
  )

  const assetIndex = React.useMemo(
    () => (asset ? ASSETS.findIndex((a) => a.id === asset.id) : -1),
    [asset]
  )

  const tableRow = React.useMemo(() => {
    if (asset) {
      const index = assetIndex >= 0 ? assetIndex : 0
      return portfolioAssetRowForAsset(asset, index)
    }
    if (marketPin) {
      return portfolioAssetRowForMarketPin(marketPin)
    }
    return null
  }, [asset, assetIndex, marketPin])

  const waleDisplay = React.useMemo(() => {
    if (tableRow == null) return "—"
    const waleMatch = tableRow.wale.match(/^([\d.]+)/)
    if (waleMatch == null) return tableRow.wale
    return `${parseFloat(waleMatch[1]!).toFixed(1)} yrs`
  }, [tableRow])

  const basePath = id ? `/properties/${id}` : "/properties"
  const tabPaths = React.useMemo(
    () =>
      ASSET_TAB_PATHS.map((tab) => ({
        pathSegment: tab.pathSegment,
        path: `${basePath}/${tab.pathSegment}`,
      })),
    [basePath]
  )
  const buildingLabel = asset?.name ?? marketPin?.building ?? id
  const addressLabel = asset?.address ?? marketPin?.location ?? "—"

  const prefetchTabPath = React.useCallback(
    (href: string) => {
      void router.prefetch(href)
    },
    [router]
  )

  React.useEffect(() => {
    if (!id) return
    for (const tab of tabPaths) {
      if (pathname !== tab.path && !pathname?.startsWith(`${tab.path}/`)) {
        prefetchTabPath(tab.path)
      }
    }
  }, [id, pathname, prefetchTabPath, tabPaths])

  if (!id || tableRow == null) return null

  const keyMetrics = asset
    ? ([
        { label: "Sector", value: tableRow.typeLabel },
        { label: "Class", value: tableRow.classLabel },
        {
          label: "Spaces",
          value: String(stackingPlanSpaceCountForAsset(asset.id, asset)),
        },
        { label: "RSF", value: tableRow.rsf },
      ] as const)
    : ([
        { label: "Sector", value: tableRow.typeLabel },
        { label: "Class", value: tableRow.classLabel },
        { label: "RSF", value: tableRow.rsf },
        { label: "WALT", value: tableRow.wale },
      ] as const)

  return (
    <>
      <div className="border-b border-border bg-background px-4 py-3 md:px-6 md:py-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-start">
            <div className="h-fit min-w-0 self-center">
              <h2 className="truncate text-lg font-semibold sm:text-xl">{buildingLabel}</h2>
              <p className="truncate text-xs text-muted-foreground sm:text-sm">{addressLabel}</p>
            </div>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch justify-start sm:self-stretch sm:items-end">
            <div
              className={cn(
                "flex min-h-0 w-full max-w-full flex-1 flex-col items-stretch gap-2 sm:grid sm:h-full sm:min-h-0 sm:max-w-full sm:items-stretch sm:justify-end sm:gap-2",
                asset
                  ? "sm:grid-cols-[auto_minmax(0,min(100%,22rem))_auto]"
                  : "sm:grid-cols-[auto_minmax(0,320px)]"
              )}
            >
              <div
                className="flex min-h-0 min-w-0 w-full max-w-full items-stretch justify-start gap-0 self-stretch overflow-x-auto rounded-lg border border-border bg-muted/30 text-xs shadow-[inset_-18px_0_18px_-22px_hsl(var(--foreground)/0.7)] sm:w-fit sm:max-w-none sm:shrink-0 sm:justify-end sm:shadow-none"
                aria-label="Building key metrics"
              >
                {keyMetrics.map((k, i) => (
                  <div
                    key={k.label}
                    className={cn(
                      "flex min-h-0 max-w-[9.5rem] shrink-0 flex-col justify-center self-stretch px-2 py-0.5 sm:max-w-[10rem] sm:px-2 sm:py-1",
                      i > 0 && "border-l border-border"
                    )}
                  >
                    <span className="whitespace-nowrap text-[10px] font-medium leading-tight text-muted-foreground sm:text-[11px]">
                      {k.label}
                    </span>
                    <span className="mt-px truncate text-xs font-semibold leading-tight tabular-nums text-foreground sm:text-[13px]">
                      {k.value}
                    </span>
                  </div>
                ))}
              </div>
              <OccupancySummaryBar
                occupiedPercent={parseOccPct(tableRow.occPct)}
                className="h-full min-h-0 w-full sm:max-w-[min(100%,22rem)]"
                secondaryMetricLabel="WALT"
                secondaryMetricValue={waleDisplay}
              />
              {asset ? <AssetLeasingAssumptionsStat /> : null}
            </div>
          </div>
        </div>
      </div>

      <nav className="overflow-x-auto overflow-y-hidden border-b border-border bg-background px-4 shadow-[inset_-18px_0_18px_-22px_hsl(var(--foreground)/0.75)] md:px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-fit items-center gap-1 -mb-px">
          {ASSET_TAB_PATHS.map((tab) => {
            const Icon = tab.icon
            const tabPath = `${basePath}/${tab.pathSegment}`
            const isActive =
              pathname === tabPath || pathname?.startsWith(`${tabPath}/`)
            return (
              <button
                key={tab.pathSegment}
                type="button"
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors sm:px-4",
                  isActive
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onMouseEnter={() => prefetchTabPath(tabPath)}
                onFocus={() => prefetchTabPath(tabPath)}
                onClick={() => {
                  if (!isActive) {
                    router.push(tabPath)
                  }
                }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>

    </>
  )
}
