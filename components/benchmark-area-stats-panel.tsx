"use client"

import {
  BENCHMARK_KPI_DEFINITIONS,
  type BenchmarkAreaSnapshot,
  type BenchmarkKpiDefinition,
} from "@/lib/benchmark-area-model"
import { qualityScoreValueClass } from "@/lib/stacking-plan-visual-tokens"
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
      <h3 className="text-xs font-medium leading-snug text-muted-foreground">
        {definition.label}
      </h3>
      <p
        className={cn(
          "mt-1 text-lg font-semibold leading-tight tracking-tight tabular-nums",
          valueClassName ?? "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
        {definition.methodology}
      </p>
      {participantNote ? (
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground/90">
          {participantNote}
        </p>
      ) : null}
    </article>
  )
}

export function BenchmarkAreaStatsPanel({
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
      className={cn("@container min-w-0", className)}
      aria-label="Area benchmark statistics"
    >
      <div className="shrink-0 space-y-0.5 border-b border-border/60 pb-2.5">
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

      <div className="pt-3">
        <div className="grid grid-cols-2 gap-2 @lg:grid-cols-4" role="list">
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
