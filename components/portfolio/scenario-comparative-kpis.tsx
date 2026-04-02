"use client"

import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react"

/** `text-xs` is 0.75rem; `size-3` matches for optical alignment with the delta row. */
const deltaIconClass =
  "size-3 shrink-0 text-violet-700 dark:text-violet-300"

function DeltaDirectionIcon({
  direction,
}: {
  direction: "up" | "down" | "neutral"
}) {
  if (direction === "up") {
    return <TrendingUp className={deltaIconClass} aria-hidden />
  }
  if (direction === "down") {
    return <TrendingDown className={deltaIconClass} aria-hidden />
  }
  return <Minus className={deltaIconClass} aria-hidden />
}

/** Inline scenario headline next to the base figure (same row, violet). */
export function ScenarioMetricInlinePair({
  baseFormatted,
  scenarioFormatted,
  showScenario,
  deltaLine,
  pctLine,
  deltaDirection,
}: {
  baseFormatted: string
  scenarioFormatted: string
  showScenario: boolean
  /** Shown on the line below the headline when a scenario is active (e.g. +$XM). */
  deltaLine?: string
  pctLine?: string
  /** Drives the trend icon before the primary delta text (same `text-xs` scale as the line). */
  deltaDirection?: "up" | "down" | "neutral"
}) {
  const showDelta =
    showScenario && deltaLine != null && pctLine != null && pctLine !== ""

  return (
    <>
      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
          {baseFormatted}
        </span>
        {showScenario ? (
          <>
            <ArrowRight
              className="size-5 shrink-0 text-muted-foreground/60"
              aria-hidden
            />
            <span className="text-2xl font-semibold tracking-tight tabular-nums text-violet-800 dark:text-violet-200">
              {scenarioFormatted}
            </span>
          </>
        ) : null}
      </div>
      {showDelta ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
          <DeltaDirectionIcon
            direction={deltaDirection ?? "neutral"}
          />
          <span className="font-semibold tabular-nums text-violet-700 dark:text-violet-300">
            {deltaLine}
          </span>
          <span className="tabular-nums text-violet-600/95 dark:text-violet-400/90">
            {pctLine}
          </span>
        </div>
      ) : null}
    </>
  )
}
