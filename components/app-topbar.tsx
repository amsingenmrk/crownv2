"use client"

import {
  useCallback,
  useEffect,
  useId,
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
  updateCustomAssetGroupById,
  updateFundByGroupId,
} from "@/lib/asset-group-overrides"
import {
  ASSETS,
  ASSET_GROUP_SIDEBAR_LABELS,
  BUILT_IN_ASSET_GROUP_IDS,
  getAssetById,
  portfolioScopeHref,
  portfolioScopeIdFromRouteParam,
  resolvePortfolioScopeDescription,
} from "@/lib/assets"
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
  scenarioDescriptionForDisplay,
  scenarioDisplayTitleForSlug,
  subscribeUserScenarios,
  updateBuiltinScenarioDisplay,
  updateUserScenarioBySlug,
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
      return scenarioDisplayTitleForSlug(slug, userScenarios)
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
  pageTitle,
  canRenameInline,
  onOpenRename,
}: {
  pageTitle: string
  canRenameInline: boolean
  onOpenRename: () => void
}) {
  return (
    <BreadcrumbItem className="min-w-0">
      {canRenameInline ? (
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
            title="Edit name and description"
            onClick={onOpenRename}
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
  pageTitle,
  onOpenRename,
}: {
  pageTitle: string
  onOpenRename: () => void
}) {
  return (
    <BreadcrumbItem className="min-w-0">
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
          title="Edit name and description"
          onClick={onOpenRename}
        >
          {pageTitle}
        </button>
      </span>
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
  const [scenarioRenameDescriptionDraft, setScenarioRenameDescriptionDraft] =
    useState("")
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
  const [portfolioScopeRenameDescriptionDraft, setPortfolioScopeRenameDescriptionDraft] =
    useState("")
  const scenarioRenameNameFieldId = useId()
  const scenarioRenameDescriptionFieldId = useId()
  const portfolioRenameNameFieldId = useId()
  const portfolioRenameDescriptionFieldId = useId()
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
  const canRenameScenarioInline =
    scenarioSlug != null &&
    (userScenarioSlugs.includes(scenarioSlug) ||
      scenarioSlug === BUILTIN_SCENARIO.slug)

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

  const openScenarioRename = useCallback(() => {
    if (scenarioSlug == null || !canRenameScenarioInline) return
    if (scenarioSlug === BUILTIN_SCENARIO.slug) {
      setScenarioRenameDraft(
        scenarioDisplayTitleForSlug(scenarioSlug, userScenarios)
      )
      setScenarioRenameDescriptionDraft(
        scenarioDescriptionForDisplay(scenarioSlug, userScenarios) ?? ""
      )
    } else {
      const row = userScenarios.find((s) => s.slug === scenarioSlug)
      setScenarioRenameDraft(row?.name ?? pageTitle)
      setScenarioRenameDescriptionDraft(row?.description ?? "")
    }
    setScenarioRenameOpen(true)
  }, [canRenameScenarioInline, pageTitle, scenarioSlug, userScenarios])

  const openPortfolioScopeRename = useCallback(() => {
    if (portfolioScopeBreadcrumbId == null) return
    const id = portfolioScopeBreadcrumbId
    setPortfolioScopeRenameDraft(portfolioScopeLabels[id] ?? id)
    if (isBuiltInPortfolioScope) {
      setPortfolioScopeRenameDescriptionDraft(
        resolvePortfolioScopeDescription(
          id,
          assetGroupData.customGroupDescriptions,
          assetGroupData.fundDescriptionOverrides
        ) ?? ""
      )
    } else {
      setPortfolioScopeRenameDescriptionDraft(
        assetGroupData.customGroupDescriptions[id] ?? ""
      )
    }
    setPortfolioScopeRenameOpen(true)
  }, [
    assetGroupData.customGroupDescriptions,
    assetGroupData.fundDescriptionOverrides,
    isBuiltInPortfolioScope,
    portfolioScopeBreadcrumbId,
    portfolioScopeLabels,
  ])

  const commitScenarioRename = useCallback(() => {
    const name = scenarioRenameDraft.trim()
    if (!name || scenarioSlug == null) return
    if (scenarioSlug === BUILTIN_SCENARIO.slug) {
      const prevName = scenarioDisplayTitleForSlug(scenarioSlug, userScenarios)
      const prevDesc = (
        scenarioDescriptionForDisplay(scenarioSlug, userScenarios) ?? ""
      ).trim()
      const nextDesc = scenarioRenameDescriptionDraft.trim()
      if (name === prevName.trim() && nextDesc === prevDesc) {
        setScenarioRenameOpen(false)
        return
      }
      if (
        updateBuiltinScenarioDisplay({
          name,
          description: scenarioRenameDescriptionDraft,
        })
      ) {
        setScenarioRenameOpen(false)
        showToast("Saved.")
      }
      return
    }
    const row = userScenarios.find((s) => s.slug === scenarioSlug)
    const prevName = row?.name ?? ""
    const prevDesc = (row?.description ?? "").trim()
    const nextDesc = scenarioRenameDescriptionDraft.trim()
    if (name === prevName && nextDesc === prevDesc) {
      setScenarioRenameOpen(false)
      return
    }
    if (
      updateUserScenarioBySlug(scenarioSlug, {
        name,
        description: scenarioRenameDescriptionDraft,
      }) != null
    ) {
      setScenarioRenameOpen(false)
      showToast("Saved.")
    }
  }, [
    scenarioRenameDescriptionDraft,
    scenarioRenameDraft,
    scenarioSlug,
    showToast,
    userScenarios,
  ])

  const commitPortfolioScopeRename = useCallback(() => {
    const name = portfolioScopeRenameDraft.trim()
    if (!name || portfolioScopeBreadcrumbId == null) return
    const id = portfolioScopeBreadcrumbId
    if (isBuiltInPortfolioScope) {
      const prevName = portfolioScopeLabels[id] ?? id
      const prevDesc = (
        resolvePortfolioScopeDescription(
          id,
          assetGroupData.customGroupDescriptions,
          assetGroupData.fundDescriptionOverrides
        ) ?? ""
      ).trim()
      const nextDesc = portfolioScopeRenameDescriptionDraft.trim()
      if (name === prevName && nextDesc === prevDesc) {
        setPortfolioScopeRenameOpen(false)
        return
      }
      if (
        updateFundByGroupId(id, {
          name,
          description: portfolioScopeRenameDescriptionDraft,
        })
      ) {
        setPortfolioScopeRenameOpen(false)
        showToast("Saved.")
      }
      return
    }
    const prevName = portfolioScopeLabels[id] ?? id
    const prevDesc = (assetGroupData.customGroupDescriptions[id] ?? "").trim()
    const nextDesc = portfolioScopeRenameDescriptionDraft.trim()
    if (name === prevName && nextDesc === prevDesc) {
      setPortfolioScopeRenameOpen(false)
      return
    }
    if (
      updateCustomAssetGroupById(id, {
        name,
        description: portfolioScopeRenameDescriptionDraft,
      })
    ) {
      setPortfolioScopeRenameOpen(false)
      showToast("Saved.")
    }
  }, [
    assetGroupData.customGroupDescriptions,
    assetGroupData.fundDescriptionOverrides,
    isBuiltInPortfolioScope,
    portfolioScopeBreadcrumbId,
    portfolioScopeLabels,
    portfolioScopeRenameDescriptionDraft,
    portfolioScopeRenameDraft,
    showToast,
  ])

  const scenarioRenameSaveDisabled = useMemo(() => {
    if (!scenarioRenameDraft.trim() || scenarioSlug == null) return true
    if (scenarioSlug === BUILTIN_SCENARIO.slug) {
      const effName = scenarioDisplayTitleForSlug(scenarioSlug, userScenarios)
      const effDesc = (
        scenarioDescriptionForDisplay(scenarioSlug, userScenarios) ?? ""
      ).trim()
      return (
        scenarioRenameDraft.trim() === effName.trim() &&
        scenarioRenameDescriptionDraft.trim() === effDesc
      )
    }
    const row = userScenarios.find((s) => s.slug === scenarioSlug)
    if (!row) return true
    return (
      scenarioRenameDraft.trim() === row.name &&
      scenarioRenameDescriptionDraft.trim() === (row.description ?? "").trim()
    )
  }, [
    scenarioRenameDescriptionDraft,
    scenarioRenameDraft,
    scenarioSlug,
    userScenarios,
  ])

  const portfolioRenameSaveDisabled = useMemo(() => {
    if (!portfolioScopeRenameDraft.trim() || portfolioScopeBreadcrumbId == null) {
      return true
    }
    const id = portfolioScopeBreadcrumbId
    if (isBuiltInPortfolioScope) {
      const prevName = portfolioScopeLabels[id] ?? id
      const prevDesc = (
        resolvePortfolioScopeDescription(
          id,
          assetGroupData.customGroupDescriptions,
          assetGroupData.fundDescriptionOverrides
        ) ?? ""
      ).trim()
      return (
        portfolioScopeRenameDraft.trim() === prevName &&
        portfolioScopeRenameDescriptionDraft.trim() === prevDesc
      )
    }
    const prevName = portfolioScopeLabels[id] ?? id
    const prevDesc = (assetGroupData.customGroupDescriptions[id] ?? "").trim()
    const nextDesc = portfolioScopeRenameDescriptionDraft.trim()
    return portfolioScopeRenameDraft.trim() === prevName && nextDesc === prevDesc
  }, [
    assetGroupData.customGroupDescriptions,
    assetGroupData.fundDescriptionOverrides,
    isBuiltInPortfolioScope,
    portfolioScopeBreadcrumbId,
    portfolioScopeLabels,
    portfolioScopeRenameDescriptionDraft,
    portfolioScopeRenameDraft,
  ])

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
        setScenarioRenameDescriptionDraft("")
      })
    }
  }, [showScenarioBreadcrumb, scenarioSlug])

  useEffect(() => {
    if (!showPortfolioScopeBreadcrumb) {
      queueMicrotask(() => {
        setPortfolioScopeRenameOpen(false)
        setDeletePortfolioScopeOpen(false)
        setPortfolioScopeRenameDescriptionDraft("")
      })
    }
  }, [showPortfolioScopeBreadcrumb])

  useEffect(() => {
    queueMicrotask(() => {
      setPortfolioScopeRenameOpen(false)
      setDeletePortfolioScopeOpen(false)
      setPortfolioScopeRenameDescriptionDraft("")
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
                pageTitle={pageTitle}
                canRenameInline={canRenameScenarioInline}
                onOpenRename={openScenarioRename}
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
              <PortfolioScopeBreadcrumbCurrentPage
                key={portfolioScopeBreadcrumbId}
                pageTitle={
                  portfolioScopeLabels[portfolioScopeBreadcrumbId] ??
                  portfolioScopeBreadcrumbId
                }
                onOpenRename={openPortfolioScopeRename}
              />
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
              <DropdownMenuContent
                align="end"
                sideOffset={6}
                className="min-w-60 w-max max-w-[min(calc(100vw-1.5rem),22rem)]"
              >
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => {
                    router.push("/documents")
                  }}
                >
                  <FileUp className="size-4 shrink-0 opacity-80" aria-hidden />
                  <span className="min-w-0 flex-1">Import Documents</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2">
                    <Briefcase
                      className="size-4 shrink-0 opacity-80"
                      aria-hidden
                    />
                    Change Portfolio
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="min-w-64">
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
                          <span className="min-w-0 flex-1 break-words">
                            {label}
                          </span>
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
                            <span className="min-w-0 flex-1 break-words">
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
                      <span className="min-w-0 flex-1">Create new portfolio</span>
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
                <DropdownMenuItem onClick={openPortfolioScopeRename}>
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
              onOpenChange={(open) => {
                setPortfolioScopeRenameOpen(open)
                if (!open) {
                  setPortfolioScopeRenameDraft("")
                  setPortfolioScopeRenameDescriptionDraft("")
                }
              }}
            >
              <DialogContent showCloseButton className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Rename portfolio</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <label
                      htmlFor={portfolioRenameNameFieldId}
                      className="text-sm font-medium text-foreground"
                    >
                      Name
                    </label>
                    <Input
                      id={portfolioRenameNameFieldId}
                      value={portfolioScopeRenameDraft}
                      onChange={(e) => setPortfolioScopeRenameDraft(e.target.value)}
                      placeholder="e.g. Fund I"
                      autoComplete="off"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          commitPortfolioScopeRename()
                        }
                      }}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label
                      htmlFor={portfolioRenameDescriptionFieldId}
                      className="text-sm font-medium text-foreground"
                    >
                      Description{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      id={portfolioRenameDescriptionFieldId}
                      value={portfolioScopeRenameDescriptionDraft}
                      onChange={(e) =>
                        setPortfolioScopeRenameDescriptionDraft(e.target.value)
                      }
                      placeholder="How this portfolio scope is used…"
                      rows={3}
                      maxLength={600}
                      className={cn(
                        "min-h-[4.5rem] w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
                      )}
                    />
                  </div>
                </div>
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
                    disabled={portfolioRenameSaveDisabled}
                    onClick={commitPortfolioScopeRename}
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
                  onClick={() => {
                    if (!canRenameScenarioInline) return
                    openScenarioRename()
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
              onOpenChange={(open) => {
                setScenarioRenameOpen(open)
                if (!open) {
                  setScenarioRenameDraft("")
                  setScenarioRenameDescriptionDraft("")
                }
              }}
            >
              <DialogContent showCloseButton className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Rename scenario</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <label
                      htmlFor={scenarioRenameNameFieldId}
                      className="text-sm font-medium text-foreground"
                    >
                      Name
                    </label>
                    <Input
                      id={scenarioRenameNameFieldId}
                      value={scenarioRenameDraft}
                      onChange={(e) => setScenarioRenameDraft(e.target.value)}
                      placeholder="e.g. Q3 disposition plan"
                      autoComplete="off"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          commitScenarioRename()
                        }
                      }}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label
                      htmlFor={scenarioRenameDescriptionFieldId}
                      className="text-sm font-medium text-foreground"
                    >
                      Description{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      id={scenarioRenameDescriptionFieldId}
                      value={scenarioRenameDescriptionDraft}
                      onChange={(e) =>
                        setScenarioRenameDescriptionDraft(e.target.value)
                      }
                      placeholder="What this scenario is for…"
                      rows={3}
                      maxLength={600}
                      className={cn(
                        "min-h-[4.5rem] w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
                      )}
                    />
                  </div>
                </div>
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
                    disabled={scenarioRenameSaveDisabled}
                    onClick={commitScenarioRename}
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
