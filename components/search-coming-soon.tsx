"use client"

import * as React from "react"
import dynamic from "next/dynamic"

import type { PortfolioMapboxPin } from "@/components/portfolio-mapbox"
import { Skeleton } from "@/components/ui/skeleton"
import { ASSETS } from "@/lib/assets"
import { usePortfolioAssetCoordinates } from "@/hooks/use-portfolio-asset-coordinates"

const PortfolioMapbox = dynamic(
  () => import("@/components/portfolio-mapbox").then((m) => m.PortfolioMapbox),
  { ssr: false }
)

function ListingSkeletonCard() {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
      <Skeleton className="size-16 shrink-0 rounded-md" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-0.5">
        <Skeleton className="h-4 w-[85%]" />
        <Skeleton className="h-3 w-[60%]" />
        <Skeleton className="h-3 w-[40%]" />
      </div>
    </div>
  )
}

function MapRegionSkeleton() {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[48px_48px] opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-transparent to-muted/30" />
      <Skeleton className="absolute left-[22%] top-[28%] size-3 rounded-full shadow-sm ring-2 ring-background" />
      <Skeleton className="absolute left-[48%] top-[42%] size-3 rounded-full shadow-sm ring-2 ring-background" />
      <Skeleton className="absolute left-[62%] top-[36%] size-3 rounded-full shadow-sm ring-2 ring-background" />
      <Skeleton className="absolute left-[38%] top-[58%] size-3 rounded-full shadow-sm ring-2 ring-background" />
      <Skeleton className="absolute left-[72%] top-[62%] size-3 rounded-full shadow-sm ring-2 ring-background" />
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="rounded-lg border border-border bg-background/90 px-4 py-3 text-center shadow-sm backdrop-blur-sm">
          <p className="text-sm font-medium text-foreground">Interactive map</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Coming soon</p>
        </div>
      </div>
    </>
  )
}

export function SearchComingSoon() {
  const { mapboxEnabled, coordinates } = usePortfolioAssetCoordinates()

  const searchMapPins = React.useMemo((): PortfolioMapboxPin[] => {
    return ASSETS.map((a) => {
      const ll = coordinates[a.id]
      if (!ll) return null
      return {
        id: a.id,
        longitude: ll[0],
        latitude: ll[1],
        building: a.name,
        lift: "",
        liftPercent: 0,
        liftStrength: 0.45,
      }
    }).filter((p): p is PortfolioMapboxPin => p != null)
  }, [coordinates])

  const showMapbox = mapboxEnabled

  return (
    <div
      role="main"
      className="flex min-h-0 flex-1 flex-col lg:flex-row"
    >
      {/* Map region */}
      <div className="flex min-h-[min(50vh,420px)] flex-1 flex-col p-4 md:p-6 lg:min-h-0">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-muted/20">
          {showMapbox ? (
            <PortfolioMapbox pins={searchMapPins} />
          ) : (
            <MapRegionSkeleton />
          )}
          {showMapbox ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-4">
              <div className="rounded-lg border border-border bg-background/90 px-3 py-2 text-center shadow-sm backdrop-blur-sm">
                <p className="text-xs font-medium text-foreground">
                  Listing search
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Coming soon
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Listings skeleton */}
      <aside className="flex w-full shrink-0 flex-col gap-4 border-t border-border bg-muted/15 p-4 md:p-5 lg:w-[min(100%,380px)] lg:border-l lg:border-t-0 xl:w-[420px]">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pt-1">
          {Array.from({ length: 7 }, (_, i) => (
            <ListingSkeletonCard key={i} />
          ))}
        </div>
      </aside>
    </div>
  )
}
