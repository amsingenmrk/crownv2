"use client"

import * as React from "react"

import { BenchmarkMapbox } from "@/components/benchmark-mapbox"
import { BenchmarkAreaBreadcrumbs } from "@/components/benchmark-area-breadcrumbs"
import { BenchmarkAreaSearchBox } from "@/components/benchmark-area-search-box"
import { BenchmarkAreaStatsPanel } from "@/components/benchmark-area-stats-panel"
import { BenchmarkForecastSection } from "@/components/benchmark-kpi-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { usePortfolioAssetCoordinates } from "@/hooks/use-portfolio-asset-coordinates"
import {
  BENCHMARK_ROOT_AREA,
  getBenchmarkAreaLevelLabel,
  getBenchmarkAreaPath,
  listBenchmarkAreaChildren,
} from "@/lib/benchmark-area-hierarchy"
import {
  benchmarkAreaStats,
  benchmarkSnapshotFromRaw,
  buildingCountBucketLabel,
} from "@/lib/benchmark-area-model"
import { BENCHMARK_AREA_QUERY_PARAM } from "@/lib/benchmark-area-url"
import {
  resolveBenchmarkAreaSelection,
  type BenchmarkArea,
} from "@/lib/benchmark-area-search"
import { cn } from "@/lib/utils"

const BENCHMARK_SECTION_CARD =
  "overflow-hidden rounded-xl border border-border bg-card shadow-sm"

function sameBounds(
  left: BenchmarkArea["bounds"],
  right: BenchmarkArea["bounds"]
): boolean {
  return (
    left[0][0] === right[0][0] &&
    left[0][1] === right[0][1] &&
    left[1][0] === right[1][0] &&
    left[1][1] === right[1][1]
  )
}

function BenchmarkMapSkeleton() {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[48px_48px] opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-transparent to-muted/30" />
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="rounded-lg border border-border bg-background/90 px-4 py-3 text-center shadow-sm backdrop-blur-sm">
          <p className="text-sm font-medium text-foreground">Benchmark map</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Search a market or region to set benchmark boundaries
          </p>
        </div>
      </div>
    </>
  )
}

export function BenchmarkWorkspace({
  initialArea,
  initialCompareAssetId,
}: {
  initialArea?: BenchmarkArea
  initialCompareAssetId?: string
} = {}) {
  const { mapboxEnabled } = usePortfolioAssetCoordinates()
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim()
  const initialSelection = initialArea ?? BENCHMARK_ROOT_AREA

  const [currentArea, setCurrentArea] =
    React.useState<BenchmarkArea>(initialSelection)
  const [committedArea, setCommittedArea] =
    React.useState<BenchmarkArea>(initialSelection)
  const [searchPending, setSearchPending] = React.useState(false)
  const [searchFeedback, setSearchFeedback] = React.useState<string | null>(null)
  const visibleAreaRequestIdRef = React.useRef(0)

  const visibleChildren = React.useMemo(
    () => [...listBenchmarkAreaChildren(currentArea)],
    [currentArea.id]
  )
  const [resolvedVisibleChildren, setResolvedVisibleChildren] =
    React.useState<BenchmarkArea[]>(visibleChildren)
  const breadcrumbPath = React.useMemo(
    () => getBenchmarkAreaPath(currentArea),
    [currentArea.id]
  )
  const nextLevelLabel = currentArea.childLevel
    ? getBenchmarkAreaLevelLabel(currentArea.childLevel)
    : null

  const commitResolvedArea = React.useCallback((area: BenchmarkArea) => {
    setCurrentArea(area)
    setCommittedArea(area)
  }, [])

  React.useEffect(() => {
    const requestedArea = initialArea ?? BENCHMARK_ROOT_AREA
    let cancelled = false

    void resolveBenchmarkAreaSelection(requestedArea, accessToken).then(
      (resolved) => {
        if (cancelled) return
        setCurrentArea(resolved)
        setCommittedArea(resolved)
      }
    )

    return () => {
      cancelled = true
    }
  }, [accessToken, initialArea])

  const applyArea = React.useCallback(
    async (area: BenchmarkArea) => {
      setSearchPending(true)
      try {
        const resolved = await resolveBenchmarkAreaSelection(area, accessToken)
        commitResolvedArea(resolved)
        setSearchFeedback(`${resolved.label} selected.`)
      } finally {
        setSearchPending(false)
      }
    },
    [accessToken, commitResolvedArea]
  )

  const statsRaw = React.useMemo(
    () => benchmarkAreaStats(committedArea),
    [committedArea]
  )

  const snapshot = React.useMemo(
    () =>
      statsRaw == null
        ? {
            areaLabel: committedArea.label,
            buildingCount: 0,
            fullParticipantCount: 0,
            kpis: [],
          }
        : benchmarkSnapshotFromRaw(committedArea.label, statsRaw),
    [committedArea.label, statsRaw]
  )
  const coverageNote =
    statsRaw != null &&
    statsRaw.coverageAreaId != null &&
    statsRaw.coverageAreaId !== committedArea.id
      ? `Using the nearest supported benchmark coverage from ${statsRaw.coverageAreaLabel ?? "a broader parent area"}.`
      : null

  const showMapbox = mapboxEnabled

  React.useEffect(() => {
    const requestId = ++visibleAreaRequestIdRef.current
    setResolvedVisibleChildren(visibleChildren)

    if (visibleChildren.length === 0) {
      return
    }

    void (async () => {
      const resolved = await Promise.all(
        visibleChildren.map((area) =>
          resolveBenchmarkAreaSelection(area, accessToken)
        )
      )
      if (requestId !== visibleAreaRequestIdRef.current) return

      setResolvedVisibleChildren(
        resolved.filter(
          (area) =>
            area.boundaryGeometry != null ||
            area.boundary != null ||
            !sameBounds(area.bounds, currentArea.bounds)
        )
      )
    })()
  }, [accessToken, currentArea.bounds, currentArea.id, visibleChildren])

  const jumpToArea = React.useCallback(
    (area: BenchmarkArea) => {
      commitResolvedArea(area)
      setSearchFeedback(`${area.label} selected.`)
    },
    [commitResolvedArea]
  )

  // Mirror the committed area into the URL so the view is shareable and
  // survives a refresh. Uses history.replaceState rather than the Next router
  // to avoid a server round-trip (and the full remount the loader's `key`
  // would trigger) on every breadcrumb/map navigation.
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (committedArea.id === BENCHMARK_ROOT_AREA.id) {
      url.searchParams.delete(BENCHMARK_AREA_QUERY_PARAM)
    } else {
      url.searchParams.set(BENCHMARK_AREA_QUERY_PARAM, committedArea.id)
    }
    if (url.href !== window.location.href) {
      window.history.replaceState(window.history.state, "", url)
    }
  }, [committedArea.id])

  const breadcrumbs = (
    <BenchmarkAreaBreadcrumbs
      path={breadcrumbPath}
      currentAreaId={currentArea.id}
      childrenOfCurrent={visibleChildren}
      nextLevelLabel={nextLevelLabel}
      onJump={jumpToArea}
      onSelect={(area) => {
        void applyArea(area)
      }}
    />
  )

  return (
    <div
      role="main"
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4"
    >
      <section
        className={cn(BENCHMARK_SECTION_CARD, "shrink-0")}
        aria-label="Benchmark map and area statistics"
      >
        <div className="flex flex-col lg:flex-row lg:items-stretch">
          <div className="relative min-h-[11rem] w-full shrink-0 bg-muted/20 sm:min-h-[12rem] lg:min-h-0 lg:flex-1">
            <div className="absolute inset-0 overflow-hidden">
              {showMapbox ? (
                <BenchmarkMapbox
                  area={currentArea}
                  visibleAreas={resolvedVisibleChildren}
                  activeAreaId={committedArea.id}
                  compactMode
                  onAreaSelect={(area) => {
                    void applyArea(area)
                  }}
                />
              ) : (
                <BenchmarkMapSkeleton />
              )}
            </div>
            <div className="pointer-events-none absolute inset-0 z-20 flex justify-start pr-24 md:pr-28">
              <div className="pointer-events-auto w-full max-w-[22rem] p-3 sm:max-w-sm md:p-4">
                <BenchmarkAreaSearchBox
                  currentArea={currentArea}
                  committedAreaId={committedArea.id}
                  accessToken={accessToken}
                  onApply={(area) => {
                    void applyArea(area)
                  }}
                  onCommitResolved={jumpToArea}
                  onPending={setSearchPending}
                  onFeedback={setSearchFeedback}
                />
                {showMapbox ? (
                  <div className="mt-2 inline-flex w-fit items-center rounded-md bg-background/85 px-2 py-1 text-[11px] text-muted-foreground shadow-sm ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
                    {buildingCountBucketLabel(snapshot.buildingCount)}
                  </div>
                ) : null}
                {searchPending || searchFeedback ? (
                  <p className="mt-2 px-1 text-xs text-muted-foreground">
                    {searchPending
                      ? "Updating benchmark area…"
                      : searchFeedback}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col border-t border-border lg:flex-[2] lg:border-t-0 lg:border-l">
            <div className="p-4">
              {coverageNote ? (
                <div className="mb-3 rounded-lg border border-amber-200/70 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                  {coverageNote}
                </div>
              ) : null}
              {showMapbox ? (
                <BenchmarkAreaStatsPanel
                  snapshot={snapshot}
                  benchmarkAreaId={committedArea.id}
                  headerSlot={breadcrumbs}
                  initialCompareAssetId={initialCompareAssetId}
                />
              ) : (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="space-y-2 rounded-lg border border-border p-3"
                      >
                        <Skeleton className="h-3 w-2/3" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {showMapbox ? (
        <section
          className={cn(BENCHMARK_SECTION_CARD, "shrink-0")}
          aria-label="Benchmark forecasts"
        >
          {coverageNote ? (
            <div className="border-b border-border/60 bg-amber-50/70 px-4 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              {coverageNote}
            </div>
          ) : null}
          <BenchmarkForecastSection
            key={committedArea.id}
            area={committedArea}
            statsRaw={statsRaw}
          />
        </section>
      ) : null}
    </div>
  )
}
