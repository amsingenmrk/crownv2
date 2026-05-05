"use client"

import * as React from "react"
import { useRouter, usePathname, useParams } from "next/navigation"
import { Layers, Wrench, LineChart } from "lucide-react"
import { cn } from "@/lib/utils"
import { ASSETS, getAssetById } from "@/lib/assets"
import { portfolioAssetRowForAsset } from "@/lib/portfolio-row-for-asset"

function formatVacancyPct(occupiedPercent: number): string {
  const vacant = Math.max(0, Math.min(100, 100 - occupiedPercent))
  const rounded = Math.round(vacant * 10) / 10
  return rounded % 1 === 0
    ? `${Math.round(rounded)}%`
    : `${rounded.toFixed(1)}%`
}

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
    { label: "Class", value: tableRow.classLabel },
    { label: "RSF", value: tableRow.rsf },
    { label: "Occupancy", value: tableRow.occPct },
    { label: "Vacancy", value: formatVacancyPct(asset.occupiedPercent) },
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
          <div className="flex min-w-0 flex-col items-stretch justify-center sm:items-end">
            <div
              className="flex w-full max-w-full items-stretch justify-end gap-0 overflow-x-auto rounded-xl border border-border bg-muted/30 text-sm shadow-sm"
              aria-label="Building key metrics"
            >
              {keyMetrics.map((k, i) => (
                <div
                  key={k.label}
                  className={cn(
                    "flex min-w-[9.25rem] flex-1 basis-0 flex-col justify-center px-3 py-2 sm:px-4 sm:py-2.5",
                    i > 0 && "border-l border-border"
                  )}
                >
                  <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                    {k.label}
                  </span>
                  <span className="mt-0.5 whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">
                    {k.value}
                  </span>
                </div>
              ))}
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
