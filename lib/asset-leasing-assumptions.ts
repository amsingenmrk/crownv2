import {
  defaultForecastAssumptionsForAsset,
  type ForecastAssumptions,
} from "@/lib/forecast-data"

export const LEASE_TYPE_OPTIONS = [
  { value: "gross", label: "Gross" },
  { value: "modified-gross", label: "Modified gross" },
  { value: "nnn", label: "NNN" },
] as const

export type LeaseTypeValue = (typeof LEASE_TYPE_OPTIONS)[number]["value"]

export type AssetLeasingAssumptionsState = ForecastAssumptions & {
  leaseType: LeaseTypeValue
  leaseTermYears: number
}

export function assetLeasingAssumptionsStorageKey(assetId: string) {
  return `glassbox:asset-leasing-assumptions:${assetId}`
}

export function defaultAssetLeasingAssumptions(
  assetId: string
): AssetLeasingAssumptionsState {
  return {
    ...defaultForecastAssumptionsForAsset(assetId),
    leaseType: "modified-gross",
    leaseTermYears: 5,
  }
}

function clampLeaseTermYears(value: number) {
  return Math.min(30, Math.max(1, Math.round(value)))
}

function isLeaseTypeValue(value: string): value is LeaseTypeValue {
  return LEASE_TYPE_OPTIONS.some((option) => option.value === value)
}

export function parseStoredAssetLeasingAssumptions(
  raw: string | null,
  assetId: string
): AssetLeasingAssumptionsState {
  const fallback = defaultAssetLeasingAssumptions(assetId)
  if (!raw) return fallback

  try {
    const parsed = JSON.parse(raw) as Partial<AssetLeasingAssumptionsState>
    return {
      ...fallback,
      ...parsed,
      leaseType: isLeaseTypeValue(String(parsed.leaseType ?? ""))
        ? (parsed.leaseType as AssetLeasingAssumptionsState["leaseType"])
        : fallback.leaseType,
      leaseTermYears: clampLeaseTermYears(
        Number(parsed.leaseTermYears ?? fallback.leaseTermYears)
      ),
      timeToLeaseMonths: Math.round(
        Number(parsed.timeToLeaseMonths ?? fallback.timeToLeaseMonths)
      ),
      occupancyTargetPct: Math.round(
        Number(parsed.occupancyTargetPct ?? fallback.occupancyTargetPct)
      ),
      defaultRenewalProbabilityPct: Math.round(
        Number(
          parsed.defaultRenewalProbabilityPct ??
            fallback.defaultRenewalProbabilityPct
        )
      ),
    }
  } catch {
    return fallback
  }
}

export function persistAssetLeasingAssumptions(
  assetId: string,
  state: AssetLeasingAssumptionsState
) {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(
      assetLeasingAssumptionsStorageKey(assetId),
      JSON.stringify(state)
    )
  } catch {
    /* ignore quota / private mode */
  }
}
