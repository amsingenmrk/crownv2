"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Columns4 } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const ANALYZE_ROUTES = [
  { title: "Benchmarks", href: "/benchmarks", icon: BarChart3 },
  { title: "Compare", href: "/compare", icon: Columns4 },
] as const

export function NavRoutes() {
  const pathname = usePathname()
  const renderRouteItems = (
    routes: readonly {
      title: string
      href: string
      icon: typeof BarChart3
    }[]
  ) =>
    routes.map((item) => {
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
    })

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Analyze</SidebarGroupLabel>
        <SidebarMenu>{renderRouteItems(ANALYZE_ROUTES)}</SidebarMenu>
      </SidebarGroup>
    </>
  )
}
