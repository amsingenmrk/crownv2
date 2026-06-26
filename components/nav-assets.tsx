"use client"

import * as React from "react"
import { NavCompetitiveSetTree } from "@/components/nav-competitive-set-tree"
import { NavPortfolioTree } from "@/components/nav-portfolio-tree"
import { SidebarAddAssetsImportModal } from "@/components/sidebar-add-assets-import-modal"
import { SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar"

export function NavAssets() {
  return (
    <>
      <SidebarGroup className="pb-1 group-data-[collapsible=icon]:hidden">
        <SidebarAddAssetsImportModal />
        <SidebarGroupLabel>Your Assets</SidebarGroupLabel>
        <NavPortfolioTree />
      </SidebarGroup>

      <SidebarGroup className="pt-2 group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Other Assets</SidebarGroupLabel>
        <NavCompetitiveSetTree />
      </SidebarGroup>
    </>
  )
}
