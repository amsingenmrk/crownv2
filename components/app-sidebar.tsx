"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"

import { AppCommandPalette } from "@/components/app-command-palette"
import { NavAssets } from "@/components/nav-assets"
import { NavRoutes } from "@/components/nav-routes"
import { NavScenarios } from "@/components/nav-scenarios"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const user = {
  name: "Hans Jackson",
  email: "hans.jackson@nmrk.com",
  avatar: "",
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/portfolio" />}>
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                <Image
                  src="/newmark_symbol_light.svg"
                  alt=""
                  width={28}
                  height={28}
                  className="size-7"
                  aria-hidden
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Glassbox</span>
                <span className="truncate text-xs text-muted-foreground">
                  Meridian Capital Assets
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <AppCommandPalette />
        <NavAssets />
        <NavRoutes />
        <NavScenarios />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
