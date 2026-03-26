"use client"

import { Building2 } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const ASSETS = [
  "3001-3003 Washington Blvd",
  "One Vanderbilt",
  "Empire State Building",
  "Willis Tower",
  "Salesforce Tower",
  "200 Clarendon",
] as const

export function NavAssets() {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Assets</SidebarGroupLabel>
      <SidebarMenu className="max-h-[40vh] overflow-y-auto">
        {ASSETS.map((name) => (
          <SidebarMenuItem key={name}>
            <SidebarMenuButton type="button" className="h-auto min-h-8 py-2">
              <Building2 className="shrink-0" />
              <span className="line-clamp-2 text-left">{name}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
