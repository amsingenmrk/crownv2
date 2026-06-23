"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import {
  PortfolioProvenanceIndicator,
} from "@/components/portfolio/portfolio-provenance-indicator"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ASSETS } from "@/lib/assets"
import {
  BENCHMARK_KPI_DEFINITIONS,
  type BenchmarkAreaSnapshot,
  type BenchmarkKpiDefinition,
} from "@/lib/benchmark-area-model"
import { assetBenchmarksPageHref } from "@/lib/benchmark-area-url"
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
}: {
  definition: BenchmarkKpiDefinition
  value: string
}) {
  const valueClassName = scoreValueClass(definition, value)

  return (
    <article className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-1.5">
        <h3 className="text-xs font-medium leading-snug text-muted-foreground">
          {definition.label}
        </h3>
        <PortfolioProvenanceIndicator
          label={definition.methodology}
          className="text-muted-foreground/80"
        />
      </div>
      <p
        className={cn(
          "mt-1 text-lg font-semibold leading-tight tracking-tight tabular-nums",
          valueClassName ?? "text-foreground"
        )}
      >
        {value}
      </p>
    </article>
  )
}

export function BenchmarkAreaStatsPanel({
  snapshot,
  benchmarkAreaId,
  className,
}: {
  snapshot: BenchmarkAreaSnapshot
  benchmarkAreaId: string
  className?: string
}) {
  const [selectedAssetId, setSelectedAssetId] = React.useState(
    () => ASSETS[0]?.id ?? ""
  )
  const selectedAssetName =
    ASSETS.find((asset) => asset.id === selectedAssetId)?.name ?? ""
  const kpiByKey = Object.fromEntries(
    snapshot.kpis.map((kpi) => [kpi.key, kpi])
  ) as Record<
    (typeof BENCHMARK_KPI_DEFINITIONS)[number]["key"],
    (typeof snapshot.kpis)[number]
  >
  const fundamentalsDefinitions = BENCHMARK_KPI_DEFINITIONS.filter(
    (definition) => definition.section === "fundamentals"
  )
  const rentDefinitions = BENCHMARK_KPI_DEFINITIONS.filter(
    (definition) => definition.section === "rents"
  )
  const scoreDefinitions = BENCHMARK_KPI_DEFINITIONS.filter(
    (definition) => definition.section === "scores"
  )
  const renderSection = ({
    title,
    ariaLabel,
    definitions,
    bordered,
  }: {
    title: string
    ariaLabel: string
    definitions: readonly BenchmarkKpiDefinition[]
    bordered: boolean
  }) => (
    <section className="space-y-2.5" aria-label={ariaLabel}>
      <div className={cn(bordered && "border-t border-border/60 pt-3")}>
        <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-2 @lg:grid-cols-4" role="list">
        {definitions.map((definition) => {
          const kpi = kpiByKey[definition.key]
          return (
            <div key={definition.key} role="listitem" className="min-w-0">
              <BenchmarkKpiCard
                definition={definition}
                value={kpi?.value ?? "—"}
              />
            </div>
          )
        })}
      </div>
    </section>
  )

  return (
    <aside
      className={cn("@container min-w-0", className)}
      aria-label="Area benchmark statistics"
    >
      <div className="flex shrink-0 flex-col gap-3 border-b border-border/60 pb-2.5 @lg:flex-row @lg:items-start @lg:justify-between">
        <div className="min-w-0 space-y-0.5">
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

        <div className="flex min-w-0 items-end gap-2 @lg:shrink-0">
          <Field className="min-w-0 flex-1 gap-1 @lg:w-56">
            <FieldLabel className="text-xs font-medium text-muted-foreground">
              Compare to Asset
            </FieldLabel>
            <Select
              value={selectedAssetId}
              onValueChange={(value) => setSelectedAssetId(value ?? "")}
            >
              <SelectTrigger
                size="sm"
                className="min-w-0 w-full"
                aria-label="Compare to Asset"
              >
                <SelectValue placeholder="Select asset…">
                  {selectedAssetName || "Select asset…"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                {ASSETS.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Button
            size="icon-sm"
            variant="outline"
            disabled={!selectedAssetId}
            aria-label="Open selected asset benchmark page"
            render={
              selectedAssetId ? (
                <Link
                  href={assetBenchmarksPageHref(
                    selectedAssetId,
                    benchmarkAreaId
                  )}
                />
              ) : undefined
            }
          >
            <ArrowUpRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="space-y-4 pt-3">
        {renderSection({
          title: "Fundamentals",
          ariaLabel: "Benchmark fundamentals",
          definitions: fundamentalsDefinitions,
          bordered: false,
        })}
        {renderSection({
          title: "Rents",
          ariaLabel: "Benchmark rents",
          definitions: rentDefinitions,
          bordered: true,
        })}
        {renderSection({
          title: "Scores",
          ariaLabel: "Benchmark scores",
          definitions: scoreDefinitions,
          bordered: true,
        })}
      </div>
    </aside>
  )
}
