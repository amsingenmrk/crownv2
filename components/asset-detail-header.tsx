"use client"

import * as React from "react"
import { useRouter, usePathname, useParams } from "next/navigation"
import { Layers, Wrench, LineChart } from "lucide-react"
import { OccupancySummaryBar } from "@/components/occupancy-summary-bar"
import { cn } from "@/lib/utils"
import { ASSETS, getAssetById } from "@/lib/assets"
import { portfolioAssetRowForAsset } from "@/lib/portfolio-row-for-asset"

export const ASSET_TAB_PATHS = [
  { pathSegment: "stacking-plan", label: "Stacking Plan", icon: Layers },
  { pathSegment: "modifications", label: "Modifications", icon: Wrench },
  { pathSegment: "forecasts", label: "Forecasts", icon: LineChart },
] as const

export function AssetDetailHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const id = typeof params?.id === "string" ? params.id : null
  const asset = React.useMemo(() => (id ? getAssetById(id) : null), [id])

  const assetIndex = React.useMemo(
    () => (asset ? ASSETS.findIndex((a) => a.id === asset.id) : -1),
    [asset]
  )

  const tableRow = React.useMemo(() => {
    if (!asset) return null
    const index = assetIndex >= 0 ? assetIndex : 0
    return portfolioAssetRowForAsset(asset, index)
  }, [asset, assetIndex])

  if (!id || !asset || tableRow == null) return null

  const basePath = `/assets/${id}`
  const buildingLabel = asset.name
  const addressLabel = asset.address

  const keyMetrics = [
    { label: "Sector", value: tableRow.typeLabel },
    { label: "Class", value: tableRow.classLabel },
    { label: "RSF", value: tableRow.rsf },
  ] as const

  return (
    <>
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between">
          <div className="flex min-w-0 items-start">
            <div className="h-fit self-center min-w-0">
              <h2 className="text-xl font-semibold truncate">{buildingLabel}</h2>
              <p className="text-sm text-muted-foreground truncate">{addressLabel}</p>
            </div>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch justify-start sm:self-stretch sm:items-end">
            <div className="flex min-h-0 w-full max-w-full flex-1 flex-col items-stretch gap-2 sm:grid sm:h-full sm:min-h-0 sm:max-w-full sm:grid-cols-[auto_minmax(0,380px)] sm:items-stretch sm:justify-end sm:gap-2">
              <div
                className="flex min-h-0 min-w-0 w-full max-w-full items-stretch justify-end gap-0 self-stretch overflow-x-auto rounded-lg border border-border bg-muted/30 text-xs sm:w-fit sm:max-w-none sm:shrink-0"
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
              <OccupancySummaryBar occupiedPercent={asset.occupiedPercent} />
            </div>
          </div>
        </div>
      </div>

      <nav className="overflow-x-auto overflow-y-hidden border-b border-border bg-background px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                  "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap",
                  isActive
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => router.push(tabPath)}
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
