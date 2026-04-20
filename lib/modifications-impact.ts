import {
  getSelectedModificationDetails,
  type ActiveModificationSelection,
  type ModId,
  type ModValues,
} from "@/lib/building-modifications"
import type {
  StackingPlanFloor,
  StackingPlanTenant,
} from "@/lib/stacking-plan-data"

const REFERENCE_DATE = new Date("2026-01-01T00:00:00Z")

const MOD_OPTION_IMPACT_PSF: Record<ModId, Record<string, number>> = {
  gym: {
    "training-gym": 0.6,
    "weight-room": 0.78,
    "yoga-pilates": 0.48,
    "full-service": 1.12,
  },
  bar: {
    "sports-bar": 0.42,
    "traditional-pubs": 0.32,
    "cocktail-bar": 0.56,
    "beer-garden": 0.38,
  },
  cafe: {
    "grab-and-go": 0.28,
    "social-work-friendly-cafe": 0.48,
    "health-drinks": 0.34,
  },
  restaurant: {
    "white-cloth": 0.98,
    takeout: 0.36,
    "fast-casual": 0.52,
    "family-friendly": 0.64,
    deli: 0.34,
  },
  leed: {
    "leed-certified": 0.42,
    "leed-silver": 0.68,
    "leed-gold": 0.98,
    "leed-platinum": 1.28,
  },
}

export type ModificationImpactBand = "inactive" | "low" | "medium" | "high"

export type ModificationLeaseTiming =
  | "available"
  | "near_term"
  | "medium_term"
  | "long_term"
  | "unknown"

export type SpaceSizeBucket = "small" | "medium" | "large"

export type RentGapBucket = "none" | "low" | "medium" | "high"

export type ModificationImpactSpace = StackingPlanTenant & {
  floor: number
  baselineRentPsf: number
  modifiedRentPsf: number
  deltaPsf: number
  deltaPct: number
  impactBand: ModificationImpactBand
  leaseTiming: ModificationLeaseTiming
  sizeBucket: SpaceSizeBucket
  rentGapBucket: RentGapBucket
}

export type ModificationImpactFloor = Omit<StackingPlanFloor, "tenants"> & {
  tenants: ModificationImpactSpace[]
}

export type ModificationImpactDataset = {
  activeSelections: ActiveModificationSelection[]
  floors: ModificationImpactFloor[]
}

export type ModificationImpactFilters = {
  floor: "all" | string
  query: string
  vacancy: "all" | "occupied" | "vacant"
  leaseTiming: "all" | ModificationLeaseTiming
  rentGap: "all" | Exclude<RentGapBucket, "none">
  size: "all" | SpaceSizeBucket
}

export type ModificationImpactMetrics = {
  averageBaselineRentPsf: number | null
  averageModifiedRentPsf: number | null
  averageLiftPsf: number | null
  averageLiftPct: number | null
  minLiftPsf: number | null
  minLiftPct: number | null
  maxLiftPsf: number | null
  maxLiftPct: number | null
  matchingSqft: number
  matchedSpaceCount: number
  impactedSqft: number
}

export function createDefaultModificationImpactFilters(): ModificationImpactFilters {
  return {
    floor: "all",
    query: "",
    vacancy: "all",
    leaseTiming: "all",
    rentGap: "all",
    size: "all",
  }
}

export function buildModificationImpactDataset(
  floors: StackingPlanFloor[],
  modValues: ModValues
): ModificationImpactDataset {
  const activeSelections = getSelectedModificationDetails(modValues)

  const rawFloors = floors.map((floor) => ({
    ...floor,
    tenants: floor.tenants.map((tenant) =>
      buildImpactSpace(tenant, floor, activeSelections)
    ),
  }))

  const maxDeltaPsf = rawFloors.reduce((maxValue, floor) => {
    const floorMax = floor.tenants.reduce(
      (tenantMax, tenant) => Math.max(tenantMax, tenant.deltaPsf),
      0
    )
    return Math.max(maxValue, floorMax)
  }, 0)

  return {
    activeSelections,
    floors: rawFloors.map((floor) => ({
      ...floor,
      tenants: floor.tenants.map((tenant) => ({
        ...tenant,
        impactBand: resolveImpactBand(tenant.deltaPsf, maxDeltaPsf),
      })),
    })),
  }
}

export function matchesImpactFilters(
  tenant: ModificationImpactSpace,
  filters: ModificationImpactFilters
) {
  if (filters.floor !== "all" && String(tenant.floor) !== filters.floor) {
    return false
  }

  if (filters.vacancy === "occupied" && tenant.isVacant) {
    return false
  }

  if (filters.vacancy === "vacant" && !tenant.isVacant) {
    return false
  }

  if (
    filters.leaseTiming !== "all" &&
    tenant.leaseTiming !== filters.leaseTiming
  ) {
    return false
  }

  if (filters.rentGap !== "all" && tenant.rentGapBucket !== filters.rentGap) {
    return false
  }

  if (filters.size !== "all" && tenant.sizeBucket !== filters.size) {
    return false
  }

  const query = filters.query.trim().toLowerCase()
  if (query === "") {
    return true
  }

  return [
    tenant.name,
    tenant.space,
    tenant.floorLabel,
    tenant.availabilityStatus,
    tenant.leaseType ?? "",
  ].some((value) => value.toLowerCase().includes(query))
}

export function deriveImpactMetrics(
  spaces: ModificationImpactSpace[]
): ModificationImpactMetrics {
  if (spaces.length === 0) {
    return {
      averageBaselineRentPsf: null,
      averageModifiedRentPsf: null,
      averageLiftPsf: null,
      averageLiftPct: null,
      minLiftPsf: null,
      minLiftPct: null,
      maxLiftPsf: null,
      maxLiftPct: null,
      matchingSqft: 0,
      matchedSpaceCount: 0,
      impactedSqft: 0,
    }
  }

  const matchingSqft = spaces.reduce((sum, tenant) => sum + tenant.sqft, 0)
  const baselineWeighted = spaces.reduce(
    (sum, tenant) => sum + tenant.sqft * tenant.baselineRentPsf,
    0
  )
  const modifiedWeighted = spaces.reduce(
    (sum, tenant) => sum + tenant.sqft * tenant.modifiedRentPsf,
    0
  )
  const deltaWeighted = spaces.reduce(
    (sum, tenant) => sum + tenant.sqft * tenant.deltaPsf,
    0
  )

  const averageBaselineRentPsf =
    matchingSqft === 0
      ? null
      : roundToHundredths(baselineWeighted / matchingSqft)
  const averageModifiedRentPsf =
    matchingSqft === 0
      ? null
      : roundToHundredths(modifiedWeighted / matchingSqft)
  const averageLiftPsf =
    matchingSqft === 0 ? null : roundToHundredths(deltaWeighted / matchingSqft)
  const averageLiftPct =
    averageBaselineRentPsf == null || averageBaselineRentPsf === 0
      ? null
      : roundToHundredths(
          (((averageModifiedRentPsf ?? 0) - averageBaselineRentPsf) /
            averageBaselineRentPsf) *
            100
        )
  const minLiftPsf = roundToHundredths(
    spaces.reduce(
      (minValue, tenant) => Math.min(minValue, tenant.deltaPsf),
      Number.POSITIVE_INFINITY
    )
  )
  const minLiftPct = roundToHundredths(
    spaces.reduce(
      (minValue, tenant) => Math.min(minValue, tenant.deltaPct),
      Number.POSITIVE_INFINITY
    )
  )
  const maxLiftPsf = roundToHundredths(
    spaces.reduce(
      (maxValue, tenant) => Math.max(maxValue, tenant.deltaPsf),
      Number.NEGATIVE_INFINITY
    )
  )
  const maxLiftPct = roundToHundredths(
    spaces.reduce(
      (maxValue, tenant) => Math.max(maxValue, tenant.deltaPct),
      Number.NEGATIVE_INFINITY
    )
  )

  return {
    averageBaselineRentPsf,
    averageModifiedRentPsf,
    averageLiftPsf,
    averageLiftPct,
    minLiftPsf,
    minLiftPct,
    maxLiftPsf,
    maxLiftPct,
    matchingSqft,
    matchedSpaceCount: spaces.length,
    impactedSqft: spaces
      .filter((tenant) => tenant.deltaPsf > 0)
      .reduce((sum, tenant) => sum + tenant.sqft, 0),
  }
}

function buildImpactSpace(
  tenant: StackingPlanTenant,
  floor: StackingPlanFloor,
  activeSelections: ActiveModificationSelection[]
): ModificationImpactSpace {
  const baselineRentPsf = getBaselineRentPsf(tenant, floor)
  const leaseTiming = getLeaseTiming(tenant)
  const sizeBucket = getSizeBucket(tenant.sqft)

  const deltaPsf = roundToHundredths(
    activeSelections.reduce((sum, selection) => {
      return (
        sum +
        getDriverImpactPsf({
          selection,
          tenant,
          floor,
          leaseTiming,
          sizeBucket,
        })
      )
    }, 0)
  )
  const modifiedRentPsf = roundToHundredths(baselineRentPsf + deltaPsf)
  const deltaPct =
    baselineRentPsf === 0
      ? 0
      : roundToHundredths((deltaPsf / baselineRentPsf) * 100)

  return {
    ...tenant,
    floor: floor.floor,
    baselineRentPsf,
    modifiedRentPsf,
    deltaPsf,
    deltaPct,
    impactBand: "inactive",
    leaseTiming,
    sizeBucket,
    rentGapBucket: getRentGapBucket(deltaPsf),
  }
}

function getDriverImpactPsf({
  selection,
  tenant,
  floor,
  leaseTiming,
  sizeBucket,
}: {
  selection: ActiveModificationSelection
  tenant: StackingPlanTenant
  floor: StackingPlanFloor
  leaseTiming: ModificationLeaseTiming
  sizeBucket: SpaceSizeBucket
}) {
  const baseImpact =
    MOD_OPTION_IMPACT_PSF[selection.id][selection.optionValue] ?? 0

  return roundToHundredths(
    baseImpact *
      getLeaseTimingWeight(leaseTiming) *
      getSizeWeight(sizeBucket) *
      getBuildoutWeight(tenant.buildout) *
      getFloorWeight(selection.id, floor.floor) *
      getQualityWeight(tenant)
  )
}

function getBaselineRentPsf(
  tenant: StackingPlanTenant,
  floor: StackingPlanFloor
) {
  const fallbackFloorRent =
    floor.valueDrivers.predictedRentPsf ||
    floor.valueDrivers.marketBaselineRentPsf

  return roundToHundredths(
    tenant.predictedRentPsfValue ??
      tenant.contractRatePsfValue ??
      fallbackFloorRent ??
      0
  )
}

function getLeaseTiming(tenant: StackingPlanTenant): ModificationLeaseTiming {
  if (tenant.isVacant) {
    return "available"
  }

  if (
    tenant.leaseExpirationDate == null ||
    tenant.leaseExpirationDate.trim() === ""
  ) {
    return "unknown"
  }

  const expiration = new Date(tenant.leaseExpirationDate)
  if (Number.isNaN(expiration.getTime())) {
    return "unknown"
  }

  const months =
    (expiration.getUTCFullYear() - REFERENCE_DATE.getUTCFullYear()) * 12 +
    (expiration.getUTCMonth() - REFERENCE_DATE.getUTCMonth())

  if (months <= 12) {
    return "near_term"
  }

  if (months <= 36) {
    return "medium_term"
  }

  return "long_term"
}

function getLeaseTimingWeight(timing: ModificationLeaseTiming) {
  switch (timing) {
    case "available":
      return 1.12
    case "near_term":
      return 0.88
    case "medium_term":
      return 0.62
    case "long_term":
      return 0.36
    case "unknown":
      return 0.52
  }
}

function getSizeBucket(sqft: number): SpaceSizeBucket {
  if (sqft <= 6000) {
    return "small"
  }

  if (sqft <= 12000) {
    return "medium"
  }

  return "large"
}

function getSizeWeight(size: SpaceSizeBucket) {
  switch (size) {
    case "small":
      return 0.94
    case "medium":
      return 1
    case "large":
      return 1.08
  }
}

function getBuildoutWeight(buildout: StackingPlanTenant["buildout"]) {
  switch (buildout) {
    case "Shell":
      return 1.1
    case "White Box":
      return 1
    case "Fully Built-Out":
      return 0.92
  }
}

function getFloorWeight(id: ModId, floor: number) {
  if (id === "leed") {
    return 1.02
  }

  if (id === "gym") {
    if (floor <= 8) return 1.06
    if (floor <= 18) return 1
    return 0.94
  }

  if (floor <= 8) return 1.12
  if (floor <= 18) return 1
  return 0.86
}

function getQualityWeight(tenant: StackingPlanTenant) {
  const sun = tenant.sunScore ?? 60
  const view = tenant.viewScore ?? 58
  const blended = (sun + view) / 2

  return 0.92 + Math.max(0, Math.min(0.18, (blended - 55) / 250))
}

function resolveImpactBand(
  deltaPsf: number,
  maxDeltaPsf: number
): ModificationImpactBand {
  if (deltaPsf <= 0 || maxDeltaPsf <= 0) {
    return "inactive"
  }

  if (deltaPsf <= maxDeltaPsf * 0.34) {
    return "low"
  }

  if (deltaPsf <= maxDeltaPsf * 0.67) {
    return "medium"
  }

  return "high"
}

function getRentGapBucket(deltaPsf: number): RentGapBucket {
  if (deltaPsf < 0.1) {
    return "none"
  }

  if (deltaPsf < 0.75) {
    return "low"
  }

  if (deltaPsf < 1.5) {
    return "medium"
  }

  return "high"
}

function roundToHundredths(value: number) {
  return Math.round(value * 100) / 100
}
