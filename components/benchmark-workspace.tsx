"use client"

import * as React from "react"
import { ArrowLeft, ChevronRight, Search, X } from "lucide-react"

import { BenchmarkMapbox } from "@/components/benchmark-mapbox"
import { BenchmarkAreaStatsPanel } from "@/components/benchmark-area-stats-panel"
import { BenchmarkForecastSection } from "@/components/benchmark-kpi-panel"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { usePortfolioAssetCoordinates } from "@/hooks/use-portfolio-asset-coordinates"
import {
  BENCHMARK_ROOT_AREA,
  getBenchmarkAreaLevelLabel,
  getBenchmarkAreaParent,
  getBenchmarkAreaPath,
  listBenchmarkAreaChildren,
} from "@/lib/benchmark-area-hierarchy"
import {
  benchmarkAreaStats,
  benchmarkSnapshotFromRaw,
} from "@/lib/benchmark-area-model"
import {
  benchmarkAreaLevelLabel,
  resolveBenchmarkAreaFromSearch,
  resolveBenchmarkAreaSelection,
  searchBenchmarkAreas,
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
}: {
  initialArea?: BenchmarkArea
} = {}) {
  const { mapboxEnabled } = usePortfolioAssetCoordinates()
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim()
  const searchInputId = React.useId()
  const suggestionsListId = React.useId()
  const initialSelection = initialArea ?? BENCHMARK_ROOT_AREA

  const [currentArea, setCurrentArea] =
    React.useState<BenchmarkArea>(initialSelection)
  const [committedArea, setCommittedArea] =
    React.useState<BenchmarkArea>(initialSelection)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [suggestions, setSuggestions] = React.useState<BenchmarkArea[]>(() => [
    ...listBenchmarkAreaChildren(initialSelection),
  ])
  const [suggestionsOpen, setSuggestionsOpen] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const [searchPending, setSearchPending] = React.useState(false)
  const [searchFeedback, setSearchFeedback] = React.useState<string | null>(null)
  const searchContainerRef = React.useRef<HTMLDivElement>(null)
  const searchRequestIdRef = React.useRef(0)
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

  const loadSuggestions = React.useCallback(
    async (query: string, area = currentArea) => {
      const requestId = ++searchRequestIdRef.current
      setSearchPending(true)
      try {
        const results = await searchBenchmarkAreas(query, area, accessToken)
        if (requestId !== searchRequestIdRef.current) return
        setSuggestions(results)
        if (!query.trim()) {
          const areaNextLevelLabel = area.childLevel
            ? getBenchmarkAreaLevelLabel(area.childLevel)
            : null
          setSearchFeedback(
            results.length > 0
              ? `Showing ${areaNextLevelLabel ?? "available"} choices for ${area.label}.`
              : "No deeper drilldown areas are available here. Use search or the breadcrumbs to move elsewhere."
          )
          return
        }
        setSearchFeedback(
          results.length > 0
            ? `Showing ${results.length} matching benchmark ${results.length === 1 ? "area" : "areas"}.`
            : "No benchmark matches found. Try a supported market, submarket, county, or ZIP."
        )
      } finally {
        if (requestId === searchRequestIdRef.current) {
          setSearchPending(false)
        }
      }
    },
    [accessToken, currentArea]
  )

  const commitResolvedArea = React.useCallback((area: BenchmarkArea) => {
    setCurrentArea(area)
    setCommittedArea(area)
    setSearchQuery("")
    setSuggestionsOpen(false)
    setHighlightedIndex(-1)
  }, [])

  React.useEffect(() => {
    const requestedArea = initialArea ?? BENCHMARK_ROOT_AREA
    let cancelled = false

    void resolveBenchmarkAreaSelection(requestedArea, accessToken).then(
      (resolved) => {
        if (cancelled) return
        setCurrentArea(resolved)
        setCommittedArea(resolved)
        setSuggestions([...listBenchmarkAreaChildren(resolved)])
        setSearchQuery("")
        setSuggestionsOpen(false)
        setHighlightedIndex(-1)
      }
    )

    return () => {
      cancelled = true
    }
  }, [accessToken, initialArea])

  const applyArea = React.useCallback(
    async (area: BenchmarkArea) => {
      setSuggestionsOpen(false)
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

  const runSearch = React.useCallback(
    async (query: string) => {
      const trimmed = query.trim()
      if (!trimmed) {
        setSuggestionsOpen(true)
        await loadSuggestions("", currentArea)
        return
      }
      setSearchPending(true)
      try {
        const resolved = await resolveBenchmarkAreaFromSearch(
          query,
          currentArea,
          accessToken
        )
        if (
          resolved.id === BENCHMARK_ROOT_AREA.id &&
          trimmed.toLowerCase() !== BENCHMARK_ROOT_AREA.label.toLowerCase()
        ) {
          setSuggestionsOpen(true)
          await loadSuggestions(trimmed, currentArea)
          return
        }
        commitResolvedArea(resolved)
        setSearchFeedback(`${resolved.label} selected.`)
      } finally {
        setSearchPending(false)
      }
    },
    [accessToken, commitResolvedArea, currentArea, loadSuggestions]
  )

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setSuggestionsOpen(false)
      }
    }
    window.addEventListener("pointerdown", onPointerDown)
    return () => window.removeEventListener("pointerdown", onPointerDown)
  }, [])

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
  const showSearchClear =
    searchQuery.trim().length > 0 || currentArea.id !== BENCHMARK_ROOT_AREA.id

  React.useEffect(() => {
    if (!suggestionsOpen) return
    void loadSuggestions(searchQuery, currentArea)
  }, [currentArea.id, loadSuggestions, searchQuery, suggestionsOpen])

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

  const goToParent = React.useCallback(() => {
    const parent = getBenchmarkAreaParent(currentArea)
    if (!parent) return
    jumpToArea(parent)
  }, [currentArea, jumpToArea])

  const selectionPrompt =
    nextLevelLabel != null
      ? `Select ${nextLevelLabel}`
      : "Deepest benchmark level selected"

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
              <div
                ref={searchContainerRef}
                className="pointer-events-auto w-full max-w-[22rem] p-3 sm:max-w-sm md:p-4"
              >
                <div className="overflow-hidden rounded-lg border border-border/80 bg-background/95 shadow-md ring-1 ring-black/5 backdrop-blur-md dark:ring-white/10">
                  <label htmlFor={searchInputId} className="sr-only">
                    Search benchmark area
                  </label>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      id={searchInputId}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        const value = e.target.value
                        setHighlightedIndex(-1)
                        setSearchQuery(value)
                        setSuggestionsOpen(true)
                        void loadSuggestions(value)
                      }}
                      onFocus={() => {
                        setSuggestionsOpen(true)
                        void loadSuggestions(searchQuery)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault()
                          setSuggestionsOpen(true)
                          setHighlightedIndex((index) =>
                            index < suggestions.length - 1 ? index + 1 : 0
                          )
                          return
                        }
                        if (e.key === "ArrowUp") {
                          e.preventDefault()
                          setSuggestionsOpen(true)
                          setHighlightedIndex((index) =>
                            index > 0
                              ? index - 1
                              : Math.max(suggestions.length - 1, 0)
                          )
                          return
                        }
                        if (e.key === "Enter") {
                          e.preventDefault()
                          const highlighted =
                            highlightedIndex >= 0
                              ? suggestions[highlightedIndex]
                              : undefined
                          if (suggestionsOpen && highlighted) {
                            void applyArea(highlighted)
                            return
                          }
                          void runSearch(searchQuery)
                          return
                        }
                        if (e.key === "Escape") {
                          setSuggestionsOpen(false)
                          setHighlightedIndex(-1)
                        }
                      }}
                      placeholder="Search market, submarket, county, or ZIP…"
                      autoComplete="off"
                      role="combobox"
                      aria-expanded={suggestionsOpen}
                      aria-controls={suggestionsListId}
                      aria-autocomplete="list"
                      aria-activedescendant={
                        highlightedIndex >= 0
                          ? `${suggestionsListId}-option-${highlightedIndex}`
                          : undefined
                      }
                      className={cn(
                        "h-9 border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0 dark:bg-transparent",
                        showSearchClear && "pr-9"
                      )}
                    />
                    {showSearchClear ? (
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex w-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                        aria-label="Clear search or reset benchmark level"
                        onClick={() => {
                          setHighlightedIndex(-1)
                          if (searchQuery.trim()) {
                            setSearchQuery("")
                            setSuggestionsOpen(true)
                            void loadSuggestions("")
                            return
                          }
                          jumpToArea(BENCHMARK_ROOT_AREA)
                        }}
                      >
                        <X className="size-4 shrink-0" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                  {suggestionsOpen ? (
                    suggestions.length > 0 ? (
                      <ul
                        id={suggestionsListId}
                        role="listbox"
                        className="max-h-72 overflow-y-auto border-t border-border py-1"
                      >
                        {suggestions.map((suggestion, index) => (
                          <li
                            key={suggestion.id}
                            id={`${suggestionsListId}-option-${index}`}
                            role="option"
                            aria-selected={
                              highlightedIndex === index ||
                              committedArea.id === suggestion.id
                            }
                          >
                            <button
                              type="button"
                              className={cn(
                                "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted",
                                (highlightedIndex === index ||
                                  committedArea.id === suggestion.id) &&
                                  "bg-muted"
                              )}
                              onMouseEnter={() => setHighlightedIndex(index)}
                              onClick={() => {
                                void applyArea(suggestion)
                              }}
                            >
                              <span className="min-w-0 truncate">
                                {suggestion.label}
                              </span>
                              <span className="shrink-0 text-[11px] text-muted-foreground">
                                {benchmarkAreaLevelLabel(suggestion)}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                        No benchmark areas match this search yet.
                      </div>
                    )
                  ) : null}
                </div>
                <div className="mt-2 space-y-2 px-1">
                  <div className="rounded-lg border border-border/70 bg-background/80 p-2.5 shadow-sm backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        {selectionPrompt}
                      </p>
                      {currentArea.parentId ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          onClick={goToParent}
                        >
                          <ArrowLeft className="size-3" aria-hidden />
                          Back
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                      {breadcrumbPath.map((area, index) => (
                        <React.Fragment key={area.id}>
                          {index > 0 ? (
                            <ChevronRight className="size-3 shrink-0" aria-hidden />
                          ) : null}
                          <button
                            type="button"
                            className={cn(
                              "rounded px-1 py-0.5 transition-colors hover:bg-muted hover:text-foreground",
                              area.id === currentArea.id &&
                                "bg-muted text-foreground"
                            )}
                            onClick={() => jumpToArea(area)}
                          >
                            {area.label}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  {searchPending || searchFeedback ? (
                    <p className="text-xs text-muted-foreground">
                      {searchPending
                        ? "Updating benchmark area…"
                        : searchFeedback}
                    </p>
                  ) : null}
                </div>
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
                <BenchmarkAreaStatsPanel snapshot={snapshot} />
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
