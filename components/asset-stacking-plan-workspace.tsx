"use client"

import * as React from "react"
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Download,
  Eraser,
  Merge,
  MoreVertical,
  Split,
  Upload,
} from "lucide-react"

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { INPUT_LABEL_TEXT_CLASS } from "@/components/ui/field"
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  applyStackingPlanTenantForecastOverrides,
  getStackingPlanTenantForecastOverrideSnapshot,
  parseStackingPlanTenantForecastOverrideSnapshot,
  setStackingPlanTenantForecastOverride,
  subscribeStackingPlanTenantForecastOverrides,
  TENANT_RENEWAL_PROBABILITY_MAX_PCT,
  TENANT_RENEWAL_PROBABILITY_MIN_PCT,
  TENANT_TIME_TO_LEASE_MAX_MONTHS,
  TENANT_TIME_TO_LEASE_MIN_MONTHS,
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
}

type VacantSplitModalState = {
  floorNumber: number
  tenantId: string
  totalSqft: number
  suiteA: string
  suiteB: string
  sqftA: string
  sqftB: string
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
const BUILDOUT_OPTIONS = ["Shell", "White Box", "Fully Built-Out"] as const

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

/** Avoid rebalancing on a single digit while typing large totals (e.g. 5 → 9995). */
function vacantSplitSfMinDigitsBeforeBalance(totalSqft: number) {
  return totalSqft >= 100 ? 2 : 1
}

function balanceVacantSplitSqftPair(
  totalSqft: number,
  editedSide: "a" | "b",
  rawEdited: string,
  previousOther: string
): { sqftA: string; sqftB: string } {
  const trimmed = rawEdited.trim()
  if (trimmed === "") {
    return editedSide === "a"
      ? { sqftA: "", sqftB: String(totalSqft) }
      : { sqftA: String(totalSqft), sqftB: "" }
  }

  const minDigits = vacantSplitSfMinDigitsBeforeBalance(totalSqft)
  const core = trimmed.replace(/^0+/, "") || ""

  if (core === "" || !/^\d+$/.test(core) || core.length < minDigits) {
    return editedSide === "a"
      ? { sqftA: trimmed, sqftB: previousOther }
      : { sqftA: previousOther, sqftB: trimmed }
  }

  const n = parseInt(core, 10)
  if (Number.isNaN(n)) {
    return editedSide === "a"
      ? { sqftA: trimmed, sqftB: previousOther }
      : { sqftA: previousOther, sqftB: trimmed }
  }

  const clamped = Math.min(Math.max(1, n), totalSqft - 1)
  const other = totalSqft - clamped
  return editedSide === "a"
    ? { sqftA: String(clamped), sqftB: String(other) }
    : { sqftA: String(other), sqftB: String(clamped) }
}

function finalizeVacantSplitSfOnBlur(
  totalSqft: number,
  blurredSide: "a" | "b",
  rawBlurred: string
): { sqftA: string; sqftB: string } {
  const t = rawBlurred.trim()
  const core = t.replace(/^0+/, "") || ""
  if (t === "" || core === "" || !/^\d+$/.test(core)) {
    const a = Math.floor(totalSqft / 2)
    return { sqftA: String(a), sqftB: String(totalSqft - a) }
  }
  let n = parseInt(core, 10)
  if (Number.isNaN(n)) {
    const a = Math.floor(totalSqft / 2)
    return { sqftA: String(a), sqftB: String(totalSqft - a) }
  }
  n = Math.min(Math.max(1, n), totalSqft - 1)
  const rest = totalSqft - n
  return blurredSide === "a"
    ? { sqftA: String(n), sqftB: String(rest) }
    : { sqftA: String(rest), sqftB: String(n) }
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
    left.timeToLeaseMonths === right.timeToLeaseMonths
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

const VACANT_SEGMENT_DISPLAY_NAME = "Vacant"

function createVacantTenantId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `vacant-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function suiteCoreForVacantSplit(space: string) {
  let raw = stripSuitePrefix(space).trim()
  raw = raw.replace(/-a$/i, "").replace(/-b$/i, "")
  return raw === "" ? "Suite" : raw
}

function splitVacantSuiteLabels(space: string): { first: string; second: string } {
  const core = suiteCoreForVacantSplit(space)
  return {
    first: normalizeSuiteValue(`${core}-A`),
    second: normalizeSuiteValue(`${core}-B`),
  }
}

function adjacentVacantMergeDirection(
  floor: StackingPlanFloor,
  tenantIndex: number
): "right" | "left" | null {
  const tenant = floor.tenants[tenantIndex]
  if (tenant == null || !tenant.isVacant) return null
  const right = floor.tenants[tenantIndex + 1]
  if (right?.isVacant) return "right"
  const left = floor.tenants[tenantIndex - 1]
  if (left?.isVacant) return "left"
  return null
}

type VacantSpaceMergeResult = {
  floors: StackingPlanFloor[]
  survivorTenantId: string
  mergedAwayTenantIds: string[]
}

function applyVacantSpaceMerge(
  floors: readonly StackingPlanFloor[],
  floorNumber: number,
  tenantId: string
): VacantSpaceMergeResult | null {
  const floorIndex = floors.findIndex((f) => f.floor === floorNumber)
  if (floorIndex < 0) return null
  const floor = floors[floorIndex]!
  const idx = floor.tenants.findIndex((t) => t.id === tenantId)
  if (idx < 0 || !floor.tenants[idx]!.isVacant) return null

  const direction = adjacentVacantMergeDirection(floor, idx)
  const tenants = [...floor.tenants]

  if (direction === "right") {
    const left = tenants[idx]!
    const right = tenants[idx + 1]!
    tenants[idx] = {
      ...left,
      sqft: left.sqft + right.sqft,
      name: VACANT_SEGMENT_DISPLAY_NAME,
    }
    tenants.splice(idx + 1, 1)
    const nextFloor = recalculateFloor({ ...floor, tenants })
    return {
      floors: floors.map((f, i) => (i === floorIndex ? nextFloor : f)),
      survivorTenantId: left.id,
      mergedAwayTenantIds: [right.id],
    }
  }

  if (direction === "left") {
    const left = tenants[idx - 1]!
    const right = tenants[idx]!
    tenants[idx - 1] = {
      ...left,
      sqft: left.sqft + right.sqft,
      name: VACANT_SEGMENT_DISPLAY_NAME,
    }
    tenants.splice(idx, 1)
    const nextFloor = recalculateFloor({ ...floor, tenants })
    return {
      floors: floors.map((f, i) => (i === floorIndex ? nextFloor : f)),
      survivorTenantId: left.id,
      mergedAwayTenantIds: [right.id],
    }
  }

  return null
}

type VacantSpaceSplitResult = {
  floors: StackingPlanFloor[]
  originalTenantId: string
  firstTenantId: string
}

type VacantSplitParts = {
  spaceA: string
  spaceB: string
  sqftA: number
  sqftB: number
}

function applyVacantSpaceSplit(
  floors: readonly StackingPlanFloor[],
  floorNumber: number,
  tenantId: string,
  parts: VacantSplitParts
): VacantSpaceSplitResult | null {
  const floorIndex = floors.findIndex((f) => f.floor === floorNumber)
  if (floorIndex < 0) return null
  const floor = floors[floorIndex]!
  const idx = floor.tenants.findIndex((t) => t.id === tenantId)
  const tenant = floor.tenants[idx]
  if (idx < 0 || tenant == null || !tenant.isVacant || tenant.sqft < 2) {
    return null
  }

  const sqftA = Math.round(parts.sqftA)
  const sqftB = Math.round(parts.sqftB)
  if (sqftA < 1 || sqftB < 1 || sqftA + sqftB !== tenant.sqft) {
    return null
  }

  const spaceA = normalizeSuiteValue(parts.spaceA.trim())
  const spaceB = normalizeSuiteValue(parts.spaceB.trim())
  if (spaceA === "" || spaceB === "") {
    return null
  }

  const idA = createVacantTenantId()
  const idB = createVacantTenantId()

  const nextA: StackingPlanTenant = {
    ...tenant,
    id: idA,
    space: spaceA,
    sqft: sqftA,
    name: VACANT_SEGMENT_DISPLAY_NAME,
  }
  const nextB: StackingPlanTenant = {
    ...tenant,
    id: idB,
    space: spaceB,
    sqft: sqftB,
    name: VACANT_SEGMENT_DISPLAY_NAME,
  }

  const tenants = [...floor.tenants]
  tenants.splice(idx, 1, nextA, nextB)
  const nextFloor = recalculateFloor({ ...floor, tenants })

  return {
    floors: floors.map((f, i) => (i === floorIndex ? nextFloor : f)),
    originalTenantId: tenant.id,
    firstTenantId: idA,
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
  const market = isMarketListingPinId(assetId)
  if (typeof window === "undefined") {
    return !market
  }
  try {
    const v = localStorage.getItem(rentRollImportedStorageKey(assetId))
    if (v === "1") return true
    if (v === "0") return false
    return !market
  } catch {
    return !market
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
  if (mode === "contractRate") {
    const band = getContractRateBandData(
      tenant,
      getWeightedFloorAverageRate(floor, "contractRatePsfValue")
    )
    return `${base} • ${tenant.contractRate ?? "N/A"} • ${band.label}`
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
  const stackingPlaceholderActive = !rentRollImported
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
  const [vacantSplitModal, setVacantSplitModal] =
    React.useState<VacantSplitModalState | null>(null)
  const [vacantSplitSaveError, setVacantSplitSaveError] = React.useState<
    string | null
  >(null)
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

    const timeToLeaseMonths = parseOptionalIntegerInput(
      tenantEditorDraft.timeToLeaseMonths,
      TENANT_TIME_TO_LEASE_MIN_MONTHS,
      TENANT_TIME_TO_LEASE_MAX_MONTHS
    )
    const renewalProbabilityPct = selectedTenant.isVacant
      ? undefined
      : parseOptionalIntegerInput(
          tenantEditorDraft.renewalProbabilityPct,
          TENANT_RENEWAL_PROBABILITY_MIN_PCT,
          TENANT_RENEWAL_PROBABILITY_MAX_PCT
        )

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
              timeToLeaseMonths,
              renewalProbabilityPct: undefined,
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
              contractRatePsfValue != null &&
              predictedRentPsfValue != null &&
              rentPremiumPctValue != null
                ? `+$${(predictedRentPsfValue - contractRatePsfValue).toFixed(2)} / SF (+${rentPremiumPctValue.toFixed(
                    1
                  )}% vs contract rent)`
                : tenant.rentPremium,
            renewalProbabilityPct,
            timeToLeaseMonths,
          }
          return updatedTenant
        })

        return recalculateFloor({ ...floor, tenants: nextTenants })
      })
    )

    setStackingPlanTenantForecastOverride(assetId, selectedTenant.id, {
      renewalProbabilityPct,
      timeToLeaseMonths,
    })

    if (updatedTenant != null) {
      setTenantEditorDraft(buildTenantEditorDraft(updatedTenant))
    }
  }, [assetId, selectedTenant, tenantEditorDraft])

  const handleVacantSpaceCombine = React.useCallback(
    (floorNumber: number, tenantId: string) => {
      const result = applyVacantSpaceMerge(floors, floorNumber, tenantId)
      if (result == null) return
      setFloors(result.floors)
      for (const removedId of result.mergedAwayTenantIds) {
        setStackingPlanTenantForecastOverride(assetId, removedId, {})
      }
      if (
        selectedTenantId != null &&
        result.mergedAwayTenantIds.includes(selectedTenantId)
      ) {
        setSelectedTenantId(result.survivorTenantId)
        const survivor = result.floors
          .flatMap((f) => f.tenants)
          .find((t) => t.id === result.survivorTenantId)
        setTenantEditorDraft(
          survivor != null ? buildTenantEditorDraft(survivor) : null
        )
      }
    },
    [assetId, floors, selectedTenantId]
  )

  const handleVacantSpaceSplitOpen = React.useCallback(
    (floorNumber: number, tenantId: string) => {
      const floor = floors.find((f) => f.floor === floorNumber)
      const tenant = floor?.tenants.find((t) => t.id === tenantId)
      if (tenant == null || !tenant.isVacant || tenant.sqft < 2) return

      const sqftA = Math.floor(tenant.sqft / 2)
      const sqftB = tenant.sqft - sqftA
      const { first, second } = splitVacantSuiteLabels(tenant.space)
      setVacantSplitSaveError(null)
      setVacantSplitModal({
        floorNumber,
        tenantId,
        totalSqft: tenant.sqft,
        suiteA: stripSuitePrefix(first),
        suiteB: stripSuitePrefix(second),
        sqftA: String(sqftA),
        sqftB: String(sqftB),
      })
    },
    [floors]
  )

  const handleVacantSplitModalClose = React.useCallback(() => {
    setVacantSplitModal(null)
    setVacantSplitSaveError(null)
  }, [])

  const handleVacantSplitModalSave = React.useCallback(() => {
    if (vacantSplitModal == null) return

    const {
      floorNumber,
      tenantId,
      totalSqft,
      suiteA,
      suiteB,
      sqftA: sqftARaw,
      sqftB: sqftBRaw,
    } = vacantSplitModal

    const sqftA = parseNumericInput(sqftARaw)
    const sqftB = parseNumericInput(sqftBRaw)
    if (
      sqftA == null ||
      sqftB == null ||
      sqftA !== Math.floor(sqftA) ||
      sqftB !== Math.floor(sqftB)
    ) {
      setVacantSplitSaveError(
        "Enter a whole number of rentable SF for each space."
      )
      return
    }
    const sqftAi = Math.round(sqftA)
    const sqftBi = Math.round(sqftB)
    if (sqftAi < 1 || sqftBi < 1) {
      setVacantSplitSaveError("Each space needs at least 1 SF.")
      return
    }
    if (sqftAi + sqftBi !== totalSqft) {
      setVacantSplitSaveError(
        `The two SF values must add up to ${totalSqft.toLocaleString()} SF (the current vacant total).`
      )
      return
    }

    const spaceA = normalizeSuiteValue(suiteA.trim())
    const spaceB = normalizeSuiteValue(suiteB.trim())
    if (spaceA === "" || spaceB === "") {
      setVacantSplitSaveError("Enter a suite name for each space.")
      return
    }

    const result = applyVacantSpaceSplit(floors, floorNumber, tenantId, {
      spaceA,
      spaceB,
      sqftA: sqftAi,
      sqftB: sqftBi,
    })
    if (result == null) {
      setVacantSplitSaveError(
        "Could not apply split. Check values and try again."
      )
      return
    }

    setFloors(result.floors)
    setStackingPlanTenantForecastOverride(assetId, result.originalTenantId, {})
    if (selectedTenantId === result.originalTenantId) {
      setSelectedTenantId(result.firstTenantId)
      const first = result.floors
        .flatMap((f) => f.tenants)
        .find((t) => t.id === result.firstTenantId)
      setTenantEditorDraft(
        first != null ? buildTenantEditorDraft(first) : null
      )
    }
    handleVacantSplitModalClose()
  }, [
    assetId,
    floors,
    handleVacantSplitModalClose,
    selectedTenantId,
    vacantSplitModal,
  ])

  React.useEffect(() => {
    setFloors(derivedFloorsFromDataset)
    setIsDrawerOpen(false)
    setSelectedTenantId(null)
    setTenantEditorDraft(null)
    setExpandedFloor(null)
    setVacantSplitModal(null)
    setVacantSplitSaveError(null)
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
              {rentRollImported ? (
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
              )}
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
              onVacantSpaceCombine={handleVacantSpaceCombine}
              onVacantSpaceSplit={handleVacantSpaceSplitOpen}
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
                      {rentRollImported ? (
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
                      )}
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
          <div className="bg-background py-3 sm:py-4">
            <div className="w-full min-w-0 max-w-full">
              {displayedFloors.map((floor) => (
                <SimplifiedFloorRow
                  key={floor.floor}
                  floor={floor}
                  vizMode={vizMode}
                  averagePredictedRentPsf={averagePredictedRentPsf}
                  onTenantSelect={handleTenantSelect}
                  onVacantSpaceCombine={handleVacantSpaceCombine}
                  onVacantSpaceSplit={handleVacantSpaceSplitOpen}
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

      {vacantSplitModal != null ? (
        <Dialog
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) handleVacantSplitModalClose()
          }}
        >
          <DialogContent className="max-w-2xl sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Split vacant space</DialogTitle>
              <DialogDescription>
                Set suite and rentable SF for each side. Editing SF in one
                column updates the other so the two sides always total{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {vacantSplitModal.totalSqft.toLocaleString()} SF
                </span>
                .
              </DialogDescription>
            </DialogHeader>

            <form
              className="contents"
              onSubmit={(event) => {
                event.preventDefault()
                handleVacantSplitModalSave()
              }}
            >
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
                <p className="text-sm font-semibold leading-none text-muted-foreground">
                  Space 1
                </p>
                <label className="block space-y-1.5">
                  <span className={INPUT_LABEL_TEXT_CLASS}>
                    Suite
                  </span>
                  <Input
                    value={vacantSplitModal.suiteA}
                    onChange={(event) => {
                      setVacantSplitSaveError(null)
                      setVacantSplitModal((m) =>
                        m == null ? m : { ...m, suiteA: event.target.value }
                      )
                    }}
                    placeholder="1201-A"
                    autoComplete="off"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className={INPUT_LABEL_TEXT_CLASS}>
                    SF
                  </span>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={vacantSplitModal.sqftA}
                    onChange={(event) => {
                      setVacantSplitSaveError(null)
                      const raw = event.target.value
                      setVacantSplitModal((m) => {
                        if (m == null) return m
                        const { sqftA, sqftB } = balanceVacantSplitSqftPair(
                          m.totalSqft,
                          "a",
                          raw,
                          m.sqftB
                        )
                        return { ...m, sqftA, sqftB }
                      })
                    }}
                    onBlur={() => {
                      setVacantSplitSaveError(null)
                      setVacantSplitModal((m) => {
                        if (m == null) return m
                        const { sqftA, sqftB } = finalizeVacantSplitSfOnBlur(
                          m.totalSqft,
                          "a",
                          m.sqftA
                        )
                        return { ...m, sqftA, sqftB }
                      })
                    }}
                    autoComplete="off"
                  />
                </label>
              </div>

              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
                <p className="text-sm font-semibold leading-none text-muted-foreground">
                  Space 2
                </p>
                <label className="block space-y-1.5">
                  <span className={INPUT_LABEL_TEXT_CLASS}>
                    Suite
                  </span>
                  <Input
                    value={vacantSplitModal.suiteB}
                    onChange={(event) => {
                      setVacantSplitSaveError(null)
                      setVacantSplitModal((m) =>
                        m == null ? m : { ...m, suiteB: event.target.value }
                      )
                    }}
                    placeholder="1201-B"
                    autoComplete="off"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className={INPUT_LABEL_TEXT_CLASS}>
                    SF
                  </span>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={vacantSplitModal.sqftB}
                    onChange={(event) => {
                      setVacantSplitSaveError(null)
                      const raw = event.target.value
                      setVacantSplitModal((m) => {
                        if (m == null) return m
                        const { sqftA, sqftB } = balanceVacantSplitSqftPair(
                          m.totalSqft,
                          "b",
                          raw,
                          m.sqftA
                        )
                        return { ...m, sqftA, sqftB }
                      })
                    }}
                    onBlur={() => {
                      setVacantSplitSaveError(null)
                      setVacantSplitModal((m) => {
                        if (m == null) return m
                        const { sqftA, sqftB } = finalizeVacantSplitSfOnBlur(
                          m.totalSqft,
                          "b",
                          m.sqftB
                        )
                        return { ...m, sqftA, sqftB }
                      })
                    }}
                    autoComplete="off"
                  />
                </label>
              </div>
            </div>

            {vacantSplitSaveError != null ? (
              <p className="text-sm text-destructive">{vacantSplitSaveError}</p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleVacantSplitModalClose}
              >
                Cancel
              </Button>
              <Button type="submit">Save split</Button>
            </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
  const tone = stackingSegmentToneFromHex(visualColor)
  const isCompact = tenant.widthPercent < 14
  const isSemiCompact = tenant.widthPercent < 18
  const isVeryCompact = tenant.widthPercent < 7
  const hoverInteractionClass = isVeryCompact
    ? "hover:ring-1 hover:ring-inset hover:ring-foreground/15"
    : "hover:-translate-y-px hover:shadow-sm hover:shadow-foreground/8 hover:ring-1 hover:ring-inset hover:ring-foreground/15"

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
        tone.fillClass,
        !isLastTenant && "border-r border-border/30",
        isSelected
          ? "z-10 ring-2 ring-primary/70 ring-inset"
          : hoverInteractionClass
      )}
      style={{
        width: `${tenant.widthPercent}%`,
        minWidth: isVeryCompact ? "12px" : "28px",
      }}
      title={title}
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
            <div className={cn("truncate", tone.metaClass)}>{tenant.sqftLabel}</div>
          ) : null}
          <div className={cn("truncate", tone.metaClass)}>{tenant.expiration}</div>
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
  onVacantSpaceCombine,
  onVacantSpaceSplit,
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
  stackingPlaceholderActive: boolean
  onVacantSpaceCombine: (floorNumber: number, tenantId: string) => void
  onVacantSpaceSplit: (floorNumber: number, tenantId: string) => void
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
            onVacantSpaceCombine={onVacantSpaceCombine}
            onVacantSpaceSplit={onVacantSpaceSplit}
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
  onVacantSpaceCombine,
  onVacantSpaceSplit,
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
  metricsPlaceholder: boolean
  isExpanded: boolean
  onToggleExpanded: () => void
  onTenantSelect: (tenant: StackingPlanTenant) => void
  onVacantSpaceCombine: (floorNumber: number, tenantId: string) => void
  onVacantSpaceSplit: (floorNumber: number, tenantId: string) => void
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
                  onVacantSpaceCombine={onVacantSpaceCombine}
                  onVacantSpaceSplit={onVacantSpaceSplit}
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
                <span className="text-[10px] font-medium tracking-normal">
                  {isExpanded ? "Hide" : "Value drivers"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {activeTenant != null && tenantEditorDraft != null ? (
        <SelectedTenantEditorRow
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
  onVacantSpaceCombine,
  onVacantSpaceSplit,
}: {
  floor: StackingPlanFloor
  vizMode: StackingVizMode
  averagePredictedRentPsf: number | null
  selectedTenantId: string | null
  showEmptyPlaceholder: boolean
  onTenantSelect: (tenant: StackingPlanTenant) => void
  onVacantSpaceCombine: (floorNumber: number, tenantId: string) => void
  onVacantSpaceSplit: (floorNumber: number, tenantId: string) => void
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
          "isolate flex h-[36px] w-full items-stretch overflow-hidden rounded-lg border border-border/50 bg-muted/10 ring-1 ring-inset ring-border/30",
          isMetricDrivenView &&
            "border-border/60 bg-background/55 ring-border/40"
        )}
      >
        <div className="h-full w-full rounded-md bg-muted/55" aria-hidden />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "isolate flex h-[78px] w-full items-stretch overflow-hidden rounded-lg border border-border/50 bg-muted/10 ring-1 ring-inset ring-border/30",
        isMetricDrivenView && "border-border/60 bg-background/55 ring-border/40"
      )}
    >
      {floor.tenants.map((tenant, index) => (
        <StackBandSegment
          key={tenant.id}
          tenant={tenant}
          tenantIndex={index}
          floor={floor}
          vizMode={vizMode}
          averagePredictedRentPsf={averagePredictedRentPsf}
          isFirstTenant={index === 0}
          isLastTenant={index === floor.tenants.length - 1}
          isSelected={selectedTenantId === tenant.id}
          showTrailingDivider={
            index !== floor.tenants.length - 1 &&
            selectedTenantId !== tenant.id &&
            selectedTenantId !== floor.tenants[index + 1]?.id
          }
          onTenantSelect={onTenantSelect}
          onVacantSpaceCombine={onVacantSpaceCombine}
          onVacantSpaceSplit={onVacantSpaceSplit}
        />
      ))}
    </div>
  )
}

function StackBandSegment({
  tenant,
  tenantIndex,
  floor,
  vizMode,
  averagePredictedRentPsf,
  isFirstTenant,
  isLastTenant,
  isSelected,
  showTrailingDivider,
  onTenantSelect,
  onVacantSpaceCombine,
  onVacantSpaceSplit,
}: {
  tenant: StackingPlanTenant
  tenantIndex: number
  floor: StackingPlanFloor
  vizMode: StackingVizMode
  averagePredictedRentPsf: number | null
  isFirstTenant: boolean
  isLastTenant: boolean
  isSelected: boolean
  showTrailingDivider: boolean
  onTenantSelect: (tenant: StackingPlanTenant) => void
  onVacantSpaceCombine: (floorNumber: number, tenantId: string) => void
  onVacantSpaceSplit: (floorNumber: number, tenantId: string) => void
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
  const canCombineVacant =
    tenant.isVacant &&
    adjacentVacantMergeDirection(floor, tenantIndex) != null
  const canSplitVacant = tenant.isVacant && tenant.sqft >= 2

  const segmentSurfaceClass = cn(
    "relative flex h-full min-h-0 flex-col justify-center gap-1.5 overflow-hidden text-left transition-[ring-color,box-shadow,transform] duration-150",
    tenant.isVacant ? "stacking-plan-vacant-slot" : tone.fillClass,
    isFirstTenant && "rounded-l-[7px]",
    isLastTenant && "rounded-r-[7px]",
    showTrailingDivider && "border-r border-border/30",
    isSelected
      ? "z-10 ring-2 ring-inset ring-primary/80"
      : hoverInteractionClass
  )

  return (
    <div
      className="relative isolate flex h-full min-h-0 min-w-0 flex-col"
      style={{
        width: `${tenant.widthPercent}%`,
        minWidth: isVeryCompact ? "18px" : "40px",
      }}
    >
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
          "relative z-0 flex h-full min-h-0 w-full min-w-0 cursor-pointer flex-col justify-center gap-1.5 overflow-hidden px-2.5 py-2 text-left focus-visible:z-[5] focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset",
          segmentSurfaceClass,
          tenant.isVacant && "pr-7"
        )}
        title={getTenantVisualizationTitle({
          tenant,
          floor,
          mode: vizMode,
          averagePredictedRentPsf,
        })}
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
      {tenant.isVacant ? (
        <div
          className="pointer-events-auto absolute top-1 right-1 z-20 p-0.5"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`More actions for vacant ${tenant.space}`}
                />
              }
            >
              <MoreVertical className="size-3.5" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4} className="min-w-40">
              <DropdownMenuItem
                disabled={!canCombineVacant}
                onClick={() => onVacantSpaceCombine(floor.floor, tenant.id)}
              >
                <Merge className="size-4 shrink-0 opacity-70" aria-hidden />
                Combine spaces
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canSplitVacant}
                onClick={() => onVacantSpaceSplit(floor.floor, tenant.id)}
              >
                <Split className="size-4 shrink-0 opacity-70" aria-hidden />
                Split space
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
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
            <span className={INPUT_LABEL_TEXT_CLASS}>
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
          <span className={INPUT_LABEL_TEXT_CLASS}>
            Suite
          </span>
          <Input
            value={draft.suite}
            onChange={(event) => onDraftChange("suite", event.target.value)}
            placeholder="1201"
          />
        </label>

        <label className="space-y-1.5">
          <span className={INPUT_LABEL_TEXT_CLASS}>
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
          <span className={INPUT_LABEL_TEXT_CLASS}>
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
            <span className={INPUT_LABEL_TEXT_CLASS}>
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
              <span className={INPUT_LABEL_TEXT_CLASS}>
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
              <span className={INPUT_LABEL_TEXT_CLASS}>
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
              <span className={INPUT_LABEL_TEXT_CLASS}>
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
              <span className={INPUT_LABEL_TEXT_CLASS}>
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

        <label className="space-y-1.5">
          <span className={INPUT_LABEL_TEXT_CLASS}>
            Time to Lease
          </span>
          <Input
            type="number"
            min={String(TENANT_TIME_TO_LEASE_MIN_MONTHS)}
            max={String(TENANT_TIME_TO_LEASE_MAX_MONTHS)}
            step="1"
            value={draft.timeToLeaseMonths}
            onChange={(event) =>
              onDraftChange("timeToLeaseMonths", event.target.value)
            }
            placeholder="Building default"
          />
        </label>

        {!tenant.isVacant ? (
          <label className="space-y-1.5">
            <span className={INPUT_LABEL_TEXT_CLASS}>
              Renewal Probability
            </span>
            <Input
              type="number"
              min={String(TENANT_RENEWAL_PROBABILITY_MIN_PCT)}
              max={String(TENANT_RENEWAL_PROBABILITY_MAX_PCT)}
              step="1"
              value={draft.renewalProbabilityPct}
              onChange={(event) =>
                onDraftChange("renewalProbabilityPct", event.target.value)
              }
              placeholder="Building default"
            />
          </label>
        ) : (
          null
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
  floor,
  tenant,
  draft,
  onDraftChange,
  onCancel,
  onClose,
  onSave,
}: {
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
          <div className="mb-3">
            <p className="text-sm font-semibold text-foreground">
              Suite Editor • Floor {floor.floor} • {tenant.space}
            </p>
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

function SimplifiedStackingHoverSummary({
  text,
  trigger,
}: {
  text: string
  trigger: React.ReactElement<Record<string, unknown>>
}) {
  if (!text.trim()) {
    return trigger
  }

  return (
    <Tooltip>
      <TooltipTrigger render={trigger} />
      <TooltipContent
        side="top"
        sideOffset={6}
        className="max-w-[min(22rem,calc(100vw-2rem))] px-3 py-2 text-left text-xs leading-snug font-medium text-background"
      >
        <span className="block whitespace-pre-line">{text}</span>
      </TooltipContent>
    </Tooltip>
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
  onVacantSpaceCombine,
  onVacantSpaceSplit,
  selectedTenantId,
  interactionMode,
  tenantVisualOverrides,
  showRentRollPlaceholder = false,
}: {
  floor: StackingPlanFloor
  vizMode: StackingVizMode
  averagePredictedRentPsf: number | null
  onTenantSelect: (tenant: StackingPlanTenant) => void
  onVacantSpaceCombine: (floorNumber: number, tenantId: string) => void
  onVacantSpaceSplit: (floorNumber: number, tenantId: string) => void
  selectedTenantId: string | null
  interactionMode: "drawer" | "none"
  tenantVisualOverrides?: Record<string, SimplifiedTenantVisualOverride>
  showRentRollPlaceholder?: boolean
}) {
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
              floor.tenants.map((tenant, index) => {
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
                  floor,
                  mode: vizMode,
                  averagePredictedRentPsf,
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

              const canCombineVacant =
                tenant.isVacant &&
                adjacentVacantMergeDirection(floor, index) != null
              const canSplitVacant = tenant.isVacant && tenant.sqft >= 2

              const vacantMenu =
                interactionMode === "drawer" && tenant.isVacant ? (
                  <div
                    className="pointer-events-auto absolute inset-y-0 right-0 z-20 flex items-start justify-end pr-1 pt-0.5"
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-foreground [&_svg]:size-2.5"
                            aria-label={`More actions for vacant ${tenant.space}`}
                          />
                        }
                      >
                        <MoreVertical className="size-2.5" aria-hidden />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        sideOffset={4}
                        className="min-w-40"
                      >
                        <DropdownMenuItem
                          disabled={!canCombineVacant}
                          onClick={() =>
                            onVacantSpaceCombine(floor.floor, tenant.id)
                          }
                        >
                          <Merge className="size-4 shrink-0 opacity-70" aria-hidden />
                          Combine spaces
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!canSplitVacant}
                          onClick={() =>
                            onVacantSpaceSplit(floor.floor, tenant.id)
                          }
                        >
                          <Split className="size-4 shrink-0 opacity-70" aria-hidden />
                          Split space
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null

              if (interactionMode === "none") {
                return tenant.isVacant ? (
                  <div
                    key={tenant.id}
                    className="relative isolate flex h-full min-h-0 min-w-0 flex-col"
                    style={segmentFlexStyle}
                  >
                    <SimplifiedStackingHoverSummary
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
                    {vacantMenu}
                  </div>
                ) : (
                  <div
                    key={tenant.id}
                    className="relative flex h-full min-h-0 min-w-0"
                    style={segmentFlexStyle}
                  >
                    <SimplifiedStackingHoverSummary
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
                    <SimplifiedStackingHoverSummary
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
                    {vacantMenu}
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
                  <SimplifiedStackingHoverSummary
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
