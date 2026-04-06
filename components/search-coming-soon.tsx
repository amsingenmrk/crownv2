"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Image as LandscapeImageIcon, Search } from "lucide-react"

import type { PortfolioMapboxPin } from "@/components/portfolio-mapbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ASSETS, assetHref } from "@/lib/assets"
import { usePortfolioAssetCoordinates } from "@/hooks/use-portfolio-asset-coordinates"
import { lngLatForPortfolioAsset } from "@/lib/portfolio-asset-lng-lat"
import {
  listingPreviewBodyClassName,
  listingPreviewCardClassName,
  listingPreviewThumbClassName,
} from "@/lib/listing-preview-card-layout"
import { marketSearchDemoPinsBase } from "@/lib/market-search-demo-listings"
import { seedForAsset } from "@/lib/portfolio-asset-financials"
import {
  liftPillClassFromStrength,
  marketLiftPillClassFromStrength,
  normalizedLiftStrength,
} from "@/lib/portfolio-lift"
import { spreadPortfolioMapPinsForDisplay } from "@/lib/portfolio-map-pin-spread"
import { cn } from "@/lib/utils"

const PortfolioMapbox = dynamic(
  () => import("@/components/portfolio-mapbox").then((m) => m.PortfolioMapbox),
  { ssr: false }
)

function SearchListingPreviewCard({ pin }: { pin: PortfolioMapboxPin }) {
  const isMarket = pin.listingScope === "market"
  const liftText =
    pin.lift.trim() !== ""
      ? pin.lift
      : pin.liftPercent > 0
        ? `+${pin.liftPercent}%`
        : "—"
  const liftBadgeText =
    liftText === "—" ? "Potential lift —" : `Potential lift ${liftText}`

  const liftPillClass = isMarket
    ? marketLiftPillClassFromStrength(pin.liftStrength)
    : liftPillClassFromStrength(pin.liftStrength)

  const scopeBadgeClass = isMarket
    ? "bg-muted text-muted-foreground ring-1 ring-border"
    : "bg-primary/10 text-primary ring-1 ring-primary/25 dark:bg-primary/15 dark:ring-primary/30"

  const cardInner = (
    <>
      <div className={listingPreviewThumbClassName}>
        {pin.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pin.imageUrl}
            alt={pin.building}
            className="size-full object-cover"
          />
        ) : (
          <div
            className="flex size-full items-center justify-center text-muted-foreground"
            aria-hidden
          >
            <LandscapeImageIcon
              className="size-6 opacity-50"
              strokeWidth={1.25}
            />
          </div>
        )}
      </div>
      <div className={listingPreviewBodyClassName}>
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
          <h3 className="line-clamp-2 min-w-0 flex-1 text-sm font-semibold leading-4 text-foreground">
            {pin.building}
          </h3>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
              scopeBadgeClass
            )}
          >
            {isMarket ? "Market" : "Portfolio"}
          </span>
        </div>
        {pin.location ? (
          <p className="line-clamp-2 text-xs leading-3 text-muted-foreground">
            {pin.location}
          </p>
        ) : null}
        <span
          className={cn(
            "inline-flex w-fit max-w-full rounded-full px-2.5 py-0.5 text-xs font-semibold leading-3",
            liftPillClass
          )}
          aria-label={
            liftText === "—"
              ? "Potential lift, not available"
              : `Potential lift ${liftText}`
          }
        >
          <span className="truncate">{liftBadgeText}</span>
        </span>
      </div>
    </>
  )

  const articleClass = cn(
    "min-w-0",
    listingPreviewCardClassName,
    !isMarket && pin.assetDetailHref && "transition-colors hover:bg-muted/35"
  )

  if (!isMarket && pin.assetDetailHref) {
    return (
      <Link href={pin.assetDetailHref} className="block min-w-0 rounded-lg">
        <article className={articleClass}>{cardInner}</article>
      </Link>
    )
  }

  return <article className={articleClass}>{cardInner}</article>
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

type ListingSearchFilter = "office" | "size" | "rent"

function SearchListingsToolbar({
  searchQuery,
  onSearchQueryChange,
  activeFilter,
  onActiveFilterChange,
}: {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  activeFilter: ListingSearchFilter
  onActiveFilterChange: (value: ListingSearchFilter) => void
}) {
  return (
    <div
      className="shrink-0 border-b border-border px-4 py-3 md:px-6 md:py-4"
      aria-label="Search and filter listings"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:gap-4">
        <div className="relative min-w-0 flex-1 sm:max-w-md lg:max-w-xl">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Downtown Denver"
            aria-label="Search properties by location or name"
            className="h-9 pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["office", "Office"],
              ["size", "Size"],
              ["rent", "Rent"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              variant={activeFilter === id ? "outline" : "secondary"}
              size="lg"
              className={
                activeFilter === id
                  ? "border-primary text-primary hover:bg-primary/5 hover:text-primary"
                  : undefined
              }
              onClick={() => onActiveFilterChange(id)}
              aria-pressed={activeFilter === id}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SearchComingSoon() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeFilter, setActiveFilter] =
    React.useState<ListingSearchFilter>("office")

  const { mapboxEnabled, coordinates } = usePortfolioAssetCoordinates()

  const searchMapPins = React.useMemo((): PortfolioMapboxPin[] => {
    const liftPcts = ASSETS.map(
      (a, i) => 3 + (seedForAsset(a, i) % 15)
    )
    const minLift = Math.min(...liftPcts)
    const maxLift = Math.max(...liftPcts)
    const portfolioRaw = ASSETS.map((a, index) => {
      const liftPct = liftPcts[index]!
      const [longitude, latitude] = lngLatForPortfolioAsset(
        a.id,
        a.groupId,
        coordinates
      )
      return {
        id: a.id,
        longitude,
        latitude,
        building: a.name,
        lift: `+${liftPct}%`,
        liftPercent: liftPct,
        liftStrength: normalizedLiftStrength(liftPct, minLift, maxLift),
        listingScope: "portfolio" as const,
        assetDetailHref: assetHref(a.id),
        imageUrl: a.imageUrl,
        location: a.address,
      }
    })
    const marketRaw = marketSearchDemoPinsBase()
    return spreadPortfolioMapPinsForDisplay([...portfolioRaw, ...marketRaw])
  }, [coordinates])

  const portfolioPins = React.useMemo(
    () => searchMapPins.filter((p) => p.listingScope !== "market"),
    [searchMapPins]
  )
  const marketPins = React.useMemo(
    () => searchMapPins.filter((p) => p.listingScope === "market"),
    [searchMapPins]
  )

  const showMapbox = mapboxEnabled

  return (
    <div role="main" className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SearchListingsToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        activeFilter={activeFilter}
        onActiveFilterChange={setActiveFilter}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Map region */}
        <div className="flex min-h-[min(50vh,420px)] flex-1 flex-col lg:h-full lg:min-h-0">
          <div className="relative min-h-0 w-full flex-1 overflow-hidden border-b border-border bg-muted/20 min-h-[min(50vh,420px)] lg:min-h-0 lg:border-b-0 lg:border-r">
            {showMapbox ? (
              <PortfolioMapbox pins={searchMapPins} edgeToEdge />
            ) : (
              <MapRegionSkeleton />
            )}
            {showMapbox ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-4">
                <div className="rounded-lg border border-border bg-background/90 px-3 py-2 text-center shadow-sm backdrop-blur-sm">
                  <p className="text-xs font-medium text-foreground">
                    Map legend
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Violet: your portfolio · Dark: market listings
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Listings skeleton */}
        <aside className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden border-t border-border bg-muted/15 p-4 md:p-5 lg:h-full lg:w-[min(100%,380px)] lg:flex-none lg:shrink-0 lg:border-l lg:border-t-0 xl:w-[420px]">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Search results
            </p>
            <p className="text-xs text-muted-foreground">
              {portfolioPins.length} in your portfolio · {marketPins.length}{" "}
              market listings (demo)
            </p>
          </div>
          <div
            className="min-h-0 flex-1 space-y-5 overflow-y-auto pt-1"
            role="region"
            aria-label="Listing results"
          >
            <section aria-label="Your portfolio">
              <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Your portfolio
              </h2>
              <div className="space-y-3" role="list">
                {portfolioPins.map((pin) => (
                  <div key={pin.id} role="listitem">
                    <SearchListingPreviewCard pin={pin} />
                  </div>
                ))}
              </div>
            </section>
            <section aria-label="Market listings">
              <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Market
              </h2>
              <div className="space-y-3" role="list">
                {marketPins.map((pin) => (
                  <div key={pin.id} role="listitem">
                    <SearchListingPreviewCard pin={pin} />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  )
}
