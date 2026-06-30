"use client"

import * as React from "react"
import Link from "next/link"
import { createPortal } from "react-dom"
import { ArrowUpRight } from "lucide-react"

import {
  PortfolioProvenanceIndicator,
} from "@/components/portfolio/portfolio-provenance-indicator"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ASSETS, getAssetById } from "@/lib/assets"
import {
  ensureCompetitiveMembershipSeeded,
  getCompetitiveGroupSnapshot,
  parseCompetitiveGroupSnapshot,
  subscribeCompetitiveGroups,
} from "@/lib/competitive-group-overrides"
import {
  getBenchmarkAreaById,
  getBenchmarkAreaParent,
} from "@/lib/benchmark-area-hierarchy"
import {
  BENCHMARK_KPI_DEFINITIONS,
  benchmarkAssetKpiPercentilesForArea,
  benchmarkBuildingTableRowForAsset,
  type BenchmarkAreaSnapshot,
  type BenchmarkKpiDefinition,
} from "@/lib/benchmark-area-model"
import { KpiRangeBar } from "@/components/benchmark-kpi-range-bar"
import { usePortfolioAssetCoordinates } from "@/hooks/use-portfolio-asset-coordinates"
import { resolveBenchmarkAreaForAsset } from "@/lib/benchmark-area-for-asset"
import {
  assetsSharingGeo,
  geoKeyForBenchmarkArea,
} from "@/lib/benchmark-data/asset-percentiles"
import { assetBenchmarksPageHref } from "@/lib/benchmark-area-url"
import { curatedZipAssignmentsForZipCode } from "@/lib/benchmark-submarket-assignments"
import {
  MARKET_SEARCH_LISTING_COUNT,
  getMarketListingPinById,
  marketSearchDemoPinsBase,
} from "@/lib/market-search-demo-listings"
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
  const pin = getMarketListingPinById(assetId)
  const locationText = asset?.address ?? pin?.location
  const zipCode = zipCodeFromAddress(locationText)
  const stateCode = stateCodeFromAddress(locationText)

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

type CompareAssetOption = {
  id: string
  label: string
}

function ordinalPercentile(n: number): string {
  const rounded = Math.round(n)
  const v = rounded % 100
  const suffix =
    v >= 11 && v <= 13
      ? "th"
      : rounded % 10 === 1
        ? "st"
        : rounded % 10 === 2
          ? "nd"
          : rounded % 10 === 3
            ? "rd"
            : "th"
  return `${rounded}${suffix} pct`
}

function parseKpiNumber(text: string | null | undefined): number | null {
  if (text == null) return null
  const match = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/)
  if (match == null) return null
  const n = Number(match[0])
  return Number.isFinite(n) ? n : null
}

function formatKpiDeltaMagnitude(
  format: BenchmarkKpiDefinition["format"],
  magnitude: number
): string {
  switch (format) {
    case "rentPsf":
      return `$${magnitude.toFixed(2)}`
    case "valuePsf":
      return `$${Math.round(magnitude).toLocaleString("en-US")}`
    case "percent":
      // The headline value already carries "%", so the delta is in points.
      return `${magnitude.toFixed(1)}`
    case "score":
      return `${Math.round(magnitude)}`
    default:
      return String(magnitude)
  }
}

function BenchmarkKpiCard({
  definition,
  value,
  supportingRange,
  comparing = false,
  compareLabel,
  areaLabel,
  assetValue,
  assetPercentile,
}: {
  definition: BenchmarkKpiDefinition
  value: string
  supportingRange?: string
  comparing?: boolean
  compareLabel?: string
  areaLabel?: string
  assetValue?: string
  assetPercentile?: number | null
}) {
  const valueClassName = scoreValueClass(definition, value)

  // Observed cap rate is a market aggregate, not an asset-specific metric — the
  // asset benchmark page omits it, so there's nothing to compare here.
  const assetApplicable = definition.key !== "observedCapRate"

  // Position the asset by its percentile standing within the area (0..1), which
  // is measured against the same area mean shown as the headline value. The
  // area average is the 50th percentile by construction.
  const showBar =
    comparing &&
    assetApplicable &&
    assetPercentile != null &&
    assetValue != null

  // Explicit ▲/▼ delta of the asset vs. the area average (the headline value).
  const areaNum = parseKpiNumber(value)
  const assetNum = parseKpiNumber(assetValue)
  const delta =
    areaNum != null && assetNum != null ? assetNum - areaNum : null
  const deltaLabel =
    delta == null
      ? null
      : Math.abs(delta) < 0.05
        ? "at market avg"
        : `${delta > 0 ? "▲" : "▼"}${formatKpiDeltaMagnitude(definition.format, Math.abs(delta))}`

  // Compact value for the tight caption line — the "/ SF" unit is already in
  // the headline value, so drop it here to leave room for value + delta + pct.
  const assetValueCompact = assetValue?.replace(/\s*\/\s*SF$/i, "")
  const assetCaption =
    assetValueCompact != null
      ? deltaLabel != null
        ? `${assetValueCompact} · ${deltaLabel}`
        : assetValueCompact
      : undefined
  const assetTitle =
    assetValue != null
      ? `${compareLabel ?? "Asset"} · ${assetValue}${assetPercentile != null ? ` · ${ordinalPercentile(assetPercentile)}` : ""}${deltaLabel != null ? ` · ${deltaLabel} vs avg` : ""}`
      : undefined

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
      {showBar ? (
        <KpiRangeBar
          className="mt-auto pt-2.5"
          areaFraction={0.5}
          areaLabel={`${areaLabel ?? "Area"} average · ${value}`}
          assetFraction={(assetPercentile ?? 0) / 100}
          assetCaption={assetCaption}
          assetTrailing={
            assetPercentile != null
              ? ordinalPercentile(assetPercentile).replace(" pct", "")
              : undefined
          }
          assetTrailingClassName={
            assetPercentile != null
              ? qualityScoreValueClass(assetPercentile)
              : undefined
          }
          assetTitle={assetTitle}
        />
      ) : comparing ? (
        <p className="mt-auto pt-2.5 text-[11px] italic text-muted-foreground">
          asset comparison not available for this metric
        </p>
      ) : supportingRange ? (
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
  headerSlot,
  headerPortalTargetId,
  initialCompareAssetId,
}: {
  snapshot: BenchmarkAreaSnapshot
  benchmarkAreaId: string
  className?: string
  headerSlot?: React.ReactNode
  headerPortalTargetId?: string
  initialCompareAssetId?: string
}) {
  React.useEffect(() => {
    ensureCompetitiveMembershipSeeded()
  }, [])

  const competitiveGroupSnap = React.useSyncExternalStore(
    subscribeCompetitiveGroups,
    getCompetitiveGroupSnapshot,
    () => ""
  )
  const competitiveGroupData = React.useMemo(
    () => parseCompetitiveGroupSnapshot(competitiveGroupSnap),
    [competitiveGroupSnap]
  )

  // Portfolio assets comparable at this geography come from the per-asset
  // percentile table (assets sharing the selected area's geo). Falls back to
  // the curated path logic for areas the table doesn't key (e.g. markets).
  const tableEligiblePortfolioIds = React.useMemo(() => {
    const geoKey = geoKeyForBenchmarkArea({
      id: benchmarkAreaId,
      level: "country",
      label: "",
    })
    if (geoKey == null) return null
    return new Set(assetsSharingGeo(geoKey.geoLevel, geoKey.statsKey))
  }, [benchmarkAreaId])

  const scopedPortfolioAssets = React.useMemo(
    () =>
      ASSETS.filter((asset) =>
        tableEligiblePortfolioIds != null
          ? tableEligiblePortfolioIds.has(asset.id)
          : benchmarkPathIdsForAsset(asset.id).has(benchmarkAreaId)
      ).map((asset) => ({ id: asset.id, label: asset.name })),
    [benchmarkAreaId, tableEligiblePortfolioIds]
  )
  const scopedOtherAssets = React.useMemo(() => {
    const activePins = marketSearchDemoPinsBase(MARKET_SEARCH_LISTING_COUNT).filter(
      (pin) => !competitiveGroupData.removedAssetIds.has(pin.id)
    )
    return activePins
      .filter((pin) => benchmarkPathIdsForAsset(pin.id).has(benchmarkAreaId))
      .map((pin) => ({ id: pin.id, label: pin.building }))
      .sort((left, right) =>
        left.label.localeCompare(right.label, undefined, { sensitivity: "base" })
      )
  }, [benchmarkAreaId, competitiveGroupData.removedAssetIds])

  const scopedAssets = React.useMemo<CompareAssetOption[]>(
    () => [...scopedPortfolioAssets, ...scopedOtherAssets],
    [scopedOtherAssets, scopedPortfolioAssets]
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

  // Honor a deep-linked compare asset once (e.g. arriving from that asset's
  // benchmark page), without snapping back if the user later changes it.
  const compareSeededRef = React.useRef(false)
  React.useEffect(() => {
    if (compareSeededRef.current || !initialCompareAssetId) return
    if (scopedAssets.some((asset) => asset.id === initialCompareAssetId)) {
      setSelectedAssetId(initialCompareAssetId)
      compareSeededRef.current = true
    }
  }, [initialCompareAssetId, scopedAssets])
  const selectedAssetName =
    scopedAssets.find((asset) => asset.id === selectedAssetId)?.label ?? ""

  // Selected compare asset's per-KPI values + percentile standing within this
  // area. Values mirror the asset benchmark page (benchmarkBuildingTableRowForAsset).
  const { coordinates } = usePortfolioAssetCoordinates()
  const comparing = selectedAssetId !== ""
  const assetCompare = React.useMemo(() => {
    if (!comparing) return null
    const area = getBenchmarkAreaById(benchmarkAreaId)
    if (area == null) return null
    const row = benchmarkBuildingTableRowForAsset(selectedAssetId, coordinates)
    return {
      kpis: row?.kpis ?? null,
      percentiles: benchmarkAssetKpiPercentilesForArea(
        area,
        selectedAssetId,
        coordinates
      ),
    }
  }, [benchmarkAreaId, comparing, coordinates, selectedAssetId])

  const [headerPortalTarget, setHeaderPortalTarget] =
    React.useState<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!headerPortalTargetId || typeof document === "undefined") {
      setHeaderPortalTarget(null)
      return
    }
    setHeaderPortalTarget(document.getElementById(headerPortalTargetId))
  }, [headerPortalTargetId])

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
                comparing={comparing}
                compareLabel={selectedAssetName}
                areaLabel={snapshot.areaLabel}
                assetValue={assetCompare?.kpis?.[definition.key]?.value}
                assetPercentile={assetCompare?.percentiles?.[definition.key] ?? null}
              />
            </div>
          )
        })}
      </div>
    </section>
  )

  const header = (
      <div
        className={cn(
          "flex shrink-0 flex-col gap-3 md:flex-row md:items-start md:justify-between",
          !headerPortalTargetId && "border-b border-border/60 pb-2.5"
        )}
      >
        <div className="min-w-0 md:flex-1">
          {headerSlot ? (
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Benchmark area
              </span>
              {headerSlot}
            </div>
          ) : (
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {snapshot.areaLabel}
            </h2>
          )}
        </div>

        <div className="flex min-w-0 items-end gap-2 md:ml-auto md:shrink-0">
          <Field className="min-w-0 flex-1 gap-1 md:w-56">
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
                {scopedPortfolioAssets.length > 0 ? (
                  <SelectGroup>
                    <SelectLabel>Your Assets</SelectLabel>
                    {scopedPortfolioAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}
                {scopedOtherAssets.length > 0 ? (
                  <SelectGroup>
                    <SelectLabel>Other Assets</SelectLabel>
                    {scopedOtherAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}
              </SelectContent>
            </Select>
          </Field>
          {selectedAssetId ? (
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Open selected asset benchmark page"
              render={
                <Link
                  href={assetBenchmarksPageHref(selectedAssetId, benchmarkAreaId)}
                />
              }
            >
              <ArrowUpRight className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
  )

  return (
    <aside
      className={cn("@container min-w-0", className)}
      aria-label="Area benchmark statistics"
    >
      {headerPortalTarget
        ? createPortal(header, headerPortalTarget)
        : headerPortalTargetId
          ? null
          : header}

      <div className={cn("space-y-4", !headerPortalTargetId && "pt-3")}>
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
