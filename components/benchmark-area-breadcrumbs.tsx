"use client"

import * as React from "react"
import { Check, ChevronDown, ChevronRight, Plus } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getBenchmarkAreaLevelLabel,
  listBenchmarkAreaChildren,
} from "@/lib/benchmark-area-hierarchy"
import { type BenchmarkArea } from "@/lib/benchmark-area-search"
import { cn } from "@/lib/utils"

function AreaSelectMenu({
  trigger,
  heading,
  options,
  selectedId,
  onSelect,
}: {
  trigger: React.ReactNode
  heading: string
  options: readonly BenchmarkArea[]
  selectedId?: string
  onSelect: (area: BenchmarkArea) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger as React.ReactElement} />
      <DropdownMenuContent
        align="start"
        className="max-h-80 w-auto min-w-52 overflow-y-auto"
      >
        <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {heading}
        </div>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => onSelect(option)}
            className={cn(
              "justify-between gap-3",
              option.id === selectedId && "font-medium text-foreground"
            )}
          >
            <span className="min-w-0 truncate">{option.label}</span>
            {option.id === selectedId ? (
              <Check className="size-4 shrink-0 text-primary" aria-hidden />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Geography breadcrumb trail. Each crumb's label jumps to that level; its
 * caret opens a menu of the alternatives at the *same* level (siblings). A
 * trailing "add" pill drills one level deeper into the current area's children.
 */
export function BenchmarkAreaBreadcrumbs({
  path,
  currentAreaId,
  childrenOfCurrent,
  nextLevelLabel,
  onJump,
  onSelect,
  className,
}: {
  path: readonly BenchmarkArea[]
  currentAreaId: string
  childrenOfCurrent: readonly BenchmarkArea[]
  nextLevelLabel: string | null
  onJump: (area: BenchmarkArea) => void
  onSelect: (area: BenchmarkArea) => void
  className?: string
}) {
  return (
    <nav
      aria-label="Benchmark geography"
      className={cn(
        "flex flex-wrap items-center gap-x-0.5 gap-y-1 text-xs",
        className
      )}
    >
      {path.map((area, index) => {
        // A crumb's dropdown offers the alternatives at its own level — its
        // siblings, i.e. the children of its parent.
        const siblings = path[index - 1]
          ? listBenchmarkAreaChildren(path[index - 1])
          : []
        const levelLabel = getBenchmarkAreaLevelLabel(area.level)
        const isCurrent = area.id === currentAreaId
        const hasSiblings = siblings.length > 1
        return (
          // Keep each separator glued to the crumb that follows it so the
          // chevron never orphans at the end of a wrapped line.
          <span key={area.id} className="inline-flex items-center gap-x-0.5">
            {index > 0 ? (
              <ChevronRight
                className="size-3.5 shrink-0 text-muted-foreground/50"
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "inline-flex items-center overflow-hidden rounded-md border transition-colors",
                isCurrent
                  ? "border-border bg-muted text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border/60"
              )}
            >
              <button
                type="button"
                className={cn(
                  "px-2 py-1 font-medium transition-colors hover:bg-muted hover:text-foreground",
                  isCurrent && "cursor-default"
                )}
                onClick={() => onJump(area)}
                aria-current={isCurrent ? "page" : undefined}
              >
                {area.label}
              </button>
              {hasSiblings ? (
                <AreaSelectMenu
                  heading={`Switch ${levelLabel}`}
                  options={siblings}
                  selectedId={area.id}
                  onSelect={onSelect}
                  trigger={
                    <button
                      type="button"
                      className="flex h-full items-center border-l border-border/60 px-1.5 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[popup-open]:bg-muted data-[popup-open]:text-foreground"
                      aria-label={`Switch ${levelLabel} (${area.label})`}
                    >
                      <ChevronDown className="size-3.5" aria-hidden />
                    </button>
                  }
                />
              ) : null}
            </span>
          </span>
        )
      })}
      {childrenOfCurrent.length > 0 && nextLevelLabel ? (
        <span className="inline-flex items-center gap-x-0.5">
          <ChevronRight
            className="size-3.5 shrink-0 text-muted-foreground/50"
            aria-hidden
          />
          <AreaSelectMenu
            heading={`Add ${nextLevelLabel}`}
            options={childrenOfCurrent}
            onSelect={onSelect}
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 font-medium text-muted-foreground transition-colors hover:border-solid hover:bg-muted hover:text-foreground data-[popup-open]:border-solid data-[popup-open]:bg-muted data-[popup-open]:text-foreground"
                aria-label={`Add ${nextLevelLabel}`}
              >
                <Plus className="size-3.5" aria-hidden />
                {nextLevelLabel}
                <ChevronDown className="size-3.5" aria-hidden />
              </button>
            }
          />
        </span>
      ) : null}
    </nav>
  )
}
