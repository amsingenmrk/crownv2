import type { StackingPlanDataset } from "@/lib/stacking-plan-data"

const STORAGE_KEY_PREFIX = "glassbox:stacking-plan-tenant-forecast-overrides:"
const CHANGED_EVENT = "glassbox:stacking-plan-tenant-forecast-overrides-changed" as const

export const TENANT_TIME_TO_LEASE_MIN_MONTHS = 3
export const TENANT_TIME_TO_LEASE_MAX_MONTHS = 24
export const TENANT_RENEWAL_PROBABILITY_MIN_PCT = 10
export const TENANT_RENEWAL_PROBABILITY_MAX_PCT = 95

export type TenantForecastAssumptionOverride = {
  timeToLeaseMonths?: number
  renewalProbabilityPct?: number
}

export type TenantForecastAssumptionOverrideMap = Record<
  string,
  TenantForecastAssumptionOverride
>

type TenantForecastOverrideChangedDetail = {
  assetId: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function sanitizeOptionalInteger(
  value: unknown,
  min: number,
  max: number
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined
  }

  return clamp(Math.round(value), min, max)
}

function sanitizeOverride(
  value: TenantForecastAssumptionOverride
): TenantForecastAssumptionOverride {
  return {
    timeToLeaseMonths: sanitizeOptionalInteger(
      value.timeToLeaseMonths,
      TENANT_TIME_TO_LEASE_MIN_MONTHS,
      TENANT_TIME_TO_LEASE_MAX_MONTHS
    ),
    renewalProbabilityPct: sanitizeOptionalInteger(
      value.renewalProbabilityPct,
      TENANT_RENEWAL_PROBABILITY_MIN_PCT,
      TENANT_RENEWAL_PROBABILITY_MAX_PCT
    ),
  }
}

function hasOverrideValue(value: TenantForecastAssumptionOverride) {
  return value.timeToLeaseMonths != null || value.renewalProbabilityPct != null
}

export function stackingPlanTenantForecastOverridesStorageKey(assetId: string) {
  return `${STORAGE_KEY_PREFIX}${assetId}`
}

export function parseStackingPlanTenantForecastOverrideSnapshot(
  raw: string | null | undefined
): TenantForecastAssumptionOverrideMap {
  if (raw == null || raw === "") return {}

  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }

    const next: TenantForecastAssumptionOverrideMap = {}

    for (const [tenantId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        typeof tenantId !== "string" ||
        tenantId.trim() === "" ||
        value == null ||
        typeof value !== "object" ||
        Array.isArray(value)
      ) {
        continue
      }

      const sanitized = sanitizeOverride(
        value as TenantForecastAssumptionOverride
      )
      if (!hasOverrideValue(sanitized)) continue
      next[tenantId] = sanitized
    }

    return next
  } catch {
    return {}
  }
}

export function getStackingPlanTenantForecastOverrideSnapshot(assetId: string): string {
  if (typeof window === "undefined") return ""
  return (
    localStorage.getItem(stackingPlanTenantForecastOverridesStorageKey(assetId)) ?? ""
  )
}

export function subscribeStackingPlanTenantForecastOverrides(
  assetId: string,
  onStoreChange: () => void
): () => void {
  if (typeof window === "undefined") return () => {}

  const key = stackingPlanTenantForecastOverridesStorageKey(assetId)
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) onStoreChange()
  }
  const onChanged = (event: Event) => {
    const detail = (event as CustomEvent<TenantForecastOverrideChangedDetail>).detail
    if (detail?.assetId === assetId) {
      onStoreChange()
    }
  }

  window.addEventListener("storage", onStorage)
  window.addEventListener(CHANGED_EVENT, onChanged)

  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(CHANGED_EVENT, onChanged)
  }
}

export function setStackingPlanTenantForecastOverride(
  assetId: string,
  tenantId: string,
  value: TenantForecastAssumptionOverride
) {
  if (typeof window === "undefined") return

  const key = stackingPlanTenantForecastOverridesStorageKey(assetId)
  const current = parseStackingPlanTenantForecastOverrideSnapshot(
    localStorage.getItem(key)
  )
  const sanitized = sanitizeOverride(value)

  if (hasOverrideValue(sanitized)) {
    current[tenantId] = sanitized
  } else {
    delete current[tenantId]
  }

  if (Object.keys(current).length === 0) {
    localStorage.removeItem(key)
  } else {
    localStorage.setItem(key, JSON.stringify(current))
  }

  window.dispatchEvent(
    new CustomEvent<TenantForecastOverrideChangedDetail>(CHANGED_EVENT, {
      detail: { assetId },
    })
  )
}

export function applyStackingPlanTenantForecastOverrides(
  dataset: StackingPlanDataset,
  overrides: TenantForecastAssumptionOverrideMap
): StackingPlanDataset {
  if (Object.keys(overrides).length === 0) {
    return dataset
  }

  let hasChanges = false

  const floors = dataset.floors.map((floor) => {
    let floorChanged = false

    const tenants = floor.tenants.map((tenant) => {
      const override = overrides[tenant.id]
      if (override == null) return tenant

      floorChanged = true
      hasChanges = true

      return {
        ...tenant,
        timeToLeaseMonths: override.timeToLeaseMonths,
        renewalProbabilityPct: tenant.isVacant
          ? undefined
          : override.renewalProbabilityPct,
      }
    })

    return floorChanged ? { ...floor, tenants } : floor
  })

  return hasChanges ? { ...dataset, floors } : dataset
}
