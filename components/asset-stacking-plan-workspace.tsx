"use client"

import * as React from "react"
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Download,
  Eraser,
  Upload,
} from "lucide-react"

import { AssetLeasingAssumptionsFields } from "@/components/asset-leasing-assumptions-fields"
import { useAssetLeasingAssumptions } from "@/components/asset-leasing-assumptions-provider"
import { AssetStackingPlanDrawer } from "@/components/asset-stacking-plan-drawer"
import { StackingValueDriversWaterfall } from "@/components/stacking-value-drivers-waterfall"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { INPUT_LABEL_TEXT_CLASS } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  getSampleStackingPlanData,
  STACKING_EXPIRATION_LEGEND,
  stackingPlanExpirationColor,
  type StackingPlanFloor,
  type StackingLegendItem,
  type StackingPlanTenant,
  type StackingViewMode,
} from "@/lib/stacking-plan-data"
import {
  buildStackingPlanSuiteEditorTooltipText,
  parseStackingPlanHoverCardText,
  type StackingPlanHoverCardLine,
} from "@/lib/stacking-plan-tooltip"
import {
  buildTenantForecastAssumptionOverrideFromEditor,
  resolveSpaceAssumptionsForEditor,
  spaceAssumptionUpdatesToDraft,
} from "@/lib/space-leasing-assumption-editor"
import {
  applyStackingPlanTenantForecastOverrides,
  getStackingPlanTenantForecastOverrideSnapshot,
  parseStackingPlanTenantForecastOverrideSnapshot,
  setStackingPlanTenantForecastOverride,
  subscribeStackingPlanTenantForecastOverrides,
} from "@/lib/stacking-plan-tenant-forecast-overrides"
import {
  neutralStackingSegmentTone,
  occupancyMetricTextClass,
  qualityScoreValueClass,
  stackingLegendSwatchClass,
  stackingSegmentToneFromHex,
  type StackingSegmentToneClasses,
} from "@/lib/stacking-plan-visual-tokens"
import { isMarketListingPinId } from "@/lib/market-search-demo-listings"
import { cn } from "@/lib/utils"

type AssetStackingPlanWorkspaceProps = {
  assetId: string
  lockedViewMode?: StackingWorkspaceViewMode
  showViewToggle?: boolean
  showSortControl?: boolean
  showTopToolbar?: boolean
  simplifiedTenantInteraction?: "drawer" | "none"
  simplifiedTenantVisualOverrides?: Record<
    string,
    SimplifiedTenantVisualOverride
  >
}

type StackingWorkspaceViewMode =
  | Exclude<StackingViewMode, "detailed">
  | "matrix"

export type SimplifiedTenantVisualOverride = {
  backgroundColor?: string
  title?: string
  muted?: boolean
  /** When set, segment is faded more (e.g. excluded by impact filters). */
  filterDimmed?: boolean
  /** Shown on the space bar when modification context supplies it (e.g. `+0.4%`). */
  rentLiftSummaryLabel?: string
  /** Drives label text color for contrast on tinted segment fills. */
  rentLiftLabelTone?: "positive" | "negative" | "neutral"
}

type StackSummaryMetric = {
  id: FloorMetricId
  label: string
  value: string
  valueStyle?: React.CSSProperties
  valueClassName?: string
}

type FloorMetricId = "occ" | "vac" | "pred" | "contract" | "sun" | "view"

type TenantEditorDraft = {
  name: string
  suite: string
  sqft: string
  leaseType: string
  buildout: "Shell" | "White Box" | "Fully Built-Out"
  commencement: string
  expiration: string
  contractRate: string
  availabilityStatus: string
  renewalProbabilityPct: string
  timeToLeaseMonths: string
  occupancyTargetPct: string
  assumptionLeaseType: string
  leaseTermYears: string
}

type StackingVizMode =
  | "leaseExpiration"
  | "predictedRent"
  | "contractRate"
  | "occupancy"
  | "vacancy"

const STACKING_VIZ_MODE_OPTIONS: Array<{
  value: StackingVizMode
  label: string
}> = [
  { value: "leaseExpiration", label: "Lease Expiration" },
  { value: "predictedRent", label: "Predicted Rent" },
  { value: "contractRate", label: "Contract Rate" },
]
const PREDICTED_RENT_LEGEND: readonly StackingLegendItem[] = [
  { label: "Below Avg", color: "#f97316" },
  { label: "Within +/-5%", color: "#3b82f6" },
  { label: "Above Avg", color: "#22c55e" },
] as const

const CONTRACT_RATE_LEGEND: readonly StackingLegendItem[] = [
  { label: "Below Avg", color: "#f97316" },
  { label: "Within +/-5%", color: "#3b82f6" },
  { label: "Above Avg", color: "#22c55e" },
  { label: "Available", color: "#64748b" },
] as const

const OCCUPANCY_LEGEND: readonly StackingLegendItem[] = [
  { label: "<50%", color: "#ef4444" },
  { label: "50-79%", color: "#f59e0b" },
  { label: "80%+", color: "#22c55e" },
] as const

const VACANCY_LEGEND: readonly StackingLegendItem[] = [
  { label: "<20%", color: "#22c55e" },
  { label: "20-49%", color: "#f59e0b" },
  { label: "50%+", color: "#ef4444" },
] as const

const STACKING_DETAILED_VIEW_LABEL = "Detailed"
const MATRIX_SURFACE_BAND_CLASS = "border-border bg-muted/25"
const MATRIX_ROW_GRID_CLASS =
  "grid grid-cols-[96px_minmax(0,1fr)] items-stretch"
const MATRIX_ROW_CONTENT_CLASS = "min-w-0 py-2 pr-2"
const EDITOR_SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
})

function formatCurrencyPerSfValue(value: number) {
  return `$${value.toFixed(2)} / SF`
}

function formatCurrencyRounded(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

function formatExpirationForDate(expiration?: string, isVacant?: boolean) {
  if (isVacant) return "Available"
  if (expiration == null || expiration === "") return "N/A"
  const date = new Date(expiration)
  if (Number.isNaN(date.getTime())) return "N/A"
  return EDITOR_SHORT_DATE_FORMATTER.format(date)
}

function parseNumericInput(value: string) {
  const normalized = value.replace(/[^0-9.-]/g, "")
  if (normalized === "") return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseOptionalIntegerInput(value: string, min: number, max: number) {
  if (value.trim() === "") return undefined
  const parsed = parseNumericInput(value)
  if (parsed == null) return undefined
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

function stripSuitePrefix(space: string) {
  return space.replace(/^ste\s+/i, "")
}

function normalizeSuiteValue(value: string) {
  const trimmed = value.trim()
  if (trimmed === "") return ""
  return /^ste\s+/i.test(trimmed) ? trimmed : `Ste ${trimmed}`
}

function buildTenantEditorDraft(tenant: StackingPlanTenant): TenantEditorDraft {
  return {
    name: tenant.isVacant ? "" : tenant.name,
    suite: stripSuitePrefix(tenant.space),
    sqft: String(tenant.sqft),
    leaseType: tenant.leaseType ?? "",
    buildout: tenant.buildout,
    commencement: tenant.leaseCommencementDate ?? "",
    expiration: tenant.leaseExpirationDate ?? "",
    contractRate:
      tenant.contractRatePsfValue != null
        ? tenant.contractRatePsfValue.toFixed(2)
        : "",
    availabilityStatus: tenant.availabilityStatus,
    renewalProbabilityPct:
      tenant.renewalProbabilityPct != null
        ? String(tenant.renewalProbabilityPct)
        : "",
    timeToLeaseMonths:
      tenant.timeToLeaseMonths != null ? String(tenant.timeToLeaseMonths) : "",
    occupancyTargetPct:
      tenant.occupancyTargetPct != null
        ? String(tenant.occupancyTargetPct)
        : "",
    assumptionLeaseType: tenant.assumptionLeaseType ?? "",
    leaseTermYears:
      tenant.leaseTermYears != null ? String(tenant.leaseTermYears) : "",
  }
}

function areTenantEditorDraftsEqual(
  left: TenantEditorDraft | null,
  right: TenantEditorDraft | null
) {
  if (left == null || right == null) {
    return left === right
  }

  return (
    left.name === right.name &&
    left.suite === right.suite &&
    left.sqft === right.sqft &&
    left.leaseType === right.leaseType &&
    left.buildout === right.buildout &&
    left.commencement === right.commencement &&
    left.expiration === right.expiration &&
    left.contractRate === right.contractRate &&
    left.availabilityStatus === right.availabilityStatus &&
    left.renewalProbabilityPct === right.renewalProbabilityPct &&
    left.timeToLeaseMonths === right.timeToLeaseMonths &&
    left.occupancyTargetPct === right.occupancyTargetPct &&
    left.assumptionLeaseType === right.assumptionLeaseType &&
    left.leaseTermYears === right.leaseTermYears
  )
}

function recalculateFloor(floor: StackingPlanFloor): StackingPlanFloor {
  const totalSqft = floor.tenants.reduce((sum, tenant) => sum + tenant.sqft, 0)
  const occupiedSqft = floor.tenants.reduce(
    (sum, tenant) => sum + (tenant.isVacant ? 0 : tenant.sqft),
    0
  )
  const occupancyPercent =
    totalSqft === 0 ? 0 : Math.round((occupiedSqft / totalSqft) * 100)
  const vacancyPercent = Math.max(0, 100 - occupancyPercent)

  return {
    ...floor,
    sqft: formatSqftValue(totalSqft),
    occupancy: `${occupancyPercent}%`,
    occupancyPercent,
    vacancyPercent,
    tenants: floor.tenants.map((tenant) => ({
      ...tenant,
      sqftLabel: formatSqftValue(tenant.sqft),
      widthPercent:
        totalSqft === 0
          ? 0
          : Number(((tenant.sqft / totalSqft) * 100).toFixed(2)),
    })),
  }
}

/** Plate SF from tenants when present; otherwise parse {@link StackingPlanFloor.sqft} label (e.g. empty rent-roll rows). */
function plateSqftFromFloorRow(floor: StackingPlanFloor): number {
  const tenantTotal = floor.tenants.reduce((sum, tenant) => sum + tenant.sqft, 0)
  if (tenantTotal > 0) return tenantTotal
  const digitsOnly = floor.sqft.replace(/\D/g, "")
  if (digitsOnly === "") return 0
  const parsed = Number.parseInt(digitsOnly, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function summarizeFloors(floors: readonly StackingPlanFloor[]) {
  const totalSqft = floors.reduce((sum, floor) => sum + plateSqftFromFloorRow(floor), 0)
  const occupiedSqft = floors.reduce(
    (sum, floor) =>
      sum +
      floor.tenants.reduce(
        (floorSum, tenant) => floorSum + (tenant.isVacant ? 0 : tenant.sqft),
        0
      ),
    0
  )
  const uniqueTenants = new Set(
    floors
      .flatMap((floor) => floor.tenants)
      .filter((tenant) => !tenant.isVacant)
      .map((tenant) => tenant.name.toLowerCase())
  )

  return {
    totalSqft,
    totalTenants: uniqueTenants.size,
    overallOccupancyPercent:
      totalSqft === 0
        ? 0
        : Number(((occupiedSqft / totalSqft) * 100).toFixed(2)),
  }
}

function rentRollImportedStorageKey(assetId: string) {
  return `glassbox:market-rent-roll-imported:${assetId}`
}

/** Same floors / plate sizes as full demo data, but no suites or tenants (rent roll not imported). */
function buildEmptyMarketFloors(
  floors: readonly StackingPlanFloor[]
): StackingPlanFloor[] {
  return floors.map((floor) => ({
    ...floor,
    tenants: [],
    occupancyPercent: 0,
    vacancyPercent: 100,
    occupancy: "—",
  }))
}

function readRentRollImportedFlag(assetId: string): boolean {
  return true
}

function getOccupancyBandData(occupancyPercent: number) {
  if (occupancyPercent >= 80) {
    return { label: "80%+", color: "#22c55e" }
  }
  if (occupancyPercent >= 50) {
    return { label: "50-79%", color: "#f59e0b" }
  }
  return { label: "<50%", color: "#ef4444" }
}

function getVacancyBandData(vacancyPercent: number) {
  if (vacancyPercent < 20) {
    return { label: "<20%", color: "#22c55e" }
  }
  if (vacancyPercent < 50) {
    return { label: "20-49%", color: "#f59e0b" }
  }
  return { label: "50%+", color: "#ef4444" }
}

function getPredictedRentBandData(
  tenant: StackingPlanTenant,
  averagePredictedRentPsf: number | null
) {
  if (
    tenant.predictedRentPsfValue == null ||
    averagePredictedRentPsf == null ||
    averagePredictedRentPsf <= 0
  ) {
    return { label: "Within +/-5%", color: "#3b82f6" }
  }

  const deltaPct =
    ((tenant.predictedRentPsfValue - averagePredictedRentPsf) /
      averagePredictedRentPsf) *
    100

  if (deltaPct >= 5) {
    return { label: "Above Avg", color: "#22c55e" }
  }
  if (deltaPct <= -5) {
    return { label: "Below Avg", color: "#f97316" }
  }
  return { label: "Within +/-5%", color: "#3b82f6" }
}

function getContractRateBandData(
  tenant: StackingPlanTenant,
  averageContractRatePsf: number | null
) {
  if (
    tenant.isVacant ||
    tenant.contractRatePsfValue == null ||
    averageContractRatePsf == null ||
    averageContractRatePsf <= 0
  ) {
    return { label: "Available", color: "#64748b" }
  }

  const deltaPct =
    ((tenant.contractRatePsfValue - averageContractRatePsf) /
      averageContractRatePsf) *
    100

  if (deltaPct >= 5) {
    return { label: "Above Avg", color: "#22c55e" }
  }
  if (deltaPct <= -5) {
    return { label: "Below Avg", color: "#f97316" }
  }
  return { label: "Within +/-5%", color: "#3b82f6" }
}

function getLegendItemsForMode(
  mode: StackingVizMode
): readonly StackingLegendItem[] {
  if (mode === "predictedRent") return PREDICTED_RENT_LEGEND
  if (mode === "contractRate") return CONTRACT_RATE_LEGEND
  if (mode === "occupancy") return OCCUPANCY_LEGEND
  if (mode === "vacancy") return VACANCY_LEGEND
  return STACKING_EXPIRATION_LEGEND
}

function getLegendLabelForMode(mode: StackingVizMode) {
  return (
    STACKING_VIZ_MODE_OPTIONS.find((option) => option.value === mode)?.label ??
    "Legend"
  )
}

function formatPercentValue(value: number) {
  return `${value.toFixed(1)}%`
}

function formatSignedPercentDelta(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : ""
  return `${sign}${Math.abs(value).toFixed(1)}%`
}

function formatSqftValue(value: number) {
  return `${value.toLocaleString()} SF`
}

function getTenantAbbreviation(name: string) {
  const parts = name.split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
  }

  return name.slice(0, 3).toUpperCase()
}

function getMatrixSegmentTone({
  tenant,
  floor,
  mode,
  averagePredictedRentPsf,
}: {
  tenant: StackingPlanTenant
  floor: StackingPlanFloor
  mode: StackingVizMode
  averagePredictedRentPsf: number | null
}): StackingSegmentToneClasses {
  if (mode === "leaseExpiration") {
    return stackingSegmentToneFromHex(tenant.color)
  }

  if (mode === "predictedRent") {
    return stackingSegmentToneFromHex(
      getPredictedRentBandData(tenant, averagePredictedRentPsf).color
    )
  }

  if (mode === "contractRate") {
    return stackingSegmentToneFromHex(
      getContractRateBandData(
        tenant,
        getWeightedFloorAverageRate(floor, "contractRatePsfValue")
      ).color
    )
  }

  if (mode === "occupancy") {
    return stackingSegmentToneFromHex(
      getOccupancyBandData(floor.occupancyPercent).color
    )
  }

  if (mode === "vacancy") {
    return stackingSegmentToneFromHex(
      getVacancyBandData(floor.vacancyPercent).color
    )
  }

  return neutralStackingSegmentTone(tenant.isVacant)
}

function getFocusedMetricId(vizMode: StackingVizMode): FloorMetricId | null {
  if (vizMode === "predictedRent") return "pred"
  if (vizMode === "contractRate") return "contract"
  if (vizMode === "occupancy") return "occ"
  if (vizMode === "vacancy") return "vac"
  return null
}

function getFloorMetricLongLabel(metricId: FloorMetricId) {
  if (metricId === "occ") return "Occupancy"
  if (metricId === "vac") return "Vacancy"
  if (metricId === "pred") return "Predicted rent"
  if (metricId === "contract") return "Contract rent"
  if (metricId === "sun") return "Sun score"
  return "View score"
}

function getFloorMetricPairTone(
  metricId: FloorMetricId,
  floor: StackingPlanFloor,
  vizMode: StackingVizMode
) {
  if (metricId === "occ" && vizMode === "occupancy") {
    const p = floor.occupancyPercent
    if (p >= 80) {
      return {
        containerClassName: "bg-chart-2/12 ring-1 ring-chart-2/25",
        labelClassName: "text-muted-foreground",
        valueClassName: "text-foreground",
      }
    }
    if (p >= 50) {
      return {
        containerClassName: "bg-chart-4/12 ring-1 ring-chart-4/25",
        labelClassName: "text-muted-foreground",
        valueClassName: "text-foreground",
      }
    }
    return {
      containerClassName: "bg-destructive/10 ring-1 ring-destructive/25",
      labelClassName: "text-muted-foreground",
      valueClassName: "text-foreground",
    }
  }

  if (metricId === "vac" && vizMode === "vacancy") {
    const v = floor.vacancyPercent
    if (v < 20) {
      return {
        containerClassName: "bg-chart-2/12 ring-1 ring-chart-2/25",
        labelClassName: "text-muted-foreground",
        valueClassName: "text-foreground",
      }
    }
    if (v < 50) {
      return {
        containerClassName: "bg-chart-4/12 ring-1 ring-chart-4/25",
        labelClassName: "text-muted-foreground",
        valueClassName: "text-foreground",
      }
    }
    return {
      containerClassName: "bg-destructive/10 ring-1 ring-destructive/25",
      labelClassName: "text-muted-foreground",
      valueClassName: "text-foreground",
    }
  }

  if (metricId === "pred" && vizMode === "predictedRent") {
    return {
      containerClassName: "bg-primary/10 ring-1 ring-primary/25",
      labelClassName: "text-muted-foreground",
      valueClassName: "text-foreground",
    }
  }

  if (metricId === "contract" && vizMode === "contractRate") {
    return {
      containerClassName: "bg-primary/10 ring-1 ring-primary/25",
      labelClassName: "text-muted-foreground",
      valueClassName: "text-foreground",
    }
  }

  return {
    containerClassName: "",
    labelClassName: "text-muted-foreground/80",
    valueClassName: "text-foreground/90",
  }
}

function getTenantVisualColor({
  tenant,
  floor,
  mode,
  averagePredictedRentPsf,
}: {
  tenant: StackingPlanTenant
  floor: StackingPlanFloor
  mode: StackingVizMode
  averagePredictedRentPsf: number | null
}) {
  if (mode === "predictedRent") {
    return getPredictedRentBandData(tenant, averagePredictedRentPsf).color
  }
  if (mode === "contractRate") {
    return getContractRateBandData(
      tenant,
      getWeightedFloorAverageRate(floor, "contractRatePsfValue")
    ).color
  }
  if (mode === "occupancy") {
    return getOccupancyBandData(floor.occupancyPercent).color
  }
  if (mode === "vacancy") {
    return getVacancyBandData(floor.vacancyPercent).color
  }
  return tenant.color
}

function getTenantVisualizationTitle({
  tenant,
  buildingLeasingAssumptions,
}: Parameters<typeof buildStackingPlanSuiteEditorTooltipText>[0]) {
  return buildStackingPlanSuiteEditorTooltipText({
    tenant,
    buildingLeasingAssumptions,
  })
}

function formatCompactRate(value: number | null) {
  if (value == null) {
    return "N/A"
  }

  return `$${value.toFixed(2)}`
}

function formatCompactRatePerSf(value: number | null) {
  if (value == null) {
    return "N/A"
  }

  return `${formatCompactRate(value)} / SF`
}

function formatCompactScore(value: number | null) {
  if (value == null) {
    return "N/A"
  }

  return `${Math.round(value)}`
}

function InlineMetricItem({
  label,
  value,
  labelClassName,
  valueClassName,
  valueStyle,
  className,
  emphasis = "default",
}: {
  label: string
  value: string
  labelClassName?: string
  valueClassName?: string
  valueStyle?: React.CSSProperties
  className?: string
  emphasis?: "default" | "subtle" | "active"
}) {
  const containerClassName =
    emphasis === "subtle"
      ? "rounded-none bg-transparent px-0 py-0 ring-0 shadow-none"
      : emphasis === "active"
        ? "rounded-md bg-background/85 px-2.5 py-1.5 ring-1 ring-border/55 shadow-sm"
        : "rounded-sm bg-background/55 px-2 py-1 ring-1 ring-border/35"
  const baseLabelClassName =
    emphasis === "subtle"
      ? "text-[10px] font-medium tracking-normal text-muted-foreground/65"
      : emphasis === "active"
        ? "text-[10px] font-medium tracking-normal text-muted-foreground/75"
        : "text-[10px] font-medium tracking-normal text-muted-foreground/85"
  const baseValueClassName =
    emphasis === "subtle"
      ? "text-[12px] font-medium tabular-nums text-foreground/85"
      : emphasis === "active"
        ? "text-[12px] font-semibold tabular-nums text-foreground"
        : "text-[11px] font-semibold tabular-nums text-foreground/90"

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap",
        containerClassName,
        className
      )}
    >
      <span className={cn(baseLabelClassName, labelClassName)}>{label}</span>
      <span
        className={cn(baseValueClassName, valueClassName)}
        style={valueStyle}
      >
        {value}
      </span>
    </div>
  )
}

function getWeightedFloorAverageRate(
  floor: StackingPlanFloor,
  metric: "predictedRentPsfValue" | "contractRatePsfValue",
  options?: {
    includeVacant?: boolean
  }
) {
  const relevantTenants = floor.tenants.filter(
    (tenant) =>
      (options?.includeVacant === true || !tenant.isVacant) &&
      tenant[metric] != null
  )

  if (relevantTenants.length === 0) {
    return null
  }

  const weightedTotal = relevantTenants.reduce(
    (sum, tenant) => sum + tenant.sqft * (tenant[metric] ?? 0),
    0
  )
  const totalSqft = relevantTenants.reduce(
    (sum, tenant) => sum + tenant.sqft,
    0
  )

  if (totalSqft === 0) {
    return null
  }

  return weightedTotal / totalSqft
}

function getWeightedFloorAverageScore(
  floor: StackingPlanFloor,
  metric: "sunScore" | "viewScore"
) {
  const scoredTenants = floor.tenants.filter((tenant) => tenant[metric] != null)

  if (scoredTenants.length === 0) {
    return null
  }

  const weightedTotal = scoredTenants.reduce(
    (sum, tenant) => sum + tenant.sqft * (tenant[metric] ?? 0),
    0
  )
  const totalSqft = scoredTenants.reduce((sum, tenant) => sum + tenant.sqft, 0)

  if (totalSqft === 0) {
    return null
  }

  return weightedTotal / totalSqft
}

function downloadCsv(assetId: string, floors: readonly StackingPlanFloor[]) {
  const header = [
    "Floor",
    "Suite",
    "Tenant",
    "Size SF",
    "Occupancy",
    "Lease Expiration",
    "Color",
    "Note",
  ]

  const rows = floors.flatMap((floor) =>
    floor.tenants.map((tenant) => [
      String(floor.floor),
      tenant.space,
      tenant.name,
      String(tenant.sqft),
      tenant.isVacant ? "Vacant" : "Occupied",
      tenant.expiration,
      tenant.color,
      tenant.note ?? "",
    ])
  )

  const toCell = (value: string) => `"${value.replace(/"/g, '""')}"`
  const csv = [header, ...rows]
    .map((row) => row.map(toCell).join(","))
    .join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${assetId}-stacking-plan.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function AssetStackingPlanWorkspace({
  assetId,
  lockedViewMode,
  showViewToggle = true,
  showSortControl = true,
  showTopToolbar = true,
  simplifiedTenantInteraction = "drawer",
  simplifiedTenantVisualOverrides,
}: AssetStackingPlanWorkspaceProps) {
  const { assumptions: buildingLeasingAssumptions } = useAssetLeasingAssumptions()
  const tenantForecastOverrideSnapshot = React.useSyncExternalStore(
    React.useCallback(
      (onStoreChange) =>
        subscribeStackingPlanTenantForecastOverrides(assetId, onStoreChange),
      [assetId]
    ),
    React.useCallback(
      () => getStackingPlanTenantForecastOverrideSnapshot(assetId),
      [assetId]
    ),
    () => ""
  )
  const tenantForecastOverrides = React.useMemo(
    () =>
      parseStackingPlanTenantForecastOverrideSnapshot(
        tenantForecastOverrideSnapshot
      ),
    [tenantForecastOverrideSnapshot]
  )
  const baseDataset = React.useMemo(
    () =>
      applyStackingPlanTenantForecastOverrides(
        getSampleStackingPlanData(assetId),
        tenantForecastOverrides
      ),
    [assetId, tenantForecastOverrides]
  )
  const [rentRollImported, setRentRollImported] = React.useState(() =>
    readRentRollImportedFlag(assetId)
  )
  React.useEffect(() => {
    setRentRollImported(readRentRollImportedFlag(assetId))
  }, [assetId])
  const stackingPlaceholderActive = false
  const showRentRollActions = false
  const derivedFloorsFromDataset = React.useMemo(() => {
    if (!stackingPlaceholderActive) return baseDataset.floors
    return buildEmptyMarketFloors(baseDataset.floors)
  }, [baseDataset.floors, stackingPlaceholderActive])
  const [viewMode, setViewMode] =
    React.useState<StackingWorkspaceViewMode>("matrix")
  const [vizMode, setVizMode] =
    React.useState<StackingVizMode>("leaseExpiration")
  const [isDesc, setIsDesc] = React.useState(true)
  const [floors, setFloors] = React.useState<StackingPlanFloor[]>(
    derivedFloorsFromDataset
  )

  const handleImportRentRoll = React.useCallback(() => {
    setRentRollImported(true)
    try {
      localStorage.setItem(rentRollImportedStorageKey(assetId), "1")
    } catch {
      // ignore quota / private mode
    }
  }, [assetId])

  const handleClearRentRoll = React.useCallback(() => {
    setRentRollImported(false)
    try {
      localStorage.setItem(rentRollImportedStorageKey(assetId), "0")
    } catch {
      // ignore
    }
  }, [assetId])
  const [selectedTenantId, setSelectedTenantId] = React.useState<string | null>(
    null
  )
  const [tenantEditorDraft, setTenantEditorDraft] =
    React.useState<TenantEditorDraft | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)
  const [expandedFloor, setExpandedFloor] = React.useState<number | null>(null)
  const [clearRentRollConfirmOpen, setClearRentRollConfirmOpen] =
    React.useState(false)
  const effectiveViewMode = lockedViewMode ?? viewMode
  const summary = React.useMemo(() => summarizeFloors(floors), [floors])
  const selectedTenant = React.useMemo(
    () =>
      floors
        .flatMap((floor) => floor.tenants)
        .find((tenant) => tenant.id === selectedTenantId) ?? null,
    [floors, selectedTenantId]
  )
  const selectedTenantFloor = React.useMemo(
    () =>
      selectedTenantId == null
        ? null
        : (floors.find((floor) =>
            floor.tenants.some((tenant) => tenant.id === selectedTenantId)
          ) ?? null),
    [floors, selectedTenantId]
  )
  const selectedTenantDraft = React.useMemo(
    () =>
      selectedTenant == null ? null : buildTenantEditorDraft(selectedTenant),
    [selectedTenant]
  )
  const isTenantEditorDirty = React.useMemo(
    () => !areTenantEditorDraftsEqual(tenantEditorDraft, selectedTenantDraft),
    [selectedTenantDraft, tenantEditorDraft]
  )
  const averagePredictedRentPsf = React.useMemo(() => {
    const predictedTenants = floors
      .flatMap((floor) => floor.tenants)
      .filter((tenant) => tenant.predictedRentPsfValue != null)

    if (predictedTenants.length === 0) {
      return null
    }

    const weightedTotal = predictedTenants.reduce(
      (sum, tenant) => sum + tenant.sqft * (tenant.predictedRentPsfValue ?? 0),
      0
    )
    const totalSqft = predictedTenants.reduce(
      (sum, tenant) => sum + tenant.sqft,
      0
    )

    if (totalSqft === 0) {
      return null
    }

    return weightedTotal / totalSqft
  }, [floors])
  const averageContractRatePsf = React.useMemo(() => {
    const occupiedTenants = floors
      .flatMap((floor) => floor.tenants)
      .filter(
        (tenant) => !tenant.isVacant && tenant.contractRatePsfValue != null
      )

    if (occupiedTenants.length === 0) {
      return null
    }

    const weightedTotal = occupiedTenants.reduce(
      (sum, tenant) => sum + tenant.sqft * (tenant.contractRatePsfValue ?? 0),
      0
    )
    const totalSqft = occupiedTenants.reduce(
      (sum, tenant) => sum + tenant.sqft,
      0
    )

    if (totalSqft === 0) {
      return null
    }

    return weightedTotal / totalSqft
  }, [floors])
  const predictedRentLiftPct = React.useMemo(() => {
    if (
      averagePredictedRentPsf == null ||
      averageContractRatePsf == null ||
      averageContractRatePsf <= 0
    ) {
      return null
    }

    return (
      ((averagePredictedRentPsf - averageContractRatePsf) / averageContractRatePsf) *
      100
    )
  }, [averageContractRatePsf, averagePredictedRentPsf])
  const averageSunScore = React.useMemo(() => {
    const scoredTenants = floors
      .flatMap((floor) => floor.tenants)
      .filter((tenant) => tenant.sunScore != null)

    if (scoredTenants.length === 0) {
      return null
    }

    const weightedTotal = scoredTenants.reduce(
      (sum, tenant) => sum + tenant.sqft * (tenant.sunScore ?? 0),
      0
    )
    const totalSqft = scoredTenants.reduce(
      (sum, tenant) => sum + tenant.sqft,
      0
    )

    if (totalSqft === 0) {
      return null
    }

    return weightedTotal / totalSqft
  }, [floors])
  const averageViewScore = React.useMemo(() => {
    const scoredTenants = floors
      .flatMap((floor) => floor.tenants)
      .filter((tenant) => tenant.viewScore != null)

    if (scoredTenants.length === 0) {
      return null
    }

    const weightedTotal = scoredTenants.reduce(
      (sum, tenant) => sum + tenant.sqft * (tenant.viewScore ?? 0),
      0
    )
    const totalSqft = scoredTenants.reduce(
      (sum, tenant) => sum + tenant.sqft,
      0
    )

    if (totalSqft === 0) {
      return null
    }

    return weightedTotal / totalSqft
  }, [floors])

  const displayedFloors = React.useMemo(
    () => (isDesc ? floors : [...floors].reverse()),
    [floors, isDesc]
  )
  const matrixSummaryMetrics = React.useMemo<StackSummaryMetric[]>(() => {
    if (stackingPlaceholderActive) {
      return [
        {
          id: "occ",
          label: getFloorMetricLongLabel("occ"),
          value: "—",
        },
        {
          id: "vac",
          label: getFloorMetricLongLabel("vac"),
          value: "—",
        },
        {
          id: "pred",
          label: getFloorMetricLongLabel("pred"),
          value: formatCompactRate(averagePredictedRentPsf),
        },
        {
          id: "contract",
          label: getFloorMetricLongLabel("contract"),
          value: "—",
        },
        {
          id: "sun",
          label: getFloorMetricLongLabel("sun"),
          value: formatCompactScore(averageSunScore),
          valueClassName: qualityScoreValueClass(averageSunScore),
        },
        {
          id: "view",
          label: getFloorMetricLongLabel("view"),
          value: formatCompactScore(averageViewScore),
          valueClassName: qualityScoreValueClass(averageViewScore),
        },
      ]
    }
    const vacancyPercent = Math.max(0, 100 - summary.overallOccupancyPercent)
    return [
      {
        id: "occ",
        label: getFloorMetricLongLabel("occ"),
        value: formatPercentValue(summary.overallOccupancyPercent),
      },
      {
        id: "vac",
        label: getFloorMetricLongLabel("vac"),
        value: formatPercentValue(vacancyPercent),
      },
      {
        id: "pred",
        label: getFloorMetricLongLabel("pred"),
        value: formatCompactRate(averagePredictedRentPsf),
      },
      {
        id: "contract",
        label: getFloorMetricLongLabel("contract"),
        value: formatCompactRate(averageContractRatePsf),
      },
      {
        id: "sun",
        label: getFloorMetricLongLabel("sun"),
        value: formatCompactScore(averageSunScore),
        valueClassName: qualityScoreValueClass(averageSunScore),
      },
      {
        id: "view",
        label: getFloorMetricLongLabel("view"),
        value: formatCompactScore(averageViewScore),
        valueClassName: qualityScoreValueClass(averageViewScore),
      },
    ]
  }, [
    averageContractRatePsf,
    averagePredictedRentPsf,
    averageSunScore,
    averageViewScore,
    stackingPlaceholderActive,
    summary.overallOccupancyPercent,
  ])
  const shouldShowViewToggle = lockedViewMode == null && showViewToggle
  const shouldShowSortControl =
    showSortControl && effectiveViewMode === "simplified"
  const shouldShowTopToolbar = showTopToolbar && effectiveViewMode !== "matrix"

  const closeTenantEditor = React.useCallback(() => {
    setSelectedTenantId(null)
    setTenantEditorDraft(null)
    setIsDrawerOpen(false)
  }, [])

  const requestTenantEditorClose = React.useCallback(() => {
    if (selectedTenantId == null) {
      return true
    }

    if (!isTenantEditorDirty) {
      closeTenantEditor()
      return true
    }

    if (
      typeof window !== "undefined" &&
      window.confirm("Discard unsaved suite editor changes?")
    ) {
      closeTenantEditor()
      return true
    }

    return false
  }, [closeTenantEditor, isTenantEditorDirty, selectedTenantId])

  const handleTenantSelect = React.useCallback(
    (tenant: StackingPlanTenant) => {
      if (selectedTenantId != null && selectedTenantId !== tenant.id) {
        const closed = requestTenantEditorClose()
        if (!closed) {
          return
        }
      }

      if (effectiveViewMode === "matrix") {
        if (selectedTenantId === tenant.id) {
          requestTenantEditorClose()
          return
        }

        setExpandedFloor(null)
        setSelectedTenantId(tenant.id)
        setTenantEditorDraft(buildTenantEditorDraft(tenant))
        setIsDrawerOpen(true)
        return
      }

      setSelectedTenantId(tenant.id)
      setTenantEditorDraft(buildTenantEditorDraft(tenant))
      setIsDrawerOpen(true)
    },
    [effectiveViewMode, requestTenantEditorClose, selectedTenantId]
  )

  const handleDrawerOpenChange = React.useCallback(
    (open: boolean) => {
      if (open) {
        setIsDrawerOpen(true)
        return
      }

      if (selectedTenantId != null && !requestTenantEditorClose()) {
        setIsDrawerOpen(true)
        return
      }

      setIsDrawerOpen(false)
    },
    [requestTenantEditorClose, selectedTenantId]
  )

  const handleTenantDraftChange = React.useCallback(
    (field: keyof TenantEditorDraft, value: string) => {
      setTenantEditorDraft((current) =>
        current == null ? current : { ...current, [field]: value }
      )
    },
    []
  )

  const handleTenantEditCancel = React.useCallback(() => {
    if (selectedTenant == null) return
    setTenantEditorDraft(buildTenantEditorDraft(selectedTenant))
  }, [selectedTenant])

  const handleTenantEditClose = React.useCallback(() => {
    requestTenantEditorClose()
  }, [requestTenantEditorClose])

  const handleToggleExpandedFloor = React.useCallback(
    (floorNumber: number) => {
      if (expandedFloor === floorNumber) {
        setExpandedFloor(null)
        return
      }

      if (selectedTenantId != null && !requestTenantEditorClose()) {
        return
      }

      setExpandedFloor(floorNumber)
    },
    [expandedFloor, requestTenantEditorClose, selectedTenantId]
  )

  const handleTenantEditSave = React.useCallback(() => {
    if (selectedTenant == null || tenantEditorDraft == null) return

    const spaceAssumptionOverride = buildTenantForecastAssumptionOverrideFromEditor(
      tenantEditorDraft,
      buildingLeasingAssumptions,
      { isVacant: selectedTenant.isVacant }
    )
    const timeToLeaseMonths = spaceAssumptionOverride.timeToLeaseMonths
    const renewalProbabilityPct = selectedTenant.isVacant
      ? undefined
      : spaceAssumptionOverride.renewalProbabilityPct
    const occupancyTargetPct = spaceAssumptionOverride.occupancyTargetPct
    const assumptionLeaseType = spaceAssumptionOverride.leaseType
    const leaseTermYears = spaceAssumptionOverride.leaseTermYears

    let updatedTenant: StackingPlanTenant | null = null

    setFloors((currentFloors) =>
      currentFloors.map((floor) => {
        if (!floor.tenants.some((tenant) => tenant.id === selectedTenant.id)) {
          return floor
        }

        const nextTenants = floor.tenants.map((tenant) => {
          if (tenant.id !== selectedTenant.id) return tenant

          const nextSqft = parseNumericInput(tenantEditorDraft.sqft)
          const sqft =
            nextSqft != null && nextSqft > 0
              ? Math.round(nextSqft)
              : tenant.sqft
          const suite =
            normalizeSuiteValue(tenantEditorDraft.suite) || tenant.space
          const buildout = tenantEditorDraft.buildout

          if (tenant.isVacant) {
            updatedTenant = {
              ...tenant,
              space: suite,
              sqft,
              buildout,
              availabilityStatus:
                tenantEditorDraft.availabilityStatus.trim() ||
                tenant.availabilityStatus,
              leaseCommencementDate: undefined,
              leaseExpirationDate: undefined,
              expiration: formatExpirationForDate(undefined, true),
              color: stackingPlanExpirationColor(undefined, true),
              timeToLeaseMonths,
              renewalProbabilityPct: undefined,
              occupancyTargetPct,
              assumptionLeaseType,
              leaseTermYears,
            }
            return updatedTenant
          }

          const nextContractRate = parseNumericInput(
            tenantEditorDraft.contractRate
          )
          const contractRatePsfValue =
            nextContractRate != null && nextContractRate > 0
              ? Number(nextContractRate.toFixed(2))
              : tenant.contractRatePsfValue
          const marketRentPsfValue = tenant.marketRentPsfValue
          const predictedRentPsfValue = tenant.predictedRentPsfValue
          const rentPremiumPctValue =
            marketRentPsfValue != null &&
            predictedRentPsfValue != null &&
            marketRentPsfValue > 0
              ? Number(
                  (
                    ((predictedRentPsfValue - marketRentPsfValue) /
                      marketRentPsfValue) *
                    100
                  ).toFixed(1)
                )
              : tenant.rentPremiumPctValue
          const leaseExpirationDate = tenantEditorDraft.expiration || undefined

          updatedTenant = {
            ...tenant,
            name: tenantEditorDraft.name.trim() || tenant.name,
            space: suite,
            sqft,
            buildout,
            leaseType: tenantEditorDraft.leaseType.trim() || tenant.leaseType,
            leaseCommencementDate: tenantEditorDraft.commencement || undefined,
            leaseExpirationDate,
            expiration: formatExpirationForDate(leaseExpirationDate, false),
            color: stackingPlanExpirationColor(leaseExpirationDate, false),
            contractRatePsfValue,
            contractRate:
              contractRatePsfValue != null
                ? formatCurrencyPerSfValue(contractRatePsfValue)
                : tenant.contractRate,
            rentPerSf:
              contractRatePsfValue != null
                ? formatCurrencyPerSfValue(contractRatePsfValue)
                : tenant.rentPerSf,
            annualRent:
              contractRatePsfValue != null
                ? formatCurrencyRounded(sqft * contractRatePsfValue)
                : tenant.annualRent,
            predictedRentPsfValue,
            predictedRent:
              predictedRentPsfValue != null
                ? formatCurrencyPerSfValue(predictedRentPsfValue)
                : tenant.predictedRent,
            rentPremiumPctValue,
            rentPremium:
              marketRentPsfValue != null &&
              predictedRentPsfValue != null &&
              rentPremiumPctValue != null
                ? `${predictedRentPsfValue - marketRentPsfValue >= 0 ? "+" : "−"}$${Math.abs(
                    predictedRentPsfValue - marketRentPsfValue
                  ).toFixed(2)} / SF (${rentPremiumPctValue >= 0 ? "+" : "−"}${Math.abs(
                    rentPremiumPctValue
                  ).toFixed(1)}% vs market rent)`
                : tenant.rentPremium,
            renewalProbabilityPct,
            timeToLeaseMonths,
            occupancyTargetPct,
            assumptionLeaseType,
            leaseTermYears,
          }
          return updatedTenant
        })

        return recalculateFloor({ ...floor, tenants: nextTenants })
      })
    )

    setStackingPlanTenantForecastOverride(
      assetId,
      selectedTenant.id,
      spaceAssumptionOverride
    )

    if (updatedTenant != null) {
      setTenantEditorDraft(buildTenantEditorDraft(updatedTenant))
    }
  }, [assetId, buildingLeasingAssumptions, selectedTenant, tenantEditorDraft])

  React.useEffect(() => {
    setFloors(derivedFloorsFromDataset)
    setIsDrawerOpen(false)
    setSelectedTenantId(null)
    setTenantEditorDraft(null)
    setExpandedFloor(null)
  }, [derivedFloorsFromDataset])

  return (
    <>
      <section
        role="region"
        aria-label="Stacking plan"
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
          effectiveViewMode === "matrix" &&
            "border-0 bg-transparent shadow-none"
        )}
      >
        {shouldShowTopToolbar ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5">
            {shouldShowViewToggle || shouldShowSortControl ? (
              <div className="flex flex-wrap items-center gap-2">
                {shouldShowViewToggle ? (
                  <ToggleGroup
                    value={[effectiveViewMode]}
                    onValueChange={(values) => {
                      const next = values?.[0]
                      if (next === "matrix" || next === "simplified") {
                        setViewMode(next)
                      }
                    }}
                    aria-label="Switch stacking plan view"
                  >
                    <ToggleGroupItem value="matrix">
                      {STACKING_DETAILED_VIEW_LABEL}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="simplified">Floor</ToggleGroupItem>
                  </ToggleGroup>
                ) : null}

                {shouldShowSortControl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="rounded-lg"
                    onClick={() => setIsDesc((prev) => !prev)}
                  >
                    <ArrowUpDown className="size-3" />
                    {isDesc ? "Top down" : "Bottom up"}
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className="ml-auto flex flex-wrap items-center gap-3">
              <Select
                value={vizMode}
                onValueChange={(value) => {
                  if (
                    value === "leaseExpiration" ||
                    value === "predictedRent" ||
                    value === "contractRate"
                  ) {
                    setVizMode(value)
                  }
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="min-w-[176px] rounded-lg border-border bg-background shadow-sm"
                  aria-label="Select stacking visualization mode"
                >
                  <span className="truncate">
                    {getLegendLabelForMode(vizMode)}
                  </span>
                </SelectTrigger>
                <SelectContent align="end">
                  {STACKING_VIZ_MODE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <StackingPlanLegend mode={vizMode} />
              {showRentRollActions ? (
                rentRollImported ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setClearRentRollConfirmOpen(true)}
                  >
                    <Eraser className="size-3.5" aria-hidden />
                    Clear rent roll
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleImportRentRoll}
                  >
                    <Upload className="size-3.5" aria-hidden />
                    Import rent roll
                  </Button>
                )
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadCsv(assetId, floors)}
              >
                <Download className="size-3.5" aria-hidden />
                Export
              </Button>
            </div>
          </div>
        ) : null}

        {effectiveViewMode === "matrix" ? (
          <div className="space-y-4">
            <DetailedStackingMatrix
              assetId={assetId}
              floors={floors}
              vizMode={vizMode}
              averagePredictedRentPsf={averagePredictedRentPsf}
              summaryMetrics={matrixSummaryMetrics}
              totalSqft={summary.totalSqft}
              overallOccupancyPercent={summary.overallOccupancyPercent}
              stackingPlaceholderActive={stackingPlaceholderActive}
              headerControls={
                <div className="flex w-full flex-col gap-3">
                  <StackingPlanRentSummary
                    metricsPlaceholder={stackingPlaceholderActive}
                    averageContractRatePsf={averageContractRatePsf}
                    averagePredictedRentPsf={averagePredictedRentPsf}
                    predictedRentLiftPct={predictedRentLiftPct}
                  />
                  <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {shouldShowViewToggle ? (
                        <div className="flex items-center">
                          <ToggleGroup
                            value={[effectiveViewMode]}
                            onValueChange={(values) => {
                              const next = values?.[0]
                              if (next === "matrix" || next === "simplified") {
                                setViewMode(next)
                              }
                            }}
                            aria-label="Switch stacking plan view"
                          >
                            <ToggleGroupItem value="matrix">
                              {STACKING_DETAILED_VIEW_LABEL}
                            </ToggleGroupItem>
                            <ToggleGroupItem value="simplified">
                              Floor
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </div>
                      ) : (
                        <>
                          <Select
                            value={vizMode}
                            onValueChange={(value) => {
                              if (
                                value === "leaseExpiration" ||
                                value === "predictedRent" ||
                                value === "contractRate"
                              ) {
                                setVizMode(value)
                              }
                            }}
                          >
                            <SelectTrigger
                              className="min-w-[176px] rounded-lg border-border bg-background shadow-sm"
                              aria-label="Select stacking visualization mode"
                            >
                              <span className="truncate">
                                {getLegendLabelForMode(vizMode)}
                              </span>
                            </SelectTrigger>
                            <SelectContent align="start">
                              {STACKING_VIZ_MODE_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center">
                            <StackingPlanLegend mode={vizMode} />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 xl:justify-end">
                      {shouldShowViewToggle ? (
                        <>
                          <Select
                            value={vizMode}
                            onValueChange={(value) => {
                              if (
                                value === "leaseExpiration" ||
                                value === "predictedRent" ||
                                value === "contractRate"
                              ) {
                                setVizMode(value)
                              }
                            }}
                          >
                            <SelectTrigger
                              className="min-w-[176px] rounded-lg border-border bg-background shadow-sm"
                              aria-label="Select stacking visualization mode"
                            >
                              <span className="truncate">
                                {getLegendLabelForMode(vizMode)}
                              </span>
                            </SelectTrigger>
                            <SelectContent align="start">
                              {STACKING_VIZ_MODE_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center">
                            <StackingPlanLegend mode={vizMode} />
                          </div>
                        </>
                      ) : null}
                      {showRentRollActions ? (
                        rentRollImported ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setClearRentRollConfirmOpen(true)}
                          >
                            <Eraser className="size-3.5" aria-hidden />
                            Clear rent roll
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleImportRentRoll}
                          >
                            <Upload className="size-3.5" aria-hidden />
                            Import rent roll
                          </Button>
                        )
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => downloadCsv(assetId, floors)}
                      >
                        <Download className="size-3.5" aria-hidden />
                        Export
                      </Button>
                    </div>
                  </div>
                </div>
              }
              expandedFloor={expandedFloor}
              onToggleFloor={handleToggleExpandedFloor}
              onTenantSelect={handleTenantSelect}
              selectedTenantId={selectedTenantId}
            />
          </div>
        ) : (
          <div className="bg-background py-3 sm:py-4">
            <div className="w-full min-w-0 max-w-full">
              {displayedFloors.map((floor) => (
                <SimplifiedFloorRow
                  key={floor.floor}
                  floor={floor}
                  vizMode={vizMode}
                  averagePredictedRentPsf={averagePredictedRentPsf}
                  onTenantSelect={handleTenantSelect}
                  selectedTenantId={selectedTenantId}
                  interactionMode={simplifiedTenantInteraction}
                  tenantVisualOverrides={simplifiedTenantVisualOverrides}
                  showRentRollPlaceholder={stackingPlaceholderActive}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <Dialog
        open={clearRentRollConfirmOpen}
        onOpenChange={setClearRentRollConfirmOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear rent roll?</DialogTitle>
            <DialogDescription>
              This removes suite-level tenants and lease detail from the stacking
              plan. You can import a rent roll again later, but unsaved local
              edits tied to this view will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setClearRentRollConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                handleClearRentRoll()
                setClearRentRollConfirmOpen(false)
              }}
            >
              Clear rent roll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {effectiveViewMode === "matrix" &&
      selectedTenant != null &&
      selectedTenantFloor != null &&
      tenantEditorDraft != null ? (
        <StackingPlanSuiteEditorSheet
          open={isDrawerOpen}
          onOpenChange={handleDrawerOpenChange}
          floor={selectedTenantFloor}
          tenant={selectedTenant}
          draft={tenantEditorDraft}
          onDraftChange={handleTenantDraftChange}
          onCancel={handleTenantEditCancel}
          onClose={handleTenantEditClose}
          onSave={handleTenantEditSave}
        />
      ) : null}

      {effectiveViewMode !== "matrix" &&
      simplifiedTenantInteraction === "drawer" ? (
        <AssetStackingPlanDrawer
          open={isDrawerOpen}
          tenant={selectedTenant}
          onOpenChange={handleDrawerOpenChange}
        />
      ) : null}
    </>
  )
}

function StackingPlanLegend({ mode }: { mode: StackingVizMode }) {
  const legendItems = getLegendItemsForMode(mode)
  const legendLabel = getLegendLabelForMode(mode)

  return (
    <div
      className="flex items-center text-[11px] text-muted-foreground"
      aria-label={`${legendLabel} legend`}
    >
      <div className="flex flex-wrap items-center gap-3 rounded-full border border-border/50 bg-background/35 px-3 py-1 shadow-none">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full ring-1 ring-border/60",
                stackingLegendSwatchClass(item)
              )}
              aria-hidden
            />
            <span className="text-[10px] font-medium text-foreground/75">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MatrixModeBadge({
  mode,
  className,
}: {
  mode: StackingVizMode
  className?: string
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border/55 bg-background/75 px-2.5 py-1 shadow-sm",
        className
      )}
    >
      <span className="text-[11px] font-medium text-foreground/90">
        {getLegendLabelForMode(mode)}
      </span>
    </div>
  )
}

function DetailedColumnHeaders({
  isDesc,
  onToggle,
}: {
  isDesc: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center border-b border-border bg-muted/35">
      <div className="flex w-[116px] items-center justify-center gap-1.5 px-3 py-3">
        <div className="text-[11px] font-medium tracking-normal text-muted-foreground">
          Floor
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Toggle floor order. Currently ${isDesc ? "descending" : "ascending"}.`}
          className="inline-flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowUpDown className="h-3 w-3" />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center gap-[10px] px-3 py-3">
        <div className={INPUT_LABEL_TEXT_CLASS}>Stack</div>
      </div>
    </div>
  )
}

function DetailedFloorRow({
  floor,
  isLast,
  vizMode,
  averagePredictedRentPsf,
  onTenantSelect,
  selectedTenantId,
}: {
  floor: StackingPlanFloor
  isLast: boolean
  vizMode: StackingVizMode
  averagePredictedRentPsf: number | null
  onTenantSelect: (tenant: StackingPlanTenant) => void
  selectedTenantId: string | null
}) {
  const { assumptions: buildingLeasingAssumptions } = useAssetLeasingAssumptions()
  const averagePredictedRate = getWeightedFloorAverageRate(
    floor,
    "predictedRentPsfValue",
    { includeVacant: true }
  )
  const averageContractRate = getWeightedFloorAverageRate(
    floor,
    "contractRatePsfValue"
  )
  const averageSunScore = getWeightedFloorAverageScore(floor, "sunScore")
  const averageViewScore = getWeightedFloorAverageScore(floor, "viewScore")

  return (
    <div
      className={`grid min-h-16 grid-cols-[116px_minmax(0,1fr)] items-stretch bg-background transition-colors hover:bg-muted/10 ${
        !isLast ? "border-b border-border/70" : ""
      }`}
    >
      <div className="flex items-center justify-center px-3 py-3">
        <div className="flex min-w-[72px] flex-col items-center justify-center gap-1.5">
          <div className="flex h-10 min-w-[52px] items-center justify-center rounded-lg border border-border/60 bg-muted/35 px-3">
            <div className="text-[15px] font-semibold text-foreground tabular-nums">
              {floor.floor}
            </div>
          </div>
          <div className="text-center text-[11px] font-medium text-muted-foreground/90 tabular-nums">
            {floor.sqft}
          </div>
        </div>
      </div>

      <div className="min-w-0 py-2 pr-2">
        <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-muted/10">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-border/30 px-2.5 py-1.5">
            <InlineMetricItem
              label={getFloorMetricLongLabel("occ")}
              value={`${floor.occupancyPercent}%`}
              valueClassName={occupancyMetricTextClass(floor.occupancyPercent)}
              className="bg-background/70"
            />
            <InlineMetricItem
              label={getFloorMetricLongLabel("pred")}
              value={formatCompactRate(averagePredictedRate)}
            />
            <InlineMetricItem
              label={getFloorMetricLongLabel("contract")}
              value={formatCompactRate(averageContractRate)}
            />
            <InlineMetricItem
              label={getFloorMetricLongLabel("sun")}
              value={formatCompactScore(averageSunScore)}
              valueClassName={qualityScoreValueClass(averageSunScore)}
            />
            <InlineMetricItem
              label={getFloorMetricLongLabel("view")}
              value={formatCompactScore(averageViewScore)}
              valueClassName={qualityScoreValueClass(averageViewScore)}
            />
          </div>
          <div className="flex min-h-[60px] min-w-0 flex-1 items-stretch gap-1.5 overflow-hidden rounded-sm border border-border/70 bg-muted/20 p-0.5 shadow-sm">
            {floor.tenants.map((tenant, index) => (
              <TenantSegment
                key={tenant.id}
                tenant={tenant}
                visualColor={getTenantVisualColor({
                  tenant,
                  floor,
                  mode: vizMode,
                  averagePredictedRentPsf,
                })}
                title={getTenantVisualizationTitle({
                  tenant,
                  buildingLeasingAssumptions,
                })}
                isSelected={selectedTenantId === tenant.id}
                onOpenTenant={onTenantSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TenantSegment({
  tenant,
  visualColor,
  title,
  isSelected,
  onOpenTenant,
}: {
  tenant: StackingPlanTenant
  visualColor: string
  title: string
  isSelected: boolean
  onOpenTenant: (tenant: StackingPlanTenant) => void
}) {
  const tone = stackingSegmentToneFromHex(visualColor)
  const isCompact = tenant.widthPercent < 14
  const isSemiCompact = tenant.widthPercent < 18
  const isVeryCompact = tenant.widthPercent < 7
  const hoverInteractionClass = isVeryCompact
    ? "hover:ring-1 hover:ring-inset hover:ring-foreground/15"
    : "hover:-translate-y-px hover:shadow-sm hover:shadow-foreground/8 hover:ring-1 hover:ring-inset hover:ring-foreground/15"

  return (
    <StackingHoverSummary
      text={title}
      trigger={
        <button
          type="button"
          onClick={() => onOpenTenant(tenant)}
          aria-haspopup="dialog"
          aria-expanded={isSelected}
          aria-label={`${tenant.name}, ${tenant.space}, ${tenant.sqftLabel}, ${
            tenant.isVacant
              ? tenant.availabilityStatus
              : `expires ${tenant.expiration}`
          }. Open details.`}
          className={cn(
            "relative flex h-full min-h-[60px] min-w-0 cursor-pointer flex-col justify-center gap-1 rounded-sm px-2 py-1.5 text-left ring-1 ring-inset ring-border/55 transition-[ring-color,box-shadow,transform] duration-150 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset",
            tone.fillClass,
            isSelected
              ? "z-10 ring-2 ring-primary/55 ring-inset"
              : hoverInteractionClass
          )}
          style={{
            flex: `${tenant.widthPercent} 1 0px`,
            minWidth: isVeryCompact ? "12px" : "28px",
          }}
        >
          <div
            className={cn(
              "self-stretch truncate text-center text-[10.5px] leading-4 font-semibold",
              tone.textClass
            )}
          >
            {tenant.name}
          </div>

          {!isCompact ? (
            <div className="flex items-start justify-center gap-1.5 overflow-hidden text-[10px] font-medium whitespace-nowrap">
              <div className={cn("truncate", tone.metaClass)}>{tenant.space}</div>
              {!isSemiCompact ? (
                <div className={cn("truncate", tone.metaClass)}>
                  {tenant.sqftLabel}
                </div>
              ) : null}
              <div className={cn("truncate", tone.metaClass)}>{tenant.expiration}</div>
            </div>
          ) : null}
        </button>
      }
    />
  )
}

function StackSummaryRow({
  totalSqft,
  occupancyPercent,
  summaryMetrics,
  vizMode,
}: {
  totalSqft: number
  occupancyPercent: number
  summaryMetrics: StackSummaryMetric[]
  vizMode: StackingVizMode
}) {
  const vacancyPercent = Math.max(0, 100 - occupancyPercent)
  const summaryToneFloor: StackingPlanFloor = {
    floor: 0,
    sqft: formatSqftValue(totalSqft),
    occupancy: "",
    occupancyPercent,
    vacancyPercent,
    tenants: [],
    valueDrivers: {
      marketBaselineRentPsf: 0,
      predictedRentPsf: 0,
      waterfallFactors: [],
      otherFactors: [],
      summary: {
        contractRentPsf: 0,
        deltaFromMarketPsf: 0,
        totalPositiveImpact: 0,
        totalNegativeImpact: 0,
        visibleFactorCount: 0,
        otherFactorCount: 0,
      },
    },
  }
  const focusedMetricId = getFocusedMetricId(vizMode)
  const focusedMetric = focusedMetricId
    ? (summaryMetrics.find((item) => item.id === focusedMetricId) ?? null)
    : null
  const secondaryMetrics = focusedMetricId
    ? summaryMetrics.filter((item) => item.id !== focusedMetricId)
    : summaryMetrics
  const hasFocusedMetric = focusedMetric != null
  const footerMetricEmphasis = "subtle" as const

  return (
    <div
      className={cn("border-t", MATRIX_SURFACE_BAND_CLASS)}
      aria-label="Stacking plan building summary"
    >
      <div className={MATRIX_ROW_GRID_CLASS}>
        <div className="flex items-center justify-center px-3 py-3">
          <div className="flex min-w-[60px] flex-col items-center gap-1">
            <div className="flex h-9 min-w-[52px] items-center justify-center rounded-lg border border-border/60 bg-muted/35 px-3">
              <div className="text-[10px] font-medium tracking-normal text-foreground">
                Total
              </div>
            </div>
            <div className="text-center text-[10px] font-medium text-muted-foreground/85 tabular-nums">
              {formatSqftValue(totalSqft)}
            </div>
          </div>
        </div>
        <div className={MATRIX_ROW_CONTENT_CLASS}>
          <div className="flex h-full min-w-0 items-center overflow-hidden rounded-xl border border-border/60 bg-background/55 shadow-sm">
            <div
              className={cn(
                "flex h-full w-full flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5",
                hasFocusedMetric ? "justify-between" : "justify-start"
              )}
            >
              {hasFocusedMetric ? (
                <div className="flex flex-wrap items-center gap-2.5">
                  <MatrixModeBadge mode={vizMode} />
                  <FloorMetricPair
                    metricId={focusedMetric.id}
                    label={getFloorMetricLongLabel(focusedMetric.id)}
                    value={focusedMetric.value}
                    floor={summaryToneFloor}
                    vizMode={vizMode}
                    valueStyle={focusedMetric.valueStyle}
                    valueClassName={focusedMetric.valueClassName}
                    emphasis={footerMetricEmphasis}
                  />
                </div>
              ) : null}
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                {secondaryMetrics.map((item) => (
                  <FloorMetricPair
                    key={item.id}
                    metricId={item.id}
                    label={item.label}
                    value={item.value}
                    floor={summaryToneFloor}
                    vizMode={vizMode}
                    valueStyle={item.valueStyle}
                    valueClassName={item.valueClassName}
                    emphasis={footerMetricEmphasis}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailedStackingMatrix({
  assetId,
  floors,
  vizMode,
  averagePredictedRentPsf,
  summaryMetrics,
  totalSqft,
  overallOccupancyPercent,
  stackingPlaceholderActive,
  headerControls,
  expandedFloor,
  onToggleFloor,
  onTenantSelect,
  selectedTenantId,
}: {
  assetId: string
  floors: readonly StackingPlanFloor[]
  vizMode: StackingVizMode
  averagePredictedRentPsf: number | null
  summaryMetrics: StackSummaryMetric[]
  totalSqft: number
  overallOccupancyPercent: number
  stackingPlaceholderActive: boolean
  headerControls: React.ReactNode
  expandedFloor: number | null
  onToggleFloor: (floorNumber: number) => void
  onTenantSelect: (tenant: StackingPlanTenant) => void
  selectedTenantId: string | null
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <StackFirstHeaderRow headerControls={headerControls} />
      <div className="bg-background py-3 sm:py-4">
        {floors.map((floor) => (
          <StackFirstRow
            key={floor.floor}
            assetId={assetId}
            floor={floor}
            vizMode={vizMode}
            averagePredictedRentPsf={averagePredictedRentPsf}
            metricsPlaceholder={stackingPlaceholderActive}
            isExpanded={expandedFloor === floor.floor}
            onToggleExpanded={() => onToggleFloor(floor.floor)}
            onTenantSelect={onTenantSelect}
            selectedTenantId={selectedTenantId}
          />
        ))}
        <StackSummaryRow
          totalSqft={totalSqft}
          occupancyPercent={overallOccupancyPercent}
          summaryMetrics={summaryMetrics}
          vizMode={vizMode}
        />
      </div>
    </div>
  )
}

function StackFirstHeaderRow({
  headerControls,
}: {
  headerControls: React.ReactNode
}) {
  return (
    <div className={cn("border-b", MATRIX_SURFACE_BAND_CLASS, "px-3 py-3")}>
      <div className="flex flex-wrap items-center gap-3">{headerControls}</div>
    </div>
  )
}

function StackingPlanRentSummary({
  metricsPlaceholder = false,
  averageContractRatePsf,
  averagePredictedRentPsf,
  predictedRentLiftPct,
}: {
  metricsPlaceholder?: boolean
  averageContractRatePsf: number | null
  averagePredictedRentPsf: number | null
  predictedRentLiftPct: number | null
}) {
  const contractDisplay = metricsPlaceholder
    ? "—"
    : formatCompactRatePerSf(averageContractRatePsf)
  const predictedDisplay = metricsPlaceholder
    ? "—"
    : formatCompactRatePerSf(averagePredictedRentPsf)
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-background/75 px-3 py-2 shadow-sm">
      <div className="flex items-baseline gap-2 whitespace-nowrap">
        <span className="text-[11px] font-medium text-muted-foreground">
          In-Place Rent
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {contractDisplay}
        </span>
      </div>
      <div className="hidden h-5 w-px shrink-0 bg-border/60 sm:block" />
      <div className="flex items-baseline gap-2 whitespace-nowrap">
        <span className="text-[11px] font-medium text-muted-foreground">
          Predicted Rent
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {predictedDisplay}
        </span>
        {!metricsPlaceholder && predictedRentLiftPct != null ? (
          <span
            className={cn(
              "text-[10px] font-semibold tabular-nums",
              predictedRentLiftPct >= 0
                ? "text-emerald-900 dark:text-emerald-100"
                : "text-rose-800 dark:text-rose-100"
            )}
          >
            ({formatSignedPercentDelta(predictedRentLiftPct)})
          </span>
        ) : null}
      </div>
    </div>
  )
}

function StackFirstRow({
  assetId,
  floor,
  vizMode,
  averagePredictedRentPsf,
  metricsPlaceholder,
  isExpanded,
  onToggleExpanded,
  onTenantSelect,
  selectedTenantId,
}: {
  assetId: string
  floor: StackingPlanFloor
  vizMode: StackingVizMode
  averagePredictedRentPsf: number | null
  metricsPlaceholder: boolean
  isExpanded: boolean
  onToggleExpanded: () => void
  onTenantSelect: (tenant: StackingPlanTenant) => void
  selectedTenantId: string | null
}) {
  const hasSelectedTenantOnFloor =
    selectedTenantId != null &&
    floor.tenants.some((tenant) => tenant.id === selectedTenantId)
  return (
    <div className="group border-b border-border/70 last:border-b-0">
      <div
        className={cn(
          MATRIX_ROW_GRID_CLASS,
          "bg-background transition-colors group-hover:bg-muted/10"
        )}
      >
        <div className="flex items-center justify-center px-3 py-3">
          <div className="flex min-w-[60px] flex-col items-center gap-1">
            <div className="flex h-9 min-w-[52px] items-center justify-center rounded-lg border border-border/60 bg-muted/35 px-3">
              <div className="text-[15px] font-semibold text-foreground tabular-nums">
                {floor.floor}
              </div>
            </div>
            <div className="text-center text-[10px] font-medium text-muted-foreground/85 tabular-nums">
              {floor.sqft}
            </div>
          </div>
        </div>
        <div className={MATRIX_ROW_CONTENT_CLASS}>
          <div
            className={cn(
              "grid h-full min-w-0 grid-cols-[minmax(0,1fr)_56px] overflow-hidden rounded-xl border border-border/60 bg-background/80 shadow-sm transition-[background-color,border-color,box-shadow]",
              hasSelectedTenantOnFloor
                ? "border-primary/25 bg-primary/[0.04] shadow-[0_0_0_1px_rgba(59,130,246,0.06)]"
                : isExpanded
                  ? "border-border/70 bg-background/84 shadow-[0_0_0_1px_rgba(148,163,184,0.06)]"
                  : "group-hover:border-border/80 group-hover:bg-background"
            )}
          >
            <div className="min-w-0 px-3 py-2.5">
              <div className="space-y-2">
                <FloorMetricRibbon
                  floor={floor}
                  vizMode={vizMode}
                  metricsPlaceholder={metricsPlaceholder}
                />
                <StackBand
                  floor={floor}
                  vizMode={vizMode}
                  averagePredictedRentPsf={averagePredictedRentPsf}
                  selectedTenantId={selectedTenantId}
                  showEmptyPlaceholder={metricsPlaceholder}
                  onTenantSelect={onTenantSelect}
                />
              </div>
            </div>
            <div
              className={cn(
                "border-l border-border/60 bg-background/55",
                hasSelectedTenantOnFloor
                  ? "bg-primary/5"
                  : isExpanded
                    ? "bg-muted/20"
                    : undefined
              )}
            >
              <button
                type="button"
                onClick={onToggleExpanded}
                className="inline-flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset"
                aria-label={`${isExpanded ? "Collapse" : "Expand"} floor ${floor.floor} value drivers`}
              >
                {isExpanded ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
                <span className="text-[10px] font-medium tracking-normal">
                  {isExpanded ? "Hide" : "Value drivers"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {isExpanded ? <ExpandedFloorDetails floor={floor} /> : null}
    </div>
  )
}

function FloorMetricRibbon({
  floor,
  vizMode,
  metricsPlaceholder,
}: {
  floor: StackingPlanFloor
  vizMode: StackingVizMode
  metricsPlaceholder: boolean
}) {
  const averagePredictedRate = getWeightedFloorAverageRate(
    floor,
    "predictedRentPsfValue",
    { includeVacant: true }
  )
  const averageContractRate = getWeightedFloorAverageRate(
    floor,
    "contractRatePsfValue"
  )
  const averageSunScore = getWeightedFloorAverageScore(floor, "sunScore")
  const averageViewScore = getWeightedFloorAverageScore(floor, "viewScore")
  const focusedMetricId = getFocusedMetricId(vizMode)

  const items: Array<{
    id: FloorMetricId
    label: string
    value: string
    valueStyle?: React.CSSProperties
    valueClassName?: string
  }> = [
    {
      id: "occ",
      label: getFloorMetricLongLabel("occ"),
      value: metricsPlaceholder
        ? "—"
        : formatPercentValue(floor.occupancyPercent),
    },
    {
      id: "vac",
      label: getFloorMetricLongLabel("vac"),
      value: metricsPlaceholder
        ? "—"
        : formatPercentValue(floor.vacancyPercent),
    },
    {
      id: "pred",
      label: getFloorMetricLongLabel("pred"),
      value: formatCompactRate(averagePredictedRate),
    },
    {
      id: "contract",
      label: getFloorMetricLongLabel("contract"),
      value: metricsPlaceholder ? "—" : formatCompactRate(averageContractRate),
    },
    {
      id: "sun",
      label: getFloorMetricLongLabel("sun"),
      value: formatCompactScore(averageSunScore),
      valueClassName: qualityScoreValueClass(averageSunScore),
    },
    {
      id: "view",
      label: getFloorMetricLongLabel("view"),
      value: formatCompactScore(averageViewScore),
      valueClassName: qualityScoreValueClass(averageViewScore),
    },
  ]
  const focusedMetric = focusedMetricId
    ? (items.find((item) => item.id === focusedMetricId) ?? null)
    : null
  const secondaryMetrics = focusedMetricId
    ? items.filter((item) => item.id !== focusedMetricId)
    : items
  const hasFocusedMetric = focusedMetric != null

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/20 pb-2",
        hasFocusedMetric ? "justify-between" : "justify-start"
      )}
    >
      {hasFocusedMetric ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <MatrixModeBadge mode={vizMode} />
          <FloorMetricPair
            metricId={focusedMetric.id}
            label={focusedMetric.label}
            value={focusedMetric.value}
            floor={floor}
            vizMode={vizMode}
            valueStyle={focusedMetric.valueStyle}
            valueClassName={focusedMetric.valueClassName}
            emphasis="active"
          />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        {secondaryMetrics.map((item) => (
          <FloorMetricPair
            key={item.id}
            metricId={item.id}
            label={item.label}
            value={item.value}
            floor={floor}
            vizMode={vizMode}
            valueStyle={item.valueStyle}
            valueClassName={item.valueClassName}
            emphasis="subtle"
          />
        ))}
      </div>
    </div>
  )
}

function FloorMetricPair({
  metricId,
  label,
  value,
  floor,
  vizMode,
  valueStyle,
  valueClassName,
  emphasis = "default",
}: {
  metricId: FloorMetricId
  label: string
  value: string
  floor: StackingPlanFloor
  vizMode: StackingVizMode
  valueStyle?: React.CSSProperties
  valueClassName?: string
  emphasis?: "default" | "subtle" | "active"
}) {
  const tone = getFloorMetricPairTone(metricId, floor, vizMode)

  return (
    <InlineMetricItem
      label={label}
      value={value}
      className={emphasis === "subtle" ? undefined : tone.containerClassName}
      labelClassName={tone.labelClassName}
      valueClassName={cn(tone.valueClassName, valueClassName)}
      valueStyle={valueStyle}
      emphasis={emphasis}
    />
  )
}

function StackBand({
  floor,
  vizMode,
  averagePredictedRentPsf,
  selectedTenantId,
  showEmptyPlaceholder,
  onTenantSelect,
}: {
  floor: StackingPlanFloor
  vizMode: StackingVizMode
  averagePredictedRentPsf: number | null
  selectedTenantId: string | null
  showEmptyPlaceholder: boolean
  onTenantSelect: (tenant: StackingPlanTenant) => void
}) {
  const isMetricDrivenView =
    vizMode === "predictedRent" ||
    vizMode === "contractRate" ||
    vizMode === "occupancy" ||
    vizMode === "vacancy"

  if (showEmptyPlaceholder && floor.tenants.length === 0) {
    return (
      <div
        className={cn(
          "isolate flex h-[36px] w-full items-stretch gap-1.5 overflow-hidden rounded-lg border border-border/70 bg-muted/20 p-0.5 shadow-sm ring-1 ring-inset ring-border/30",
          isMetricDrivenView &&
            "border-border/60 bg-background/55 ring-border/40"
        )}
      >
        <div className="h-full w-full rounded-sm bg-muted/55" aria-hidden />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "isolate flex h-[78px] w-full items-stretch gap-1.5 overflow-hidden rounded-lg border border-border/70 bg-muted/20 p-0.5 shadow-sm ring-1 ring-inset ring-border/30",
        isMetricDrivenView && "border-border/60 bg-background/55 ring-border/40"
      )}
    >
      {floor.tenants.map((tenant) => (
        <StackBandSegment
          key={tenant.id}
          tenant={tenant}
          floor={floor}
          vizMode={vizMode}
          averagePredictedRentPsf={averagePredictedRentPsf}
          isSelected={selectedTenantId === tenant.id}
          onTenantSelect={onTenantSelect}
        />
      ))}
    </div>
  )
}

function StackBandSegment({
  tenant,
  floor,
  vizMode,
  averagePredictedRentPsf,
  isSelected,
  onTenantSelect,
}: {
  tenant: StackingPlanTenant
  floor: StackingPlanFloor
  vizMode: StackingVizMode
  averagePredictedRentPsf: number | null
  isSelected: boolean
  onTenantSelect: (tenant: StackingPlanTenant) => void
}) {
  const { assumptions: buildingLeasingAssumptions } = useAssetLeasingAssumptions()
  const tone = getMatrixSegmentTone({
    tenant,
    floor,
    mode: vizMode,
    averagePredictedRentPsf,
  })
  const showFullLabel = tenant.widthPercent >= 14
  const showAbbreviation = tenant.widthPercent >= 8
  const showSuiteWithTitle = tenant.widthPercent >= 10
  const showSupportingDetails = tenant.widthPercent >= 14
  const showFullRateRow = !tenant.isVacant && tenant.widthPercent >= 16
  const showCompactRateRow = !tenant.isVacant && tenant.widthPercent >= 10
  const isVeryCompact = tenant.widthPercent < 7
  const hoverInteractionClass = isVeryCompact
    ? "hover:ring-1 hover:ring-inset hover:ring-foreground/15"
    : "hover:-translate-y-px hover:shadow-sm hover:shadow-foreground/8 hover:ring-1 hover:ring-inset hover:ring-foreground/15"
  const nameLabel = showFullLabel
    ? tenant.name
    : showAbbreviation
      ? getTenantAbbreviation(tenant.name)
      : ""
  const metaLabel = tenant.isVacant
    ? tenant.availabilityStatus
    : tenant.expiration
  const titleLabel = showSuiteWithTitle
    ? `${nameLabel} • ${tenant.space}`
    : nameLabel
  const contractRateValue = tenant.contractRatePsfValue
  const predictedRateValue = tenant.predictedRentPsfValue
  const showVacantPredictedRow =
    tenant.isVacant && predictedRateValue != null && tenant.widthPercent >= 10

  const segmentSurfaceClass = cn(
    "relative flex h-full min-h-0 flex-col justify-center gap-1.5 overflow-hidden rounded-sm text-left ring-1 ring-inset ring-border/55 transition-[ring-color,box-shadow,transform] duration-150",
    tenant.isVacant ? "stacking-plan-vacant-slot" : tone.fillClass,
    isSelected
      ? "z-10 ring-2 ring-inset ring-primary/55"
      : hoverInteractionClass
  )

  return (
    <div
      className="relative isolate flex h-full min-h-0 min-w-0 flex-col"
      style={{
        flex: `${tenant.widthPercent} 1 0px`,
        minWidth: isVeryCompact ? "18px" : "40px",
      }}
    >
      <StackingHoverSummary
        text={getTenantVisualizationTitle({
          tenant,
          buildingLeasingAssumptions,
        })}
        trigger={
          <button
            type="button"
            onClick={() => onTenantSelect(tenant)}
            aria-expanded={isSelected}
            aria-haspopup="dialog"
            aria-label={`${tenant.name}, ${tenant.space}, ${tenant.sqftLabel}, ${
              tenant.isVacant
                ? tenant.availabilityStatus
                : `expires ${tenant.expiration}`
            }. Open suite editor.`}
            className={cn(
              "relative z-0 flex h-full min-h-0 w-full min-w-0 cursor-pointer flex-col justify-center gap-1.5 overflow-hidden px-2.5 py-2 text-left focus-visible:z-[5] focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset",
              segmentSurfaceClass,
              tenant.isVacant && "pr-7"
            )}
          >
            {titleLabel ? (
              <div
                className={cn(
                  "w-full truncate text-left text-[10.5px] leading-4 font-semibold",
                  tone.textClass
                )}
              >
                {titleLabel}
              </div>
            ) : null}
            {showSupportingDetails ? (
              <div className="flex w-full items-center gap-1.5 overflow-hidden text-[10px] font-medium whitespace-nowrap">
                <div className={cn("truncate", tone.metaClass)}>
                  {tenant.sqftLabel}
                </div>
                <div aria-hidden className={tone.metaClass}>
                  •
                </div>
                <div className={cn("truncate", tone.metaClass)}>{metaLabel}</div>
              </div>
            ) : null}
            {showFullRateRow &&
            contractRateValue != null &&
            predictedRateValue != null ? (
              <div className="flex w-full items-center gap-1.5 overflow-hidden text-[10px] font-medium whitespace-nowrap">
                <div className={cn("truncate", tone.metaClass)}>
                  Contract {formatCompactRate(contractRateValue)}
                </div>
                <div aria-hidden className={tone.metaClass}>
                  •
                </div>
                <div className={cn("truncate", tone.metaClass)}>
                  Predicted {formatCompactRate(predictedRateValue)}
                </div>
              </div>
            ) : showCompactRateRow &&
              contractRateValue != null &&
              predictedRateValue != null ? (
              <div
                className={cn(
                  "w-full truncate text-[10px] font-medium whitespace-nowrap",
                  tone.metaClass
                )}
              >
                Contract {formatCompactRate(contractRateValue)} • Predicted{" "}
                {formatCompactRate(predictedRateValue)}
              </div>
            ) : showVacantPredictedRow ? (
              <div
                className={cn(
                  "w-full truncate text-[10px] font-medium whitespace-nowrap",
                  tone.metaClass
                )}
              >
                Predicted {formatCompactRate(predictedRateValue)}
              </div>
            ) : null}
          </button>
        }
      />
    </div>
  )
}

function CompactTenantEditor({
  tenant,
  draft,
  onDraftChange,
  onCancel,
  onClose,
  onSave,
  className,
}: {
  tenant: StackingPlanTenant
  draft: TenantEditorDraft
  onDraftChange: (field: keyof TenantEditorDraft, value: string) => void
  onCancel: () => void
  onClose?: () => void
  onSave: () => void
  className?: string
}) {
  const { assumptions: buildingLeasingAssumptions } = useAssetLeasingAssumptions()
  const spaceAssumptions = React.useMemo(
    () => resolveSpaceAssumptionsForEditor(draft, buildingLeasingAssumptions),
    [buildingLeasingAssumptions, draft]
  )
  const spaceAssumptionIdPrefix = React.useMemo(
    () => `space-${tenant.id}-`,
    [tenant.id]
  )

  const handleSpaceAssumptionsChange = React.useCallback(
    (updates: Partial<typeof buildingLeasingAssumptions>) => {
      const draftUpdates = spaceAssumptionUpdatesToDraft(
        updates,
        buildingLeasingAssumptions
      )
      for (const [field, value] of Object.entries(draftUpdates) as Array<
        [keyof TenantEditorDraft, string]
      >) {
        onDraftChange(field, value)
      }
    },
    [buildingLeasingAssumptions, onDraftChange]
  )

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSave()
      }}
      className={cn("flex min-h-0 min-w-0 flex-col", className)}
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-6 py-4">
      <div className="min-w-0 space-y-3 rounded-lg border border-border/70 bg-muted/50 px-3 py-3 dark:border-border/60 dark:bg-muted/35">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">Space assumptions</h4>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Override building leasing defaults for this suite. Leave values aligned
            with building defaults to inherit them.
          </p>
        </div>
        <AssetLeasingAssumptionsFields
          idPrefix={spaceAssumptionIdPrefix}
          layout="single"
          fieldStyle="stacked"
          assumptions={spaceAssumptions}
          onAssumptionsChange={handleSpaceAssumptionsChange}
          showRenewalProbability={!tenant.isVacant}
        />
      </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-background px-6 py-3">
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-lg"
            onClick={onClose}
          >
            Close
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg"
          onClick={onCancel}
        >
          Reset
        </Button>
        <Button type="submit" size="sm" className="rounded-lg">
          Save
        </Button>
      </div>
    </form>
  )
}

function StackingPlanSuiteEditorSheet({
  open,
  onOpenChange,
  floor,
  tenant,
  draft,
  onDraftChange,
  onCancel,
  onClose,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  floor: StackingPlanFloor
  tenant: StackingPlanTenant
  draft: TenantEditorDraft
  onDraftChange: (field: keyof TenantEditorDraft, value: string) => void
  onCancel: () => void
  onClose: () => void
  onSave: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(520px,100vw)] gap-0 border-l border-border bg-background p-0 shadow-xl sm:max-w-[520px]"
      >
        <div className="flex h-full min-h-0 flex-col bg-background">
          <div className="shrink-0 border-b border-border px-6 py-4 pr-14">
            <SheetTitle className="text-base font-semibold tracking-tight text-foreground">
              Floor {floor.floor} • {tenant.space}
            </SheetTitle>
          </div>
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <CompactTenantEditor
              tenant={tenant}
              draft={draft}
              onDraftChange={onDraftChange}
              onCancel={onCancel}
              onClose={onClose}
              onSave={onSave}
              className="h-full"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ExpandedFloorDetails({ floor }: { floor: StackingPlanFloor }) {
  if (floor.tenants.length === 0) {
    return (
      <div className={cn(MATRIX_ROW_GRID_CLASS, "bg-muted/10")}>
        <div />
        <div className={MATRIX_ROW_CONTENT_CLASS}>
          <div className="rounded-xl border border-border/55 bg-background/70 px-3 py-4">
            <p className="text-sm text-muted-foreground">
              Import a rent roll to see suite-level detail and floor value
              drivers.
            </p>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className={cn(MATRIX_ROW_GRID_CLASS, "bg-muted/10")}>
      <div />
      <div className={MATRIX_ROW_CONTENT_CLASS}>
        <div className="rounded-xl border border-border/55 bg-background/70 px-3 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Floor {floor.floor} Value Drivers
            </p>
          </div>
          <StackingValueDriversWaterfall valueDrivers={floor.valueDrivers} />
        </div>
      </div>
    </div>
  )
}

function HoverCardFieldGrid({
  lines,
  headingClassName,
}: {
  lines: StackingPlanHoverCardLine[]
  headingClassName?: string
}) {
  if (lines.length === 0) {
    return null
  }

  return (
    <dl className="space-y-0.5 text-xs leading-snug">
      {lines.map((line, index) => {
        if (line.type === "heading") {
          return (
            <div
              key={`heading-${index}`}
              className={cn(
                "pt-0.5 text-[11px] font-semibold text-muted-foreground",
                headingClassName
              )}
            >
              {line.text}
            </div>
          )
        }

        if (line.type === "text") {
          return (
            <div key={`text-${index}`} className="text-foreground">
              {line.text}
            </div>
          )
        }

        return (
          <div
            key={`row-${line.label}-${index}`}
            className="flex min-w-0 items-baseline justify-between gap-2"
          >
            <dt className="shrink-0 text-muted-foreground">{line.label}</dt>
            <dd className="min-w-0 truncate text-right font-medium text-foreground tabular-nums">
              {line.value}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

function splitHoverCardLines(lines: StackingPlanHoverCardLine[]) {
  const assumptionIndex = lines.findIndex(
    (line) => line.type === "heading" && line.text === "Space assumptions"
  )

  if (assumptionIndex === -1) {
    return { mainLines: lines, assumptionLines: [] as StackingPlanHoverCardLine[] }
  }

  return {
    mainLines: lines.slice(0, assumptionIndex),
    assumptionLines: lines.slice(assumptionIndex),
  }
}

function StackingHoverSummary({
  text,
  trigger,
}: {
  text: string
  trigger: React.ReactElement<Record<string, unknown>>
}) {
  if (!text.trim()) {
    return trigger
  }

  const { title, lines } = parseStackingPlanHoverCardText(text)
  const { mainLines, assumptionLines } = splitHoverCardLines(lines)

  return (
    <HoverCard>
      <HoverCardTrigger delay={200} closeDelay={100} render={trigger} />
      <HoverCardContent
        side="top"
        sideOffset={6}
        align="start"
        className="w-[17rem] overflow-hidden p-0"
      >
        <div className="space-y-1 px-2 py-1.5">
          {title ? (
            <p className="truncate text-xs leading-snug font-semibold text-foreground">
              {title}
            </p>
          ) : null}
          <HoverCardFieldGrid lines={mainLines} />
        </div>
        {assumptionLines.length > 0 ? (
          <div className="w-full bg-muted/65 px-2 py-1.5">
            <HoverCardFieldGrid
              lines={assumptionLines}
              headingClassName="pt-0"
            />
          </div>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  )
}

/** Rent lift % on narrow stacking segments; centered, truncates when overflow. */
function SimplifiedSpaceRentLiftLabel({
  text,
  tone = "neutral",
}: {
  text: string
  tone?: "positive" | "negative" | "neutral"
}) {
  const textClassName = cn(
    "block min-h-0 w-full max-w-full truncate text-center text-[10px] font-bold tabular-nums leading-tight sm:text-[11px]",
    "drop-shadow-[0_0_3px_rgba(255,255,255,0.96),0_1px_1px_rgba(255,255,255,0.65)] dark:drop-shadow-[0_0_2px_rgba(0,0,0,0.82),0_1px_2px_rgba(0,0,0,0.55)]",
    tone === "negative" &&
      "text-rose-950 dark:text-rose-50",
    tone === "neutral" && "text-slate-950 dark:text-slate-50",
    tone === "positive" &&
      "text-emerald-950 dark:text-emerald-50"
  )

  return (
    <span
      className="pointer-events-none absolute inset-0 z-[1] flex min-h-0 min-w-0 items-center justify-center px-0.5"
      title={`Rent lift: ${text}`}
    >
      <span className="flex min-h-0 min-w-0 w-full max-w-full items-center justify-center">
        <span className={textClassName}>{text}</span>
      </span>
    </span>
  )
}

function SimplifiedFloorRow({
  floor,
  vizMode,
  averagePredictedRentPsf,
  onTenantSelect,
  selectedTenantId,
  interactionMode,
  tenantVisualOverrides,
  showRentRollPlaceholder = false,
}: {
  floor: StackingPlanFloor
  vizMode: StackingVizMode
  averagePredictedRentPsf: number | null
  onTenantSelect: (tenant: StackingPlanTenant) => void
  selectedTenantId: string | null
  interactionMode: "drawer" | "none"
  tenantVisualOverrides?: Record<string, SimplifiedTenantVisualOverride>
  showRentRollPlaceholder?: boolean
}) {
  const { assumptions: buildingLeasingAssumptions } = useAssetLeasingAssumptions()
  return (
    <div className="flex h-[1.875rem] items-center bg-background transition-colors hover:bg-muted/10">
      <div className="flex w-[52px] items-center justify-center px-1">
        <div className="flex h-[1.5625rem] min-w-[28px] justify-center rounded-sm border border-border bg-muted/60 px-1.5 shadow-sm">
          <div className="text-[11px] leading-5 font-semibold text-foreground tabular-nums">
            {floor.floor}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center px-1">
        <div className="flex w-full">
          <div className="flex h-[1.5625rem] w-full items-stretch gap-1.5 overflow-hidden rounded-sm border border-border/70 bg-muted/20 p-0.5 shadow-sm">
            {showRentRollPlaceholder && floor.tenants.length === 0 ? (
              <div
                className="my-auto h-2.5 w-full rounded-sm bg-muted/60"
                aria-hidden
              />
            ) : (
              floor.tenants.map((tenant) => {
              const visualOverride = tenantVisualOverrides?.[tenant.id]
              const rentLiftSummaryLabel =
                visualOverride?.rentLiftSummaryLabel?.trim()
              const rentLiftLabelTone = visualOverride?.rentLiftLabelTone
              const overrideBg = visualOverride?.backgroundColor
              const themeHex = getTenantVisualColor({
                tenant,
                floor,
                mode: vizMode,
                averagePredictedRentPsf,
              })
              const themeFillClass =
                overrideBg == null && !tenant.isVacant
                  ? stackingSegmentToneFromHex(themeHex).fillClass
                  : undefined
              const title =
                visualOverride?.title ??
                getTenantVisualizationTitle({
                  tenant,
                  buildingLeasingAssumptions,
                })
              const isSelected =
                interactionMode === "drawer" && selectedTenantId === tenant.id

              const segmentFlexStyle = {
                flex: `${tenant.widthPercent} 1 0px`,
                minWidth: "10px",
              } satisfies React.CSSProperties

              const segmentSurfaceStyle = {
                ...(overrideBg != null ? { backgroundColor: overrideBg } : {}),
                opacity: visualOverride?.filterDimmed
                  ? 0.2
                  : visualOverride?.muted
                    ? 0.35
                    : 1,
              } satisfies React.CSSProperties

              const segmentClassName = cn(
                "h-full rounded-sm",
                themeFillClass,
                tenant.isVacant &&
                  overrideBg == null &&
                  "stacking-plan-vacant-slot",
                tenant.isVacant &&
                  overrideBg != null &&
                  "stacking-plan-vacant-slot--hatch-only",
                "ring-1 ring-inset ring-border/55",
                interactionMode === "drawer"
                  ? "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none focus-visible:ring-inset"
                  : "cursor-default",
                isSelected
                  ? "z-10 ring-2 ring-inset ring-primary/55"
                  : "hover:opacity-90"
              )

              if (interactionMode === "none") {
                return tenant.isVacant ? (
                  <div
                    key={tenant.id}
                    className="relative isolate flex h-full min-h-0 min-w-0 flex-col"
                    style={segmentFlexStyle}
                  >
                    <StackingHoverSummary
                      text={title}
                      trigger={
                        <div
                          className={cn(segmentClassName, "relative h-full w-full")}
                          style={segmentSurfaceStyle}
                        />
                      }
                    />
                    {rentLiftSummaryLabel ? (
                      <SimplifiedSpaceRentLiftLabel
                        text={rentLiftSummaryLabel}
                        tone={rentLiftLabelTone}
                      />
                    ) : null}
                  </div>
                ) : (
                  <div
                    key={tenant.id}
                    className="relative flex h-full min-h-0 min-w-0"
                    style={segmentFlexStyle}
                  >
                    <StackingHoverSummary
                      text={title}
                      trigger={
                        <div
                          className={cn(
                            segmentClassName,
                            "relative min-h-0 w-full flex-1"
                          )}
                          style={{
                            height: "100%",
                            ...segmentSurfaceStyle,
                          }}
                        />
                      }
                    />
                    {rentLiftSummaryLabel ? (
                      <SimplifiedSpaceRentLiftLabel
                        text={rentLiftSummaryLabel}
                        tone={rentLiftLabelTone}
                      />
                    ) : null}
                  </div>
                )
              }

              if (tenant.isVacant) {
                const vacantAria = [
                  `${tenant.name}, ${tenant.space}, ${tenant.availabilityStatus}. Open details.`,
                  rentLiftSummaryLabel
                    ? `Rent lift ${rentLiftSummaryLabel}.`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")
                return (
                  <div
                    key={tenant.id}
                    className="relative isolate flex h-full min-h-0 min-w-0 flex-col"
                    style={segmentFlexStyle}
                  >
                    <StackingHoverSummary
                      text={title}
                      trigger={
                        <button
                          type="button"
                          style={segmentSurfaceStyle}
                          className={cn(
                            segmentClassName,
                            "relative z-0 flex h-full min-h-0 w-full min-w-0 pr-3.5 text-left"
                          )}
                          onClick={() => onTenantSelect(tenant)}
                          aria-haspopup="dialog"
                          aria-expanded={selectedTenantId === tenant.id}
                          aria-label={vacantAria}
                        />
                      }
                    />
                    {rentLiftSummaryLabel ? (
                      <SimplifiedSpaceRentLiftLabel
                        text={rentLiftSummaryLabel}
                        tone={rentLiftLabelTone}
                      />
                    ) : null}
                  </div>
                )
              }

              const suiteAria = [
                `${tenant.name}, ${tenant.space}, expires ${tenant.expiration}. Open details.`,
                rentLiftSummaryLabel
                  ? `Rent lift ${rentLiftSummaryLabel}.`
                  : "",
              ]
                .filter(Boolean)
                .join(" ")

              return (
                <div
                  key={tenant.id}
                  className="relative flex h-full min-h-0 min-w-0"
                  style={segmentFlexStyle}
                >
                  <StackingHoverSummary
                    text={title}
                    trigger={
                      <button
                        type="button"
                        className={cn(segmentClassName, "relative")}
                        style={{
                          width: "100%",
                          height: "100%",
                          ...segmentSurfaceStyle,
                        }}
                        onClick={() => onTenantSelect(tenant)}
                        aria-haspopup="dialog"
                        aria-expanded={selectedTenantId === tenant.id}
                        aria-label={suiteAria}
                      />
                    }
                  />
                  {rentLiftSummaryLabel ? (
                    <SimplifiedSpaceRentLiftLabel
                      text={rentLiftSummaryLabel}
                      tone={rentLiftLabelTone}
                    />
                  ) : null}
                </div>
              )
            })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryFooter({
  totalSqft,
  overallOccupancyPercent,
  averagePredictedRentPsf,
  averageContractRatePsf,
  averageSunScore,
  averageViewScore,
  totalTenants,
}: {
  totalSqft: number
  overallOccupancyPercent: number
  averagePredictedRentPsf: number | null
  averageContractRatePsf: number | null
  averageSunScore: number | null
  averageViewScore: number | null
  totalTenants: number
}) {
  return (
    <div className="flex items-center border-t border-border bg-muted/20">
      <div className="flex w-[116px] flex-col items-center px-3 py-3 text-center">
        <div className="text-[10px] font-medium tracking-normal text-muted-foreground">
          Total RSF
        </div>
        <div className="mt-1 text-[11px] font-semibold text-foreground tabular-nums">
          {totalSqft.toLocaleString()} SF
        </div>
      </div>
      <div className="flex flex-1 items-center justify-between gap-3 px-3 py-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <InlineMetricItem
            label={getFloorMetricLongLabel("occ")}
            value={`${overallOccupancyPercent.toFixed(2)}%`}
            className="bg-background/70"
          />
          <InlineMetricItem
            label={getFloorMetricLongLabel("pred")}
            value={formatCompactRate(averagePredictedRentPsf)}
          />
          <InlineMetricItem
            label={getFloorMetricLongLabel("contract")}
            value={formatCompactRate(averageContractRatePsf)}
          />
          <InlineMetricItem
            label={getFloorMetricLongLabel("sun")}
            value={formatCompactScore(averageSunScore)}
            valueClassName={qualityScoreValueClass(averageSunScore)}
          />
          <InlineMetricItem
            label={getFloorMetricLongLabel("view")}
            value={formatCompactScore(averageViewScore)}
            valueClassName={qualityScoreValueClass(averageViewScore)}
          />
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold text-foreground shadow-sm">
          <span className="text-muted-foreground">Tenants</span>
          <span className="tabular-nums">{totalTenants}</span>
        </div>
      </div>
    </div>
  )
}
