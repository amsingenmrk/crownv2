"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, User, ChevronRight, Square } from "lucide-react"
import { cn } from "@/lib/utils"

const ASSETS = [
  "3001-3003 Washington Blvd",
  "One Vanderbilt",
  "Empire State Building",
  "Willis Tower",
  "Salesforce Tower",
  "200 Clarendon",
]

export function AppSidebar() {
  const pathname = usePathname()
  const isHome = pathname === "/"
  const isSearch = pathname === "/search"

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Branding */}
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary/10 text-sidebar-primary">
          <Square className="size-4" />
        </div>
        <span className="font-semibold">Glassbox</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-3">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
            isHome
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Home className="size-4 shrink-0" />
          Home
        </Link>
        <Link
          href="/search"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
            isSearch
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Search className="size-4 shrink-0" />
          Search
        </Link>
      </nav>

      {/* Assets */}
      <div className="flex flex-1 flex-col overflow-hidden px-3 pb-3">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Assets
        </p>
        <ul className="flex flex-col gap-0.5 overflow-y-auto">
          {ASSETS.map((name) => (
            <li key={name}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* User profile */}
      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-sidebar-accent"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent">
            <User className="size-4 text-sidebar-accent-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Hans Jackson</p>
            <p className="truncate text-xs text-muted-foreground">
              hans.jackson@nmkr.com
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </div>
    </aside>
  )
}
