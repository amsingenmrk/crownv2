"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { cn } from "@/lib/utils"

export type ScopedSurfaceNavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export function ScopedSurfaceNav({
  items,
  ariaLabel,
}: {
  items: readonly ScopedSurfaceNavItem[]
  ariaLabel: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const activeHref = React.useMemo(() => {
    const matching = items
      .filter(
        (item) =>
          pathname === item.href || pathname?.startsWith(`${item.href}/`)
      )
      .sort((left, right) => right.href.length - left.href.length)

    return matching[0]?.href ?? null
  }, [items, pathname])

  return (
    <nav
      className="overflow-x-auto overflow-y-hidden border-b border-border bg-background px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      aria-label={ariaLabel}
    >
      <div className="-mb-px flex w-fit items-center gap-1">
        {items.map((item) => {
          const isActive = activeHref === item.href
          const Icon = item.icon

          return (
            <button
              key={item.href}
              type="button"
              className={cn(
                "flex items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => router.push(item.href)}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
