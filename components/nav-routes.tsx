"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Briefcase, Search } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const ROUTES = [
  { title: "Portfolio", href: "/portfolio", icon: Briefcase },
  { title: "Search", href: "/search", icon: Search },
] as const

export function NavRoutes() {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>App</SidebarGroupLabel>
      <SidebarMenu>
        {ROUTES.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={active}
                render={<Link href={item.href} />}
              >
                <Icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
