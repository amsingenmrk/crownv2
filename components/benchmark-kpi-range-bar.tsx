import * as React from "react"

import { cn } from "@/lib/utils"

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

/**
 * A diverging percentile bar for a KPI card. The center line is the area-average
 * baseline (50th percentile); when comparing, a filled segment runs from center
 * to the selected asset's percentile — left if below average, right if above —
 * with the asset as a dot. The caption carries the asset's value + delta.
 */
export function KpiRangeBar({
  areaFraction,
  areaLabel,
  assetFraction = null,
  assetCaption,
  assetTrailing,
  assetTrailingClassName,
  assetTitle,
  className,
}: {
  /** Position of the average baseline, 0..1 (50th percentile = 0.5). */
  areaFraction: number
  areaLabel: string
  assetFraction?: number | null
  assetCaption?: string
  /** Short right-aligned tag on the caption line (e.g. the percentile). */
  assetTrailing?: string
  /** Color class for the trailing tag (e.g. percentile grading). */
  assetTrailingClassName?: string
  assetTitle?: string
  className?: string
}) {
  const base = clamp01(areaFraction)
  const asset = assetFraction != null ? clamp01(assetFraction) : null
  const fillLeft = asset != null ? Math.min(base, asset) : base
  const fillWidth = asset != null ? Math.abs(asset - base) : 0

  const ariaLabel =
    asset != null && (assetTitle ?? assetCaption) != null
      ? `${areaLabel}. ${assetTitle ?? assetCaption}.`
      : `${areaLabel}.`

  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <div
        className="relative h-1.5 w-full rounded-full bg-muted"
        role="img"
        aria-label={ariaLabel}
      >
        {/* Distance from the average, toward the asset. */}
        {asset != null && fillWidth > 0 ? (
          <span
            className="absolute top-0 h-full bg-primary/30"
            style={{ left: `${fillLeft * 100}%`, width: `${fillWidth * 100}%` }}
          />
        ) : null}
        {/* Area-average baseline. */}
        <span
          title={areaLabel}
          className="absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-muted-foreground/60"
          style={{ left: `${base * 100}%` }}
        />
        {/* Selected asset. */}
        {asset != null ? (
          <span
            title={assetTitle ?? assetCaption}
            className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-background"
            style={{ left: `${asset * 100}%` }}
          />
        ) : null}
      </div>
      {asset != null && assetCaption != null ? (
        <div className="flex items-center gap-1.5 text-[11px] leading-tight">
          <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-foreground">
            {assetCaption}
          </span>
          {assetTrailing != null ? (
            <span
              className={cn(
                "shrink-0 font-medium tabular-nums",
                assetTrailingClassName ?? "text-muted-foreground"
              )}
            >
              {assetTrailing}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
