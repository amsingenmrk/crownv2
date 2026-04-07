"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  Briefcase,
  Image as LandscapeImageIcon,
  Search,
} from "lucide-react"

import type { PortfolioMapboxPin } from "@/components/portfolio-mapbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ASSETS, assetHref } from "@/lib/assets"
import { usePortfolioAssetCoordinates } from "@/hooks/use-portfolio-asset-coordinates"
import { lngLatForPortfolioAsset } from "@/lib/portfolio-asset-lng-lat"
import {
  listingPreviewBodyClassName,
  listingPreviewThumbClassName,
} from "@/lib/listing-preview-card-layout"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import { portfolioAssetRowForAsset } from "@/lib/portfolio-row-for-asset"
import {
  MARKET_SEARCH_LISTING_COUNT,
  marketSearchDemoPinsBase,
} from "@/lib/market-search-demo-listings"
import { seedForAsset } from "@/lib/portfolio-asset-financials"
import {
  liftPillClassFromStrength,
  marketLiftPillClassFromStrength,
  normalizedLiftStrength,
} from "@/lib/portfolio-lift"
import { spreadPortfolioMapPinsForDisplay } from "@/lib/portfolio-map-pin-spread"
import { cn } from "@/lib/utils"

const PortfolioMapbox = dynamic(
  () =>
    import("@/lib/configure-mapbox-gl-worker").then(() =>
      import("@/components/portfolio-mapbox").then((m) => m.PortfolioMapbox)
    ),
  { ssr: false }
)

/** Same column labels as the portfolio assets table (RSF … WALE). */
const SEARCH_CARD_PORTFOLIO_METRICS: {
  label: string
  get: (row: PortfolioAssetRow) => string
}[] = [
  { label: "RSF", get: (r) => r.rsf },
  { label: "Occ%", get: (r) => r.occPct },
  { label: "$/SF", get: (r) => r.pricePerSf },
  { label: "NOI", get: (r) => r.noi },
  { label: "Value", get: (r) => r.value },
  { label: "Cap", get: (r) => r.capRate },
  { label: "WALE", get: (r) => r.wale },
]

function SearchListingPreviewCard({ pin }: { pin: PortfolioMapboxPin }) {
  const isMarket = pin.listingScope === "market"
  const portfolioRow = React.useMemo(() => {
    if (isMarket) return null
    const index = ASSETS.findIndex((a) => a.id === pin.id)
    if (index < 0) return null
    return portfolioAssetRowForAsset(ASSETS[index]!, index)
  }, [isMarket, pin.id])
  const liftText =
    pin.lift.trim() !== ""
      ? pin.lift
      : pin.liftPercent > 0
        ? `+${pin.liftPercent}%`
        : "—"
  const liftBadgeText =
    liftText === "—" ? "Potential —" : `Potential ${liftText}`

  const liftPillClass = isMarket
    ? marketLiftPillClassFromStrength(pin.liftStrength)
    : liftPillClassFromStrength(pin.liftStrength)

  const cardInner = (
    <>
      <div className="flex gap-3 p-3">
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
        <div className={cn(listingPreviewBodyClassName, "justify-start")}>
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                {pin.building}
              </h3>
              {pin.location ? (
                <p className="line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground [overflow-wrap:anywhere]">
                  {pin.location}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5 self-start">
              <span
                className={cn(
                  "inline-flex w-fit max-w-[min(100%,11rem)] justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-3",
                  liftPillClass
                )}
                aria-label={
                  liftText === "—"
                    ? "Potential, not available"
                    : `Potential ${liftText}`
                }
              >
                <span className="truncate">{liftBadgeText}</span>
              </span>
              {!isMarket ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span
                        className="inline-flex shrink-0 cursor-default text-muted-foreground"
                        aria-label="Portfolio Asset"
                      />
                    }
                  >
                    <Briefcase className="size-4" strokeWidth={2} aria-hidden />
                  </TooltipTrigger>
                  <TooltipContent side="top">Portfolio Asset</TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      {portfolioRow ? (
        <div
          className="border-t border-border bg-muted/25 px-3 py-2.5"
          aria-label="Portfolio table metrics"
        >
          <dl className="grid grid-cols-4 gap-x-2 gap-y-2.5 sm:grid-cols-7">
            {SEARCH_CARD_PORTFOLIO_METRICS.map(({ label, get }) => (
              <div key={label} className="min-w-0">
                <dt className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </dt>
                <dd className="truncate text-xs font-medium tabular-nums text-foreground">
                  {get(portfolioRow)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </>
  )

  const articleClass = cn(
    "min-w-0 flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm",
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

function MapRegionSkeleton({
  totalListings,
  portfolioCount,
  marketCount,
}: {
  totalListings: number
  portfolioCount: number
  marketCount: number
}) {
  const previewDots =
    totalListings <= 0 ? 0 : Math.min(totalListings, 12)
  const dotPositions = Array.from({ length: previewDots }, (_, i) => {
    const u = ((i * 37) % 97) / 97
    const v = ((i * 53) % 89) / 89
    return {
      left: `${12 + u * 76}%`,
      top: `${18 + v * 64}%`,
    }
  })

  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[48px_48px] opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-transparent to-muted/30" />
      {dotPositions.map((pos, i) => (
        <Skeleton
          key={i}
          className="absolute size-3 rounded-full shadow-sm ring-2 ring-background"
          style={{ left: pos.left, top: pos.top }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="rounded-lg border border-border bg-background/90 px-4 py-3 text-center shadow-sm backdrop-blur-sm">
          <p className="text-sm font-medium text-foreground">Interactive map</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {totalListings} locations match the list · {portfolioCount}{" "}
            portfolio, {marketCount} market (demo)
          </p>
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
      className="shrink-0 border-b border-border px-3 py-3"
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

  const { listingPins, portfolioPins, marketPins } = React.useMemo(() => {
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
    const marketRaw = marketSearchDemoPinsBase(MARKET_SEARCH_LISTING_COUNT)
    const spread = spreadPortfolioMapPinsForDisplay([
      ...portfolioRaw,
      ...marketRaw,
    ])
    const pf = spread.filter((p) => p.listingScope !== "market")
    const mk = spread.filter((p) => p.listingScope === "market")
    if (
      process.env.NODE_ENV === "development" &&
      pf.length + mk.length !== spread.length
    ) {
      console.warn(
        "[search] listingScope partition does not cover all pins",
        spread.length,
        pf.length,
        mk.length
      )
    }
    return {
      listingPins: spread,
      portfolioPins: pf,
      marketPins: mk,
    }
  }, [coordinates])

  const showMapbox = mapboxEnabled

  return (
    <div role="main" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <SearchListingsToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        activeFilter={activeFilter}
        onActiveFilterChange={setActiveFilter}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Map region */}
        <div className="flex min-h-[min(50vh,420px)] min-w-0 flex-1 flex-col lg:h-full lg:min-h-0">
          <div className="relative min-h-0 min-w-0 w-full flex-1 overflow-hidden border-b border-border bg-muted/20 min-h-[min(50vh,420px)] lg:min-h-0 lg:border-b-0 lg:border-r">
            {showMapbox ? (
              <PortfolioMapbox pins={listingPins} edgeToEdge />
            ) : (
              <MapRegionSkeleton
                totalListings={listingPins.length}
                portfolioCount={portfolioPins.length}
                marketCount={marketPins.length}
              />
            )}
          </div>
        </div>

        {/* Listings skeleton */}
        <aside className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden border-t border-border bg-muted/15 p-4 md:p-5 lg:h-full lg:w-[min(100%,456px)] lg:flex-none lg:shrink-0 lg:border-l lg:border-t-0 xl:w-[504px]">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Search results
            </p>
          </div>
          <div
            className="min-h-0 flex-1 space-y-3 overflow-y-auto pt-1"
            role="list"
            aria-label="Listing results"
          >
            {portfolioPins.map((pin) => (
              <div key={pin.id} role="listitem">
                <SearchListingPreviewCard pin={pin} />
              </div>
            ))}
            {marketPins.map((pin) => (
              <div key={pin.id} role="listitem">
                <SearchListingPreviewCard pin={pin} />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
