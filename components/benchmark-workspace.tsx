"use client"

import * as React from "react"

import { BenchmarkMapbox } from "@/components/benchmark-mapbox"
import { BenchmarkAreaBreadcrumbs } from "@/components/benchmark-area-breadcrumbs"
import { BenchmarkAreaSearchBox } from "@/components/benchmark-area-search-box"
import { BenchmarkAreaStatsPanel } from "@/components/benchmark-area-stats-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { usePortfolioAssetCoordinates } from "@/hooks/use-portfolio-asset-coordinates"
import {
  HIERARCHY_ROOT_AREA as BENCHMARK_ROOT_AREA,
  hierarchyLevelLabel as getBenchmarkAreaLevelLabel,
  hierarchyAreaPath as getBenchmarkAreaPath,
  hierarchyChildren as listBenchmarkAreaChildren,
} from "@/lib/benchmark-data/benchmark-hierarchy"
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
import { enrichGeoBenchmarkAreaForMap, constrainGeoChildAreaForMap } from "@/lib/benchmark-data/geo-area-map"
import { cn } from "@/lib/utils"

const BENCHMARK_SECTION_CARD =
  "overflow-hidden rounded-xl border border-border bg-card shadow-sm"

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
  const [breadcrumbPath, setBreadcrumbPath] = React.useState<BenchmarkArea[]>(
    () => getBenchmarkAreaPath(initialArea ?? BENCHMARK_ROOT_AREA)
  )
  const nextLevelLabel = currentArea.childLevel
    ? getBenchmarkAreaLevelLabel(currentArea.childLevel)
    : null

  const commitResolvedArea = React.useCallback((area: BenchmarkArea) => {
    setCurrentArea(area)
    setCommittedArea(area)
  }, [])

  const resolveArea = React.useCallback(
    (area: BenchmarkArea): Promise<BenchmarkArea> =>
      resolveBenchmarkAreaSelection(enrichGeoBenchmarkAreaForMap(area), accessToken),
    [accessToken]
  )

  React.useEffect(() => {
    const requestedArea = initialArea ?? BENCHMARK_ROOT_AREA
    let cancelled = false

    void resolveArea(requestedArea).then((resolved) => {
      if (cancelled) return
      setCurrentArea(resolved)
      setCommittedArea(resolved)
      setBreadcrumbPath(getBenchmarkAreaPath(resolved))
    })

    return () => {
      cancelled = true
    }
  }, [accessToken, initialArea, resolveArea])

  const applyArea = React.useCallback(
    async (
      area: BenchmarkArea,
      options?: { breadcrumbPath?: BenchmarkArea[] }
    ) => {
      setSearchPending(true)
      try {
        const resolved = await resolveArea(area)
        commitResolvedArea(resolved)
        if (options?.breadcrumbPath != null) {
          setBreadcrumbPath(options.breadcrumbPath)
        } else {
          setBreadcrumbPath((prev) =>
            getBenchmarkAreaPath(resolved, {
              preferAncestorIds: new Set(prev.map((entry) => entry.id)),
            })
          )
        }
        setSearchFeedback(`${resolved.label} selected.`)
      } finally {
        setSearchPending(false)
      }
    },
    [commitResolvedArea, resolveArea]
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
        visibleChildren.map((area) => resolveArea(area))
      )
      if (requestId !== visibleAreaRequestIdRef.current) return

      const scopedToParent = resolved.map((child) =>
        constrainGeoChildAreaForMap(currentArea, child)
      )

      setResolvedVisibleChildren(
        scopedToParent.filter(
          (area) => area.boundaryGeometry != null || area.boundary != null
        )
      )
    })()
  }, [accessToken, currentArea.bounds, currentArea.id, visibleChildren])

  const jumpToArea = React.useCallback(
    (area: BenchmarkArea) => {
      setSearchPending(true)
      void resolveArea(area)
        .then((resolved) => {
          commitResolvedArea(resolved)
          setBreadcrumbPath((prev) => {
            const idx = prev.findIndex((entry) => entry.id === resolved.id)
            if (idx >= 0) return prev.slice(0, idx + 1)
            return getBenchmarkAreaPath(resolved, {
              preferAncestorIds: new Set(prev.map((entry) => entry.id)),
            })
          })
          setSearchFeedback(`${resolved.label} selected.`)
        })
        .finally(() => {
          setSearchPending(false)
        })
    },
    [commitResolvedArea, resolveArea]
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
        const isDrillDown = visibleChildren.some((child) => child.id === area.id)
        const nextPath = isDrillDown
          ? [...breadcrumbPath, area]
          : (() => {
              const idx = breadcrumbPath.findIndex(
                (entry) => entry.level === area.level
              )
              if (idx >= 0) return [...breadcrumbPath.slice(0, idx), area]
              return getBenchmarkAreaPath(area, {
                preferAncestorIds: new Set(
                  breadcrumbPath.map((entry) => entry.id)
                ),
              })
            })()
        void applyArea(area, { breadcrumbPath: nextPath })
      }}
    />
  )
  const statsHeaderPortalId = React.useId().replace(/:/g, "")

  return (
    <div
      role="main"
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-3 sm:p-4"
    >
      <section
        className={cn(BENCHMARK_SECTION_CARD, "shrink-0")}
        aria-label="Benchmark map and area statistics"
      >
        {showMapbox ? (
          <div
            id={statsHeaderPortalId}
            className="border-b border-border/60 px-4 py-3"
          />
        ) : null}
        <div className="flex flex-col lg:flex-row lg:items-stretch">
          <div className="relative min-h-[13rem] w-full shrink-0 bg-muted/20 sm:min-h-[14rem] lg:min-h-[34rem] lg:flex-1">
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
            <div className="pointer-events-none absolute inset-0 z-20 flex justify-start pr-12 sm:pr-24 md:pr-28">
              <div className="pointer-events-auto w-full max-w-[min(100%,22rem)] p-2.5 sm:max-w-sm sm:p-3 md:p-4">
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
            <div className="p-3 sm:p-4">
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
                  headerPortalTargetId={statsHeaderPortalId}
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
    </div>
  )
}
