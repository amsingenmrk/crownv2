"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Filter, Plus, Search, X } from "lucide-react"

import { useAppToast } from "@/components/app-toast"
import type { PortfolioMapboxPin } from "@/components/portfolio-mapbox"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { INPUT_LABEL_TEXT_CLASS } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { addPortfolioAssetToScenarioBySlug } from "@/lib/add-portfolio-asset-to-scenario"
import {
  getAssetGroupOverridesSnapshot,
  parseAssetGroupOverrideSnapshot,
  toggleAssetGroupMembership,
  subscribeAssetGroupOverrides,
} from "@/lib/asset-group-overrides"
import {
  COMPETITIVE_SEEDED_GROUPS,
  getCompetitiveGroupSnapshot,
  parseCompetitiveGroupSnapshot,
  removeCompetitiveAssetFromOtherAssets,
  resolveCompetitiveGroupIdsForAsset,
  subscribeCompetitiveGroups,
  toggleCompetitiveAssetGroupMembership,
} from "@/lib/competitive-group-overrides"
import {
  ASSETS,
  SEEDED_PORTFOLIO_GROUP_IDS,
  assetHref,
  getAssetById,
  resolveAssetGroupIdsForAsset,
  resolveAssetGroupLabel,
} from "@/lib/assets"
import { portfolioAssetRowForMarketPin } from "@/lib/market-listing-portfolio-row"
import { usePortfolioAssetCoordinates } from "@/hooks/use-portfolio-asset-coordinates"
import { useScenariosIncludingAssetCount } from "@/hooks/use-scenarios-including-asset-count"
import { lngLatForPortfolioAsset } from "@/lib/portfolio-asset-lng-lat"
import {
  listingPreviewBodyClassName,
} from "@/lib/listing-preview-card-layout"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import { portfolioAssetRowForAsset } from "@/lib/portfolio-row-for-asset"
import {
  getMarketListingPinById,
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
import {
  BUILTIN_SCENARIO,
  BUILTIN_SCENARIO_DISPLAY_CHANGED_EVENT,
  BUILTIN_SCENARIO_DISPLAY_STORAGE_KEY,
  readUserScenarios,
  scenarioDisplayTitleForSlug,
  USER_SCENARIOS_CHANGED_EVENT,
  type UserScenario,
} from "@/lib/user-scenarios"

const PortfolioMapbox = dynamic(
  () =>
    import("@/lib/configure-mapbox-gl-worker").then(() =>
      import("@/components/portfolio-mapbox").then((m) => m.PortfolioMapbox)
    ),
  { ssr: false }
)

/** Search card metrics (subset of portfolio table columns). */
const SEARCH_CARD_PORTFOLIO_METRICS: {
  label: string
  get: (row: PortfolioAssetRow) => string
}[] = [
  { label: "RSF", get: (r) => r.rsf },
  { label: "Occ%", get: (r) => r.occPct },
  { label: "Value", get: (r) => r.value },
  { label: "Cap", get: (r) => r.capRate },
]

const DEFAULT_SEARCH_LISTING_FILTERS = {
  showPortfolio: true,
  showMarket: true,
} as const

type SearchListingFilters = {
  showPortfolio: boolean
  showMarket: boolean
}

type ScenarioMenuOption = { name: string; slug: string }
type PortfolioMenuOption = { name: string; groupId: string }
type CompetitiveMenuOption = { name: string; groupId: string }
type CompetitiveGroupSnapshotData = ReturnType<typeof parseCompetitiveGroupSnapshot>

function SearchListingCardActions({
  assetId,
  membershipGroupIds,
  competitiveMembershipGroupIds,
  competitiveGroupsForMenu,
  portfoliosForMenu,
  scenariosForMenu,
}: {
  assetId: string
  membershipGroupIds: readonly string[]
  competitiveMembershipGroupIds: readonly string[]
  competitiveGroupsForMenu: CompetitiveMenuOption[]
  portfoliosForMenu: PortfolioMenuOption[]
  scenariosForMenu: ScenarioMenuOption[]
}) {
  const showToast = useAppToast()
  const baseGroupId =
    ASSETS.find((asset) => asset.id === assetId)?.groupId ?? "office"
  const [openAction, setOpenAction] = React.useState<
    "upload-om" | "add-from-other-assets" | null
  >(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="shrink-0 border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Add listing to prospective group, portfolio group, or scenario"
            />
          }
        >
          <Plus className="size-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="top"
          sideOffset={6}
          className="z-[120] min-w-[12.5rem] max-h-[min(50vh,22rem)] overflow-y-auto"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Other Assets actions
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setOpenAction("upload-om")}>
              Add OM
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOpenAction("add-from-other-assets")}>
              Add from Other Assets
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Prospective groups
            </DropdownMenuLabel>
            {competitiveGroupsForMenu.map((group) => {
              const selected = competitiveMembershipGroupIds.includes(group.groupId)
              return (
                <DropdownMenuItem
                  key={group.groupId}
                  onClick={() => {
                    const changed = toggleCompetitiveAssetGroupMembership(
                      assetId,
                      group.groupId
                    )
                    if (!changed) return
                    queueMicrotask(() =>
                      showToast(
                        selected
                          ? `Listing removed from “${group.name}”.`
                          : `Listing added to “${group.name}”.`
                      )
                    )
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{group.name}</span>
                  {selected ? (
                    <span
                      className="ml-2 text-xs text-muted-foreground"
                      aria-hidden
                    >
                      Added
                    </span>
                  ) : null}
                </DropdownMenuItem>
              )
            })}
            {competitiveMembershipGroupIds.length > 0 ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    const changed = removeCompetitiveAssetFromOtherAssets(assetId)
                    if (!changed) return
                    queueMicrotask(() => showToast("Removed from Other Assets."))
                  }}
                >
                  Remove from Other Assets
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Portfolio groups
            </DropdownMenuLabel>
            {portfoliosForMenu.map((p) => {
              const selected = membershipGroupIds.includes(p.groupId)
              return (
                <DropdownMenuItem
                  key={p.groupId}
                  onClick={() => {
                    const wasSelected = selected
                    toggleAssetGroupMembership(assetId, p.groupId, baseGroupId)
                    queueMicrotask(() =>
                      showToast(
                        wasSelected
                          ? `Property removed from “${p.name}”.`
                          : `Property added to “${p.name}”.`
                      )
                    )
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {selected ? (
                    <span
                      className="ml-2 text-xs text-muted-foreground"
                      aria-hidden
                    >
                      Added
                    </span>
                  ) : null}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Scenarios
            </DropdownMenuLabel>
            {scenariosForMenu.map((s) => (
              <DropdownMenuItem
                key={s.slug}
                onClick={() => {
                  addPortfolioAssetToScenarioBySlug(s.slug, assetId)
                  queueMicrotask(() => showToast(`Added to “${s.name}”.`))
                }}
              >
                <span className="truncate">{s.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={openAction === "upload-om"}
        onOpenChange={(open) => {
          if (!open) setOpenAction(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add OM</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            OM upload flow will be connected here for Other Assets overview.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenAction(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openAction === "add-from-other-assets"}
        onOpenChange={(open) => {
          if (!open) setOpenAction(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add from Other Assets</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Asset transfer selection flow from Other Assets will be connected here.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenAction(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SearchListingPreviewCard({
  pin,
  competitiveGroupData,
  competitiveGroupsForMenu,
  portfoliosForMenu,
  scenariosForMenu,
}: {
  pin: PortfolioMapboxPin
  competitiveGroupData: CompetitiveGroupSnapshotData
  competitiveGroupsForMenu: CompetitiveMenuOption[]
  portfoliosForMenu: PortfolioMenuOption[]
  scenariosForMenu: ScenarioMenuOption[]
}) {
  const isMarket = pin.listingScope === "market"
  const scenariosIncludingCount = useScenariosIncludingAssetCount(pin.id)
  const assetGroupOverrideSnap = React.useSyncExternalStore(
    subscribeAssetGroupOverrides,
    getAssetGroupOverridesSnapshot,
    () => ""
  )
  const assetGroupData = React.useMemo(
    () => parseAssetGroupOverrideSnapshot(assetGroupOverrideSnap),
    [assetGroupOverrideSnap]
  )

  const portfolioRow = React.useMemo(() => {
    if (isMarket) {
      const marketPin = getMarketListingPinById(pin.id)
      return marketPin ? portfolioAssetRowForMarketPin(marketPin) : null
    }
    const index = ASSETS.findIndex((a) => a.id === pin.id)
    if (index < 0) return null
    const a = getAssetById(pin.id, assetGroupData) ?? ASSETS[index]!
    return portfolioAssetRowForAsset(a, index)
  }, [assetGroupData, isMarket, pin.id])
  const membershipGroupIds = React.useMemo(
    () => resolveAssetGroupIdsForAsset(pin.id, assetGroupData),
    [assetGroupData, pin.id]
  )
  const competitiveMembershipGroupIds = React.useMemo(
    () =>
      resolveCompetitiveGroupIdsForAsset(
        pin.id,
        competitiveGroupData.membershipOverrides,
        {
          customGroups: competitiveGroupData.customGroups,
          removedAssetIds: competitiveGroupData.removedAssetIds,
          removedSeededGroupIds: competitiveGroupData.removedSeededGroupIds,
        }
      ),
    [
      competitiveGroupData.customGroups,
      competitiveGroupData.membershipOverrides,
      competitiveGroupData.removedAssetIds,
      competitiveGroupData.removedSeededGroupIds,
      pin.id,
    ]
  )
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

  const cardTop = (
    <div className="p-3">
      <div className={cn(listingPreviewBodyClassName, "justify-start py-0")}>
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
              {pin.building}
            </h3>
            {pin.location ? (
              <p className="truncate text-xs leading-4 text-muted-foreground">
                {pin.location}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5 self-start">
            <span
              className={cn(
                "inline-flex w-fit max-w-[min(100%,11rem)] items-center justify-center gap-1 rounded-full px-[7px] py-0.5 text-[11px] font-medium leading-tight",
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
            <div className="flex max-w-full flex-row flex-wrap items-center justify-end gap-1.5">
              {!isMarket ? (
                <span
                  className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted/50 px-[7px] py-0.5 text-[11px] font-medium leading-tight text-muted-foreground"
                  aria-label="Portfolio asset"
                >
                  Asset
                </span>
              ) : null}
              {scenariosIncludingCount > 0 ? (
                <span
                  className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted/50 px-[7px] py-0.5 text-[11px] font-medium leading-tight text-muted-foreground"
                  aria-label={
                    scenariosIncludingCount === 1
                      ? "Included in 1 scenario"
                      : `Included in ${scenariosIncludingCount} scenarios`
                  }
                >
                  {scenariosIncludingCount}{" "}
                  {scenariosIncludingCount === 1 ? "Scenario" : "Scenarios"}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const cardFooter = (
    <div className="flex items-end justify-between gap-3 border-t border-border bg-muted/25 px-3 py-2.5">
      {portfolioRow ? (
        <dl
          className="grid min-w-0 flex-1 grid-cols-2 gap-x-2 gap-y-2.5 sm:grid-cols-4"
          aria-label="Listing metrics"
        >
          {SEARCH_CARD_PORTFOLIO_METRICS.map(({ label, get }) => (
            <div key={label} className="min-w-0">
              <dt className={cn("truncate", INPUT_LABEL_TEXT_CLASS)}>{label}</dt>
              <dd className="truncate text-xs font-medium tabular-nums text-foreground">
                {get(portfolioRow)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="min-w-0 flex-1" aria-hidden />
      )}
      <div className="shrink-0">
        <SearchListingCardActions
          assetId={pin.id}
          membershipGroupIds={membershipGroupIds}
          competitiveMembershipGroupIds={competitiveMembershipGroupIds}
          competitiveGroupsForMenu={competitiveGroupsForMenu}
          portfoliosForMenu={portfoliosForMenu}
          scenariosForMenu={scenariosForMenu}
        />
      </div>
    </div>
  )

  const articleClass =
    "min-w-0 flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"

  const mainSurfaceClass = cn(
    "min-w-0",
    pin.assetDetailHref &&
      "transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
  )

  return (
    <article className={articleClass}>
      {pin.assetDetailHref ? (
        <Link href={pin.assetDetailHref} className={mainSurfaceClass}>
          {cardTop}
        </Link>
      ) : (
        <div className={mainSurfaceClass}>{cardTop}</div>
      )}
      {cardFooter}
    </article>
  )
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

export function SearchComingSoon() {
  const { mapboxEnabled, coordinates } = usePortfolioAssetCoordinates()
  const assetGroupOverrideSnap = React.useSyncExternalStore(
    subscribeAssetGroupOverrides,
    getAssetGroupOverridesSnapshot,
    () => ""
  )
  const assetGroupData = React.useMemo(
    () => parseAssetGroupOverrideSnapshot(assetGroupOverrideSnap),
    [assetGroupOverrideSnap]
  )
  const competitiveGroupSnap = React.useSyncExternalStore(
    subscribeCompetitiveGroups,
    getCompetitiveGroupSnapshot,
    () => ""
  )
  const competitiveGroupData = React.useMemo(
    () => parseCompetitiveGroupSnapshot(competitiveGroupSnap),
    [competitiveGroupSnap]
  )
  const filterTitleId = React.useId()
  const portfolioCbId = React.useId()
  const marketCbId = React.useId()

  const [filterPanelOpen, setFilterPanelOpen] = React.useState(false)
  const [appliedFilters, setAppliedFilters] = React.useState<SearchListingFilters>(
    { ...DEFAULT_SEARCH_LISTING_FILTERS }
  )
  const [draftFilters, setDraftFilters] = React.useState<SearchListingFilters>(
    { ...DEFAULT_SEARCH_LISTING_FILTERS }
  )
  const [mapSearchQuery, setMapSearchQuery] = React.useState("")

  const { portfolioPins, marketPins } = React.useMemo(() => {
    const liftPcts = ASSETS.map(
      (a, i) => 3 + (seedForAsset(a, i) % 15)
    )
    const minLift = Math.min(...liftPcts)
    const maxLift = Math.max(...liftPcts)
    const portfolioRaw = ASSETS.flatMap((a, index) => {
      if (assetGroupData.standalonePropertyNavIds.has(a.id)) return []
      const liftPct = liftPcts[index]!
      const effective = getAssetById(a.id, assetGroupData) ?? a
      const [longitude, latitude] = lngLatForPortfolioAsset(
        a.id,
        effective.groupId,
        coordinates
      )
      return [
        {
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
        },
      ]
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
      portfolioPins: pf,
      marketPins: mk,
    }
  }, [assetGroupData, coordinates])

  const displayedListingPins = React.useMemo(
    () => [
      ...(appliedFilters.showPortfolio ? portfolioPins : []),
      ...(appliedFilters.showMarket ? marketPins : []),
    ],
    [appliedFilters.showMarket, appliedFilters.showPortfolio, marketPins, portfolioPins]
  )

  const mapSearchFilteredPins = React.useMemo(() => {
    const q = mapSearchQuery.trim().toLowerCase()
    if (!q) return displayedListingPins
    return displayedListingPins.filter((pin) => {
      const haystack = [pin.building, pin.location ?? ""]
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [displayedListingPins, mapSearchQuery])

  const searchFilteredPortfolioPins = React.useMemo(
    () => mapSearchFilteredPins.filter((p) => p.listingScope !== "market"),
    [mapSearchFilteredPins]
  )
  const searchFilteredMarketPins = React.useMemo(
    () => mapSearchFilteredPins.filter((p) => p.listingScope === "market"),
    [mapSearchFilteredPins]
  )

  const openFilterPanel = React.useCallback(() => {
    setDraftFilters(appliedFilters)
    setFilterPanelOpen(true)
  }, [appliedFilters])

  const handleFilterClear = React.useCallback(() => {
    setDraftFilters({ ...DEFAULT_SEARCH_LISTING_FILTERS })
  }, [])

  const handleFilterCancel = React.useCallback(() => {
    setFilterPanelOpen(false)
  }, [])

  const handleFilterApply = React.useCallback(() => {
    setAppliedFilters(draftFilters)
    setFilterPanelOpen(false)
  }, [draftFilters])

  React.useEffect(() => {
    if (!filterPanelOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleFilterCancel()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [filterPanelOpen, handleFilterCancel])

  const [userScenarios, setUserScenarios] = React.useState<UserScenario[]>([])

  React.useEffect(() => {
    const sync = () => setUserScenarios(readUserScenarios())
    sync()
    const onStorage = (e: StorageEvent) => {
      if (
        e.key !== "glassbox:user-scenarios" &&
        e.key !== BUILTIN_SCENARIO_DISPLAY_STORAGE_KEY
      ) {
        return
      }
      sync()
    }
    window.addEventListener(USER_SCENARIOS_CHANGED_EVENT, sync)
    window.addEventListener(BUILTIN_SCENARIO_DISPLAY_CHANGED_EVENT, sync)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener(USER_SCENARIOS_CHANGED_EVENT, sync)
      window.removeEventListener(BUILTIN_SCENARIO_DISPLAY_CHANGED_EVENT, sync)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  const scenariosForMenu = React.useMemo((): ScenarioMenuOption[] => {
    const userSorted = [...userScenarios].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    )
    return [
      {
        name: scenarioDisplayTitleForSlug(BUILTIN_SCENARIO.slug, userScenarios),
        slug: BUILTIN_SCENARIO.slug,
      },
      ...userSorted,
    ]
  }, [userScenarios])

  const portfoliosForMenu = React.useMemo((): PortfolioMenuOption[] => {
    const custom = Object.entries(assetGroupData.customGroups)
      .map(([groupId, name]) => ({ name, groupId }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      )
    const seededGroups = SEEDED_PORTFOLIO_GROUP_IDS.filter(
      (groupId) => !assetGroupData.removedPortfolioGroupIds.has(groupId)
    ).map((groupId) => ({
      name: resolveAssetGroupLabel(groupId, assetGroupData.customGroups),
      groupId,
    }))
    return [...seededGroups, ...custom]
  }, [assetGroupData.customGroups, assetGroupData.removedPortfolioGroupIds])
  const competitiveGroupsForMenu = React.useMemo((): CompetitiveMenuOption[] => {
    const seeded = COMPETITIVE_SEEDED_GROUPS.filter(
      (group) => !competitiveGroupData.removedSeededGroupIds.has(group.id)
    ).map((group) => ({
      name: competitiveGroupData.groupLabels[group.id] ?? group.label,
      groupId: group.id,
    }))
    const custom = Object.entries(competitiveGroupData.customGroups)
      .map(([groupId, name]) => ({ name, groupId }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      )
    return [...seeded, ...custom]
  }, [
    competitiveGroupData.customGroups,
    competitiveGroupData.groupLabels,
    competitiveGroupData.removedSeededGroupIds,
  ])

  const showMapbox = mapboxEnabled
  const propertyCount = mapSearchFilteredPins.length

  return (
    <>
    <div
      role="main"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Map region */}
        <div className="flex min-h-[min(42vh,340px)] min-w-0 flex-none flex-col sm:min-h-[min(50vh,420px)] lg:h-full lg:min-h-0 lg:flex-1">
          <div className="relative min-h-[min(42vh,340px)] min-w-0 w-full flex-1 overflow-hidden border-b border-border bg-muted/20 sm:min-h-[min(50vh,420px)] lg:min-h-0 lg:border-b-0 lg:border-r">
            {showMapbox ? (
              <PortfolioMapbox pins={mapSearchFilteredPins} edgeToEdge />
            ) : (
              <MapRegionSkeleton
                totalListings={mapSearchFilteredPins.length}
                portfolioCount={searchFilteredPortfolioPins.length}
                marketCount={searchFilteredMarketPins.length}
              />
            )}
            <div className="pointer-events-none absolute inset-0 z-20 flex justify-start">
              <div className="pointer-events-auto w-full max-w-[min(100%,22rem)] p-2.5 sm:max-w-sm sm:p-3 md:p-4">
                <div className="rounded-lg border border-border/80 bg-background/95 shadow-md ring-1 ring-black/5 backdrop-blur-md dark:ring-white/10">
                  <label htmlFor="property-map-search" className="sr-only">
                    Search properties on map
                  </label>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      id="property-map-search"
                      type="search"
                      value={mapSearchQuery}
                      onChange={(e) => setMapSearchQuery(e.target.value)}
                      placeholder="Search address or building…"
                      autoComplete="off"
                      className="h-9 border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0 dark:bg-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Listings skeleton */}
        <aside className="relative flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-hidden border-t border-border bg-muted/15 p-3 sm:p-4 lg:h-full lg:max-h-full lg:w-[min(100%,416px)] lg:flex-none lg:shrink-0 lg:border-l lg:border-t-0 xl:w-[448px]">
          <div className="flex shrink-0 min-w-0 items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-medium text-foreground">
              {propertyCount === 1
                ? "1 Property"
                : `${propertyCount} Properties`}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              aria-label="Filter properties"
              aria-expanded={filterPanelOpen}
              onClick={() =>
                filterPanelOpen ? handleFilterCancel() : openFilterPanel()
              }
            >
              <Filter className="size-3.5" aria-hidden />
              Filter
            </Button>
          </div>
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {!filterPanelOpen ? (
              <div
                className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain pt-1 [-webkit-overflow-scrolling:touch]"
                role="list"
                aria-label={
                  propertyCount === 1
                    ? "1 property in results"
                    : `${propertyCount} properties in results`
                }
              >
                {searchFilteredPortfolioPins.map((pin) => (
                  <div key={pin.id} role="listitem">
                    <SearchListingPreviewCard
                      pin={pin}
                      competitiveGroupData={competitiveGroupData}
                      competitiveGroupsForMenu={competitiveGroupsForMenu}
                      portfoliosForMenu={portfoliosForMenu}
                      scenariosForMenu={scenariosForMenu}
                    />
                  </div>
                ))}
                {searchFilteredMarketPins.map((pin) => (
                  <div key={pin.id} role="listitem">
                    <SearchListingPreviewCard
                      pin={pin}
                      competitiveGroupData={competitiveGroupData}
                      competitiveGroupsForMenu={competitiveGroupsForMenu}
                      portfoliosForMenu={portfoliosForMenu}
                      scenariosForMenu={scenariosForMenu}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {filterPanelOpen ? (
              <div
                className="absolute inset-0 z-10 flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
                role="dialog"
                aria-modal="true"
                aria-labelledby={filterTitleId}
              >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                  <h2
                    id={filterTitleId}
                    className="text-sm font-semibold text-foreground"
                  >
                    Filters
                  </h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    aria-label="Close filters"
                    onClick={handleFilterCancel}
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                  <p className="mb-3 text-xs font-medium text-muted-foreground">
                    Listing scope
                  </p>
                  <div className="flex flex-col gap-3">
                    <label
                      htmlFor={portfolioCbId}
                      className="flex cursor-pointer items-center gap-3 text-sm text-foreground"
                    >
                      <Checkbox
                        id={portfolioCbId}
                        checked={draftFilters.showPortfolio}
                        onCheckedChange={(v) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            showPortfolio: !!v,
                          }))
                        }
                        aria-label="Show portfolio assets"
                      />
                      <span>Portfolio assets</span>
                    </label>
                    <label
                      htmlFor={marketCbId}
                      className="flex cursor-pointer items-center gap-3 text-sm text-foreground"
                    >
                      <Checkbox
                        id={marketCbId}
                        checked={draftFilters.showMarket}
                        onCheckedChange={(v) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            showMarket: !!v,
                          }))
                        }
                        aria-label="Show market listings"
                      />
                      <span>Market listings</span>
                    </label>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-center sm:justify-start"
                    onClick={handleFilterClear}
                  >
                    Clear
                  </Button>
                  <div className="flex flex-1 justify-end gap-2 sm:flex-none">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleFilterCancel}
                    >
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={handleFilterApply}>
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
    </>
  )
}
