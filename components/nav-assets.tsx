"use client"

import * as React from "react"
import { NavCompetitiveSetTree } from "@/components/nav-competitive-set-tree"
import { NavPortfolioTree } from "@/components/nav-portfolio-tree"
import { SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar"

export function NavAssets() {
  return (
    <>
      <SidebarGroup className="pb-1 group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="h-7 px-2 text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/60">
          Your Assets
        </SidebarGroupLabel>
        <NavPortfolioTree />
      </SidebarGroup>

      <SidebarGroup className="pt-2 group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="h-7 px-2 text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/60">
          Other Assets
        </SidebarGroupLabel>
        <NavCompetitiveSetTree />
      </SidebarGroup>
    </>
  )
}
