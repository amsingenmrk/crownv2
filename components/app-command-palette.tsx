"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  Search,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { ASSETS, assetHref, getAssetById } from "@/lib/assets"
import { getRecentAssetIds, recordRecentAsset } from "@/lib/recent-assets"
import { cn } from "@/lib/utils"

const SCENARIO_HREF = "/scenarios/2026-capital-planning" as const

const ROUTES = [
  { title: "Portfolio", href: "/portfolio", icon: Briefcase },
  { title: "Search", href: "/search", icon: Search },
  { title: "Benchmarks", href: "/benchmarks", icon: BarChart3 },
] as const

function isMac(): boolean {
  if (typeof navigator === "undefined") return false
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform)
}

export function AppCommandPalette({ className }: { className?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const recentAssets = useMemo(() => {
    if (!open) return []
    return getRecentAssetIds()
      .map((id) => getAssetById(id))
      .filter((a): a is NonNullable<typeof a> => a != null)
  }, [open])

  const recentIds = useMemo(
    () => new Set(recentAssets.map((a) => a.id)),
    [recentAssets]
  )

  const otherAssets = useMemo(
    () => ASSETS.filter((a) => !recentIds.has(a.id)),
    [recentIds]
  )

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const go = (href: string, opts?: { assetId?: string }) => {
    if (opts?.assetId) recordRecentAsset(opts.assetId)
    router.push(href)
    setOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "h-8 gap-2 text-muted-foreground",
          className
        )}
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
      >
        <Search className="size-3.5 shrink-0" aria-hidden />
        <span className="hidden text-xs sm:inline">Search</span>
        <kbd className="pointer-events-none ml-0.5 hidden h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
          {isMac() ? "⌘" : "Ctrl"}K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search assets, scenarios, pages…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {recentAssets.length > 0 ? (
            <CommandGroup heading="Recent assets">
              {recentAssets.map((a) => (
                <CommandItem
                  key={`recent-${a.id}`}
                  value={`recent ${a.name} ${a.address} ${a.groupLabel}`}
                  onSelect={() => go(assetHref(a.id), { assetId: a.id })}
                >
                  <Building2 className="text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{a.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {a.groupLabel}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {recentAssets.length > 0 ? <CommandSeparator /> : null}

          <CommandGroup heading="Pages">
            {ROUTES.map((r) => {
              const Icon = r.icon
              return (
                <CommandItem
                  key={r.href}
                  value={`page ${r.title}`}
                  onSelect={() => go(r.href)}
                >
                  <Icon className="text-muted-foreground" aria-hidden />
                  {r.title}
                </CommandItem>
              )
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Scenarios">
            <CommandItem
              value="scenario 2026 capital planning"
              onSelect={() => go(SCENARIO_HREF)}
            >
              <CalendarDays className="text-muted-foreground" aria-hidden />
              2026 Capital Planning
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Assets">
            {otherAssets.map((a) => (
              <CommandItem
                key={a.id}
                value={`asset ${a.name} ${a.address} ${a.groupLabel}`}
                onSelect={() => go(assetHref(a.id), { assetId: a.id })}
              >
                <Building2 className="text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{a.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {a.groupLabel}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
