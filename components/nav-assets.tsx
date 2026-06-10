"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Briefcase, ChevronDown, ChevronRight, Plus } from "lucide-react"
import { useInitialAssetGroupOverrideSnapshot } from "@/components/app-shell-environment"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { NewPortfolioScopeDialog } from "@/components/new-portfolio-scope-dialog"
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenuAction,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  getAssetGroupOverridesSnapshot,
  parseAssetGroupOverrideSnapshot,
  subscribeAssetGroupOverrides,
  syncAssetGroupSnapshotCookieFromLocalStorage,
} from "@/lib/asset-group-overrides"
import {
  ASSETS,
  ASSET_GROUP_SIDEBAR_LABELS,
  SEEDED_PORTFOLIO_GROUP_IDS,
  type Asset,
  assetIsInPortfolioGroup,
  getAssetById,
  PORTFOLIO_OVERVIEW_LABEL,
  type AssetGroupId,
  assetHref,
  portfolioScopeIdFromRouteParam,
  portfolioScopeHref,
  resolveAssetGroupIdsForAsset,
} from "@/lib/assets"

const INITIAL_GROUP_OPEN: Record<string, boolean> = {
  office: false,
  industrial: false,
  retail: false,
}

function PortfolioNavAssetRow({
  asset,
  pathname,
}: {
  asset: Pick<Asset, "id" | "name">
  pathname: string
}) {
  const href = assetHref(asset.id)
  const active =
    pathname === href || pathname.startsWith(`/properties/${asset.id}/`)

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        size="sm"
        className="h-auto min-h-6 py-1 leading-snug"
        isActive={active}
        render={<Link href={href} />}
      >
        <span className="line-clamp-2 text-left">{asset.name}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}

export function NavAssets() {
  const pathname = usePathname()
  const [newScopeOpen, setNewScopeOpen] = React.useState(false)
  const initialAssetGroupOverrideSnapshot = useInitialAssetGroupOverrideSnapshot()
  const [portfolioAssetsExpanded, setPortfolioAssetsExpanded] =
    React.useState(false)
  const [openByGroup, setOpenByGroup] =
    React.useState<Record<string, boolean>>(INITIAL_GROUP_OPEN)
  const assetGroupOverrideSnap = React.useSyncExternalStore(
    subscribeAssetGroupOverrides,
    getAssetGroupOverridesSnapshot,
    () => initialAssetGroupOverrideSnapshot
  )
  const assetGroupData = React.useMemo(
    () => parseAssetGroupOverrideSnapshot(assetGroupOverrideSnap),
    [assetGroupOverrideSnap]
  )

  React.useEffect(() => {
    syncAssetGroupSnapshotCookieFromLocalStorage()
  }, [])

  const navAssetSections = React.useMemo(() => {
    const seededGroups = SEEDED_PORTFOLIO_GROUP_IDS.filter(
      (groupId) => !assetGroupData.removedPortfolioGroupIds.has(groupId)
    ).map((groupId) => {
      const override = assetGroupData.fundLabelOverrides[groupId]?.trim()
      return {
        label:
          override != null && override.length > 0
            ? override
            : ASSET_GROUP_SIDEBAR_LABELS[groupId],
        groupId,
      } satisfies { label: string; groupId: AssetGroupId }
    })
    const custom = Object.entries(assetGroupData.customGroups)
      .map(([groupId, label]) => ({ label, groupId }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
      )
    return [...seededGroups, ...custom]
  }, [
    assetGroupData.customGroups,
    assetGroupData.fundLabelOverrides,
    assetGroupData.removedPortfolioGroupIds,
  ])

  const allPortfolioNavAssets = React.useMemo(() => {
    return ASSETS.filter(
      (asset) => !assetGroupData.standalonePropertyNavIds.has(asset.id)
    )
      .map((asset) => getAssetById(asset.id, assetGroupData) ?? asset)
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      )
  }, [assetGroupData])

  /** Accordion: only one property group expanded at a time. */
  const openOnlyGroup = React.useCallback(
    (groupId: string) => {
      setOpenByGroup(() => {
        const next: Record<string, boolean> = {}
        for (const g of navAssetSections) {
          next[g.groupId] = g.groupId === groupId
        }
        return next
      })
    },
    [navAssetSections]
  )

  const activeScopeId = React.useMemo(() => {
    if (pathname === "/portfolio") return "all"
    const match = pathname.match(/^\/portfolio\/scopes\/([^/]+)/)
    return match?.[1] ? portfolioScopeIdFromRouteParam(match[1]) : null
  }, [pathname])

  const activeAssetGroupId = React.useMemo(() => {
    const match = pathname.match(/^\/properties\/([^/]+)/)
    if (!match?.[1]) return null
    const assetId = decodeURIComponent(match[1])
    if (assetGroupData.standalonePropertyNavIds.has(assetId)) return null
    return getAssetById(assetId, assetGroupData)?.groupIds?.find((gid) =>
      navAssetSections.some((g) => g.groupId === gid)
    ) ?? null
  }, [assetGroupData, pathname])

  const closeAllPortfolioGroups = React.useCallback(() => {
    setOpenByGroup((current) => {
      const next: Record<string, boolean> = {}
      for (const g of navAssetSections) {
        next[g.groupId] = false
      }
      const keys = new Set([...Object.keys(current), ...Object.keys(next)])
      let changed = false
      for (const k of keys) {
        if ((current[k] ?? false) !== (next[k] ?? false)) {
          changed = true
          break
        }
      }
      return changed ? next : current
    })
  }, [navAssetSections])

  React.useEffect(() => {
    const nextOpenIds = [activeScopeId, activeAssetGroupId].filter(
      (value): value is string => value != null && value !== "all"
    )
    const pathAssetMatch = pathname.match(/^\/properties\/([^/]+)/)
    const pathAssetGroupIds =
      pathAssetMatch?.[1] != null
        ? resolveAssetGroupIdsForAsset(
            decodeURIComponent(pathAssetMatch[1]),
            assetGroupData
          )
        : []
    setOpenByGroup((current) => {
      const next: Record<string, boolean> = {}
      for (const g of navAssetSections) {
        next[g.groupId] =
          nextOpenIds.includes(g.groupId) ||
          pathAssetGroupIds.includes(g.groupId)
      }
      const keys = new Set([...Object.keys(current), ...Object.keys(next)])
      let changed = false
      for (const k of keys) {
        if ((current[k] ?? false) !== (next[k] ?? false)) {
          changed = true
          break
        }
      }
      return changed ? next : current
    })
  }, [activeAssetGroupId, activeScopeId, navAssetSections])

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarMenu className="gap-0">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={PORTFOLIO_OVERVIEW_LABEL}
              className="pr-8"
              isActive={pathname === "/portfolio"}
              render={
                <Link
                  href="/portfolio"
                  onClick={() => closeAllPortfolioGroups()}
                />
              }
            >
              <Briefcase />
              <span>{PORTFOLIO_OVERVIEW_LABEL}</span>
            </SidebarMenuButton>
            <SidebarMenuAction
              type="button"
              aria-expanded={portfolioAssetsExpanded}
              aria-label={`${portfolioAssetsExpanded ? "Collapse" : "Expand"} ${PORTFOLIO_OVERVIEW_LABEL} assets`}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setPortfolioAssetsExpanded((open) => !open)
              }}
            >
              {portfolioAssetsExpanded ? (
                <ChevronDown
                  className="size-4 shrink-0 transition-transform duration-200"
                  aria-hidden
                />
              ) : (
                <ChevronRight
                  className="size-4 shrink-0 transition-transform duration-200"
                  aria-hidden
                />
              )}
            </SidebarMenuAction>
          </SidebarMenuItem>
          {portfolioAssetsExpanded ? (
            <li className="list-none group-data-[collapsible=icon]:hidden">
              <SidebarMenuSub className="gap-0 py-0.5">
                {allPortfolioNavAssets.map((asset) => (
                  <PortfolioNavAssetRow
                    key={`portfolio-${asset.id}`}
                    asset={asset}
                    pathname={pathname}
                  />
                ))}
              </SidebarMenuSub>
            </li>
          ) : null}
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Groups</SidebarGroupLabel>
        <SidebarGroupAction
          type="button"
          title="New portfolio group"
          aria-label="New portfolio group"
          onClick={() => setNewScopeOpen(true)}
        >
          <Plus />
        </SidebarGroupAction>
        <SidebarMenu className="gap-0">
          {navAssetSections.map((group) => {
            const assets = ASSETS.filter(
              (a) =>
                !assetGroupData.standalonePropertyNavIds.has(a.id) &&
                assetIsInPortfolioGroup(a.id, group.groupId, assetGroupData)
            )
            return (
              <Collapsible
                key={group.groupId}
                open={openByGroup[group.groupId] ?? false}
                onOpenChange={(open) => {
                  if (open) {
                    openOnlyGroup(group.groupId)
                  } else {
                    setOpenByGroup((s) => ({ ...s, [group.groupId]: false }))
                  }
                }}
                className="group/collapsible"
                render={<SidebarMenuItem />}
              >
                <div className="relative">
                  <SidebarMenuButton
                    tooltip={group.label}
                    className="h-8 pr-8"
                    isActive={
                      activeScopeId === group.groupId ||
                      activeAssetGroupId === group.groupId
                    }
                    render={<Link href={portfolioScopeHref(group.groupId)} />}
                  >
                    <span className="truncate">{group.label}</span>
                  </SidebarMenuButton>
                  <CollapsibleTrigger
                    render={
                      <SidebarMenuAction
                        aria-label={`${openByGroup[group.groupId] ? "Collapse" : "Expand"} ${group.label}`}
                      />
                    }
                  >
                    {openByGroup[group.groupId] ? (
                      <ChevronDown
                        className="size-4 shrink-0 transition-transform duration-200"
                        aria-hidden
                      />
                    ) : (
                      <ChevronRight
                        className="size-4 shrink-0 transition-transform duration-200"
                        aria-hidden
                      />
                    )}
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <SidebarMenuSub className="mt-0.5 gap-0 py-0.5">
                    {assets.map((asset) => {
                      return (
                        <PortfolioNavAssetRow
                          key={asset.id}
                          asset={asset}
                          pathname={pathname}
                        />
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </SidebarMenu>
      </SidebarGroup>

      <NewPortfolioScopeDialog
        open={newScopeOpen}
        onOpenChange={setNewScopeOpen}
      />
    </>
  )
}
