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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  getAssetGroupOverridesSnapshot,
  readCustomAssetGroups,
  subscribeAssetGroupOverrides,
} from "@/lib/asset-group-overrides"
import {
  ASSETS,
  ASSET_GROUP_SIDEBAR_LABELS,
  getAssetById,
  type AssetGroupId,
  assetHref,
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

  const navAssetSections = React.useMemo(() => {
    void assetGroupOverrideSnap
    const custom = Object.entries(readCustomAssetGroups())
      .map(([groupId, label]) => ({ label, groupId }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
      )
    return [...ASSET_GROUPS, ...custom]
  }, [assetGroupOverrideSnap])

  const portfoliosActive =
    pathname === "/portfolio" || pathname.startsWith("/portfolio/")

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Portfolios</SidebarGroupLabel>
      <SidebarMenu className="gap-0">
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="All assets"
            isActive={portfoliosActive}
            render={<Link href="/portfolio" />}
          >
            <Briefcase />
            <span>All assets</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <li className="list-none group-data-[collapsible=icon]:hidden">
          <SidebarMenuSub className="gap-0 py-0.5">
            {navAssetSections.map((group) => {
              const assets = ASSETS.filter(
                (a) => getAssetById(a.id)?.groupId === group.groupId
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
                  <CollapsibleTrigger
                    render={
                      <SidebarMenuButton
                        tooltip={group.label}
                        className="h-8 data-[panel-open]:[&_svg:last-child]:rotate-90"
                      />
                    }
                  >
                    <span className="truncate">{group.label}</span>
                    <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="mx-0 translate-x-0 gap-0 border-0 px-0 py-0.5">
                      {assets.map((asset) => {
                        const href = assetHref(asset.id)
                        const active =
                          pathname === href ||
                          pathname.startsWith(`/assets/${asset.id}/`)
                        return (
                          <SidebarMenuSubItem key={asset.id}>
                            <SidebarMenuSubButton
                              size="sm"
                              className="h-auto min-h-6 translate-x-0 py-1 leading-snug"
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
