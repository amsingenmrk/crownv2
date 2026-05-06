"use client"

import { OccupancySummaryBar } from "@/components/occupancy-summary-bar"
import { formatRsfShort } from "@/lib/portfolio-row-for-asset"
import { cn } from "@/lib/utils"

export function HeaderRsfOccupancyCluster({
  totalRsfSqft,
  assetCount,
  spaceCount,
  occupiedPercent,
  waleYears,
}: {
  totalRsfSqft: number
  assetCount: number
  spaceCount: number
  occupiedPercent: number
  waleYears?: number | null
}) {
  const waleDisplay =
    typeof waleYears === "number" && Number.isFinite(waleYears) && waleYears > 0
      ? `${waleYears.toFixed(1)} yrs`
      : "—"
  const stats = [
    {
      key: "assets",
      label: "Assets",
      value: String(assetCount),
      aria: "Number of assets",
    },
    {
      key: "spaces",
      label: "Spaces",
      value: String(spaceCount),
      aria: "Total spaces across asset stacking plans",
    },
    {
      key: "rsf",
      label: "RSF",
      value: formatRsfShort(totalRsfSqft),
      aria: "Total rentable square feet",
    },
  ] as const

  return (
    <div className="mx-auto flex w-full max-w-full flex-col items-stretch gap-2 sm:mx-0 sm:flex-row sm:items-stretch sm:justify-end">
      <div
        className="flex min-h-0 min-w-0 w-full shrink-0 items-stretch justify-center self-stretch overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-muted/30 text-xs sm:w-fit sm:justify-end"
        aria-label="Portfolio summary statistics"
      >
        {stats.map((s, i) => (
          <div
            key={s.key}
            className={cn(
              "flex min-h-0 max-w-[10rem] shrink-0 flex-col justify-center self-stretch px-2 py-0.5 sm:px-2 sm:py-1",
              i > 0 && "border-l border-border"
            )}
            aria-label={s.aria}
          >
            <span className="whitespace-nowrap text-[10px] font-medium leading-tight text-muted-foreground sm:text-[11px]">
              {s.label}
            </span>
            <span className="mt-px truncate text-xs font-semibold leading-tight tabular-nums text-foreground sm:text-[13px]">
              {s.value}
            </span>
          </div>
        ))}
      </div>
      <OccupancySummaryBar
        occupiedPercent={occupiedPercent}
        className="h-full min-h-0"
        secondaryMetricLabel="WALE / WALT"
        secondaryMetricValue={waleDisplay}
      />
    </div>
  )
}
