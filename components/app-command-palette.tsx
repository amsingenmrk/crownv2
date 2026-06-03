"use client"

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  GitCompareArrows,
  Search,
  TextSearch,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  useInitialAssetGroupOverrideSnapshot,
  useInitialMacLikePlatform,
} from "@/components/app-shell-environment"
import {
  getAssetGroupOverridesSnapshot,
  parseAssetGroupOverrideSnapshot,
  subscribeAssetGroupOverrides,
} from "@/lib/asset-group-overrides"
import { ASSETS, assetHref, getAssetById } from "@/lib/assets"
import { getRecentAssetIds, recordRecentAsset } from "@/lib/recent-assets"
import {
  BUILTIN_SCENARIO,
  readUserScenarios,
  scenarioDisplayTitleForSlug,
} from "@/lib/user-scenarios"
import { cn } from "@/lib/utils"

const ROUTES = [
  { title: "Portfolio", href: "/portfolio", icon: Briefcase },
  { title: "Property search", href: "/search", icon: Search },
  { title: "Compare", href: "/compare", icon: GitCompareArrows },
  { title: "New comparison", href: "/compare/new", icon: GitCompareArrows },
  { title: "Benchmarks", href: "/benchmarks", icon: BarChart3 },
] as const

function useMacLikePlatform() {
  const initialMacLikePlatform = useInitialMacLikePlatform()
  const [macLike, setMacLike] = useState(initialMacLikePlatform)

  useEffect(() => {
    if (typeof navigator === "undefined") return
    const next = /Mac|iPhone|iPad|iPod/i.test(navigator.platform)
    if (next !== macLike) setMacLike(next)
  }, [macLike])

  return macLike
}

function CommandKeyHint({ className }: { className?: string }) {
  const macLike = useMacLikePlatform()
  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex h-6 items-center gap-1 rounded-md border px-2 font-medium text-muted-foreground",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex min-h-[1.1rem] min-w-[1.1rem] items-center justify-center leading-none",
          macLike ? "size-[1.1rem] font-sans text-sm" : "text-xs"
        )}
        aria-hidden={macLike || undefined}
      >
        {macLike ? "⌘" : "Ctrl"}
      </span>
      <span className="font-mono text-xs leading-none">K</span>
    </kbd>
  )
}

export function AppCommandPalette({
  variant = "sidebar",
  className,
}: {
  variant?: "header" | "sidebar"
  className?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const initialAssetGroupOverrideSnapshot =
    useInitialAssetGroupOverrideSnapshot()
  const assetGroupOverrideSnap = useSyncExternalStore(
    subscribeAssetGroupOverrides,
    getAssetGroupOverridesSnapshot,
    () => initialAssetGroupOverrideSnapshot
  )
  const assetGroupData = useMemo(
    () => parseAssetGroupOverrideSnapshot(assetGroupOverrideSnap),
    [assetGroupOverrideSnap]
  )

  const recentAssets = useMemo(() => {
    if (!open) return []
    return getRecentAssetIds()
      .map((id) => getAssetById(id, assetGroupData))
      .filter((a): a is NonNullable<typeof a> => a != null)
  }, [assetGroupData, open])

  const recentIds = useMemo(
    () => new Set(recentAssets.map((a) => a.id)),
    [recentAssets]
  )

  const otherAssets = useMemo(() => {
    return ASSETS.filter((a) => !recentIds.has(a.id)).map(
      (a) => getAssetById(a.id, assetGroupData) ?? a
    )
  }, [assetGroupData, recentIds])

  const commandScenarios = useMemo(() => {
    if (!open) return []
    const user = readUserScenarios()
      .slice()
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      )
    const builtinTitle = scenarioDisplayTitleForSlug(
      BUILTIN_SCENARIO.slug,
      user
    )
    return [
      {
        name: builtinTitle,
        href: `/scenarios/${BUILTIN_SCENARIO.slug}`,
        value: `scenario ${builtinTitle.toLowerCase()}`,
      },
      ...user.map((s) => ({
        name: s.name,
        href: `/scenarios/${s.slug}`,
        value: `scenario ${s.name} ${s.slug}`,
      })),
    ]
  }, [open])

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

  const shortcut = (
    <CommandKeyHint className="ml-auto hidden border-sidebar-border bg-sidebar-accent opacity-90 group-data-[collapsible=icon]:hidden sm:inline-flex" />
  )

  return (
    <>
      {variant === "sidebar" ? (
        <SidebarGroup className={cn("p-2 pb-1", className)}>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                type="button"
                tooltip="Find anything — ⌘K"
                className="text-sidebar-foreground/80"
                onClick={() => setOpen(true)}
                aria-label="Open command palette"
              >
                <TextSearch aria-hidden />
                <span className="group-data-[collapsible=icon]:hidden">
                  Find anything
                </span>
                {shortcut}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-8 gap-2 text-muted-foreground", className)}
          onClick={() => setOpen(true)}
          aria-label="Open command palette"
        >
          <TextSearch className="size-3.5 shrink-0" aria-hidden />
          <span className="hidden text-xs sm:inline">Find anything</span>
          <CommandKeyHint className="ml-0.5 hidden border-border bg-muted sm:ml-1 sm:inline-flex" />
        </Button>
      )}

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Find assets, scenarios, pages…" />
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
            {commandScenarios.map((s) => (
              <CommandItem
                key={s.href}
                value={s.value}
                onSelect={() => go(s.href)}
              >
                <CalendarDays className="text-muted-foreground" aria-hidden />
                {s.name}
              </CommandItem>
            ))}
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
