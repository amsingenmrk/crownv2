"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const TITLES: Record<string, string> = {
  "/": "Portfolio",
  "/portfolio": "Portfolio",
  "/search": "Search",
  "/benchmarks": "Benchmark",
}

export function AppTopbar() {
  const pathname = usePathname()
  const title = pathname ? (TITLES[pathname] ?? "Glassbox") : "Glassbox"

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background transition-[width,height] ease-linear">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
      </div>
    </header>
  )
}
