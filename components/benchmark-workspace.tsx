"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Search } from "lucide-react"

import { BenchmarkKpiPanel } from "@/components/benchmark-kpi-panel"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { usePortfolioAssetCoordinates } from "@/hooks/use-portfolio-asset-coordinates"
import { benchmarkAreaSnapshot } from "@/lib/benchmark-area-model"
import {
  filterBenchmarkAreaPresets,
  resolveBenchmarkAreaFromSearch,
  searchBenchmarkAreas,
  US_NATIONAL_BENCHMARK_AREA,
  type BenchmarkArea,
} from "@/lib/benchmark-area-search"
import { cn } from "@/lib/utils"

const BenchmarkMapbox = dynamic(
  () =>
    import("@/lib/configure-mapbox-gl-worker").then(() =>
      import("@/components/benchmark-mapbox").then((m) => m.BenchmarkMapbox)
    ),
  { ssr: false }
)

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

  const [selectedArea, setSelectedArea] = React.useState<BenchmarkArea>(
    US_NATIONAL_BENCHMARK_AREA
  )
  const [searchQuery, setSearchQuery] = React.useState("")
  const [suggestions, setSuggestions] = React.useState<BenchmarkArea[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = React.useState(false)
  const [searchPending, setSearchPending] = React.useState(false)
  const searchContainerRef = React.useRef<HTMLDivElement>(null)

  const applyArea = React.useCallback((area: BenchmarkArea) => {
    setSelectedArea(area)
    setSuggestionsOpen(false)
  }, [])

  const runSearch = React.useCallback(
    async (query: string) => {
      if (!mapboxToken) {
        const preset = filterBenchmarkAreaPresets(query)[0]
        if (preset) applyArea(preset)
        return
      }
      setSearchPending(true)
      try {
        const area = await resolveBenchmarkAreaFromSearch(query, mapboxToken)
        applyArea(area)
      } finally {
        setSearchPending(false)
      }
    },
    [applyArea, mapboxToken]
  )

  React.useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      setSuggestions(filterBenchmarkAreaPresets(""))
      return
    }

    const timeout = window.setTimeout(async () => {
      if (!mapboxToken) {
        setSuggestions(filterBenchmarkAreaPresets(q))
        return
      }
      const results = await searchBenchmarkAreas(q, mapboxToken)
      setSuggestions(results)
    }, 220)

    return () => window.clearTimeout(timeout)
  }, [mapboxToken, searchQuery])

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
    () => benchmarkAreaSnapshot(selectedArea, coordinates),
    [selectedArea, coordinates]
  )

  const showMapbox = mapboxEnabled

  return (
    <div
      role="main"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="flex min-h-[min(50vh,420px)] min-w-0 flex-1 flex-col lg:h-full lg:min-h-0">
          <div className="relative min-h-0 min-w-0 w-full flex-1 overflow-hidden border-b border-border bg-muted/20 min-h-[min(50vh,420px)] lg:min-h-0 lg:border-b-0 lg:border-r">
            {showMapbox ? (
              <BenchmarkMapbox area={selectedArea} />
            ) : (
              <BenchmarkMapSkeleton />
            )}
            <div className="pointer-events-none absolute inset-0 z-20 flex justify-start">
              <div
                ref={searchContainerRef}
                className="pointer-events-auto relative w-full max-w-[min(100%,22rem)] p-3 sm:max-w-sm md:p-4"
              >
                <div className="rounded-lg border border-border/80 bg-background/95 shadow-md ring-1 ring-black/5 backdrop-blur-md dark:ring-white/10">
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
                      type="search"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setSuggestionsOpen(true)
                      }}
                      onFocus={() => setSuggestionsOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          void runSearch(searchQuery)
                        }
                        if (e.key === "Escape") {
                          setSuggestionsOpen(false)
                        }
                      }}
                      placeholder="Search city, metro, or region…"
                      autoComplete="off"
                      role="combobox"
                      aria-expanded={suggestionsOpen}
                      aria-controls={suggestionsListId}
                      aria-autocomplete="list"
                      className="h-9 border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0 dark:bg-transparent"
                    />
                  </div>
                </div>
                {suggestionsOpen && suggestions.length > 0 ? (
                  <ul
                    id={suggestionsListId}
                    role="listbox"
                    className="absolute left-3 right-3 top-[calc(100%-0.25rem)] z-30 max-h-56 overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-lg sm:left-4 sm:right-4"
                  >
                    {suggestions.map((suggestion) => (
                      <li key={suggestion.id} role="option">
                        <button
                          type="button"
                          className={cn(
                            "flex w-full items-center px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted",
                            selectedArea.id === suggestion.id && "bg-muted/70"
                          )}
                          onClick={() => {
                            setSearchQuery(suggestion.label)
                            applyArea(suggestion)
                          }}
                        >
                          {suggestion.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {searchPending ? (
                  <p className="mt-2 px-1 text-xs text-muted-foreground">
                    Updating benchmark area…
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden border-t border-border bg-muted/15 p-4 lg:h-full lg:max-h-full lg:w-[min(100%,416px)] lg:flex-none lg:shrink-0 lg:border-l lg:border-t-0 xl:w-[448px]">
          {showMapbox ? (
            <BenchmarkKpiPanel snapshot={snapshot} className="h-full" />
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
  )
}
