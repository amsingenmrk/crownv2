"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Beaker, Columns4, FileUp, Search } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const DOCUMENT_ROUTES = [
  { title: "Doc Upload", href: "/documents", icon: FileUp },
] as const

const ANALYZE_ROUTES = [
  { title: "Property search", href: "/search", icon: Search },
  { title: "Compare", href: "/compare", icon: Columns4 },
  { title: "Benchmarks", href: "/benchmarks", icon: BarChart3 },
] as const

const EXAMPLES_ROUTES = [{ title: "Examples", href: "/examples", icon: Beaker }] as const

export function NavRoutes() {
  const pathname = usePathname()
  const renderRouteItems = (
    routes: readonly {
      title: string
      href: string
      icon: typeof FileUp
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
      <SidebarGroup>
        <SidebarGroupLabel>Examples</SidebarGroupLabel>
        <SidebarMenu>{renderRouteItems(EXAMPLES_ROUTES)}</SidebarMenu>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>Documents</SidebarGroupLabel>
        <SidebarMenu>{renderRouteItems(DOCUMENT_ROUTES)}</SidebarMenu>
      </SidebarGroup>
    </>
  )
}
