"use client"

import * as React from "react"
import { useRouter, usePathname, useParams } from "next/navigation"
import { Building, Layers, Wrench, LineChart } from "lucide-react"
import { cn } from "@/lib/utils"
import { getAssetById } from "@/lib/assets"

export const ASSET_TAB_PATHS = [
  { pathSegment: "stacking-plan", label: "Stacking Plan", icon: Layers },
  { pathSegment: "modifications", label: "Modifications", icon: Wrench },
  { pathSegment: "forecasts", label: "Forecasts", icon: LineChart },
] as const

function OccupancyBar({ occupiedPercent }: { occupiedPercent: number }) {
  const vacant = Math.max(0, Math.min(100, 100 - occupiedPercent))
  return (
    <div className="flex h-full items-center gap-0 w-[480px] max-w-full rounded-full border border-border bg-muted/30 px-2 py-1.5 text-sm">
      <span className="rounded-full px-3 text-muted-foreground font-medium whitespace-nowrap">
        {occupiedPercent}% Occupied
      </span>
      <div className="mx-2 flex min-w-0 flex-1 items-center">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary/70 transition-[width] duration-300"
            style={{ width: `${occupiedPercent}%` }}
          />
        </div>
      </div>
      <span className="rounded-full px-3 text-muted-foreground font-medium whitespace-nowrap">
        {vacant}% Vacant
      </span>
    </div>
  )
}

export function AssetDetailHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const id = typeof params?.id === "string" ? params.id : null
  const asset = React.useMemo(() => (id ? getAssetById(id) : null), [id])

  if (!id || !asset) return null

  const basePath = `/assets/${id}`
  const buildingLabel = asset.name
  const addressLabel = asset.address

  return (
    <>
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="h-12 w-[70px] shrink-0 overflow-hidden rounded-[8px] bg-muted">
              {asset.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={asset.imageUrl}
                  alt={buildingLabel}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Building className="w-6 h-6" />
                </div>
              )}
            </div>
            <div className="h-fit self-center min-w-0">
              <h2 className="text-xl font-semibold truncate">{buildingLabel}</h2>
              <p className="text-sm text-muted-foreground truncate">{addressLabel}</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-col items-stretch justify-center sm:items-end">
            <OccupancyBar occupiedPercent={asset.occupiedPercent} />
          </div>
        </div>
      </div>

      <nav className="px-6 border-b border-border bg-background overflow-x-auto">
        <div className="flex items-center gap-1 -mb-px min-w-min">
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
