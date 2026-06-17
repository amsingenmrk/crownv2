"use client"

import * as React from "react"
import { Search, X } from "lucide-react"

import { BenchmarkMapbox } from "@/components/benchmark-mapbox"
import { BenchmarkAreaStatsPanel } from "@/components/benchmark-area-stats-panel"
import { BenchmarkForecastSection } from "@/components/benchmark-kpi-panel"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { usePortfolioAssetCoordinates } from "@/hooks/use-portfolio-asset-coordinates"
import {
  benchmarkAreaStats,
  benchmarkSnapshotFromRaw,
} from "@/lib/benchmark-area-model"
import {
  filterBenchmarkAreaPresets,
  matchBenchmarkPresetFromQuery,
  resolveBenchmarkAreaSelection,
  US_NATIONAL_BENCHMARK_AREA,
  type BenchmarkArea,
} from "@/lib/benchmark-area-search"
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
}: {
  initialArea?: BenchmarkArea
} = {}) {
  const { mapboxEnabled, coordinates } = usePortfolioAssetCoordinates()
  const searchInputId = React.useId()
  const suggestionsListId = React.useId()

  const [selectedArea, setSelectedArea] = React.useState<BenchmarkArea | null>(
    initialArea ?? US_NATIONAL_BENCHMARK_AREA
  )
  const [searchQuery, setSearchQuery] = React.useState(
    initialArea?.label ?? ""
  )
  const [suggestionsOpen, setSuggestionsOpen] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const [searchPending, setSearchPending] = React.useState(false)
  const searchContainerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!initialArea) return
    let cancelled = false
    void resolveBenchmarkAreaSelection(initialArea).then((resolved) => {
      if (cancelled) return
      setSelectedArea(resolved)
      setSearchQuery(resolved.label)
    })
    return () => {
      cancelled = true
    }
  }, [initialArea])

  const suggestions = React.useMemo(
    () => filterBenchmarkAreaPresets(searchQuery.trim()),
    [searchQuery]
  )

  const applyArea = React.useCallback(
    async (area: BenchmarkArea) => {
      setSuggestionsOpen(false)
      setSearchPending(true)
      try {
        const resolved = await resolveBenchmarkAreaSelection(area)
        setSelectedArea(resolved)
        setSearchQuery(resolved.label)
      } finally {
        setSearchPending(false)
      }
    },
    []
  )

  const runSearch = React.useCallback(
    async (query: string) => {
      const trimmed = query.trim()
      if (!trimmed) {
        const national = await resolveBenchmarkAreaSelection(
          US_NATIONAL_BENCHMARK_AREA
        )
        setSelectedArea(national)
        setSearchQuery("")
        setSuggestionsOpen(false)
        return
      }
      setSearchPending(true)
      try {
        const preset = matchBenchmarkPresetFromQuery(query)
        if (preset) {
          await applyArea(preset)
          return
        }
        setSuggestionsOpen(true)
      } finally {
        setSearchPending(false)
      }
    },
    [applyArea]
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

  const activeArea = selectedArea ?? US_NATIONAL_BENCHMARK_AREA

  const statsRaw = React.useMemo(
    () =>
      benchmarkAreaStats(
        activeArea,
        coordinates
      ),
    [activeArea, coordinates]
  )

  const snapshot = React.useMemo(
    () =>
      statsRaw == null
        ? {
            areaLabel: activeArea.label,
            buildingCount: 0,
            fullParticipantCount: 0,
            kpis: [],
          }
        : benchmarkSnapshotFromRaw(activeArea.label, statsRaw),
    [activeArea.label, statsRaw]
  )

  const showMapbox = mapboxEnabled
  const showSearchClear =
    selectedArea?.id !== US_NATIONAL_BENCHMARK_AREA.id

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
              {showMapbox && selectedArea ? (
                <BenchmarkMapbox area={selectedArea} compactMode />
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
                        if (!value.trim()) {
                          setSearchQuery("")
                          void runSearch("")
                          return
                        }
                        setSearchQuery(value)
                        setSuggestionsOpen(true)
                      }}
                      onFocus={() => setSuggestionsOpen(true)}
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
                      placeholder="Search city, metro, zip, or region…"
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
                        aria-label="Clear search and show national view"
                        onClick={() => {
                          void runSearch("")
                        }}
                      >
                        <X className="size-4 shrink-0" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                  {suggestionsOpen && suggestions.length > 0 ? (
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
                            selectedArea?.id === suggestion.id
                          }
                        >
                          <button
                            type="button"
                            className={cn(
                              "flex w-full items-center px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted",
                              (highlightedIndex === index ||
                                selectedArea?.id === suggestion.id) &&
                                "bg-muted"
                            )}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            onClick={() => {
                              void applyArea(suggestion)
                            }}
                          >
                            {suggestion.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {searchPending ? (
                  <p className="mt-2 px-1 text-xs text-muted-foreground">
                    Updating benchmark area…
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col border-t border-border lg:flex-[2] lg:border-t-0 lg:border-l">
            <div className="p-4">
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
          <BenchmarkForecastSection
            key={activeArea.id}
            area={activeArea}
            statsRaw={statsRaw}
          />
        </section>
      ) : null}
    </div>
  )
}
