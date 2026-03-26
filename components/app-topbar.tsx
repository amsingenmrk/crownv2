"use client"

import { usePathname } from "next/navigation"

const TITLES: Record<string, string> = {
  "/": "Portfolio",
  "/portfolio": "Portfolio",
  "/search": "Search",
}

export function AppTopbar() {
  const pathname = usePathname()
  const title = pathname ? (TITLES[pathname] ?? "Glassbox") : "Glassbox"

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <span className="text-sm font-medium text-muted-foreground">{title}</span>
    </header>
  )
}
