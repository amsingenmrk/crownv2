"use client"

import { Briefcase, Building2 } from "lucide-react"
import { isMarketListingRowId } from "@/lib/market-listing-portfolio-row"
import { cn } from "@/lib/utils"

export function PortfolioRowStatusBadge({ rowId }: { rowId: string }) {
  const listing = isMarketListingRowId(rowId)

  if (listing) {
    return (
      <span
        className={cn(
          "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums",
          "border-zinc-400/35 bg-zinc-500/10 text-zinc-800",
          "dark:border-zinc-500/40 dark:bg-zinc-500/15 dark:text-zinc-200"
        )}
      >
        <Building2 className="size-3 shrink-0 opacity-80" aria-hidden />
        <span className="min-w-0 truncate">Listing</span>
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums",
        "border-border bg-muted/50 text-foreground",
        "dark:bg-muted/35 dark:text-foreground"
      )}
    >
      <Briefcase className="size-3 shrink-0 opacity-80" aria-hidden />
      <span className="min-w-0 truncate">Asset</span>
    </span>
  )
}
