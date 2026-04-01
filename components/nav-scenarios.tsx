"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const SCENARIO_HREF = "/scenarios/2026-capital-planning" as const

export function NavScenarios() {
  const pathname = usePathname()
  const active =
    pathname === SCENARIO_HREF || pathname.startsWith(`${SCENARIO_HREF}/`)

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Scenarios</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="2026 Capital Planning"
            isActive={active}
            render={<Link href={SCENARIO_HREF} />}
          >
            <CalendarDays />
            <span>2026 Capital Planning</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
