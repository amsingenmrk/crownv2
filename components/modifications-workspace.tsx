"use client"

import * as React from "react"
import {
  Filter,
  FilterX,
  Layers3,
  Search,
} from "lucide-react"
import { useParams, useSearchParams } from "next/navigation"

import { AssetOverviewKpiStrip } from "@/components/asset-overview-kpi-strip"
import { BuildingModificationsSidebar } from "@/components/building-modifications-sidebar"
import { INITIAL_MOD_VALUES, getModConfig, type ModValues } from "@/lib/building-modifications"
import {
  AssetStackingPlanWorkspace,
  type SimplifiedTenantVisualOverride,
} from "@/components/asset-stacking-plan-workspace"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  type ModificationImpactFilters,
  type ModificationImpactSpace,
} from "@/lib/modifications-impact"
import {
  computeRentLiftExtents,
  isRentLiftNeutralDeltaPct,
  RENT_LIFT_FILTER_EXCLUDED_SPACE_FILL,
  RENT_LIFT_NEGATIVE_LEGEND_GRADIENT,
  RENT_LIFT_NEUTRAL_PCT_EPSILON,
  RENT_LIFT_NEUTRAL_SPACE_FILL,
  RENT_LIFT_POSITIVE_LEGEND_GRADIENT,
  rentLiftSpaceBackgroundColor,
} from "@/lib/modification-impact-colors"
import {
  buildRecommendedModificationValues,
  parseRecommendedModificationSelection,
} from "@/lib/modification-recommendations"
import { getSampleStackingPlanData } from "@/lib/stacking-plan-data"

/** Dense filter row labels (below default `INPUT_LABEL_TEXT_CLASS` / `text-sm`). */
const IMPACT_FILTER_LABEL_CLASS =
  "text-[11px] font-medium leading-none text-muted-foreground"

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
  const noActiveModifications = impactDataset.activeSelections.length === 0
  const liftExtents = React.useMemo(
    () =>
      computeRentLiftExtents(
        allSpaces.map((s) => ({
          deltaPsf: s.deltaPsf,
          deltaPct: s.deltaPct,
          isVacant: s.isVacant,
        }))
      ),
    [allSpaces]
  )
  const hasActiveFilters =
    filters.floor !== "all" ||
    filters.query.trim() !== "" ||
    filters.vacancy !== "all" ||
    filters.leaseTiming !== "all" ||
    filters.rentGap !== "all" ||
    filters.size !== "all"
  const tenantVisualOverrides = React.useMemo<
    Record<string, SimplifiedTenantVisualOverride>
  >(() => {
    const overrides: Record<string, SimplifiedTenantVisualOverride> = {}

    for (const tenant of allSpaces) {
      const isMatch = matchingSpaceIds.has(tenant.id)
      const excludedByFilters = hasActiveFilters && !isMatch
      const backgroundColor = excludedByFilters
        ? RENT_LIFT_FILTER_EXCLUDED_SPACE_FILL
        : rentLiftSpaceBackgroundColor({
            deltaPsf: tenant.deltaPsf,
            deltaPct: tenant.deltaPct,
            isVacant: tenant.isVacant,
            noActiveModifications,
            extents: liftExtents,
          })
      overrides[tenant.id] = {
        backgroundColor,
        title: buildImpactTooltip(
          tenant,
          impactDataset.activeSelections.length > 0
        ),
        muted: !isMatch,
        filterDimmed: excludedByFilters,
        rentLiftSummaryLabel:
          noActiveModifications || excludedByFilters
            ? undefined
            : formatRentLiftSummaryLabel(tenant),
        rentLiftLabelTone:
          noActiveModifications || excludedByFilters
            ? undefined
            : rentLiftLabelTone(tenant),
      }
    }

    return overrides
  }, [
    allSpaces,
    hasActiveFilters,
    impactDataset.activeSelections.length,
    liftExtents,
    matchingSpaceIds,
    noActiveModifications,
  ])
  const floorOptions = React.useMemo(
    () => impactDataset.floors.map((floor) => String(floor.floor)),
    [impactDataset.floors]
  )

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
                impactDataset.activeSelections.map((selection) => {
                  const mod = getModConfig(selection.id)
                  const Icon = mod?.icon
                  return (
                    <Badge
                      key={`${selection.id}-${selection.optionValue}`}
                      variant="secondary"
                      className="max-w-[min(100%,20rem)] font-medium"
                    >
                      {Icon != null ? <Icon aria-hidden className="text-muted-foreground" /> : null}
                      <span className="truncate">{selection.optionTitle}</span>
                    </Badge>
                  )
                })
              )}
            </div>
          </section>

          <AssetOverviewKpiStrip assetId={assetId} compareModValues={values} />

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-4">
              <ImpactFilters
                metrics={metrics}
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

function ImpactFilters({
  metrics,
  filters,
  floorOptions,
  hasActiveFilters,
  onChange,
}: {
  metrics: ReturnType<typeof deriveImpactMetrics>
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <InlineLiftMetric
            label="Average rent lift"
            value={formatSignedRate(metrics.averageLiftPsf)}
            suffix={
              metrics.averageLiftPct != null
                ? `(${formatSignedPercent(metrics.averageLiftPct)})`
                : undefined
            }
          />
          <InlineLiftMetric
            label="Rent lift range"
            value={formatSignedRateRange(metrics.minLiftPsf, metrics.maxLiftPsf)}
          />
        </div>
        <div className="flex min-w-0 max-w-full flex-1 flex-wrap items-center justify-end gap-x-2 gap-y-1.5">
          {activeFilterBadges.map((badge) => (
            <Badge
              key={badge}
              variant="outline"
              className="max-w-[min(100%,14rem)] truncate rounded-full border-border/70 bg-background/75 px-2.5 py-1 text-[11px] font-medium shadow-sm"
            >
              {badge}
            </Badge>
          ))}
          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-muted-foreground"
              onClick={() => onChange(createDefaultModificationImpactFilters())}
            >
              <FilterX className="size-3.5" aria-hidden />
              Clear filters
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="relative shrink-0 aria-expanded:border-primary/40 aria-expanded:bg-primary/[0.08] aria-expanded:text-foreground aria-expanded:shadow-sm aria-expanded:ring-2 aria-expanded:ring-primary/15 dark:aria-expanded:border-primary/30 dark:aria-expanded:bg-primary/[0.14]"
            onClick={() => setIsExpanded((current) => !current)}
            aria-expanded={isExpanded}
            aria-label={
              hasActiveFilters
                ? `${isExpanded ? "Hide" : "Open"} filters, ${activeFilterBadges.length} active`
                : isExpanded
                  ? "Hide filters"
                  : "Open filters"
            }
          >
            <Filter className="size-3.5" aria-hidden />
            {activeFilterBadges.length > 0 ? (
              <span className="absolute -top-1 -right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                {activeFilterBadges.length}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <div className="rounded-xl border border-border/70 bg-muted/[0.18] p-3">
          <div className="flex flex-col gap-3">
            <span className="text-[11px] text-muted-foreground">
              Refine which spaces are emphasized in the rent impact stack.
            </span>
            <ImpactFilterFields
              filters={filters}
              floorOptions={floorOptions}
              onChange={onChange}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function InlineLiftMetric({
  label,
  value,
  suffix,
}: {
  label: string
  value: string
  suffix?: string
}) {
  return (
    <div className="flex items-baseline gap-2 rounded-lg border border-border/60 bg-background/75 px-3 py-2 shadow-sm">
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {value}
      </span>
      {suffix ? (
        <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
          {suffix}
        </span>
      ) : null}
    </div>
  )
}

function ImpactFilterFields({
  filters,
  floorOptions,
  onChange,
}: {
  filters: ModificationImpactFilters
  floorOptions: string[]
  onChange: React.Dispatch<React.SetStateAction<ModificationImpactFilters>>
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className={IMPACT_FILTER_LABEL_CLASS}>Tenant or suite</span>
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
            vacancy: (value ?? "all") as ModificationImpactFilters["vacancy"],
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
            leaseTiming: (value ?? "all") as ModificationImpactFilters["leaseTiming"],
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
            rentGap: (value ?? "all") as ModificationImpactFilters["rentGap"],
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
      <span className={IMPACT_FILTER_LABEL_CLASS}>{label}</span>
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

      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-6 rounded-full ring-1 ring-black/5"
          style={{
            background: RENT_LIFT_POSITIVE_LEGEND_GRADIENT,
          }}
          aria-hidden
        />
        <span>Positive $/SF</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-6 rounded-full ring-1 ring-black/5"
          style={{
            background: RENT_LIFT_NEGATIVE_LEGEND_GRADIENT,
          }}
          aria-hidden
        />
        <span>Negative $/SF</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-6 rounded-full ring-1 ring-black/5"
          style={{ background: RENT_LIFT_NEUTRAL_SPACE_FILL }}
          aria-hidden
        />
        <span>
          No impact (within +/- {RENT_LIFT_NEUTRAL_PCT_EPSILON}%)
        </span>
      </div>

      <div className="ml-auto text-[11px] text-muted-foreground">
        {matchingSpaceCount.toLocaleString()} of{" "}
        {totalSpaceCount.toLocaleString()} spaces emphasized
      </div>
    </div>
  )
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

function formatSignedRateAmount(value: number | null) {
  if (value == null) {
    return "N/A"
  }

  const prefix = value > 0 ? "+" : ""
  return `${prefix}$${value.toFixed(2)}`
}

function formatSignedRateRange(min: number | null, max: number | null) {
  if (min == null || max == null) {
    return "N/A"
  }

  return `${formatSignedRateAmount(min)} to ${formatSignedRateAmount(max)} / SF`
}

function formatSignedPercent(value: number | null) {
  if (value == null) {
    return "N/A"
  }

  const prefix = value > 0 ? "+" : ""
  return `${prefix}${value.toFixed(1)}%`
}

/** Signed rent lift % on each stacking segment (same as tooltip percent). */
function formatRentLiftSummaryLabel(tenant: ModificationImpactSpace) {
  return formatSignedPercent(tenant.deltaPct)
}

function rentLiftLabelTone(
  tenant: ModificationImpactSpace
): "positive" | "negative" | "neutral" {
  if (isRentLiftNeutralDeltaPct(tenant.deltaPct)) return "neutral"
  if (tenant.deltaPsf > 0) return "positive"
  if (tenant.deltaPsf < 0) return "negative"
  return "neutral"
}
