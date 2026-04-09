"use client"

import * as React from "react"
import { ArrowUpDown, ChevronDown, ChevronRight, Download } from "lucide-react"

import { AssetStackingPlanDrawer } from "@/components/asset-stacking-plan-drawer"
import { TrackSuiteInScenarioMenu } from "@/components/track-suite-in-scenario-menu"
import { StackingValueDriversWaterfall } from "@/components/stacking-value-drivers-waterfall"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  getSampleStackingPlanData,
  STACKING_EXPIRATION_LEGEND,
  type StackingPlanFloor,
  type StackingLegendItem,
  type StackingPlanTenant,
  type StackingViewMode,
} from "@/lib/stacking-plan-data"
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
}

type StackSummaryMetric = {
  id: FloorMetricId
  label: string
  value: string
  valueStyle?: React.CSSProperties
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
}

type StackingVizMode =
  | "leaseExpiration"
  | "predictedRent"
  | "occupancy"
  | "vacancy"

const STACKING_VIZ_MODE_OPTIONS: Array<{
  value: StackingVizMode
  label: string
}> = [
  { value: "leaseExpiration", label: "Lease Expiration" },
  { value: "predictedRent", label: "Predicted Rent" },
  { value: "occupancy", label: "Occupancy" },
  { value: "vacancy", label: "Vacancy" },
]
const BUILDOUT_OPTIONS = ["Shell", "White Box", "Fully Built-Out"] as const

const PREDICTED_RENT_LEGEND: readonly StackingLegendItem[] = [
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

function getExpirationColorForDate(expiration?: string, isVacant?: boolean) {
  if (isVacant || expiration == null || expiration === "") return "#64748b"
  const year = Number(expiration.slice(0, 4))
  if (Number.isNaN(year)) return "#64748b"
  if (year <= 2025) return "#ef4444"
  if (year === 2026) return "#f97316"
  if (year === 2027) return "#a855f7"
  if (year === 2028) return "#14b8a6"
  if (year === 2029) return "#3b82f6"
  return "#22c55e"
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
    left.availabilityStatus === right.availabilityStatus
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

function summarizeFloors(floors: readonly StackingPlanFloor[]) {
  const totalSqft = floors.reduce(
    (sum, floor) =>
      sum +
      floor.tenants.reduce((floorSum, tenant) => floorSum + tenant.sqft, 0),
    0
  )
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

function getOccupancyColors(occupancyPercent: number) {
  if (occupancyPercent >= 80) {
    return {
      text: "text-emerald-700",
      bar: "#22c55e",
      track: "#dcfce7",
    }
  }
  if (occupancyPercent >= 50) {
    return {
      text: "text-amber-700",
      bar: "#f59e0b",
      track: "#fef3c7",
    }
  }
  return {
    text: "text-rose-700",
    bar: "#ef4444",
    track: "#ffe4e6",
  }
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
    tenant.isVacant ||
    tenant.predictedRentPsfValue == null ||
    averagePredictedRentPsf == null ||
    averagePredictedRentPsf <= 0
  ) {
    return { label: "Available", color: "#64748b" }
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

function getTenantTone(color: string) {
  const colorMap: Record<
    string,
    {
      textColor: string
      metaColor: string
      borderColor: string
      accentColor: string
      backgroundColor: string
    }
  > = {
    "#22c55e": {
      textColor: "#14532d",
      metaColor: "#166534",
      borderColor: "rgba(34,197,94,0.28)",
      accentColor: "#22c55e",
      backgroundColor: "rgba(240,253,244,0.92)",
    },
    "#a855f7": {
      textColor: "#581c87",
      metaColor: "#6b21a8",
      borderColor: "rgba(168,85,247,0.28)",
      accentColor: "#a855f7",
      backgroundColor: "rgba(250,245,255,0.92)",
    },
    "#3b82f6": {
      textColor: "#1e3a8a",
      metaColor: "#1d4ed8",
      borderColor: "rgba(59,130,246,0.28)",
      accentColor: "#3b82f6",
      backgroundColor: "rgba(239,246,255,0.92)",
    },
    "#f97316": {
      textColor: "#7c2d12",
      metaColor: "#c2410c",
      borderColor: "rgba(249,115,22,0.28)",
      accentColor: "#f97316",
      backgroundColor: "rgba(255,247,237,0.92)",
    },
    "#ef4444": {
      textColor: "#7f1d1d",
      metaColor: "#b91c1c",
      borderColor: "rgba(239,68,68,0.28)",
      accentColor: "#ef4444",
      backgroundColor: "rgba(254,242,242,0.92)",
    },
    "#14b8a6": {
      textColor: "#134e4a",
      metaColor: "#0f766e",
      borderColor: "rgba(20,184,166,0.28)",
      accentColor: "#14b8a6",
      backgroundColor: "rgba(240,253,250,0.92)",
    },
    "#64748b": {
      textColor: "#0f172a",
      metaColor: "#475569",
      borderColor: "rgba(148,163,184,0.35)",
      accentColor: "#64748b",
      backgroundColor: "rgba(248,250,252,0.92)",
    },
  }

  return colorMap[color.toLowerCase()] ?? colorMap["#22c55e"]!
}

function getLegendItemsForMode(
  mode: StackingVizMode
): readonly StackingLegendItem[] {
  if (mode === "predictedRent") return PREDICTED_RENT_LEGEND
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

function formatSqftValue(value: number) {
  return `${value.toLocaleString()} SF`
}

function getMatrixQualityScoreColor(value: number | null) {
  if (value == null) {
    return "#94a3b8"
  }
  if (value >= 67) {
    return "#86efac"
  }
  if (value >= 34) {
    return "#fde68a"
  }
  return "#fda4af"
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

function getNeutralStackBandTone(isVacant: boolean) {
  if (isVacant) {
    return {
      textColor: "#f8fafc",
      metaColor: "#e2e8f0",
      borderColor: "rgba(148,163,184,0.32)",
      accentColor: "rgba(226,232,240,0.26)",
      backgroundColor: "rgba(100,116,139,0.38)",
    }
  }

  return {
    textColor: "#e2e8f0",
    metaColor: "#cbd5e1",
    borderColor: "rgba(148,163,184,0.18)",
    accentColor: "rgba(148,163,184,0.34)",
    backgroundColor: "rgba(71,85,105,0.28)",
  }
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
}) {
  if (mode === "leaseExpiration") {
    return getTenantTone(tenant.color)
  }

  if (mode === "predictedRent") {
    return getTenantTone(
      getPredictedRentBandData(tenant, averagePredictedRentPsf).color
    )
  }

  if (mode === "occupancy") {
    return getTenantTone(getOccupancyBandData(floor.occupancyPercent).color)
  }

  if (mode === "vacancy") {
    return getTenantTone(getVacancyBandData(floor.vacancyPercent).color)
  }

  return getNeutralStackBandTone(tenant.isVacant)
}

function getFocusedMetricId(vizMode: StackingVizMode): FloorMetricId | null {
  if (vizMode === "predictedRent") return "pred"
  if (vizMode === "occupancy") return "occ"
  if (vizMode === "vacancy") return "vac"
  return null
}

function getFloorMetricLongLabel(metricId: FloorMetricId) {
  if (metricId === "occ") return "Occupancy"
  if (metricId === "vac") return "Vacancy"
  if (metricId === "pred") return "Predicted Rent"
  if (metricId === "contract") return "Contract Rent"
  if (metricId === "sun") return "Sun Score"
  return "View Score"
}

function getFloorMetricPairTone(
  metricId: FloorMetricId,
  floor: StackingPlanFloor,
  vizMode: StackingVizMode
) {
  if (metricId === "occ" && vizMode === "occupancy") {
    const band = getOccupancyBandData(floor.occupancyPercent)

    if (band.color === "#22c55e") {
      return {
        containerClassName: "bg-emerald-500/12 ring-emerald-400/25",
        labelClassName: "text-emerald-100/80",
        valueClassName: "text-emerald-200",
      }
    }
    if (band.color === "#f59e0b") {
      return {
        containerClassName: "bg-amber-500/12 ring-amber-400/25",
        labelClassName: "text-amber-100/80",
        valueClassName: "text-amber-200",
      }
    }

    return {
      containerClassName: "bg-rose-500/12 ring-rose-400/25",
      labelClassName: "text-rose-100/80",
      valueClassName: "text-rose-200",
    }
  }

  if (metricId === "vac" && vizMode === "vacancy") {
    const band = getVacancyBandData(floor.vacancyPercent)

    if (band.color === "#22c55e") {
      return {
        containerClassName: "bg-emerald-500/12 ring-emerald-400/25",
        labelClassName: "text-emerald-100/80",
        valueClassName: "text-emerald-200",
      }
    }
    if (band.color === "#f59e0b") {
      return {
        containerClassName: "bg-amber-500/12 ring-amber-400/25",
        labelClassName: "text-amber-100/80",
        valueClassName: "text-amber-200",
      }
    }

    return {
      containerClassName: "bg-rose-500/12 ring-rose-400/25",
      labelClassName: "text-rose-100/80",
      valueClassName: "text-rose-200",
    }
  }

  if (metricId === "pred" && vizMode === "predictedRent") {
    return {
      containerClassName: "bg-sky-500/12 ring-sky-400/25",
      labelClassName: "text-sky-100/80",
      valueClassName: "text-sky-200",
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
  floor,
  mode,
  averagePredictedRentPsf,
}: {
  tenant: StackingPlanTenant
  floor: StackingPlanFloor
  mode: StackingVizMode
  averagePredictedRentPsf: number | null
}) {
  const base = `${tenant.name} • ${tenant.space}`

  if (mode === "predictedRent") {
    const band = getPredictedRentBandData(tenant, averagePredictedRentPsf)
    return `${base} • ${tenant.predictedRent ?? "N/A"} • ${band.label}`
  }
  if (mode === "occupancy") {
    return `${base} • Floor occupancy ${floor.occupancyPercent}%`
  }
  if (mode === "vacancy") {
    return `${base} • Floor vacancy ${floor.vacancyPercent}%`
  }
  return `${base} • ${tenant.expiration}`
}

function formatCompactRate(value: number | null) {
  if (value == null) {
    return "N/A"
  }

  return `$${value.toFixed(2)}`
}

function formatCompactScore(value: number | null) {
  if (value == null) {
    return "N/A"
  }

  return `${Math.round(value)}`
}

function getQualityScoreColor(value: number | null) {
  if (value == null) {
    return "#64748b"
  }
  if (value >= 67) {
    return "#15803d"
  }
  if (value >= 34) {
    return "#b45309"
  }
  return "#be123c"
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
      ? "text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/65"
      : emphasis === "active"
        ? "text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/75"
        : "text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground/85"
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
  metric: "predictedRentPsfValue" | "contractRatePsfValue"
) {
  const occupiedTenants = floor.tenants.filter(
    (tenant) => !tenant.isVacant && tenant[metric] != null
  )

  if (occupiedTenants.length === 0) {
    return null
  }

  const weightedTotal = occupiedTenants.reduce(
    (sum, tenant) => sum + tenant.sqft * (tenant[metric] ?? 0),
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
  const baseDataset = React.useMemo(
    () => getSampleStackingPlanData(assetId),
    [assetId]
  )
  const [viewMode, setViewMode] =
    React.useState<StackingWorkspaceViewMode>("matrix")
  const [vizMode, setVizMode] =
    React.useState<StackingVizMode>("leaseExpiration")
  const [isDesc, setIsDesc] = React.useState(true)
  const [floors, setFloors] = React.useState<StackingPlanFloor[]>(
    baseDataset.floors
  )
  const [selectedTenantId, setSelectedTenantId] = React.useState<string | null>(
    null
  )
  const [tenantEditorDraft, setTenantEditorDraft] =
    React.useState<TenantEditorDraft | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)
  const [expandedFloor, setExpandedFloor] = React.useState<number | null>(null)
  const effectiveViewMode = lockedViewMode ?? viewMode
  const summary = React.useMemo(() => summarizeFloors(floors), [floors])
  const selectedTenant = React.useMemo(
    () =>
      floors
        .flatMap((floor) => floor.tenants)
        .find((tenant) => tenant.id === selectedTenantId) ?? null,
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
    const occupiedTenants = floors
      .flatMap((floor) => floor.tenants)
      .filter(
        (tenant) => !tenant.isVacant && tenant.predictedRentPsfValue != null
      )

    if (occupiedTenants.length === 0) {
      return null
    }

    const weightedTotal = occupiedTenants.reduce(
      (sum, tenant) => sum + tenant.sqft * (tenant.predictedRentPsfValue ?? 0),
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
    const vacancyPercent = Math.max(0, 100 - summary.overallOccupancyPercent)
    return [
      {
        id: "occ",
        label: "Occ",
        value: formatPercentValue(summary.overallOccupancyPercent),
      },
      {
        id: "vac",
        label: "Vac",
        value: formatPercentValue(vacancyPercent),
      },
      {
        id: "pred",
        label: "Pred",
        value: formatCompactRate(averagePredictedRentPsf),
      },
      {
        id: "contract",
        label: "Cont",
        value: formatCompactRate(averageContractRatePsf),
      },
      {
        id: "sun",
        label: "Sun",
        value: formatCompactScore(averageSunScore),
        valueStyle: { color: getMatrixQualityScoreColor(averageSunScore) },
      },
      {
        id: "view",
        label: "View",
        value: formatCompactScore(averageViewScore),
        valueStyle: { color: getMatrixQualityScoreColor(averageViewScore) },
      },
    ]
  }, [
    averageContractRatePsf,
    averagePredictedRentPsf,
    averageSunScore,
    averageViewScore,
    summary.overallOccupancyPercent,
  ])
  const shouldShowViewToggle = lockedViewMode == null && showViewToggle
  const shouldShowSortControl =
    showSortControl && effectiveViewMode === "simplified"
  const shouldShowTopToolbar = showTopToolbar && effectiveViewMode !== "matrix"

  const closeTenantEditor = React.useCallback(() => {
    setSelectedTenantId(null)
    setTenantEditorDraft(null)
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
      if (effectiveViewMode === "matrix") {
        if (selectedTenantId === tenant.id) {
          requestTenantEditorClose()
          return
        }

        if (selectedTenantId != null && !requestTenantEditorClose()) {
          return
        }

        setExpandedFloor(null)
        setSelectedTenantId(tenant.id)
        setTenantEditorDraft(buildTenantEditorDraft(tenant))
        setIsDrawerOpen(false)
        return
      }

      setSelectedTenantId(tenant.id)
      setTenantEditorDraft(buildTenantEditorDraft(tenant))
      setIsDrawerOpen(true)
    },
    [effectiveViewMode, requestTenantEditorClose, selectedTenantId]
  )

  const handleDrawerOpenChange = React.useCallback((open: boolean) => {
    setIsDrawerOpen(open)
    if (!open) {
      setSelectedTenantId(null)
      setTenantEditorDraft(null)
    }
  }, [])

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
              expiration:
                tenantEditorDraft.availabilityStatus.trim() ||
                tenant.expiration,
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
          const predictedRentDelta =
            tenant.predictedRentPsfValue != null &&
            tenant.contractRatePsfValue != null
              ? tenant.predictedRentPsfValue - tenant.contractRatePsfValue
              : null
          const predictedRentPsfValue =
            contractRatePsfValue != null && predictedRentDelta != null
              ? Number((contractRatePsfValue + predictedRentDelta).toFixed(2))
              : tenant.predictedRentPsfValue
          const rentPremiumPctValue =
            contractRatePsfValue != null &&
            predictedRentPsfValue != null &&
            contractRatePsfValue > 0
              ? Number(
                  (
                    ((predictedRentPsfValue - contractRatePsfValue) /
                      contractRatePsfValue) *
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
            color: getExpirationColorForDate(leaseExpirationDate, false),
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
              contractRatePsfValue != null &&
              predictedRentPsfValue != null &&
              rentPremiumPctValue != null
                ? `+$${(predictedRentPsfValue - contractRatePsfValue).toFixed(2)} / SF (${rentPremiumPctValue.toFixed(
                    1
                  )}%)`
                : tenant.rentPremium,
          }
          return updatedTenant
        })

        return recalculateFloor({ ...floor, tenants: nextTenants })
      })
    )

    if (updatedTenant != null) {
      setTenantEditorDraft(buildTenantEditorDraft(updatedTenant))
    }
  }, [selectedTenant, tenantEditorDraft])

  React.useEffect(() => {
    setFloors(baseDataset.floors)
    setIsDrawerOpen(false)
    setSelectedTenantId(null)
    setTenantEditorDraft(null)
    setExpandedFloor(null)
  }, [baseDataset.floors])

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
                      const next = values[0]
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
                    value === "occupancy" ||
                    value === "vacancy"
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => downloadCsv(assetId, floors)}
              >
                <Download className="size-3.5 text-primary" />
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
              headerControls={
                <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {shouldShowViewToggle ? (
                      <div className="flex items-center">
                        <ToggleGroup
                          value={[effectiveViewMode]}
                          onValueChange={(values) => {
                            const next = values[0]
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
                        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-2.5 py-1.5 shadow-sm">
                          <span className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/75 uppercase">
                            Focus
                          </span>
                          <Select
                            value={vizMode}
                            onValueChange={(value) => {
                              if (
                                value === "leaseExpiration" ||
                                value === "predictedRent" ||
                                value === "occupancy" ||
                                value === "vacancy"
                              ) {
                                setVizMode(value)
                              }
                            }}
                          >
                            <SelectTrigger
                              size="sm"
                              className="min-w-[180px] border-0 bg-transparent px-0 shadow-none"
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
                        </div>
                        <div className="flex items-center">
                          <StackingPlanLegend mode={vizMode} />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 xl:justify-end">
                    {shouldShowViewToggle ? (
                      <>
                        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-2.5 py-1.5 shadow-sm">
                          <span className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/75 uppercase">
                            Focus
                          </span>
                          <Select
                            value={vizMode}
                            onValueChange={(value) => {
                              if (
                                value === "leaseExpiration" ||
                                value === "predictedRent" ||
                                value === "occupancy" ||
                                value === "vacancy"
                              ) {
                                setVizMode(value)
                              }
                            }}
                          >
                            <SelectTrigger
                              size="sm"
                              className="min-w-[180px] border-0 bg-transparent px-0 shadow-none"
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
                        </div>
                        <div className="flex items-center">
                          <StackingPlanLegend mode={vizMode} />
                        </div>
                      </>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg border-dashed border-border/55 bg-background/55 text-muted-foreground shadow-none hover:bg-muted/30 hover:text-foreground"
                      onClick={() => downloadCsv(assetId, floors)}
                    >
                      <Download className="size-3.5 text-muted-foreground" />
                      Export
                    </Button>
                  </div>
                </div>
              }
              expandedFloor={expandedFloor}
              onToggleFloor={handleToggleExpandedFloor}
              onTenantSelect={handleTenantSelect}
              selectedTenant={selectedTenant}
              selectedTenantId={selectedTenantId}
              tenantEditorDraft={tenantEditorDraft}
              onTenantDraftChange={handleTenantDraftChange}
              onTenantEditCancel={handleTenantEditCancel}
              onTenantEditClose={handleTenantEditClose}
              onTenantEditSave={handleTenantEditSave}
            />
          </div>
        ) : (
          <div className="bg-background">
            <div className="mx-auto w-full max-w-[800px]">
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
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {effectiveViewMode !== "matrix" &&
      simplifiedTenantInteraction === "drawer" ? (
        <AssetStackingPlanDrawer
          assetId={assetId}
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
              className="h-2 w-2 rounded-full ring-1 ring-black/5"
              style={{ backgroundColor: item.color }}
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
        "inline-flex items-center gap-2 rounded-full border border-border/55 bg-background/75 px-2.5 py-1 shadow-sm",
        className
      )}
    >
      <span className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/75 uppercase">
        Focus
      </span>
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
        <div className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
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
        <div className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Stack
        </div>
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
  const occupancyTone = getOccupancyColors(floor.occupancyPercent)
  const averagePredictedRate = getWeightedFloorAverageRate(
    floor,
    "predictedRentPsfValue"
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
              label="Occ"
              value={`${floor.occupancyPercent}%`}
              valueClassName={occupancyTone.text}
              className="bg-background/70"
            />
            <InlineMetricItem
              label="Pred"
              value={formatCompactRate(averagePredictedRate)}
            />
            <InlineMetricItem
              label="Contract"
              value={formatCompactRate(averageContractRate)}
            />
            <InlineMetricItem
              label="Sun"
              value={formatCompactScore(averageSunScore)}
              valueStyle={{ color: getQualityScoreColor(averageSunScore) }}
            />
            <InlineMetricItem
              label="View"
              value={formatCompactScore(averageViewScore)}
              valueStyle={{ color: getQualityScoreColor(averageViewScore) }}
            />
          </div>
          <div className="flex min-h-[60px] min-w-0 flex-1 overflow-hidden">
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
                  floor,
                  mode: vizMode,
                  averagePredictedRentPsf,
                })}
                isLastTenant={index === floor.tenants.length - 1}
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
  isLastTenant,
  isSelected,
  onOpenTenant,
}: {
  tenant: StackingPlanTenant
  visualColor: string
  title: string
  isLastTenant: boolean
  isSelected: boolean
  onOpenTenant: (tenant: StackingPlanTenant) => void
}) {
  const tone = getTenantTone(visualColor)
  const isCompact = tenant.widthPercent < 14
  const isSemiCompact = tenant.widthPercent < 18
  const isVeryCompact = tenant.widthPercent < 7
  const hoverInteractionClass = isVeryCompact
    ? "hover:ring-1 hover:ring-inset hover:ring-foreground/15"
    : "hover:-translate-y-px hover:shadow-[0_2px_6px_rgba(15,23,42,0.18)] hover:ring-1 hover:ring-inset hover:ring-foreground/15"

  return (
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
        "relative flex h-full min-h-[60px] cursor-pointer flex-col justify-center gap-1 px-2 py-1.5 text-left transition-[ring-color,box-shadow,transform] duration-150 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset",
        isSelected
          ? "z-10 ring-2 ring-primary/70 ring-inset"
          : hoverInteractionClass
      )}
      style={{
        width: `${tenant.widthPercent}%`,
        minWidth: isVeryCompact ? "12px" : "28px",
        borderRight: isLastTenant ? "none" : "1px solid rgba(148,163,184,0.18)",
        backgroundColor: tone.backgroundColor,
      }}
      title={title}
    >
      <div
        className="self-stretch truncate text-center text-[10.5px] leading-4 font-semibold"
        style={{ color: tone.textColor }}
      >
        {tenant.name}
      </div>

      {!isCompact ? (
        <div className="flex items-start justify-center gap-1.5 overflow-hidden text-[9px] font-medium whitespace-nowrap">
          <div className="truncate" style={{ color: tone.metaColor }}>
            {tenant.space}
          </div>
          {!isSemiCompact ? (
            <div className="truncate" style={{ color: tone.metaColor }}>
              {tenant.sqftLabel}
            </div>
          ) : null}
          <div className="truncate" style={{ color: tone.metaColor }}>
            {tenant.expiration}
          </div>
        </div>
      ) : null}
    </button>
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
              <div className="text-[10px] font-semibold tracking-[0.12em] text-foreground uppercase">
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
  headerControls,
  expandedFloor,
  onToggleFloor,
  onTenantSelect,
  selectedTenant,
  selectedTenantId,
  tenantEditorDraft,
  onTenantDraftChange,
  onTenantEditCancel,
  onTenantEditClose,
  onTenantEditSave,
}: {
  assetId: string
  floors: readonly StackingPlanFloor[]
  vizMode: StackingVizMode
  averagePredictedRentPsf: number | null
  summaryMetrics: StackSummaryMetric[]
  totalSqft: number
  overallOccupancyPercent: number
  headerControls: React.ReactNode
  expandedFloor: number | null
  onToggleFloor: (floorNumber: number) => void
  onTenantSelect: (tenant: StackingPlanTenant) => void
  selectedTenant: StackingPlanTenant | null
  selectedTenantId: string | null
  tenantEditorDraft: TenantEditorDraft | null
  onTenantDraftChange: (field: keyof TenantEditorDraft, value: string) => void
  onTenantEditCancel: () => void
  onTenantEditClose: () => void
  onTenantEditSave: () => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <StackFirstHeaderRow headerControls={headerControls} />
      <div className="bg-background">
        {floors.map((floor) => (
          <StackFirstRow
            key={floor.floor}
            assetId={assetId}
            floor={floor}
            vizMode={vizMode}
            averagePredictedRentPsf={averagePredictedRentPsf}
            isExpanded={expandedFloor === floor.floor}
            onToggleExpanded={() => onToggleFloor(floor.floor)}
            onTenantSelect={onTenantSelect}
            selectedTenant={selectedTenant}
            selectedTenantId={selectedTenantId}
            tenantEditorDraft={tenantEditorDraft}
            onTenantDraftChange={onTenantDraftChange}
            onTenantEditCancel={onTenantEditCancel}
            onTenantEditClose={onTenantEditClose}
            onTenantEditSave={onTenantEditSave}
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

function StackFirstRow({
  assetId,
  floor,
  vizMode,
  averagePredictedRentPsf,
  isExpanded,
  onToggleExpanded,
  onTenantSelect,
  selectedTenant,
  selectedTenantId,
  tenantEditorDraft,
  onTenantDraftChange,
  onTenantEditCancel,
  onTenantEditClose,
  onTenantEditSave,
}: {
  assetId: string
  floor: StackingPlanFloor
  vizMode: StackingVizMode
  averagePredictedRentPsf: number | null
  isExpanded: boolean
  onToggleExpanded: () => void
  onTenantSelect: (tenant: StackingPlanTenant) => void
  selectedTenant: StackingPlanTenant | null
  selectedTenantId: string | null
  tenantEditorDraft: TenantEditorDraft | null
  onTenantDraftChange: (field: keyof TenantEditorDraft, value: string) => void
  onTenantEditCancel: () => void
  onTenantEditClose: () => void
  onTenantEditSave: () => void
}) {
  const activeTenant =
    selectedTenant != null &&
    floor.tenants.some((tenant) => tenant.id === selectedTenant.id)
      ? selectedTenant
      : null
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
              activeTenant != null
                ? "border-primary/25 bg-primary/[0.04] shadow-[0_0_0_1px_rgba(59,130,246,0.06)]"
                : isExpanded
                  ? "border-border/70 bg-background/84 shadow-[0_0_0_1px_rgba(148,163,184,0.06)]"
                  : "group-hover:border-border/80 group-hover:bg-background"
            )}
          >
            <div className="min-w-0 px-3 py-2.5">
              <div className="space-y-2">
                <FloorMetricRibbon floor={floor} vizMode={vizMode} />
                <StackBand
                  floor={floor}
                  vizMode={vizMode}
                  averagePredictedRentPsf={averagePredictedRentPsf}
                  selectedTenantId={selectedTenantId}
                  onTenantSelect={onTenantSelect}
                />
              </div>
            </div>
            <div
              className={cn(
                "border-l border-border/60 bg-background/55",
                activeTenant != null
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
                <span className="text-[10px] font-semibold tracking-[0.12em] uppercase">
                  {isExpanded ? "Hide" : "Value Drivers"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {activeTenant != null && tenantEditorDraft != null ? (
        <SelectedTenantEditorRow
          assetId={assetId}
          floor={floor}
          tenant={activeTenant}
          draft={tenantEditorDraft}
          onDraftChange={onTenantDraftChange}
          onCancel={onTenantEditCancel}
          onClose={onTenantEditClose}
          onSave={onTenantEditSave}
        />
      ) : isExpanded ? (
        <ExpandedFloorDetails floor={floor} />
      ) : null}
    </div>
  )
}

function FloorMetricRibbon({
  floor,
  vizMode,
}: {
  floor: StackingPlanFloor
  vizMode: StackingVizMode
}) {
  const averagePredictedRate = getWeightedFloorAverageRate(
    floor,
    "predictedRentPsfValue"
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
    activeLabel: string
    value: string
    valueStyle?: React.CSSProperties
  }> = [
    {
      id: "occ",
      label: "Occ",
      activeLabel: "Occupancy",
      value: formatPercentValue(floor.occupancyPercent),
    },
    {
      id: "vac",
      label: "Vac",
      activeLabel: "Vacancy",
      value: formatPercentValue(floor.vacancyPercent),
    },
    {
      id: "pred",
      label: "Pred",
      activeLabel: "Predicted Rent",
      value: formatCompactRate(averagePredictedRate),
    },
    {
      id: "contract",
      label: "Cont",
      activeLabel: "Contract Rent",
      value: formatCompactRate(averageContractRate),
    },
    {
      id: "sun",
      label: "Sun",
      activeLabel: "Sun Score",
      value: formatCompactScore(averageSunScore),
      valueStyle: { color: getMatrixQualityScoreColor(averageSunScore) },
    },
    {
      id: "view",
      label: "View",
      activeLabel: "View Score",
      value: formatCompactScore(averageViewScore),
      valueStyle: { color: getMatrixQualityScoreColor(averageViewScore) },
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
            label={focusedMetric.activeLabel}
            value={focusedMetric.value}
            floor={floor}
            vizMode={vizMode}
            valueStyle={focusedMetric.valueStyle}
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
  emphasis = "default",
}: {
  metricId: FloorMetricId
  label: string
  value: string
  floor: StackingPlanFloor
  vizMode: StackingVizMode
  valueStyle?: React.CSSProperties
  emphasis?: "default" | "subtle" | "active"
}) {
  const tone = getFloorMetricPairTone(metricId, floor, vizMode)

  return (
    <InlineMetricItem
      label={label}
      value={value}
      className={emphasis === "subtle" ? undefined : tone.containerClassName}
      labelClassName={tone.labelClassName}
      valueClassName={tone.valueClassName}
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
  onTenantSelect,
}: {
  floor: StackingPlanFloor
  vizMode: StackingVizMode
  averagePredictedRentPsf: number | null
  selectedTenantId: string | null
  onTenantSelect: (tenant: StackingPlanTenant) => void
}) {
  const isMetricDrivenView =
    vizMode === "predictedRent" ||
    vizMode === "occupancy" ||
    vizMode === "vacancy"

  return (
    <div
      className={cn(
        "isolate flex h-[78px] w-full overflow-hidden rounded-lg border border-border/50 bg-muted/10 shadow-[inset_0_1px_0_rgba(148,163,184,0.08)]",
        isMetricDrivenView &&
          "border-border/60 bg-background/55 shadow-[inset_0_1px_0_rgba(148,163,184,0.12)]"
      )}
    >
      {floor.tenants.map((tenant, index) => (
        <StackBandSegment
          key={tenant.id}
          tenant={tenant}
          floor={floor}
          vizMode={vizMode}
          averagePredictedRentPsf={averagePredictedRentPsf}
          isLastTenant={index === floor.tenants.length - 1}
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
  isLastTenant,
  isSelected,
  onTenantSelect,
}: {
  tenant: StackingPlanTenant
  floor: StackingPlanFloor
  vizMode: StackingVizMode
  averagePredictedRentPsf: number | null
  isLastTenant: boolean
  isSelected: boolean
  onTenantSelect: (tenant: StackingPlanTenant) => void
}) {
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
    : "hover:-translate-y-px hover:shadow-[0_2px_6px_rgba(15,23,42,0.18)] hover:ring-1 hover:ring-inset hover:ring-foreground/15"
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

  return (
    <button
      type="button"
      onClick={() => onTenantSelect(tenant)}
      aria-expanded={isSelected}
      aria-label={`${tenant.name}, ${tenant.space}, ${tenant.sqftLabel}, ${
        tenant.isVacant
          ? tenant.availabilityStatus
          : `expires ${tenant.expiration}`
      }. Edit inline.`}
      className={cn(
        "relative flex h-full min-h-[78px] cursor-pointer flex-col justify-center gap-1.5 overflow-hidden px-2.5 py-2 text-left transition-[ring-color,box-shadow,transform] duration-150 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset",
        isSelected
          ? "z-10 ring-2 ring-primary/80 ring-inset"
          : hoverInteractionClass
      )}
      style={{
        width: `${tenant.widthPercent}%`,
        minWidth: isVeryCompact ? "18px" : "40px",
        borderRight: isLastTenant ? "none" : `1px solid ${tone.borderColor}`,
        backgroundColor: tone.backgroundColor,
      }}
      title={getTenantVisualizationTitle({
        tenant,
        floor,
        mode: vizMode,
        averagePredictedRentPsf,
      })}
    >
      {titleLabel ? (
        <div
          className="w-full truncate text-left text-[10.5px] leading-4 font-semibold"
          style={{ color: tone.textColor }}
        >
          {titleLabel}
        </div>
      ) : null}
      {showSupportingDetails ? (
        <div className="flex w-full items-center gap-1.5 overflow-hidden text-[9px] font-medium whitespace-nowrap">
          <div className="truncate" style={{ color: tone.metaColor }}>
            {tenant.sqftLabel}
          </div>
          <div aria-hidden style={{ color: tone.metaColor }}>
            •
          </div>
          <div className="truncate" style={{ color: tone.metaColor }}>
            {metaLabel}
          </div>
        </div>
      ) : null}
      {showFullRateRow &&
      contractRateValue != null &&
      predictedRateValue != null ? (
        <div className="flex w-full items-center gap-1.5 overflow-hidden text-[9px] font-medium whitespace-nowrap">
          <div className="truncate" style={{ color: tone.metaColor }}>
            Contract {formatCompactRate(contractRateValue)}
          </div>
          <div aria-hidden style={{ color: tone.metaColor }}>
            •
          </div>
          <div className="truncate" style={{ color: tone.metaColor }}>
            Predicted {formatCompactRate(predictedRateValue)}
          </div>
        </div>
      ) : showCompactRateRow &&
        contractRateValue != null &&
        predictedRateValue != null ? (
        <div
          className="w-full truncate text-[9px] font-medium whitespace-nowrap"
          style={{ color: tone.metaColor }}
        >
          Contract {formatCompactRate(contractRateValue)} • Predicted{" "}
          {formatCompactRate(predictedRateValue)}
        </div>
      ) : null}
    </button>
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
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSave()
      }}
      className={cn("space-y-4", className)}
    >
      <div
        className={cn(
          "grid gap-3",
          tenant.isVacant ? "md:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"
        )}
      >
        {!tenant.isVacant ? (
          <label className="space-y-1.5">
            <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground/80 uppercase">
              Tenant
            </span>
            <Input
              value={draft.name}
              onChange={(event) => onDraftChange("name", event.target.value)}
              placeholder="Tenant name"
            />
          </label>
        ) : null}

        <label className="space-y-1.5">
          <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground/80 uppercase">
            Suite
          </span>
          <Input
            value={draft.suite}
            onChange={(event) => onDraftChange("suite", event.target.value)}
            placeholder="1201"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground/80 uppercase">
            SF
          </span>
          <Input
            type="number"
            min="1"
            step="1"
            value={draft.sqft}
            onChange={(event) => onDraftChange("sqft", event.target.value)}
            placeholder="10000"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground/80 uppercase">
            Buildout
          </span>
          <Select
            value={draft.buildout}
            onValueChange={(value) => {
              if (
                value === "Shell" ||
                value === "White Box" ||
                value === "Fully Built-Out"
              ) {
                onDraftChange("buildout", value)
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {BUILDOUT_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        {tenant.isVacant ? (
          <label className="space-y-1.5">
            <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground/80 uppercase">
              Availability
            </span>
            <Input
              value={draft.availabilityStatus}
              onChange={(event) =>
                onDraftChange("availabilityStatus", event.target.value)
              }
              placeholder="Available now"
            />
          </label>
        ) : (
          <>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground/80 uppercase">
                Lease Type
              </span>
              <Input
                value={draft.leaseType}
                onChange={(event) =>
                  onDraftChange("leaseType", event.target.value)
                }
                placeholder="Modified Gross"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground/80 uppercase">
                Commencement
              </span>
              <Input
                type="date"
                value={draft.commencement}
                onChange={(event) =>
                  onDraftChange("commencement", event.target.value)
                }
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground/80 uppercase">
                Expiration
              </span>
              <Input
                type="date"
                value={draft.expiration}
                onChange={(event) =>
                  onDraftChange("expiration", event.target.value)
                }
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground/80 uppercase">
                Contract Rate
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={draft.contractRate}
                onChange={(event) =>
                  onDraftChange("contractRate", event.target.value)
                }
                placeholder="42.50"
              />
            </label>
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/50 pt-3">
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

function SelectedTenantEditorRow({
  assetId,
  floor,
  tenant,
  draft,
  onDraftChange,
  onCancel,
  onClose,
  onSave,
}: {
  assetId: string
  floor: StackingPlanFloor
  tenant: StackingPlanTenant
  draft: TenantEditorDraft
  onDraftChange: (field: keyof TenantEditorDraft, value: string) => void
  onCancel: () => void
  onClose: () => void
  onSave: () => void
}) {
  return (
    <div className={cn(MATRIX_ROW_GRID_CLASS, "bg-primary/[0.02]")}>
      <div />
      <div className={MATRIX_ROW_CONTENT_CLASS}>
        <div className="rounded-xl border border-primary/15 bg-background/72 px-3 py-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">
              Suite Editor • Floor {floor.floor} • {tenant.space}
            </p>
            <TrackSuiteInScenarioMenu assetId={assetId} tenant={tenant} />
          </div>
          <CompactTenantEditor
            tenant={tenant}
            draft={draft}
            onDraftChange={onDraftChange}
            onCancel={onCancel}
            onClose={onClose}
            onSave={onSave}
            className="mt-0"
          />
        </div>
      </div>
    </div>
  )
}

function ExpandedFloorDetails({ floor }: { floor: StackingPlanFloor }) {
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

function SimplifiedFloorRow({
  floor,
  vizMode,
  averagePredictedRentPsf,
  onTenantSelect,
  selectedTenantId,
  interactionMode,
  tenantVisualOverrides,
}: {
  floor: StackingPlanFloor
  vizMode: StackingVizMode
  averagePredictedRentPsf: number | null
  onTenantSelect: (tenant: StackingPlanTenant) => void
  selectedTenantId: string | null
  interactionMode: "drawer" | "none"
  tenantVisualOverrides?: Record<string, SimplifiedTenantVisualOverride>
}) {
  return (
    <div className="flex h-6 items-center bg-background transition-colors hover:bg-muted/10">
      <div className="flex w-[52px] items-center justify-center px-1">
        <div className="flex h-5 min-w-[28px] justify-center rounded-sm border border-border bg-muted/60 px-1.5 shadow-sm">
          <div className="text-[11px] leading-4 font-semibold text-foreground tabular-nums">
            {floor.floor}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center px-1">
        <div className="flex w-full">
          <div className="flex h-5 w-full overflow-hidden rounded-sm border border-border/70 bg-muted/20 shadow-sm">
            {floor.tenants.map((tenant, index) => {
              const visualOverride = tenantVisualOverrides?.[tenant.id]
              const backgroundColor =
                visualOverride?.backgroundColor ??
                getTenantVisualColor({
                  tenant,
                  floor,
                  mode: vizMode,
                  averagePredictedRentPsf,
                })
              const title =
                visualOverride?.title ??
                getTenantVisualizationTitle({
                  tenant,
                  floor,
                  mode: vizMode,
                  averagePredictedRentPsf,
                })
              const isSelected =
                interactionMode === "drawer" && selectedTenantId === tenant.id

              const sharedProps = {
                title,
                style: {
                  width: `${tenant.widthPercent}%`,
                  minWidth: "10px",
                  backgroundColor,
                  opacity: visualOverride?.muted ? 0.35 : 1,
                  boxShadow: isSelected
                    ? "inset 0 0 0 2px rgba(255,255,255,0.72)"
                    : undefined,
                  borderRight:
                    index === floor.tenants.length - 1
                      ? "none"
                      : "1px solid rgba(255,255,255,0.55)",
                } satisfies React.CSSProperties,
                className: cn(
                  "h-full",
                  interactionMode === "drawer"
                    ? "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none focus-visible:ring-inset"
                    : "cursor-default",
                  isSelected ? "z-10 brightness-95" : "hover:brightness-95"
                ),
              }

              if (interactionMode === "none") {
                return <div key={tenant.id} {...sharedProps} aria-hidden />
              }

              return (
                <button
                  key={tenant.id}
                  {...sharedProps}
                  type="button"
                  onClick={() => onTenantSelect(tenant)}
                  aria-haspopup="dialog"
                  aria-expanded={selectedTenantId === tenant.id}
                  aria-label={`${tenant.name}, ${tenant.space}, ${
                    tenant.isVacant
                      ? tenant.availabilityStatus
                      : `expires ${tenant.expiration}`
                  }. Open details.`}
                />
              )
            })}
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
        <div className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          Total RSF
        </div>
        <div className="mt-1 text-[11px] font-semibold text-foreground tabular-nums">
          {totalSqft.toLocaleString()} SF
        </div>
      </div>
      <div className="flex flex-1 items-center justify-between gap-3 px-3 py-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <InlineMetricItem
            label="Occ"
            value={`${overallOccupancyPercent.toFixed(2)}%`}
            className="bg-background/70"
          />
          <InlineMetricItem
            label="Pred"
            value={formatCompactRate(averagePredictedRentPsf)}
          />
          <InlineMetricItem
            label="Contract"
            value={formatCompactRate(averageContractRatePsf)}
          />
          <InlineMetricItem
            label="Sun"
            value={formatCompactScore(averageSunScore)}
            valueStyle={{ color: getQualityScoreColor(averageSunScore) }}
          />
          <InlineMetricItem
            label="View"
            value={formatCompactScore(averageViewScore)}
            valueStyle={{ color: getQualityScoreColor(averageViewScore) }}
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
