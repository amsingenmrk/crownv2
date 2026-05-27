import type { AssetLeasingAssumptionsState } from "@/lib/asset-leasing-assumptions"
import { LEASE_TYPE_OPTIONS, type LeaseTypeValue } from "@/lib/asset-leasing-assumptions"
import type { TenantForecastAssumptionOverride } from "@/lib/stacking-plan-tenant-forecast-overrides"
import {
  TENANT_OCCUPANCY_TARGET_MAX_PCT,
  TENANT_OCCUPANCY_TARGET_MIN_PCT,
  TENANT_RENEWAL_PROBABILITY_MAX_PCT,
  TENANT_RENEWAL_PROBABILITY_MIN_PCT,
  TENANT_SPACE_LEASE_TERM_MAX_YEARS,
  TENANT_SPACE_LEASE_TERM_MIN_YEARS,
  TENANT_TIME_TO_LEASE_MAX_MONTHS,
  TENANT_TIME_TO_LEASE_MIN_MONTHS,
} from "@/lib/stacking-plan-tenant-forecast-overrides"

export type SpaceAssumptionEditorDraft = {
  timeToLeaseMonths: string
  occupancyTargetPct: string
  renewalProbabilityPct: string
  assumptionLeaseType: string
  leaseTermYears: string
}

function parseOptionalIntegerInput(value: string, min: number, max: number) {
  const normalized = value.replace(/[^0-9.-]/g, "")
  if (normalized.trim() === "") return undefined
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return undefined
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

function isLeaseTypeValue(value: string): value is LeaseTypeValue {
  return LEASE_TYPE_OPTIONS.some((option) => option.value === value)
}

export function resolveSpaceAssumptionsForEditor(
  draft: SpaceAssumptionEditorDraft,
  building: AssetLeasingAssumptionsState
): AssetLeasingAssumptionsState {
  return {
    ...building,
    timeToLeaseMonths:
      parseOptionalIntegerInput(
        draft.timeToLeaseMonths,
        TENANT_TIME_TO_LEASE_MIN_MONTHS,
        TENANT_TIME_TO_LEASE_MAX_MONTHS
      ) ?? building.timeToLeaseMonths,
    occupancyTargetPct:
      parseOptionalIntegerInput(
        draft.occupancyTargetPct,
        TENANT_OCCUPANCY_TARGET_MIN_PCT,
        TENANT_OCCUPANCY_TARGET_MAX_PCT
      ) ?? building.occupancyTargetPct,
    defaultRenewalProbabilityPct:
      parseOptionalIntegerInput(
        draft.renewalProbabilityPct,
        TENANT_RENEWAL_PROBABILITY_MIN_PCT,
        TENANT_RENEWAL_PROBABILITY_MAX_PCT
      ) ?? building.defaultRenewalProbabilityPct,
    leaseType: isLeaseTypeValue(draft.assumptionLeaseType)
      ? draft.assumptionLeaseType
      : building.leaseType,
    leaseTermYears:
      parseOptionalIntegerInput(
        draft.leaseTermYears,
        TENANT_SPACE_LEASE_TERM_MIN_YEARS,
        TENANT_SPACE_LEASE_TERM_MAX_YEARS
      ) ?? building.leaseTermYears,
  }
}

export function buildTenantForecastAssumptionOverrideFromEditor(
  draft: SpaceAssumptionEditorDraft,
  building: AssetLeasingAssumptionsState,
  options: { isVacant: boolean }
): TenantForecastAssumptionOverride {
  const resolved = resolveSpaceAssumptionsForEditor(draft, building)
  const override: TenantForecastAssumptionOverride = {}

  if (resolved.timeToLeaseMonths !== building.timeToLeaseMonths) {
    override.timeToLeaseMonths = resolved.timeToLeaseMonths
  }
  if (resolved.occupancyTargetPct !== building.occupancyTargetPct) {
    override.occupancyTargetPct = resolved.occupancyTargetPct
  }
  if (
    !options.isVacant &&
    resolved.defaultRenewalProbabilityPct !== building.defaultRenewalProbabilityPct
  ) {
    override.renewalProbabilityPct = resolved.defaultRenewalProbabilityPct
  }
  if (resolved.leaseType !== building.leaseType) {
    override.leaseType = resolved.leaseType
  }
  if (resolved.leaseTermYears !== building.leaseTermYears) {
    override.leaseTermYears = resolved.leaseTermYears
  }

  return override
}

export function spaceAssumptionUpdatesToDraft(
  updates: Partial<AssetLeasingAssumptionsState>,
  building: AssetLeasingAssumptionsState
): Partial<SpaceAssumptionEditorDraft> {
  const next: Partial<SpaceAssumptionEditorDraft> = {}

  if (updates.timeToLeaseMonths != null) {
    next.timeToLeaseMonths =
      updates.timeToLeaseMonths === building.timeToLeaseMonths
        ? ""
        : String(updates.timeToLeaseMonths)
  }
  if (updates.occupancyTargetPct != null) {
    next.occupancyTargetPct =
      updates.occupancyTargetPct === building.occupancyTargetPct
        ? ""
        : String(updates.occupancyTargetPct)
  }
  if (updates.defaultRenewalProbabilityPct != null) {
    next.renewalProbabilityPct =
      updates.defaultRenewalProbabilityPct === building.defaultRenewalProbabilityPct
        ? ""
        : String(updates.defaultRenewalProbabilityPct)
  }
  if (updates.leaseType != null) {
    next.assumptionLeaseType =
      updates.leaseType === building.leaseType ? "" : updates.leaseType
  }
  if (updates.leaseTermYears != null) {
    next.leaseTermYears =
      updates.leaseTermYears === building.leaseTermYears
        ? ""
        : String(updates.leaseTermYears)
  }

  return next
}
