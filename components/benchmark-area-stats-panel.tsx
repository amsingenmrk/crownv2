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
import { ASSETS, getAssetById } from "@/lib/assets"
import {
  getBenchmarkAreaById,
  getBenchmarkAreaParent,
} from "@/lib/benchmark-area-hierarchy"
import {
  BENCHMARK_KPI_DEFINITIONS,
  type BenchmarkAreaSnapshot,
  type BenchmarkKpiDefinition,
} from "@/lib/benchmark-area-model"
import { resolveBenchmarkAreaForAsset } from "@/lib/benchmark-area-for-asset"
import { assetBenchmarksPageHref } from "@/lib/benchmark-area-url"
import { curatedZipAssignmentsForZipCode } from "@/lib/benchmark-submarket-assignments"
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

function buildingCountBucketLabel(count: number): string {
  if (count <= 0) return "0 buildings in view"
  if (count <= 25) return "1-25 buildings in view"
  if (count <= 100) return "26-100 buildings in view"
  if (count <= 500) return "101-500 buildings in view"
  return "500+ buildings in view"
}

function zipCodeFromAddress(value: string | undefined): string | null {
  if (!value) return null
  const match = value.match(/\b(\d{5})(?:-\d{4})?\s*$/)
  return match?.[1] ?? null
}

function stateCodeFromAddress(value: string | undefined): string | null {
  if (!value) return null
  const match = value.match(/,\s*([A-Z]{2})\s+\d{5}(?:-\d{4})?\s*$/)
  return match?.[1] ?? null
}

function areaPathIdsFromAreaId(areaId: string | null): Set<string> {
  const ids = new Set<string>()
  if (!areaId) return ids

  let cursor = getBenchmarkAreaById(areaId)
  while (cursor) {
    ids.add(cursor.id)
    cursor = getBenchmarkAreaParent(cursor)
  }
  return ids
}

function benchmarkPathIdsForAsset(assetId: string): Set<string> {
  const asset = getAssetById(assetId)
  const zipCode = zipCodeFromAddress(asset?.address)
  const stateCode = stateCodeFromAddress(asset?.address)

  if (zipCode) {
    const assignments = curatedZipAssignmentsForZipCode(zipCode)
    const scopedAssignments =
      stateCode == null
        ? assignments
        : assignments.filter((assignment) => assignment.stateCode === stateCode)
    const candidateAssignments =
      scopedAssignments.length > 0 ? scopedAssignments : assignments
    const assignment = candidateAssignments[0]
    if (assignment) {
      const preferredAreaId =
        assignment.id ??
        assignment.countyId ??
        assignment.submarketId ??
        assignment.marketId
      const ids = areaPathIdsFromAreaId(preferredAreaId)
      if (ids.size > 0) return ids
    }
  }

  const marketArea = resolveBenchmarkAreaForAsset(assetId)
  return areaPathIdsFromAreaId(marketArea.id)
}

function BenchmarkKpiCard({
  definition,
  value,
  supportingRange,
}: {
  definition: BenchmarkKpiDefinition
  value: string
  supportingRange?: string
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
      {supportingRange ? (
        <p className="mt-1 text-[11px] font-medium text-muted-foreground tabular-nums">
          ({supportingRange})
        </p>
      ) : null}
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
  const scopedAssets = React.useMemo(
    () =>
      ASSETS.filter((asset) =>
        benchmarkPathIdsForAsset(asset.id).has(benchmarkAreaId)
      ),
    [benchmarkAreaId]
  )
  const [selectedAssetId, setSelectedAssetId] = React.useState("")
  React.useEffect(() => {
    if (scopedAssets.length === 0) {
      setSelectedAssetId("")
      return
    }
    setSelectedAssetId((current) =>
      scopedAssets.some((asset) => asset.id === current)
        ? current
        : (scopedAssets[0]?.id ?? "")
    )
  }, [scopedAssets])
  const selectedAssetName =
    scopedAssets.find((asset) => asset.id === selectedAssetId)?.name ?? ""
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
                supportingRange={kpi?.supportingRange}
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
            {buildingCountBucketLabel(snapshot.buildingCount)}
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
                disabled={scopedAssets.length === 0}
              >
                <SelectValue placeholder="Select asset…">
                  {selectedAssetName || "No assets in scope"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                {scopedAssets.map((asset) => (
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
