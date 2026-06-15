"use client"

import * as React from "react"
import { PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react"

import { BenchmarkMapbox } from "@/components/benchmark-mapbox"
import { BenchmarkKpiPanel } from "@/components/benchmark-kpi-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { usePortfolioAssetCoordinates } from "@/hooks/use-portfolio-asset-coordinates"
import { benchmarkAreaSnapshot } from "@/lib/benchmark-area-model"
import {
  filterBenchmarkAreaPresets,
  matchBenchmarkPresetFromQuery,
  resolveBenchmarkAreaSelection,
  US_NATIONAL_BENCHMARK_AREA,
  type BenchmarkArea,
} from "@/lib/benchmark-area-search"
import { cn } from "@/lib/utils"

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

export function BenchmarkWorkspace() {
  const { mapboxEnabled, coordinates } = usePortfolioAssetCoordinates()
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ?? ""
  const searchInputId = React.useId()
  const suggestionsListId = React.useId()

  const [selectedArea, setSelectedArea] = React.useState<BenchmarkArea | null>(
    US_NATIONAL_BENCHMARK_AREA
  )
  const [searchQuery, setSearchQuery] = React.useState("")
  const [suggestionsOpen, setSuggestionsOpen] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const [searchPending, setSearchPending] = React.useState(false)
  const [mapExpanded, setMapExpanded] = React.useState(true)
  const searchContainerRef = React.useRef<HTMLDivElement>(null)

  const suggestions = React.useMemo(
    () => filterBenchmarkAreaPresets(searchQuery.trim()),
    [searchQuery]
  )

  const applyArea = React.useCallback(
    async (area: BenchmarkArea) => {
      setSuggestionsOpen(false)
      setSearchPending(true)
      try {
        const resolved = mapboxToken
          ? await resolveBenchmarkAreaSelection(area, mapboxToken)
          : area
        setSelectedArea(resolved)
        setSearchQuery(resolved.label)
      } finally {
        setSearchPending(false)
      }
    },
    [mapboxToken]
  )

  const runSearch = React.useCallback(
    async (query: string) => {
      const trimmed = query.trim()
      if (!trimmed) {
        const national = mapboxToken
          ? await resolveBenchmarkAreaSelection(
              US_NATIONAL_BENCHMARK_AREA,
              mapboxToken
            )
          : US_NATIONAL_BENCHMARK_AREA
        setSelectedArea(national)
        setSearchQuery("")
        setSuggestionsOpen(false)
        return
      }
      if (!mapboxToken) {
        const preset = matchBenchmarkPresetFromQuery(query)
        if (preset) await applyArea(preset)
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
    [applyArea, mapboxToken]
  )

  React.useEffect(() => {
    let cancelled = false
    const initArea = async () => {
      const area = mapboxToken
        ? await resolveBenchmarkAreaSelection(
            US_NATIONAL_BENCHMARK_AREA,
            mapboxToken
          )
        : US_NATIONAL_BENCHMARK_AREA
      if (!cancelled) {
        setSelectedArea(area)
      }
    }
    void initArea()
    return () => {
      cancelled = true
    }
  }, [mapboxToken])

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setSuggestionsOpen(false)
      }
    }
    window.addEventListener("pointerdown", onPointerDown)
    return () => window.removeEventListener("pointerdown", onPointerDown)
  }, [])

  const snapshot = React.useMemo(
    () =>
      benchmarkAreaSnapshot(
        selectedArea ?? US_NATIONAL_BENCHMARK_AREA,
        coordinates
      ),
    [selectedArea, coordinates]
  )

  const showMapbox = mapboxEnabled
  const showSearchClear =
    selectedArea?.id !== US_NATIONAL_BENCHMARK_AREA.id

  return (
    <div
      role="main"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div
          className={cn(
            "flex min-h-[min(50vh,420px)] min-w-0 flex-col lg:h-full lg:min-h-0",
            mapExpanded ? "lg:flex-[2]" : "lg:flex-1"
          )}
        >
          <div className="relative min-h-0 min-w-0 w-full flex-1 min-h-[min(50vh,420px)] border-b border-border bg-muted/20 lg:min-h-0 lg:border-b-0 lg:border-r">
            <div className="absolute inset-0 overflow-hidden">
              {showMapbox && selectedArea ? (
                <BenchmarkMapbox area={selectedArea} />
              ) : (
                <BenchmarkMapSkeleton />
              )}
            </div>
            <div className="pointer-events-none absolute inset-0 z-20 flex justify-start">
              <div
                ref={searchContainerRef}
                className="pointer-events-auto w-full max-w-[min(100%,22rem)] p-3 sm:max-w-sm md:p-4"
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0.5 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Clear search and show national view"
                        onClick={() => {
                          void runSearch("")
                        }}
                      >
                        <X className="size-4" aria-hidden />
                      </Button>
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
        </div>

        <div
          className={cn(
            "relative flex min-h-0 min-w-0 w-full flex-col overflow-hidden border-t border-border bg-muted/15 lg:h-full lg:max-h-full lg:border-l lg:border-t-0",
            mapExpanded ? "lg:flex-1" : "lg:flex-[2]"
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Area benchmarks
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs font-medium"
              aria-pressed={mapExpanded}
              onClick={() => setMapExpanded((expanded) => !expanded)}
            >
              {mapExpanded ? (
                <PanelLeftClose className="size-3.5 shrink-0" aria-hidden />
              ) : (
                <PanelLeftOpen className="size-3.5 shrink-0" aria-hidden />
              )}
              {mapExpanded ? "Less Map" : "More Map"}
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden p-4 pt-3">
          {showMapbox ? (
            <BenchmarkKpiPanel
              area={selectedArea ?? US_NATIONAL_BENCHMARK_AREA}
              snapshot={snapshot}
              className="h-full"
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
    </div>
  )
}
