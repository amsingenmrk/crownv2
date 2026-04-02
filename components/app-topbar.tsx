"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, ChevronRight, FileUp } from "lucide-react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { AppCommandPalette } from "@/components/app-command-palette"
import { ASSETS, getAssetById } from "@/lib/assets"
import { cn } from "@/lib/utils"

function hrefForAssetSwitch(pathname: string | null, newAssetId: string): string {
  if (!pathname?.startsWith("/assets/")) {
    return `/assets/${newAssetId}/stacking-plan`
  }
  const tail = pathname.replace(/^\/assets\/[^/]+/, "") || "/stacking-plan"
  return `/assets/${newAssetId}${tail.startsWith("/") ? tail : `/${tail}`}`
}

const TITLES: Record<string, string> = {
  "/": "Portfolio",
  "/portfolio": "Portfolio",
  "/search": "Search",
  "/benchmarks": "Benchmarks",
  "/scenarios/2026-capital-planning": "2026 Capital Planning",
}

export function AppTopbar() {
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const [assetMenuOpen, setAssetMenuOpen] = useState(false)
  const [assetSearch, setAssetSearch] = useState("")
  const assetSearchInputRef = useRef<HTMLInputElement>(null)

  const assetId = typeof params?.id === "string" ? params.id : null
  const asset = assetId ? getAssetById(assetId) : null
  const showAssetBreadcrumb =
    pathname?.startsWith("/assets/") === true && asset != null

  const pageTitle = pathname ? (TITLES[pathname] ?? "Glassbox") : "Glassbox"

  const filteredAssets = useMemo(() => {
    const q = assetSearch.trim().toLowerCase()
    if (!q) return ASSETS
    return ASSETS.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.address.toLowerCase().includes(q) ||
        a.groupLabel.toLowerCase().includes(q)
    )
  }, [assetSearch])

  useEffect(() => {
    if (!assetMenuOpen) return
    const id = requestAnimationFrame(() => {
      assetSearchInputRef.current?.focus()
      assetSearchInputRef.current?.select()
    })
    return () => cancelAnimationFrame(id)
  }, [assetMenuOpen])

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background transition-[width,height] ease-linear">
      <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator
          orientation="vertical"
          className="mr-2 shrink-0 data-vertical:h-4 data-vertical:self-auto"
        />
        {showAssetBreadcrumb ? (
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => router.push("/portfolio")}
              className="shrink-0 transition-colors hover:text-foreground"
            >
              Assets
            </button>
            <ChevronRight className="size-4 shrink-0" aria-hidden />
            <DropdownMenu
              open={assetMenuOpen}
              onOpenChange={(open) => {
                setAssetMenuOpen(open)
                if (!open) setAssetSearch("")
              }}
            >
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className={cn(
                      "flex min-w-0 max-w-[min(100%,18rem)] items-center gap-1 rounded-md py-0.5 pr-1 pl-0.5 text-left text-sm font-medium text-foreground outline-none",
                      "hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    )}
                  />
                }
              >
                <span className="min-w-0 truncate">{asset.name}</span>
                <ChevronDown
                  className="size-4 shrink-0 opacity-60"
                  aria-hidden
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[min(22rem,calc(100vw-2rem))] min-w-[var(--anchor-width)] p-0"
                align="start"
                sideOffset={6}
              >
                <div
                  className="border-b border-border p-2"
                  onPointerDown={(e) => e.preventDefault()}
                >
                  <Input
                    ref={assetSearchInputRef}
                    type="search"
                    placeholder="Search assets…"
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    autoComplete="off"
                    aria-label="Search assets"
                    className="h-9"
                  />
                </div>
                <div className="max-h-[min(50vh,18rem)] overflow-y-auto p-1">
                  {filteredAssets.map((a) => {
                    const selected = a.id === asset.id
                    const href = hrefForAssetSwitch(pathname, a.id)
                    return (
                      <DropdownMenuItem
                        key={a.id}
                        className="flex cursor-pointer items-start gap-2 py-2"
                        onClick={() => {
                          router.push(href)
                          setAssetMenuOpen(false)
                        }}
                      >
                        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                          {selected ? (
                            <Check
                              className="size-4 text-foreground"
                              aria-hidden
                            />
                          ) : null}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                          <span className="truncate font-medium leading-tight">
                            {a.name}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {a.groupLabel}
                          </span>
                        </span>
                      </DropdownMenuItem>
                    )
                  })}
                </div>
                {filteredAssets.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No assets match your search.
                  </div>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <span className="text-sm font-medium text-muted-foreground">
            {pageTitle}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 pr-4">
        <AppCommandPalette className="shrink-0" />
        {showAssetBreadcrumb ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
          >
            <FileUp className="size-3.5" aria-hidden />
            Import Documents
          </Button>
        ) : null}
      </div>
    </header>
  )
}
