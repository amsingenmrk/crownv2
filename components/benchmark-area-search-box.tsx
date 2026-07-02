"use client"

import * as React from "react"
import { Search, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  HIERARCHY_ROOT_AREA as BENCHMARK_ROOT_AREA,
  hierarchyLevelLabel as benchmarkAreaLevelLabel,
  searchHierarchyAreas,
} from "@/lib/benchmark-data/benchmark-hierarchy"
import { type BenchmarkArea } from "@/lib/benchmark-area-search"
import { cn } from "@/lib/utils"

/**
 * Global "teleport" search for benchmark areas. Typing finds any market,
 * submarket, county, or ZIP regardless of the current area; selecting jumps
 * straight there. Drilling into the children of the current area is the job of
 * the map and breadcrumbs, so this box stays empty until the user types.
 *
 * Owns its own input/suggestion UI state; selection and status are reported
 * upward so the workspace remains the single source of truth for the active
 * area (the map and breadcrumbs also drive it).
 *
 * - `onApply` resolves and commits an area chosen from the suggestion list.
 * - `onCommitResolved` commits an already-resolved area (exact-match Enter).
 */
export function BenchmarkAreaSearchBox({
  currentArea,
  committedAreaId,
  accessToken,
  onApply,
  onCommitResolved,
  onPending,
  onFeedback,
  className,
}: {
  currentArea: BenchmarkArea
  committedAreaId: string
  accessToken?: string
  onApply: (area: BenchmarkArea) => void
  onCommitResolved: (area: BenchmarkArea) => void
  onPending: (pending: boolean) => void
  onFeedback: (feedback: string) => void
  className?: string
}) {
  const inputId = React.useId()
  const listId = React.useId()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const requestIdRef = React.useRef(0)

  const [query, setQuery] = React.useState("")
  const [suggestions, setSuggestions] = React.useState<BenchmarkArea[]>([])
  const [open, setOpen] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)

  const loadSuggestions = React.useCallback(
    async (nextQuery: string) => {
      if (!nextQuery.trim()) {
        setSuggestions([])
        return
      }
      const requestId = ++requestIdRef.current
      onPending(true)
      try {
        const results = searchHierarchyAreas(nextQuery)
        if (requestId !== requestIdRef.current) return
        setSuggestions(results)
        onFeedback(
          results.length > 0
            ? `Showing ${results.length} matching benchmark ${results.length === 1 ? "area" : "areas"}.`
            : "No benchmark matches found. Try a supported market, submarket, county, or ZIP."
        )
      } finally {
        if (requestId === requestIdRef.current) {
          onPending(false)
        }
      }
    },
    [accessToken, currentArea, onFeedback, onPending]
  )

  const runSearch = React.useCallback(
    async (nextQuery: string) => {
      const trimmed = nextQuery.trim()
      if (!trimmed) return
      onPending(true)
      try {
        const resolved = searchHierarchyAreas(trimmed)[0] ?? BENCHMARK_ROOT_AREA
        if (
          resolved.id === BENCHMARK_ROOT_AREA.id &&
          trimmed.toLowerCase() !== BENCHMARK_ROOT_AREA.label.toLowerCase()
        ) {
          setOpen(true)
          await loadSuggestions(trimmed)
          return
        }
        onCommitResolved(resolved)
      } finally {
        onPending(false)
      }
    },
    [accessToken, currentArea, loadSuggestions, onCommitResolved, onPending]
  )

  // Reset the input whenever the active area is committed (from here, the map,
  // or the breadcrumbs).
  React.useEffect(() => {
    setQuery("")
    setOpen(false)
    setHighlightedIndex(-1)
    setSuggestions([])
  }, [currentArea.id])

  // While open with a query, keep results in sync with the active area.
  React.useEffect(() => {
    if (!open || !query.trim()) return
    void loadSuggestions(query)
  }, [currentArea.id, loadSuggestions, open, query])

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener("pointerdown", onPointerDown)
    return () => window.removeEventListener("pointerdown", onPointerDown)
  }, [])

  const showClear = query.trim().length > 0

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-hidden rounded-lg border border-border/80 bg-background/95 shadow-md ring-1 ring-black/5 backdrop-blur-md dark:ring-white/10",
        className
      )}
    >
      <label htmlFor={inputId} className="sr-only">
        Search benchmark area
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => {
            const value = e.target.value
            setHighlightedIndex(-1)
            setQuery(value)
            if (value.trim()) {
              setOpen(true)
              void loadSuggestions(value)
            } else {
              setOpen(false)
            }
          }}
          onFocus={() => {
            if (!query.trim()) return
            setOpen(true)
            void loadSuggestions(query)
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setOpen(true)
              setHighlightedIndex((index) =>
                index < suggestions.length - 1 ? index + 1 : 0
              )
              return
            }
            if (e.key === "ArrowUp") {
              e.preventDefault()
              setOpen(true)
              setHighlightedIndex((index) =>
                index > 0 ? index - 1 : Math.max(suggestions.length - 1, 0)
              )
              return
            }
            if (e.key === "Enter") {
              e.preventDefault()
              const highlighted =
                highlightedIndex >= 0 ? suggestions[highlightedIndex] : undefined
              if (open && highlighted) {
                setOpen(false)
                onApply(highlighted)
                return
              }
              void runSearch(query)
              return
            }
            if (e.key === "Escape") {
              setOpen(false)
              setHighlightedIndex(-1)
            }
          }}
          placeholder="Search market, submarket, county, or ZIP…"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            highlightedIndex >= 0 ? `${listId}-option-${highlightedIndex}` : undefined
          }
          className={cn(
            "h-9 border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0 dark:bg-transparent",
            showClear && "pr-9"
          )}
        />
        {showClear ? (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="Clear search"
            onClick={() => {
              setHighlightedIndex(-1)
              setQuery("")
              setSuggestions([])
              setOpen(false)
              onFeedback("")
            }}
          >
            <X className="size-4 shrink-0" aria-hidden />
          </button>
        ) : null}
      </div>
      {open ? (
        suggestions.length > 0 ? (
          <ul
            id={listId}
            role="listbox"
            className="max-h-72 overflow-y-auto border-t border-border py-1"
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={
                  highlightedIndex === index || committedAreaId === suggestion.id
                }
              >
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted",
                    (highlightedIndex === index ||
                      committedAreaId === suggestion.id) &&
                      "bg-muted"
                  )}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => {
                    setOpen(false)
                    onApply(suggestion)
                  }}
                >
                  <span className="min-w-0 truncate">{suggestion.label}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {benchmarkAreaLevelLabel(suggestion.level)}
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
  )
}
