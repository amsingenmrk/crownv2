"use client"

import { Info } from "lucide-react"

import {
  BENCHMARK_KPI_DEFINITIONS,
  type BenchmarkAreaSnapshot,
  type BenchmarkKpiDefinition,
} from "@/lib/benchmark-area-model"
import { qualityScoreValueClass } from "@/lib/stacking-plan-visual-tokens"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

function scoreValueClass(
  definition: BenchmarkKpiDefinition,
  value: string
): string | undefined {
  if (definition.format !== "score" || value === "—") return undefined
  const n = Number(value)
  if (!Number.isFinite(n)) return undefined
  return qualityScoreValueClass(n)
}

function BenchmarkKpiCard({
  definition,
  value,
  participantNote,
}: {
  definition: BenchmarkKpiDefinition
  value: string
  participantNote?: string
}) {
  const valueClassName = scoreValueClass(definition, value)

  return (
    <article className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-1.5">
        <h3 className="text-xs font-medium leading-snug text-muted-foreground">
          {definition.label}
        </h3>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label={`Info: ${definition.label}`}
              />
            }
          >
            <Info className="size-3 stroke-[1.5]" aria-hidden />
          </TooltipTrigger>
          <TooltipContent className="max-w-[280px] text-pretty text-xs">
            {definition.methodology}
          </TooltipContent>
        </Tooltip>
      </div>
      <p
        className={cn(
          "mt-1 text-lg font-semibold leading-tight tracking-tight tabular-nums",
          valueClassName ?? "text-foreground"
        )}
      >
        {value}
      </p>
      {participantNote ? (
        <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
          {participantNote}
        </p>
      ) : null}
    </article>
  )
}

export function BenchmarkKpiPanel({
  snapshot,
  className,
}: {
  snapshot: BenchmarkAreaSnapshot
  className?: string
}) {
  const kpiByKey = Object.fromEntries(
    snapshot.kpis.map((kpi) => [kpi.key, kpi])
  ) as Record<
    (typeof BENCHMARK_KPI_DEFINITIONS)[number]["key"],
    (typeof snapshot.kpis)[number]
  >

  return (
    <aside
      className={cn(
        "flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden",
        className
      )}
      aria-label="Benchmark metrics for map area"
    >
      <div className="shrink-0 space-y-0.5 border-b border-border pb-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Area benchmarks
        </p>
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {snapshot.areaLabel}
        </h2>
        <p className="text-xs text-muted-foreground">
          {snapshot.buildingCount === 1
            ? "1 building in view"
            : `${snapshot.buildingCount} buildings in view`}
          {snapshot.fullParticipantCount > 0 &&
          snapshot.fullParticipantCount < snapshot.buildingCount
            ? ` · ${snapshot.fullParticipantCount} full participants`
            : null}
        </p>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-0.5 [-webkit-overflow-scrolling:touch]"
        role="list"
      >
        <div className="grid grid-cols-2 gap-2">
          {BENCHMARK_KPI_DEFINITIONS.map((definition) => {
            const kpi = kpiByKey[definition.key]
            return (
              <div key={definition.key} role="listitem" className="min-w-0">
                <BenchmarkKpiCard
                  definition={definition}
                  value={kpi?.value ?? "—"}
                  participantNote={kpi?.participantNote}
                />
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
