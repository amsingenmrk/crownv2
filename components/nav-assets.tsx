"use client"

import type { LucideIcon } from "lucide-react"
import { Building2, ChevronRight, Factory, Store } from "lucide-react"
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

const ASSET_GROUPS: {
  label: string
  icon: LucideIcon
  assets: readonly string[]
}[] = [
  {
    label: "Office Buildings",
    icon: Building2,
    assets: [
      "One Vanderbilt",
      "Empire State Building",
      "425 Park Avenue",
      "50 Hudson Yards",
      "MetLife Building",
      "280 Park Avenue",
    ] as const,
  },
  {
    label: "Industrial Buildings",
    icon: Factory,
    assets: [
      "Willis Tower",
      "Salesforce Tower",
      "Denver Logistics Center",
      "Phoenix Distribution Park",
      "Nashville Cold Storage",
      "Charlotte Last-Mile Hub",
    ] as const,
  },
  {
    label: "Retail Locations",
    icon: Store,
    assets: [
      "3001-3003 Washington Blvd",
      "200 Clarendon",
      "Miami Design District",
      "Austin Domain Northside",
      "Seattle University Village",
      "Boston Newbury Street",
    ] as const,
  },
]

export function NavAssets() {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Assets</SidebarGroupLabel>
      <SidebarMenu className="max-h-[50vh] gap-0 overflow-y-auto">
        {ASSET_GROUPS.map((group) => {
          const GroupIcon = group.icon
          return (
          <Collapsible
            key={group.label}
            defaultOpen
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
                {group.assets.map((name) => (
                  <SidebarMenuSubItem key={name}>
                    <SidebarMenuSubButton
                      size="sm"
                      className="h-auto min-h-6 py-1 leading-snug"
                      render={<button type="button" />}
                    >
                      <span className="line-clamp-2 text-left">{name}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
