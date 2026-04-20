"use client"

import * as React from "react"
import {
  ChevronDown,
  ChevronRight,
  FilterX,
  Layers3,
  Search,
} from "lucide-react"
import { useParams, useSearchParams } from "next/navigation"

import {
  BuildingModificationsSidebar,
  INITIAL_MOD_VALUES,
  type ModValues,
} from "@/components/building-modifications-sidebar"
import {
  AssetStackingPlanWorkspace,
  type SimplifiedTenantVisualOverride,
} from "@/components/asset-stacking-plan-workspace"
import {
  MetricStripCell,
  MetricStripLabel,
  MetricStripValueRow,
  MetricStripValueSuffix,
  metricStripSectionClassName,
} from "@/components/metric-strip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  buildModificationImpactDataset,
  createDefaultModificationImpactFilters,
  deriveImpactMetrics,
  matchesImpactFilters,
  type ModificationImpactBand,
  type ModificationImpactFilters,
  type ModificationImpactSpace,
} from "@/lib/modifications-impact"
import { deriveBaseAnnualOpex } from "@/lib/forecast-data"
import {
  buildRecommendedModificationValues,
  parseRecommendedModificationSelection,
} from "@/lib/modification-recommendations"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import { upliftFromModValues } from "@/lib/scenario-modification-uplift"
import { getSampleStackingPlanData } from "@/lib/stacking-plan-data"
import { cn } from "@/lib/utils"

export function ModificationsWorkspace() {
  const params = useParams()
  const searchParams = useSearchParams()
  const assetId =
    typeof params?.id === "string" && params.id.length > 0
      ? params.id
      : "default"
  const recommendedModification = React.useMemo(
    () => parseRecommendedModificationSelection(searchParams),
    [searchParams]
  )

  const [values, setValues] = React.useState<ModValues>(() => ({
    ...INITIAL_MOD_VALUES,
  }))
  const [filters, setFilters] = React.useState<ModificationImpactFilters>(() =>
    createDefaultModificationImpactFilters()
  )

  React.useLayoutEffect(() => {
    setValues(buildRecommendedModificationValues(recommendedModification))
  }, [assetId, recommendedModification])

  const baseDataset = React.useMemo(
    () => getSampleStackingPlanData(assetId),
    [assetId]
  )
  const impactDataset = React.useMemo(
    () => buildModificationImpactDataset(baseDataset.floors, values),
    [baseDataset.floors, values]
  )
  const allSpaces = React.useMemo(
    () => impactDataset.floors.flatMap((floor) => floor.tenants),
    [impactDataset.floors]
  )
  const matchingSpaceIds = React.useMemo(() => {
    return new Set(
      allSpaces
        .filter((tenant) => matchesImpactFilters(tenant, filters))
        .map((tenant) => tenant.id)
    )
  }, [allSpaces, filters])
  const matchingSpaces = React.useMemo(
    () => allSpaces.filter((tenant) => matchingSpaceIds.has(tenant.id)),
    [allSpaces, matchingSpaceIds]
  )
  const metrics = React.useMemo(
    () => deriveImpactMetrics(matchingSpaces),
    [matchingSpaces]
  )
  const scenarioKpis = React.useMemo(() => {
    return deriveFilteredScenarioKpis({
      assetId,
      allSpaces,
      matchingSpaces,
      values,
    })
  }, [allSpaces, assetId, matchingSpaces, values])
  const tenantVisualOverrides = React.useMemo<
    Record<string, SimplifiedTenantVisualOverride>
  >(() => {
    const overrides: Record<string, SimplifiedTenantVisualOverride> = {}

    for (const tenant of allSpaces) {
      const isMatch = matchingSpaceIds.has(tenant.id)
      overrides[tenant.id] = {
        backgroundColor: getImpactColor(tenant, isMatch),
        title: buildImpactTooltip(
          tenant,
          impactDataset.activeSelections.length > 0
        ),
        muted: !isMatch,
      }
    }

    return overrides
  }, [allSpaces, impactDataset.activeSelections.length, matchingSpaceIds])
  const floorOptions = React.useMemo(
    () => impactDataset.floors.map((floor) => String(floor.floor)),
    [impactDataset.floors]
  )
  const hasActiveFilters =
    filters.floor !== "all" ||
    filters.query.trim() !== "" ||
    filters.vacancy !== "all" ||
    filters.leaseTiming !== "all" ||
    filters.rentGap !== "all" ||
    filters.size !== "all"

  return (
    <div className="flex min-h-0 w-full flex-col gap-4">
      <div className="flex min-h-0 w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <BuildingModificationsSidebar
          assetId={assetId}
          value={values}
          onValuesChange={setValues}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <section className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Rent Impact Stack
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {impactDataset.activeSelections.length === 0 ? (
                <span className="rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                  Select a building modification to see rent impact
                </span>
              ) : (
                impactDataset.activeSelections.map((selection) => (
                  <span
                    key={`${selection.id}-${selection.optionValue}`}
                    className="rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {selection.optionTitle}
                  </span>
                ))
              )}
            </div>
          </section>

          <ImpactMetricsStrip metrics={metrics} scenarioKpis={scenarioKpis} />

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-4">
              <ImpactFilters
                filters={filters}
                floorOptions={floorOptions}
                hasActiveFilters={hasActiveFilters}
                onChange={setFilters}
              />

              <ImpactLegend
                matchingSpaceCount={matchingSpaces.length}
                totalSpaceCount={allSpaces.length}
              />

              <AssetStackingPlanWorkspace
                assetId={assetId}
                lockedViewMode="simplified"
                showViewToggle={false}
                showSortControl={false}
                showTopToolbar={false}
                simplifiedTenantInteraction="none"
                simplifiedTenantVisualOverrides={tenantVisualOverrides}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function ImpactMetricsStrip({
  metrics,
  scenarioKpis,
}: {
  metrics: ReturnType<typeof deriveImpactMetrics>
  scenarioKpis: {
    valueLift: number | null
    valueLiftPct: number | null
    noiImpact: number | null
    noiImpactPct: number | null
    opexImpact: number | null
    opexImpactPct: number | null
  }
}) {
  return (
    <section
      className={cn(
        metricStripSectionClassName,
        "grid-cols-1 sm:grid-cols-2 xl:grid-cols-6"
      )}
      aria-label="Modification impact metrics"
    >
      <MetricStripCell>
        <MetricStripLabel>Average rent lift</MetricStripLabel>
        <MetricStripValueRow>
          <span className="text-foreground">
            {formatSignedRate(metrics.averageLiftPsf)}
          </span>
          {metrics.averageLiftPct != null ? (
            <MetricStripValueSuffix>
              ({formatSignedPercent(metrics.averageLiftPct)})
            </MetricStripValueSuffix>
          ) : null}
        </MetricStripValueRow>
      </MetricStripCell>

      <MetricStripCell>
        <MetricStripLabel>Min rent lift</MetricStripLabel>
        <MetricStripValueRow>
          <span className="text-foreground">
            {formatSignedRate(metrics.minLiftPsf)}
          </span>
          {metrics.minLiftPct != null ? (
            <MetricStripValueSuffix>
              ({formatSignedPercent(metrics.minLiftPct)})
            </MetricStripValueSuffix>
          ) : null}
        </MetricStripValueRow>
      </MetricStripCell>

      <MetricStripCell>
        <MetricStripLabel>Max rent lift</MetricStripLabel>
        <MetricStripValueRow>
          <span className="text-foreground">
            {formatSignedRate(metrics.maxLiftPsf)}
          </span>
          {metrics.maxLiftPct != null ? (
            <MetricStripValueSuffix>
              ({formatSignedPercent(metrics.maxLiftPct)})
            </MetricStripValueSuffix>
          ) : null}
        </MetricStripValueRow>
      </MetricStripCell>

      <MetricStripCell>
        <MetricStripLabel>Value lift</MetricStripLabel>
        <MetricStripValueRow>
          <span className="text-foreground">
            {formatSignedCurrencyCompact(scenarioKpis.valueLift)}
          </span>
          {scenarioKpis.valueLiftPct != null ? (
            <MetricStripValueSuffix>
              ({formatSignedPercent(scenarioKpis.valueLiftPct)})
            </MetricStripValueSuffix>
          ) : null}
        </MetricStripValueRow>
      </MetricStripCell>

      <MetricStripCell>
        <MetricStripLabel>Opex impact</MetricStripLabel>
        <MetricStripValueRow>
          <span className="text-foreground">
            {formatSignedCurrencyAnnual(scenarioKpis.opexImpact)}
          </span>
          {scenarioKpis.opexImpactPct != null ? (
            <MetricStripValueSuffix>
              ({formatSignedPercent(scenarioKpis.opexImpactPct)})
            </MetricStripValueSuffix>
          ) : null}
        </MetricStripValueRow>
      </MetricStripCell>

      <MetricStripCell>
        <MetricStripLabel>NOI impact</MetricStripLabel>
        <MetricStripValueRow>
          <span className="text-foreground">
            {formatSignedCurrencyAnnual(scenarioKpis.noiImpact)}
          </span>
          {scenarioKpis.noiImpactPct != null ? (
            <MetricStripValueSuffix>
              ({formatSignedPercent(scenarioKpis.noiImpactPct)})
            </MetricStripValueSuffix>
          ) : null}
        </MetricStripValueRow>
      </MetricStripCell>
    </section>
  )
}

function deriveFilteredScenarioKpis({
  assetId,
  allSpaces,
  matchingSpaces,
  values,
}: {
  assetId: string
  allSpaces: ModificationImpactSpace[]
  matchingSpaces: ModificationImpactSpace[]
  values: ModValues
}) {
  if (matchingSpaces.length === 0) {
    return {
      valueLift: null,
      valueLiftPct: null,
      noiImpact: null,
      noiImpactPct: null,
      opexImpact: null,
      opexImpactPct: null,
    }
  }

  const financials = financialMetricsForAssetId(assetId)
  const uplift = upliftFromModValues(values)
  const matchingSqft = matchingSpaces.reduce((sum, tenant) => sum + tenant.sqft, 0)
  const totalSqft = allSpaces.reduce((sum, tenant) => sum + tenant.sqft, 0)
  const sqftShare = totalSqft > 0 ? matchingSqft / totalSqft : 0
  const baseAnnualRevenue = matchingSpaces.reduce(
    (sum, tenant) => sum + tenant.sqft * tenant.baselineRentPsf,
    0
  )
  const modifiedAnnualRevenue = matchingSpaces.reduce(
    (sum, tenant) => sum + tenant.sqft * tenant.modifiedRentPsf,
    0
  )
  const baseAnnualOpex = deriveBaseAnnualOpex(assetId, baseAnnualRevenue)
  const opexImpact = uplift.annualOpexDeltaUsd * sqftShare
  const noiImpact = modifiedAnnualRevenue - baseAnnualRevenue - opexImpact
  const baseAnnualNoi = baseAnnualRevenue - baseAnnualOpex
  const capRatePct = financials?.capRatePct ?? null
  const valueLift =
    capRatePct != null && capRatePct > 0 ? noiImpact / (capRatePct / 100) : null
  const baseValue =
    capRatePct != null && capRatePct > 0 ? baseAnnualNoi / (capRatePct / 100) : null

  return {
    valueLift,
    valueLiftPct:
      valueLift == null || baseValue == null || baseValue === 0
        ? null
        : roundToTenths((valueLift / baseValue) * 100),
    noiImpact: roundToHundredths(noiImpact),
    noiImpactPct:
      baseAnnualNoi === 0 ? null : roundToTenths((noiImpact / baseAnnualNoi) * 100),
    opexImpact: roundToHundredths(opexImpact),
    opexImpactPct:
      baseAnnualOpex === 0 ? null : roundToTenths((opexImpact / baseAnnualOpex) * 100),
  }
}

function ImpactFilters({
  filters,
  floorOptions,
  hasActiveFilters,
  onChange,
}: {
  filters: ModificationImpactFilters
  floorOptions: string[]
  hasActiveFilters: boolean
  onChange: React.Dispatch<React.SetStateAction<ModificationImpactFilters>>
}) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const activeFilterBadges = React.useMemo(
    () => getActiveFilterBadges(filters),
    [filters]
  )

  return (
    <div className="rounded-xl border border-border/70 bg-muted/[0.18] p-3">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-1.5 text-foreground"
              onClick={() => setIsExpanded((current) => !current)}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronDown className="size-3.5" aria-hidden />
              ) : (
                <ChevronRight className="size-3.5" aria-hidden />
              )}
              Filters
            </Button>

            {hasActiveFilters ? (
              <span className="rounded-full border border-primary/20 bg-primary/[0.06] px-2.5 py-1 text-[11px] font-medium text-foreground">
                {activeFilterBadges.length} active
              </span>
            ) : null}
          </div>

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => onChange(createDefaultModificationImpactFilters())}
            >
              <FilterX className="size-3.5" aria-hidden />
              Clear filters
            </Button>
          ) : null}
        </div>

        {activeFilterBadges.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilterBadges.slice(0, 4).map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-border/70 bg-background/75 px-2.5 py-1 text-[11px] font-medium text-foreground"
              >
                {badge}
              </span>
            ))}
            {activeFilterBadges.length > 4 ? (
              <span className="text-[11px] text-muted-foreground">
                +{activeFilterBadges.length - 4} more
              </span>
            ) : null}
          </div>
        ) : null}

        {isExpanded ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
                Tenant or suite
              </span>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={filters.query}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      query: event.target.value,
                    }))
                  }
                  className="pl-8"
                  placeholder="Search spaces"
                />
              </div>
            </label>

            <FilterSelect
              label="Floor"
              value={filters.floor}
              onValueChange={(value) =>
                onChange((current) => ({ ...current, floor: value ?? "all" }))
              }
              options={[
                { value: "all", label: "All floors" },
                ...floorOptions.map((floor) => ({
                  value: floor,
                  label: `Floor ${floor}`,
                })),
              ]}
            />

            <FilterSelect
              label="Occupancy"
              value={filters.vacancy}
              onValueChange={(value) =>
                onChange((current) => ({
                  ...current,
                  vacancy: (value ??
                    "all") as ModificationImpactFilters["vacancy"],
                }))
              }
              options={[
                { value: "all", label: "All spaces" },
                { value: "occupied", label: "Occupied only" },
                { value: "vacant", label: "Vacant only" },
              ]}
            />

            <FilterSelect
              label="Lease timing"
              value={filters.leaseTiming}
              onValueChange={(value) =>
                onChange((current) => ({
                  ...current,
                  leaseTiming: (value ??
                    "all") as ModificationImpactFilters["leaseTiming"],
                }))
              }
              options={[
                { value: "all", label: "All timing" },
                { value: "available", label: "Available now" },
                { value: "near_term", label: "0-12 months" },
                { value: "medium_term", label: "1-3 years" },
                { value: "long_term", label: "3+ years" },
              ]}
            />

            <FilterSelect
              label="Rent impact"
              value={filters.rentGap}
              onValueChange={(value) =>
                onChange((current) => ({
                  ...current,
                  rentGap: (value ??
                    "all") as ModificationImpactFilters["rentGap"],
                }))
              }
              options={[
                { value: "all", label: "Any lift" },
                { value: "low", label: "Under $0.75 / SF" },
                { value: "medium", label: "$0.75-$1.49 / SF" },
                { value: "high", label: "$1.50+ / SF" },
              ]}
            />

            <FilterSelect
              label="Size"
              value={filters.size}
              onValueChange={(value) =>
                onChange((current) => ({
                  ...current,
                  size: (value ?? "all") as ModificationImpactFilters["size"],
                }))
              }
              options={[
                { value: "all", label: "All sizes" },
                { value: "small", label: "Up to 6K SF" },
                { value: "medium", label: "6K-12K SF" },
                { value: "large", label: "12K+ SF" },
              ]}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function getActiveFilterBadges(filters: ModificationImpactFilters) {
  const badges: string[] = []

  if (filters.query.trim() !== "") {
    badges.push(`Search: ${filters.query.trim()}`)
  }
  if (filters.floor !== "all") {
    badges.push(`Floor ${filters.floor}`)
  }
  if (filters.vacancy === "occupied") {
    badges.push("Occupied only")
  }
  if (filters.vacancy === "vacant") {
    badges.push("Vacant only")
  }
  if (filters.leaseTiming === "available") {
    badges.push("Available now")
  }
  if (filters.leaseTiming === "near_term") {
    badges.push("0-12 months")
  }
  if (filters.leaseTiming === "medium_term") {
    badges.push("1-3 years")
  }
  if (filters.leaseTiming === "long_term") {
    badges.push("3+ years")
  }
  if (filters.rentGap === "low") {
    badges.push("Under $0.75 / SF")
  }
  if (filters.rentGap === "medium") {
    badges.push("$0.75-$1.49 / SF")
  }
  if (filters.rentGap === "high") {
    badges.push("$1.50+ / SF")
  }
  if (filters.size === "small") {
    badges.push("Up to 6K SF")
  }
  if (filters.size === "medium") {
    badges.push("6K-12K SF")
  }
  if (filters.size === "large") {
    badges.push("12K+ SF")
  }

  return badges
}

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string
  value: string
  onValueChange: (value: string | null) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

function ImpactLegend({
  matchingSpaceCount,
  totalSpaceCount,
}: {
  matchingSpaceCount: number
  totalSpaceCount: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-full border border-border/60 bg-background/70 px-3 py-2 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-2">
        <Layers3 className="size-3.5" aria-hidden />
        <span className="font-medium text-foreground/85">Rent impact</span>
      </div>

      {(["low", "medium", "high"] as const).map((band) => (
        <div key={band} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full ring-1 ring-black/5"
            style={{ backgroundColor: getLegendColor(band) }}
            aria-hidden
          />
          <span>{getLegendLabel(band)}</span>
        </div>
      ))}

      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full ring-1 ring-black/5"
          style={{ backgroundColor: "rgba(100, 116, 139, 0.78)" }}
          aria-hidden
        />
        <span>Vacant or no lift</span>
      </div>

      <div className="ml-auto text-[11px] text-muted-foreground">
        {matchingSpaceCount.toLocaleString()} of{" "}
        {totalSpaceCount.toLocaleString()} spaces emphasized
      </div>
    </div>
  )
}

function getImpactColor(tenant: ModificationImpactSpace, isMatch: boolean) {
  if (tenant.isVacant || tenant.impactBand === "inactive") {
    return isMatch ? "rgba(100, 116, 139, 0.78)" : "rgba(100, 116, 139, 0.22)"
  }

  const activeColor = getLegendColor(tenant.impactBand)
  if (isMatch) {
    return activeColor
  }

  return getMutedLegendColor(tenant.impactBand)
}

function buildImpactTooltip(
  tenant: ModificationImpactSpace,
  hasActiveSelections: boolean
) {
  const header = `${tenant.name} • ${tenant.space} • Floor ${tenant.floor}`
  const occupancy = tenant.isVacant
    ? tenant.availabilityStatus
    : tenant.expiration
  const baseline = `Baseline rent: ${formatRate(tenant.baselineRentPsf)}`
  const modified = `Modified rent: ${formatRate(tenant.modifiedRentPsf)}`
  const lift = hasActiveSelections
    ? `Lift: ${formatSignedRate(tenant.deltaPsf)} (${formatSignedPercent(
        tenant.deltaPct
      )})`
    : "Lift: No active modifications selected"

  return [
    header,
    occupancy,
    `${tenant.sqft.toLocaleString()} SF`,
    baseline,
    modified,
    lift,
  ].join("\n")
}

function getLegendLabel(band: Exclude<ModificationImpactBand, "inactive">) {
  switch (band) {
    case "low":
      return "Lower lift"
    case "medium":
      return "Mid lift"
    case "high":
      return "Higher lift"
  }
}

function getLegendColor(band: Exclude<ModificationImpactBand, "inactive">) {
  switch (band) {
    case "low":
      return "rgba(249, 115, 22, 0.82)"
    case "medium":
      return "rgba(59, 130, 246, 0.82)"
    case "high":
      return "rgba(34, 197, 94, 0.82)"
  }
}

function getMutedLegendColor(
  band: Exclude<ModificationImpactBand, "inactive">
) {
  switch (band) {
    case "low":
      return "rgba(249, 115, 22, 0.22)"
    case "medium":
      return "rgba(59, 130, 246, 0.22)"
    case "high":
      return "rgba(34, 197, 94, 0.22)"
  }
}

function formatRate(value: number | null) {
  if (value == null) {
    return "N/A"
  }

  return `$${value.toFixed(2)} / SF`
}

function formatSignedRate(value: number | null) {
  if (value == null) {
    return "N/A"
  }

  const prefix = value > 0 ? "+" : ""
  return `${prefix}$${value.toFixed(2)} / SF`
}

function formatSignedPercent(value: number | null) {
  if (value == null) {
    return "N/A"
  }

  const prefix = value > 0 ? "+" : ""
  return `${prefix}${value.toFixed(1)}%`
}

function formatSignedCurrencyCompact(value: number | null) {
  if (value == null) {
    return "N/A"
  }

  const prefix = value > 0 ? "+" : value < 0 ? "-" : ""
  return `${prefix}${Math.abs(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  })}`
}

function formatSignedCurrencyAnnual(value: number | null) {
  if (value == null) {
    return "N/A"
  }

  return `${formatSignedCurrencyCompact(value)} / yr`
}

function roundToHundredths(value: number) {
  return Math.round(value * 100) / 100
}

function roundToTenths(value: number) {
  return Math.round(value * 10) / 10
}
