"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Briefcase, ChevronRight } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
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
} from "@/lib/asset-group-overrides"
import {
  ASSETS,
  ASSET_GROUP_SIDEBAR_LABELS,
  getAssetById,
  PORTFOLIO_OVERVIEW_LABEL,
  type AssetGroupId,
  assetHref,
  portfolioScopeIdFromRouteParam,
  portfolioScopeHref,
} from "@/lib/assets"

const ASSET_GROUPS: { label: string; groupId: AssetGroupId }[] = [
  { label: ASSET_GROUP_SIDEBAR_LABELS.office, groupId: "office" },
  { label: ASSET_GROUP_SIDEBAR_LABELS.industrial, groupId: "industrial" },
  { label: ASSET_GROUP_SIDEBAR_LABELS.retail, groupId: "retail" },
]

const INITIAL_GROUP_OPEN: Record<string, boolean> = {
  office: false,
  industrial: false,
  retail: false,
}

export function NavAssets() {
  const pathname = usePathname()
  const [openByGroup, setOpenByGroup] =
    React.useState<Record<string, boolean>>(INITIAL_GROUP_OPEN)
  const assetGroupOverrideSnap = React.useSyncExternalStore(
    subscribeAssetGroupOverrides,
    getAssetGroupOverridesSnapshot,
    () => ""
  )
  const assetGroupData = React.useMemo(
    () => parseAssetGroupOverrideSnapshot(assetGroupOverrideSnap),
    [assetGroupOverrideSnap]
  )

  const navAssetSections = React.useMemo(() => {
    const custom = Object.entries(assetGroupData.customGroups)
      .map(([groupId, label]) => ({ label, groupId }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
      )
    return [...ASSET_GROUPS, ...custom]
  }, [assetGroupData])

  const activeScopeId = React.useMemo(() => {
    if (pathname === "/portfolio") return "all"
    const match = pathname.match(/^\/portfolio\/scopes\/([^/]+)/)
    return match?.[1] ? portfolioScopeIdFromRouteParam(match[1]) : null
  }, [pathname])

  const activeAssetGroupId = React.useMemo(() => {
    const match = pathname.match(/^\/assets\/([^/]+)/)
    if (!match?.[1]) return null
    return (
      getAssetById(decodeURIComponent(match[1]), assetGroupData)?.groupId ?? null
    )
  }, [assetGroupData, pathname])

  React.useEffect(() => {
    const nextOpenIds = [activeScopeId, activeAssetGroupId].filter(
      (value): value is string => value != null && value !== "all"
    )
    if (nextOpenIds.length === 0) return
    setOpenByGroup((current) => {
      let changed = false
      const next = { ...current }
      for (const groupId of nextOpenIds) {
        if (next[groupId] !== true) {
          next[groupId] = true
          changed = true
        }
      }
      return changed ? next : current
    })
  }, [activeAssetGroupId, activeScopeId])

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Portfolios</SidebarGroupLabel>
      <SidebarMenu className="gap-0">
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip={PORTFOLIO_OVERVIEW_LABEL}
            isActive={pathname === "/portfolio"}
            render={<Link href="/portfolio" />}
          >
            <Briefcase />
            <span>{PORTFOLIO_OVERVIEW_LABEL}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <li className="list-none group-data-[collapsible=icon]:hidden">
          <SidebarMenuSub className="gap-0 py-0.5">
            {navAssetSections.map((group) => {
              const assets = ASSETS.filter(
                (a) => getAssetById(a.id, assetGroupData)?.groupId === group.groupId
              )
              return (
                <Collapsible
                  key={group.groupId}
                  open={openByGroup[group.groupId] ?? false}
                  onOpenChange={(open) =>
                    setOpenByGroup((s) => ({ ...s, [group.groupId]: open }))
                  }
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
                      <ChevronRight
                        className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                        aria-hidden
                      />
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <SidebarMenuSub className="mt-0.5 gap-0 py-0.5">
                      {assets.map((asset) => {
                        const href = assetHref(asset.id)
                        const active =
                          pathname === href ||
                          pathname.startsWith(`/assets/${asset.id}/`)
                        return (
                          <SidebarMenuSubItem key={asset.id}>
                            <SidebarMenuSubButton
                              size="sm"
                              className="h-auto min-h-6 py-1 leading-snug"
                              isActive={active}
                              render={<Link href={href} />}
                            >
                              <span className="line-clamp-2 text-left">
                                {asset.name}
                              </span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </SidebarMenuSub>
        </li>
      </SidebarMenu>
    </SidebarGroup>
  )
}
