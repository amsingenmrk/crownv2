"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  Building2,
  ChevronRight,
  Factory,
  Layers,
  Store,
} from "lucide-react"
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

const ASSET_GROUPS: {
  label: string
  groupId: AssetGroupId
  icon: LucideIcon
}[] = [
  {
    label: ASSET_GROUP_SIDEBAR_LABELS.office,
    groupId: "office",
    icon: Building2,
  },
  {
    label: ASSET_GROUP_SIDEBAR_LABELS.industrial,
    groupId: "industrial",
    icon: Factory,
  },
  {
    label: ASSET_GROUP_SIDEBAR_LABELS.retail,
    groupId: "retail",
    icon: Store,
  },
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
      .map(([groupId, label]) => ({
        label,
        groupId,
        icon: Layers,
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
      )
    return [...ASSET_GROUPS, ...custom]
  }, [assetGroupOverrideSnap])

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Assets</SidebarGroupLabel>
      <SidebarMenu className="gap-0">
        {navAssetSections.map((group) => {
          const GroupIcon = group.icon
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
                <GroupIcon />
                <span className="truncate">{group.label}</span>
                <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
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
      </SidebarMenu>
    </SidebarGroup>
  )
}
