"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export function OccupancySummaryBar({
  occupiedPercent,
  className,
  secondaryMetricLabel,
  secondaryMetricValue,
}: {
  occupiedPercent: number
  /** e.g. `h-full` when the bar sits alone in a column (portfolio) — omit beside metrics so flex/grid stretch sets height */
  className?: string
  secondaryMetricLabel?: string
  secondaryMetricValue?: string
}) {
  const clampedOccupiedPercent = Math.max(0, Math.min(100, occupiedPercent))
  const occupiedLabel = Math.round(clampedOccupiedPercent)
  const vacantLabel = Math.max(0, 100 - occupiedLabel)
  const showSecondaryMetric =
    secondaryMetricLabel != null &&
    secondaryMetricValue != null &&
    secondaryMetricValue !== ""

  return (
    <div
      className={cn(
        "mx-auto flex h-full min-h-0 w-full max-w-full shrink-0 items-stretch gap-0 self-stretch rounded-lg border border-border bg-muted/30 px-1 py-0.5 text-xs sm:mx-0 sm:min-h-0 sm:max-w-[min(100%,22rem)] sm:px-2 sm:py-1",
        className
      )}
    >
      <div className="flex min-h-0 shrink-0 flex-col justify-center px-2 py-0.5 sm:px-2 sm:py-1">
        <span className="whitespace-nowrap text-[10px] font-medium leading-tight text-muted-foreground sm:text-[11px]">
          Occupied
        </span>
        <span className="mt-px truncate text-xs font-semibold leading-tight tabular-nums text-foreground sm:text-[13px]">
          {occupiedLabel}%
        </span>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center px-1 sm:px-2">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted-foreground/20 dark:bg-muted-foreground/35 sm:h-3">
          <div
            className="h-full rounded-full bg-primary/70 transition-[width] duration-300"
            style={{ width: `${clampedOccupiedPercent}%` }}
          />
        </div>
      </div>
      <div className="flex min-h-0 shrink-0 flex-col justify-center px-2 py-0.5 sm:px-2 sm:py-1">
        <span className="whitespace-nowrap text-[10px] font-medium leading-tight text-muted-foreground sm:text-[11px]">
          Vacant
        </span>
        <span className="mt-px truncate text-xs font-semibold leading-tight tabular-nums text-foreground sm:text-[13px]">
          {vacantLabel}%
        </span>
      </div>
      {showSecondaryMetric ? (
        <div className="flex min-h-0 shrink-0 flex-col justify-center border-l border-border/60 px-2 py-0.5 sm:px-2 sm:py-1">
          <span className="whitespace-nowrap text-[10px] font-medium leading-tight text-muted-foreground sm:text-[11px]">
            {secondaryMetricLabel}
          </span>
          <span className="mt-px truncate text-xs font-semibold leading-tight tabular-nums text-foreground sm:text-[13px]">
            {secondaryMetricValue}
          </span>
        </div>
      ) : null}
    </div>
  )
}
