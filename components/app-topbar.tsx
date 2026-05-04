"use client"

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import {
  Briefcase,
  Check,
  ChevronDown,
  FileUp,
  MoreVertical,
  Plus,
} from "lucide-react"
import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAppToast } from "@/components/app-toast"
import {
  addCustomAssetGroup,
  getAssetGroupOverridesSnapshot,
  parseAssetGroupOverrideSnapshot,
  removeCustomAssetGroupById,
  setAssetGroupOverride,
  subscribeAssetGroupOverrides,
  updateCustomAssetGroupNameById,
  updateFundDisplayLabelByGroupId,
} from "@/lib/asset-group-overrides"
import {
  ASSETS,
  ASSET_GROUP_SIDEBAR_LABELS,
  BUILT_IN_ASSET_GROUP_IDS,
  getAssetById,
  portfolioScopeHref,
  portfolioScopeIdFromRouteParam,
} from "@/lib/assets"
import { humanizeScenarioSlug } from "@/lib/scenario-slug"
import {
  getSavedComparisonsStoreSnapshot,
  removeSavedComparison,
  SAVED_COMPARISONS_SERVER_SNAPSHOT,
  subscribeSavedComparisons,
  updateSavedComparison,
} from "@/lib/saved-comparisons"
import {
  BUILTIN_SCENARIO,
  duplicateScenarioFromSourceSlug,
  getUserScenariosStoreSnapshot,
  removeUserScenarioBySlug,
  subscribeUserScenarios,
  updateUserScenarioNameBySlug,
  USER_SCENARIOS_SERVER_SNAPSHOT,
} from "@/lib/user-scenarios"
import { useCompareNewHeaderBridge } from "@/components/compare-new-header-bridge"
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
  "/search": "Property search",
  "/compare": "Compare",
  "/compare/new": "New comparison",
  "/benchmarks": "Benchmarks",
}

function scenarioSlugFromPathname(pathname: string | null): string | null {
  if (pathname == null || !pathname.startsWith("/scenarios/")) return null
  const slug = pathname.slice("/scenarios/".length).split("/")[0]
  return slug || null
}

function compareSavedIdFromPathname(pathname: string | null): string | null {
  if (pathname == null || !pathname.startsWith("/compare/")) return null
  const segment = pathname.slice("/compare/".length).split("/")[0]
  if (!segment || segment === "new") return null
  return segment
}

function portfolioScopeIdFromPathname(pathname: string | null): string | null {
  if (pathname == null || !pathname.startsWith("/portfolio/scopes/")) return null
  const scopeId = pathname.slice("/portfolio/scopes/".length).split("/")[0]
  return scopeId ? portfolioScopeIdFromRouteParam(scopeId) : null
}

function titleForPathname(
  pathname: string | null,
  userScenarios: readonly { name: string; slug: string }[],
  savedComparisons: readonly { id: string; name: string }[],
  portfolioScopeLabels: Record<string, string>
): string {
  if (!pathname) return "Glassbox"
  const explicit = TITLES[pathname]
  if (explicit) return explicit
  const scopeId = portfolioScopeIdFromPathname(pathname)
  if (scopeId != null) {
    return portfolioScopeLabels[scopeId] ?? scopeId
  }
  if (pathname.startsWith("/scenarios/")) {
    const slug = pathname.slice("/scenarios/".length).split("/")[0]
    if (slug) {
      const user = userScenarios.find((s) => s.slug === slug)
      if (user) return user.name
      return humanizeScenarioSlug(slug)
    }
  }
  if (pathname.startsWith("/compare/")) {
    const rest = pathname.slice("/compare/".length).split("/")[0]
    if (rest && rest !== "new") {
      const row = savedComparisons.find((c) => c.id === rest)
      if (row) return row.name
      return "Comparison"
    }
  }
  return "Glassbox"
}

function ScenarioBreadcrumbCurrentPage({
  scenarioSlug,
  pageTitle,
  canRenameInline,
  showToast,
}: {
  scenarioSlug: string
  pageTitle: string
  canRenameInline: boolean
  showToast: (message: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (!editing) return
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => cancelAnimationFrame(id)
  }, [editing])

  const commit = useCallback(() => {
    if (!canRenameInline) {
      setEditing(false)
      return
    }
    const trimmed = draft.trim()
    if (!trimmed || trimmed === pageTitle) {
      setEditing(false)
      setDraft("")
      return
    }
    if (updateUserScenarioNameBySlug(scenarioSlug, trimmed)) {
      showToast(`Renamed to “${trimmed}”.`)
    }
    setEditing(false)
    setDraft("")
  }, [canRenameInline, draft, pageTitle, scenarioSlug, showToast])

  const cancel = useCallback(() => {
    setEditing(false)
    setDraft("")
  }, [])

  return (
    <BreadcrumbItem className="min-w-0">
      {editing && canRenameInline ? (
        <Input
          ref={inputRef}
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commit()
            }
            if (e.key === "Escape") {
              e.preventDefault()
              cancel()
            }
          }}
          autoComplete="off"
          aria-label="Scenario name"
          className="h-8 min-w-[10rem] max-w-[min(28rem,calc(100vw-8rem))] text-sm font-medium"
        />
      ) : canRenameInline ? (
        <span
          data-slot="breadcrumb-page"
          role="link"
          aria-current="page"
          className="inline-flex min-w-0 max-w-full items-center"
        >
          <button
            type="button"
            className={cn(
              "truncate rounded-sm px-1 py-0.5 text-left text-sm font-medium text-foreground -mx-1",
              "underline-offset-4 outline-none hover:bg-muted/80 hover:underline",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
            title="Click to rename"
            onClick={() => {
              setDraft(pageTitle)
              setEditing(true)
            }}
          >
            {pageTitle}
          </button>
        </span>
      ) : (
        <BreadcrumbPage className="truncate font-medium">{pageTitle}</BreadcrumbPage>
      )}
    </BreadcrumbItem>
  )
}

function PortfolioScopeBreadcrumbCurrentPage({
  scopeId,
  pageTitle,
  showToast,
}: {
  scopeId: string
  pageTitle: string
  showToast: (message: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (!editing) return
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => cancelAnimationFrame(id)
  }, [editing])

  const commit = useCallback(() => {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === pageTitle) {
      setEditing(false)
      setDraft("")
      return
    }
    if (updateCustomAssetGroupNameById(scopeId, trimmed)) {
      showToast(`Renamed to “${trimmed}”.`)
    }
    setEditing(false)
    setDraft("")
  }, [draft, pageTitle, scopeId, showToast])

  const cancel = useCallback(() => {
    setEditing(false)
    setDraft("")
  }, [])

  return (
    <BreadcrumbItem className="min-w-0">
      {editing ? (
        <Input
          ref={inputRef}
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commit()
            }
            if (e.key === "Escape") {
              e.preventDefault()
              cancel()
            }
          }}
          autoComplete="off"
          aria-label="Portfolio scope name"
          className="h-8 min-w-[10rem] max-w-[min(28rem,calc(100vw-8rem))] text-sm font-medium"
        />
      ) : (
        <span
          data-slot="breadcrumb-page"
          role="link"
          aria-current="page"
          className="inline-flex min-w-0 max-w-full items-center"
        >
          <button
            type="button"
            className={cn(
              "truncate rounded-sm px-1 py-0.5 text-left text-sm font-medium text-foreground -mx-1",
              "underline-offset-4 outline-none hover:bg-muted/80 hover:underline",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
            title="Click to rename"
            onClick={() => {
              setDraft(pageTitle)
              setEditing(true)
            }}
          >
            {pageTitle}
          </button>
        </span>
      )}
    </BreadcrumbItem>
  )
}

export function AppTopbar() {
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const showToast = useAppToast()
  const [assetMenuOpen, setAssetMenuOpen] = useState(false)
  const [assetSearch, setAssetSearch] = useState("")
  const userScenarios = useSyncExternalStore(
    subscribeUserScenarios,
    getUserScenariosStoreSnapshot,
    () => USER_SCENARIOS_SERVER_SNAPSHOT
  )
  const savedComparisons = useSyncExternalStore(
    subscribeSavedComparisons,
    getSavedComparisonsStoreSnapshot,
    () => SAVED_COMPARISONS_SERVER_SNAPSHOT
  )
  const assetGroupOverrideSnap = useSyncExternalStore(
    subscribeAssetGroupOverrides,
    getAssetGroupOverridesSnapshot,
    () => ""
  )
  const assetGroupData = useMemo(
    () => parseAssetGroupOverrideSnapshot(assetGroupOverrideSnap),
    [assetGroupOverrideSnap]
  )
  const [deleteScenarioOpen, setDeleteScenarioOpen] = useState(false)
  const [scenarioRenameOpen, setScenarioRenameOpen] = useState(false)
  const [scenarioRenameDraft, setScenarioRenameDraft] = useState("")
  const [compareRenameOpen, setCompareRenameOpen] = useState(false)
  const [compareDeleteOpen, setCompareDeleteOpen] = useState(false)
  const [compareRenameDraft, setCompareRenameDraft] = useState("")
  const [createAssetGroupOpen, setCreateAssetGroupOpen] = useState(false)
  const [newAssetGroupName, setNewAssetGroupName] = useState("")
  const [deletePortfolioScopeOpen, setDeletePortfolioScopeOpen] =
    useState(false)
  const [portfolioScopeRenameOpen, setPortfolioScopeRenameOpen] =
    useState(false)
  const [portfolioScopeRenameDraft, setPortfolioScopeRenameDraft] =
    useState("")
  const newAssetGroupInputId = useId()
  const assetSearchInputRef = useRef<HTMLInputElement>(null)

  const assetId = typeof params?.id === "string" ? params.id : null
  const asset = useMemo(
    () => (assetId ? getAssetById(assetId, assetGroupData) : null),
    [assetGroupData, assetId]
  )
  const showAssetBreadcrumb =
    pathname?.startsWith("/assets/") === true && asset != null
  const showScenarioBreadcrumb =
    pathname != null && pathname.startsWith("/scenarios/")
  const scenarioSlug = scenarioSlugFromPathname(pathname ?? null)
  const showScenarioMoreMenu = showScenarioBreadcrumb && scenarioSlug != null
  const compareSavedId = compareSavedIdFromPathname(pathname ?? null)
  const portfolioScopeBreadcrumbId =
    portfolioScopeIdFromPathname(pathname ?? null)
  const showPortfolioScopeBreadcrumb = portfolioScopeBreadcrumbId != null
  const isBuiltInPortfolioScope = useMemo(
    () =>
      portfolioScopeBreadcrumbId != null &&
      (BUILT_IN_ASSET_GROUP_IDS as readonly string[]).includes(
        portfolioScopeBreadcrumbId
      ),
    [portfolioScopeBreadcrumbId]
  )
  const showCompareSavedBreadcrumb = compareSavedId != null
  const showCompareMoreMenu = showCompareSavedBreadcrumb
  const showCompareNewBreadcrumb = pathname === "/compare/new"
  const compareNewHeaderBridge = useCompareNewHeaderBridge()
  const userScenarioSlugs = useMemo(
    () => userScenarios.map((s) => s.slug),
    [userScenarios]
  )
  const canDeleteCurrentScenario =
    scenarioSlug != null && userScenarioSlugs.includes(scenarioSlug)
  const canRenameScenarioInline = canDeleteCurrentScenario
  const canManageCurrentPortfolioScope = useMemo(() => {
    if (portfolioScopeBreadcrumbId == null) return false
    return Object.hasOwn(
      assetGroupData.customGroups,
      portfolioScopeBreadcrumbId
    )
  }, [assetGroupData.customGroups, portfolioScopeBreadcrumbId])

  const filteredAssets = useMemo(() => {
    const merged = ASSETS.map((a) => getAssetById(a.id, assetGroupData) ?? a)
    const q = assetSearch.trim().toLowerCase()
    if (!q) return merged
    return merged.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.address.toLowerCase().includes(q) ||
        a.groupLabel.toLowerCase().includes(q)
    )
  }, [assetGroupData, assetSearch])

  const portfolioScopeLabels = useMemo(() => {
    const custom = assetGroupData.customGroups
    const fundOv = assetGroupData.fundLabelOverrides
    const labels: Record<string, string> = {}
    for (const id of BUILT_IN_ASSET_GROUP_IDS) {
      const override = fundOv[id]?.trim()
      labels[id] =
        override != null && override.length > 0
          ? override
          : ASSET_GROUP_SIDEBAR_LABELS[id]
    }
    for (const [id, label] of Object.entries(custom)) {
      labels[id] = label
    }
    return labels
  }, [assetGroupData])

  const pageTitle = titleForPathname(
    pathname ?? null,
    userScenarios,
    savedComparisons,
    portfolioScopeLabels
  )

  useEffect(() => {
    if (!assetMenuOpen) return
    const id = requestAnimationFrame(() => {
      assetSearchInputRef.current?.focus()
      assetSearchInputRef.current?.select()
    })
    return () => cancelAnimationFrame(id)
  }, [assetMenuOpen])

  useEffect(() => {
    if (!showCompareSavedBreadcrumb) {
      queueMicrotask(() => {
        setCompareRenameOpen(false)
        setCompareDeleteOpen(false)
      })
    }
  }, [showCompareSavedBreadcrumb])

  useEffect(() => {
    if (!showScenarioBreadcrumb || scenarioSlug == null) {
      queueMicrotask(() => {
        setScenarioRenameOpen(false)
        setDeleteScenarioOpen(false)
      })
    }
  }, [showScenarioBreadcrumb, scenarioSlug])

  useEffect(() => {
    if (!showPortfolioScopeBreadcrumb) {
      queueMicrotask(() => {
        setPortfolioScopeRenameOpen(false)
        setDeletePortfolioScopeOpen(false)
      })
    }
  }, [showPortfolioScopeBreadcrumb])

  useEffect(() => {
    queueMicrotask(() => {
      setPortfolioScopeRenameOpen(false)
      setDeletePortfolioScopeOpen(false)
    })
  }, [portfolioScopeBreadcrumbId])

  return (
    <header className="grid h-12 min-w-0 w-full max-w-full shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border bg-background transition-[width,height] ease-linear">
      <div className="flex min-w-0 items-center gap-2 overflow-hidden px-4">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator
          orientation="vertical"
          className="mr-2 shrink-0 data-vertical:h-4 data-vertical:self-auto"
        />
        {showAssetBreadcrumb && asset != null ? (
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList className="min-w-0 flex-nowrap gap-2 sm:gap-1.5">
              <BreadcrumbItem className="shrink-0">
                <BreadcrumbLink
                  render={
                    <Link
                      href="/portfolio"
                      className="font-medium text-muted-foreground"
                    />
                  }
                >
                  Portfolio
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="shrink-0 [&>svg]:size-4" />
              <BreadcrumbItem className="min-w-0 max-w-[min(12rem,32vw)] shrink">
                <BreadcrumbLink
                  render={
                    <Link
                      href={portfolioScopeHref(asset.groupId)}
                      className="block truncate font-medium text-muted-foreground"
                    />
                  }
                  title={
                    portfolioScopeLabels[asset.groupId] ?? asset.groupLabel
                  }
                >
                  {portfolioScopeLabels[asset.groupId] ?? asset.groupLabel}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="shrink-0 [&>svg]:size-4" />
              <BreadcrumbItem className="min-w-0 max-w-[min(100%,18rem)]">
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
                          "flex min-w-0 max-w-full items-center gap-1 rounded-md py-0.5 pr-1 pl-0.5 text-left text-sm font-medium text-foreground outline-none",
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
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        ) : showScenarioBreadcrumb && scenarioSlug != null ? (
          <Breadcrumb className="min-w-0">
            <BreadcrumbList className="flex-nowrap gap-2 sm:gap-1.5">
              <BreadcrumbItem className="shrink-0">
                <span className="font-medium text-muted-foreground">
                  Scenarios
                </span>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="shrink-0 [&>svg]:size-4" />
              <ScenarioBreadcrumbCurrentPage
                key={scenarioSlug}
                scenarioSlug={scenarioSlug}
                pageTitle={pageTitle}
                canRenameInline={canRenameScenarioInline}
                showToast={showToast}
              />
            </BreadcrumbList>
          </Breadcrumb>
        ) : showCompareSavedBreadcrumb && compareSavedId != null ? (
          <Breadcrumb className="min-w-0">
            <BreadcrumbList className="flex-nowrap gap-2 sm:gap-1.5">
              <BreadcrumbItem className="shrink-0">
                <BreadcrumbLink
                  render={
                    <Link
                      href="/compare"
                      className="font-medium text-muted-foreground"
                    />
                  }
                >
                  Compare
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="shrink-0 [&>svg]:size-4" />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate font-medium">
                  {pageTitle}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        ) : showCompareNewBreadcrumb ? (
          <Breadcrumb className="min-w-0">
            <BreadcrumbList className="flex-nowrap gap-2 sm:gap-1.5">
              <BreadcrumbItem className="shrink-0">
                <BreadcrumbLink
                  render={
                    <Link
                      href="/compare"
                      className="font-medium text-muted-foreground"
                    />
                  }
                >
                  Compare
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="shrink-0 [&>svg]:size-4" />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate font-medium">
                  New comparison
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        ) : showPortfolioScopeBreadcrumb && portfolioScopeBreadcrumbId != null ? (
          <Breadcrumb className="min-w-0">
            <BreadcrumbList className="flex-nowrap gap-2 sm:gap-1.5">
              <BreadcrumbItem className="shrink-0">
                <BreadcrumbLink
                  render={
                    <Link
                      href="/portfolio"
                      className="font-medium text-muted-foreground"
                    />
                  }
                >
                  Portfolio
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="shrink-0 [&>svg]:size-4" />
              {canManageCurrentPortfolioScope ? (
                <PortfolioScopeBreadcrumbCurrentPage
                  key={portfolioScopeBreadcrumbId}
                  scopeId={portfolioScopeBreadcrumbId}
                  pageTitle={
                    portfolioScopeLabels[portfolioScopeBreadcrumbId] ??
                    portfolioScopeBreadcrumbId
                  }
                  showToast={showToast}
                />
              ) : (
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="truncate font-medium">
                    {portfolioScopeLabels[portfolioScopeBreadcrumbId] ??
                      portfolioScopeBreadcrumbId}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        ) : (
          <span className="text-sm font-medium text-muted-foreground">
            {pageTitle}
          </span>
        )}
      </div>
      <div className="flex min-w-0 items-center justify-end gap-1.5 pr-2 sm:gap-2 sm:pr-4">
        {showCompareNewBreadcrumb ? (
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={() => compareNewHeaderBridge?.requestSave()}
          >
            Save comparison
          </Button>
        ) : null}
        {showAssetBreadcrumb && asset != null ? (
          <>
            <div
              className="inline-flex max-w-[min(100%,12rem)] shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/45 px-2.5 py-1 text-xs font-medium text-foreground"
              title={`Portfolio: ${asset.groupLabel}`}
              aria-label={`Current portfolio: ${asset.groupLabel}`}
            >
              <Briefcase
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0 truncate">{asset.groupLabel}</span>
            </div>
            <Dialog
              open={createAssetGroupOpen}
              onOpenChange={(open) => {
                setCreateAssetGroupOpen(open)
                if (!open) setNewAssetGroupName("")
              }}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>New asset group</DialogTitle>
                  <DialogDescription>
                    Name this group. The current property will be moved into it.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 py-1">
                  <label
                    htmlFor={newAssetGroupInputId}
                    className="text-sm font-medium text-foreground"
                  >
                    Group name
                  </label>
                  <Input
                    id={newAssetGroupInputId}
                    value={newAssetGroupName}
                    onChange={(e) => setNewAssetGroupName(e.target.value)}
                    placeholder="e.g. West Coast logistics"
                    autoComplete="off"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        const created = addCustomAssetGroup(newAssetGroupName)
                        if (created != null && asset != null) {
                          setAssetGroupOverride(asset.id, created.id)
                          showToast(`Group “${created.label}” created.`)
                          setCreateAssetGroupOpen(false)
                          setNewAssetGroupName("")
                        } else if (newAssetGroupName.trim() === "") {
                          showToast("Enter a group name.")
                        }
                      }
                    }}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCreateAssetGroupOpen(false)
                      setNewAssetGroupName("")
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const created = addCustomAssetGroup(newAssetGroupName)
                      if (created == null) {
                        showToast("Enter a group name.")
                        return
                      }
                      if (asset != null) {
                        setAssetGroupOverride(asset.id, created.id)
                        showToast(`Group “${created.label}” created.`)
                      }
                      setCreateAssetGroupOpen(false)
                      setNewAssetGroupName("")
                    }}
                  >
                    Create group
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              aria-label="Import documents"
            >
              <FileUp className="size-3.5 shrink-0" aria-hidden />
              <span className="hidden lg:inline">Import Documents</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    aria-label="Property actions"
                  />
                }
              >
                <MoreVertical className="size-4" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={6}>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Move</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="min-w-[10rem]">
                    {BUILT_IN_ASSET_GROUP_IDS.map((gid) => {
                      const label = ASSET_GROUP_SIDEBAR_LABELS[gid]
                      const selected = asset.groupId === gid
                      return (
                        <DropdownMenuItem
                          key={gid}
                          className="gap-2"
                          disabled={selected}
                          onClick={() => {
                            if (selected) return
                            setAssetGroupOverride(asset.id, gid)
                          }}
                        >
                          <span className="flex size-4 shrink-0 items-center justify-center">
                            {selected ? (
                              <Check className="size-4" aria-hidden />
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                        </DropdownMenuItem>
                      )
                    })}
                    {Object.entries(assetGroupData.customGroups)
                      .sort((a, b) =>
                        a[1].localeCompare(b[1], undefined, {
                          sensitivity: "base",
                        })
                      )
                      .map(([gid, label]) => {
                        const selected = asset.groupId === gid
                        return (
                          <DropdownMenuItem
                            key={gid}
                            className="gap-2"
                            disabled={selected}
                            onClick={() => {
                              if (selected) return
                              setAssetGroupOverride(asset.id, gid)
                            }}
                          >
                            <span className="flex size-4 shrink-0 items-center justify-center">
                              {selected ? (
                                <Check className="size-4" aria-hidden />
                              ) : null}
                            </span>
                            <span className="min-w-0 flex-1 truncate">
                              {label}
                            </span>
                          </DropdownMenuItem>
                        )
                      })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() => {
                        setNewAssetGroupName("")
                        setCreateAssetGroupOpen(true)
                      }}
                    >
                      <Plus className="size-4 shrink-0 opacity-80" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">
                        Create new group
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : null}
        {showPortfolioScopeBreadcrumb && portfolioScopeBreadcrumbId != null ? (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    aria-label="Portfolio scope actions"
                  />
                }
              >
                <MoreVertical className="size-4" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={6}>
                <DropdownMenuItem
                  onClick={() => {
                    setPortfolioScopeRenameDraft(
                      portfolioScopeLabels[portfolioScopeBreadcrumbId] ??
                        portfolioScopeBreadcrumbId
                    )
                    setPortfolioScopeRenameOpen(true)
                  }}
                >
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={isBuiltInPortfolioScope}
                  title={
                    isBuiltInPortfolioScope
                      ? "Built-in funds cannot be deleted"
                      : undefined
                  }
                  onClick={() => {
                    if (isBuiltInPortfolioScope) return
                    setDeletePortfolioScopeOpen(true)
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog
              open={portfolioScopeRenameOpen}
              onOpenChange={setPortfolioScopeRenameOpen}
            >
              <DialogContent showCloseButton className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Rename portfolio</DialogTitle>
                </DialogHeader>
                <Input
                  value={portfolioScopeRenameDraft}
                  onChange={(e) => setPortfolioScopeRenameDraft(e.target.value)}
                  placeholder="Name"
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      const name = portfolioScopeRenameDraft.trim()
                      if (!name || portfolioScopeBreadcrumbId == null) return
                      if (
                        name ===
                        (portfolioScopeLabels[portfolioScopeBreadcrumbId] ??
                          portfolioScopeBreadcrumbId)
                      ) {
                        setPortfolioScopeRenameOpen(false)
                        return
                      }
                      const id = portfolioScopeBreadcrumbId
                      const ok = isBuiltInPortfolioScope
                        ? updateFundDisplayLabelByGroupId(id, name)
                        : updateCustomAssetGroupNameById(id, name)
                      if (ok) {
                        setPortfolioScopeRenameOpen(false)
                        showToast(`Renamed to “${name}”.`)
                      }
                    }
                  }}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPortfolioScopeRenameOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={!portfolioScopeRenameDraft.trim()}
                    onClick={() => {
                      const name = portfolioScopeRenameDraft.trim()
                      if (!name || portfolioScopeBreadcrumbId == null) return
                      if (
                        name ===
                        (portfolioScopeLabels[portfolioScopeBreadcrumbId] ??
                          portfolioScopeBreadcrumbId)
                      ) {
                        setPortfolioScopeRenameOpen(false)
                        return
                      }
                      const id = portfolioScopeBreadcrumbId
                      const ok = isBuiltInPortfolioScope
                        ? updateFundDisplayLabelByGroupId(id, name)
                        : updateCustomAssetGroupNameById(id, name)
                      if (ok) {
                        setPortfolioScopeRenameOpen(false)
                        showToast(`Renamed to “${name}”.`)
                      }
                    }}
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog
              open={deletePortfolioScopeOpen}
              onOpenChange={setDeletePortfolioScopeOpen}
            >
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Delete portfolio scope</DialogTitle>
                  <DialogDescription>
                    This removes &ldquo;{pageTitle}&rdquo; and clears
                    which assets were assigned to this custom scope. Assets
                    return to their default fund groups. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeletePortfolioScopeOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (portfolioScopeBreadcrumbId == null) return
                      const ok = removeCustomAssetGroupById(
                        portfolioScopeBreadcrumbId
                      )
                      setDeletePortfolioScopeOpen(false)
                      if (ok) {
                        router.push("/portfolio")
                        showToast("Portfolio scope deleted.")
                      }
                    }}
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : null}
        {showScenarioMoreMenu ? (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    aria-label="Scenario actions"
                  />
                }
              >
                <MoreVertical className="size-4" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={6}>
                <DropdownMenuItem
                  disabled={!canRenameScenarioInline}
                  title={
                    canRenameScenarioInline
                      ? undefined
                      : "Built-in scenarios cannot be renamed"
                  }
                  onClick={() => {
                    if (!canRenameScenarioInline || scenarioSlug == null) return
                    setScenarioRenameDraft(pageTitle)
                    setScenarioRenameOpen(true)
                  }}
                >
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={scenarioSlug == null}
                  onClick={() => {
                    if (scenarioSlug == null) return
                    const created = duplicateScenarioFromSourceSlug(scenarioSlug)
                    if (created != null) {
                      router.push(`/scenarios/${created.slug}`)
                    }
                  }}
                >
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={!canDeleteCurrentScenario}
                  title={
                    canDeleteCurrentScenario
                      ? undefined
                      : "Built-in scenarios cannot be deleted"
                  }
                  onClick={() => {
                    if (!canDeleteCurrentScenario) return
                    setDeleteScenarioOpen(true)
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog
              open={scenarioRenameOpen}
              onOpenChange={setScenarioRenameOpen}
            >
              <DialogContent showCloseButton className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Rename scenario</DialogTitle>
                </DialogHeader>
                <Input
                  value={scenarioRenameDraft}
                  onChange={(e) => setScenarioRenameDraft(e.target.value)}
                  placeholder="Name"
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      const name = scenarioRenameDraft.trim()
                      if (!name || scenarioSlug == null) return
                      if (name === pageTitle) {
                        setScenarioRenameOpen(false)
                        return
                      }
                      if (
                        updateUserScenarioNameBySlug(scenarioSlug, name) != null
                      ) {
                        setScenarioRenameOpen(false)
                        showToast(`Renamed to “${name}”.`)
                      }
                    }
                  }}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setScenarioRenameOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={!scenarioRenameDraft.trim()}
                    onClick={() => {
                      const name = scenarioRenameDraft.trim()
                      if (!name || scenarioSlug == null) return
                      if (name === pageTitle) {
                        setScenarioRenameOpen(false)
                        return
                      }
                      if (
                        updateUserScenarioNameBySlug(scenarioSlug, name) != null
                      ) {
                        setScenarioRenameOpen(false)
                        showToast(`Renamed to “${name}”.`)
                      }
                    }}
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={deleteScenarioOpen} onOpenChange={setDeleteScenarioOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Delete scenario</DialogTitle>
                  <DialogDescription>
                    This removes “{pageTitle}” and clears its saved table
                    selections for this scenario. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeleteScenarioOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (scenarioSlug == null) return
                      const next = removeUserScenarioBySlug(scenarioSlug)
                      setDeleteScenarioOpen(false)
                      if (next != null) {
                        router.push(`/scenarios/${BUILTIN_SCENARIO.slug}`)
                        showToast("Scenario deleted.")
                      }
                    }}
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : null}
        {showCompareMoreMenu && compareSavedId != null ? (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    aria-label="Comparison actions"
                  />
                }
              >
                <MoreVertical className="size-4" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={6}>
                <DropdownMenuItem
                  onClick={() => {
                    setCompareRenameDraft(pageTitle)
                    setCompareRenameOpen(true)
                  }}
                >
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    router.push(`/compare/new?from=${compareSavedId}`)
                  }}
                >
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setCompareDeleteOpen(true)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={compareRenameOpen} onOpenChange={setCompareRenameOpen}>
              <DialogContent showCloseButton className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Rename comparison</DialogTitle>
                </DialogHeader>
                <Input
                  value={compareRenameDraft}
                  onChange={(e) => setCompareRenameDraft(e.target.value)}
                  placeholder="Name"
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      const name = compareRenameDraft.trim()
                      if (!name) return
                      updateSavedComparison(compareSavedId, { name })
                      setCompareRenameOpen(false)
                      showToast(`Renamed to “${name}”.`)
                    }
                  }}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCompareRenameOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={!compareRenameDraft.trim()}
                    onClick={() => {
                      const name = compareRenameDraft.trim()
                      if (!name) return
                      updateSavedComparison(compareSavedId, { name })
                      setCompareRenameOpen(false)
                      showToast(`Renamed to “${name}”.`)
                    }}
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={compareDeleteOpen} onOpenChange={setCompareDeleteOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Delete comparison</DialogTitle>
                  <DialogDescription>
                    This removes “{pageTitle}” and its saved column layout. This
                    cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCompareDeleteOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      removeSavedComparison(compareSavedId)
                      setCompareDeleteOpen(false)
                      router.push("/compare")
                      showToast("Comparison deleted.")
                    }}
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : null}
      </div>
    </header>
  )
}
