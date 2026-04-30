"use client"

import * as React from "react"

export function OccupancySummaryBar({
  occupiedPercent,
}: {
  occupiedPercent: number
}) {
  const clampedOccupiedPercent = Math.max(0, Math.min(100, occupiedPercent))
  const occupiedLabel = Math.round(clampedOccupiedPercent)
  const vacantLabel = Math.max(0, 100 - occupiedLabel)

  return (
    <div className="flex h-full w-[480px] max-w-full items-center gap-0 rounded-full border border-border bg-muted/30 px-2 py-1.5 text-sm">
      <span className="rounded-full px-3 font-medium whitespace-nowrap text-muted-foreground">
        {occupiedLabel}% Occupied
      </span>
      <div className="mx-2 flex min-w-0 flex-1 items-center">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary/70 transition-[width] duration-300"
            style={{ width: `${clampedOccupiedPercent}%` }}
          />
        </div>
      </div>
      <span className="rounded-full px-3 font-medium whitespace-nowrap text-muted-foreground">
        {vacantLabel}% Vacant
      </span>
    </div>
  )
}
