import { getAssetById } from "@/lib/assets"

export type StackingViewMode = "detailed" | "simplified"

export type StackingLegendItem = {
  label: string
  color: string
}

export type StackingPlanContact = {
  role: string
  name: string
  title: string
  phone: string
  email: string
}

export type StackingPlanTenant = {
  id: string
  name: string
  space: string
  sqft: number
  sqftLabel: string
  expiration: string
  color: string
  widthPercent: number
  isVacant: boolean
  address: string
  floorLabel: string
  owner: string
  buildout: "Shell" | "White Box" | "Fully Built-Out"
  verificationStatus: string
  availabilityStatus: string
  leaseType?: string
  leaseCommencementDate?: string
  leaseExpirationDate?: string
  lastUpdatedDate: string
  annualRent?: string
  rentPerSf?: string
  contractRatePsfValue?: number
  predictedRentPsfValue?: number
  timeToLeaseMonths?: number
  renewalProbabilityPct?: number
  rentPremiumPctValue?: number
  sunScore?: number
  viewScore?: number
  contractRate?: string
  predictedRent?: string
  rentPremium?: string
  contacts: StackingPlanContact[]
  note?: string
}

export type StackingValueDriverFactor = {
  factor: string
  impact: number
}

export type StackingFloorValueDriverSummary = {
  contractRentPsf: number
  deltaFromMarketPsf: number
  totalPositiveImpact: number
  totalNegativeImpact: number
  visibleFactorCount: number
  otherFactorCount: number
}

export type StackingFloorValueDrivers = {
  marketBaselineRentPsf: number
  predictedRentPsf: number
  waterfallFactors: StackingValueDriverFactor[]
  otherFactors: StackingValueDriverFactor[]
  summary: StackingFloorValueDriverSummary
}

export type StackingPlanFloor = {
  floor: number
  sqft: string
  occupancy: string
  occupancyPercent: number
  vacancyPercent: number
  tenants: StackingPlanTenant[]
  valueDrivers: StackingFloorValueDrivers
}

export type StackingPlanSummary = {
  totalSqft: number
  totalTenants: number
  overallOccupancyPercent: number
}

export type StackingPlanDataset = {
  floors: StackingPlanFloor[]
  summary: StackingPlanSummary
}

type TenantSeed = {
  name: string
  space: string
  sqft: number
  expiration?: string
  note?: string
  isVacant?: boolean
}

type FloorSeed = {
  floor: number
  totalSqft: number
  tenants: TenantSeed[]
}

export const STACKING_EXPIRATION_LEGEND: readonly StackingLegendItem[] = [
  { label: "2025", color: "#ef4444" },
  { label: "2026", color: "#f97316" },
  { label: "2027", color: "#a855f7" },
  { label: "2028", color: "#14b8a6" },
  { label: "2029", color: "#3b82f6" },
  { label: "2030+", color: "#22c55e" },
] as const

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
})

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
})

const OWNER_NAMES = [
  "Hawthorne Asset Management",
  "Granite Peak Properties",
  "Northline Office Partners",
  "Waterfront Institutional Realty",
] as const

const BROKER_NAMES = [
  { name: "Andrea Williams", title: "Managing Director" },
  { name: "Maya Chen", title: "Senior Vice President" },
  { name: "Jordan Patel", title: "Executive Managing Director" },
  { name: "Ryan Ellis", title: "Vice Chairman" },
] as const

const TENANT_CONTACT_NAMES = [
  { name: "Greg Hunter", title: "Chief Executive Officer" },
  { name: "Elena Brooks", title: "Chief Financial Officer" },
  { name: "Sonia Ramirez", title: "Head of Real Estate" },
  { name: "Martin Lowe", title: "Operations Director" },
] as const

const TENANT_PREFIXES = [
  "Atlas",
  "Northstar",
  "Harbor",
  "Bluebridge",
  "Aperture",
  "Kepler",
  "Meridian",
  "Beacon",
  "Orbit",
  "Eastpoint",
  "Lattice",
  "Summit",
  "Pinnacle",
  "Union Square",
  "Nexa",
  "Crescent",
  "Hudson",
  "Stonegate",
  "Silverline",
  "Parkview",
  "Ridgeway",
  "Westport",
  "Greenline",
  "Broadleaf",
  "Crosswind",
  "Ironwood",
  "Lakefront",
  "Metro",
  "Skyline",
  "Catalyst",
] as const

const TENANT_SUFFIXES_BY_GROUP = {
  office: [
    "Capital",
    "Advisory",
    "Partners",
    "Legal",
    "Ventures",
    "Analytics",
    "Media",
    "Systems",
    "Labs",
    "Counsel",
    "Consulting",
    "Studio",
  ],
  industrial: [
    "Logistics",
    "Distribution",
    "Manufacturing",
    "Fulfillment",
    "Packaging",
    "Freight",
    "Cold Storage",
    "Supply",
    "Operations",
    "Materials",
    "Foods",
    "Works",
  ],
  retail: [
    "Collective",
    "Outfitters",
    "Mercantile",
    "Market",
    "Home",
    "Goods",
    "Kitchen",
    "Studio",
    "Exchange",
    "Retail",
    "Gallery",
    "Supply",
  ],
} as const

const VACANCY_NOTES = [
  "Plug-and-play suite",
  "Prebuilt spec suite",
  "Available direct",
  "Built office opportunity",
  "Contiguous expansion space",
  "Marketing ready",
] as const

const BUILDOUT_OPTIONS = ["Shell", "White Box", "Fully Built-Out"] as const
const VALUE_DRIVER_FEATURE_CATEGORIES = [
  "Average Floorplate",
  "Bond Exposure",
  "Building Class",
  "Building Risk at Purchase",
  "Commodity Exposure",
  "Currency Exposure",
  "Energy Star",
  "Equity Exposure",
  "Equity Volatility Exposure",
  "Historical Significance",
  "In-Building Bar",
  "In-Building Cafe",
  "In-Building Gym",
  "In-Building Restaurant",
  "In-Building Retail Density",
  "Inflation Effects",
  "Inflation Exposure",
  "Interest Rate Effects",
  "Interest Rate Exposure",
  "Last Major Renovation",
  "Lease Economics",
  "Lease Term",
  "Lease Type",
  "LEED",
  "Local Municipal Bond Exposure",
  "Local REIT Basket Exposure",
  "Market Effects",
  "Nearby BikeShare",
  "Nearby Commuter Transit",
  "Nearby Restaurants",
  "Number of Floors",
  "Relative Floor Effects",
  "Rentable Size of Space",
  "Seasonality Effects",
  "Structure Value",
  "Submarket Hospitality Density",
  "Submarket Occupancy",
  "Submarket Office Density",
  "Submarket Rent Growth",
  "Sunlight Score",
  "View Score",
  "Year Built",
] as const

type ValueDriverFeatureCategory =
  (typeof VALUE_DRIVER_FEATURE_CATEGORIES)[number]

function getSampleBuildout(seed: number, isVacant: boolean) {
  if (isVacant) {
    return BUILDOUT_OPTIONS[(seed + 1) % BUILDOUT_OPTIONS.length]!
  }

  if (seed % 5 === 0) {
    return "Shell" as const
  }

  if (seed % 2 === 0) {
    return "Fully Built-Out" as const
  }

  return "White Box" as const
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function roundToHundredths(value: number) {
  return Number(value.toFixed(2))
}

function getWeightedAverageTenantValue(
  tenants: readonly StackingPlanTenant[],
  metric:
    | "contractRatePsfValue"
    | "predictedRentPsfValue"
    | "sunScore"
    | "viewScore"
) {
  const weightedTenants = tenants.filter((tenant) => tenant[metric] != null)

  if (weightedTenants.length === 0) {
    return null
  }

  const weightedTotal = weightedTenants.reduce(
    (sum, tenant) => sum + tenant.sqft * (tenant[metric] ?? 0),
    0
  )
  const totalSqft = weightedTenants.reduce(
    (sum, tenant) => sum + tenant.sqft,
    0
  )

  if (totalSqft === 0) {
    return null
  }

  return weightedTotal / totalSqft
}

function getSqftShare(
  tenants: readonly StackingPlanTenant[],
  predicate: (tenant: StackingPlanTenant) => boolean
) {
  const totalSqft = tenants.reduce((sum, tenant) => sum + tenant.sqft, 0)

  if (totalSqft === 0) {
    return 0
  }

  return (
    tenants.reduce(
      (sum, tenant) => sum + (predicate(tenant) ? tenant.sqft : 0),
      0
    ) / totalSqft
  )
}

function getAverageRemainingLeaseYears(tenants: readonly StackingPlanTenant[]) {
  const datedTenants = tenants.filter(
    (tenant) => !tenant.isVacant && tenant.leaseExpirationDate != null
  )

  if (datedTenants.length === 0) {
    return null
  }

  const now = new Date("2026-04-08")

  const weightedTotal = datedTenants.reduce((sum, tenant) => {
    const expirationDate = new Date(tenant.leaseExpirationDate ?? "")
    if (Number.isNaN(expirationDate.getTime())) {
      return sum
    }

    const yearsRemaining = Math.max(
      0.25,
      (expirationDate.getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24 * 365.25)
    )

    return sum + tenant.sqft * yearsRemaining
  }, 0)
  const totalSqft = datedTenants.reduce((sum, tenant) => sum + tenant.sqft, 0)

  if (totalSqft === 0) {
    return null
  }

  return weightedTotal / totalSqft
}

function signedSeedJitter(seedText: string, amplitude: number) {
  const random = createPrng(hashText(seedText))
  return (random() * 2 - 1) * amplitude
}

type FloorValueDriverContext = {
  assetId: string
  assetGroup: string
  floorNumber: number
  totalFloorCount: number
  assetOccupiedPercent: number
  occupancyPercent: number
  vacancyPercent: number
  floorPositionSignal: number
  floorplateSignal: number
  suiteSizeSignal: number
  occupancySignal: number
  vacancySignal: number
  marketBias: number
  exposureBias: number
  amenityBias: number
  historicalSignal: number
  sustainabilitySignal: number
  contractToPredictedSignal: number
  leaseTermSignal: number
  leaseTypeSignal: number
  buildoutSignal: number
  relativeFloorSignal: number
  rentableSizeSignal: number
  numberOfFloorsSignal: number
  sunSignal: number
  viewSignal: number
}

function getValueDriverSignal(
  category: ValueDriverFeatureCategory,
  context: FloorValueDriverContext
) {
  const jitter = (amplitude: number) =>
    signedSeedJitter(
      `${context.assetId}:${context.floorNumber}:${category}`,
      amplitude
    )

  switch (category) {
    case "Average Floorplate":
      return context.floorplateSignal * 0.78 + jitter(0.16)
    case "Bond Exposure":
      return (
        context.exposureBias * -0.34 + context.marketBias * 0.16 + jitter(0.18)
      )
    case "Building Class":
      return (
        context.marketBias * 0.34 + context.amenityBias * 0.28 + jitter(0.14)
      )
    case "Building Risk at Purchase":
      return (
        context.marketBias * -0.28 + context.vacancySignal * 0.24 + jitter(0.18)
      )
    case "Commodity Exposure":
      return context.exposureBias * -0.24 + jitter(0.18)
    case "Currency Exposure":
      return context.exposureBias * -0.18 + jitter(0.16)
    case "Energy Star":
      return context.sustainabilitySignal * 0.7 + jitter(0.12)
    case "Equity Exposure":
      return context.marketBias * 0.34 + jitter(0.16)
    case "Equity Volatility Exposure":
      return context.marketBias * -0.26 + jitter(0.16)
    case "Historical Significance":
      return context.historicalSignal * 0.58 + jitter(0.12)
    case "In-Building Bar":
      return context.amenityBias * 0.32 + jitter(0.12)
    case "In-Building Cafe":
      return context.amenityBias * 0.44 + jitter(0.12)
    case "In-Building Gym":
      return context.amenityBias * 0.38 + jitter(0.12)
    case "In-Building Restaurant":
      return context.amenityBias * 0.34 + jitter(0.12)
    case "In-Building Retail Density":
      return context.amenityBias * 0.46 + jitter(0.14)
    case "Inflation Effects":
      return (
        context.marketBias * 0.2 + context.exposureBias * -0.18 + jitter(0.14)
      )
    case "Inflation Exposure":
      return context.exposureBias * -0.26 + jitter(0.16)
    case "Interest Rate Effects":
      return (
        context.marketBias * -0.18 + context.exposureBias * -0.22 + jitter(0.14)
      )
    case "Interest Rate Exposure":
      return context.exposureBias * -0.3 + jitter(0.18)
    case "Last Major Renovation":
      return (
        context.buildoutSignal * 0.5 + context.marketBias * 0.18 + jitter(0.12)
      )
    case "Lease Economics":
      return (
        context.contractToPredictedSignal * 0.96 +
        context.occupancySignal * 0.2 +
        jitter(0.12)
      )
    case "Lease Term":
      return context.leaseTermSignal * 0.68 + jitter(0.12)
    case "Lease Type":
      return context.leaseTypeSignal * 0.54 + jitter(0.1)
    case "LEED":
      return context.sustainabilitySignal * 0.62 + jitter(0.12)
    case "Local Municipal Bond Exposure":
      return context.exposureBias * -0.2 + jitter(0.14)
    case "Local REIT Basket Exposure":
      return context.marketBias * 0.24 + jitter(0.16)
    case "Market Effects":
      return context.marketBias * 0.92 + jitter(0.14)
    case "Nearby BikeShare":
      return context.amenityBias * 0.28 + jitter(0.12)
    case "Nearby Commuter Transit":
      return (
        context.amenityBias * 0.5 + context.marketBias * 0.18 + jitter(0.12)
      )
    case "Nearby Restaurants":
      return context.amenityBias * 0.4 + jitter(0.12)
    case "Number of Floors":
      return context.numberOfFloorsSignal * 0.58 + jitter(0.12)
    case "Relative Floor Effects":
      return context.relativeFloorSignal * 0.92 + jitter(0.1)
    case "Rentable Size of Space":
      return context.rentableSizeSignal * 0.74 + jitter(0.12)
    case "Seasonality Effects":
      return context.marketBias * 0.16 + jitter(0.14)
    case "Structure Value":
      return (
        context.marketBias * 0.24 +
        context.floorplateSignal * 0.26 +
        jitter(0.14)
      )
    case "Submarket Hospitality Density":
      return context.amenityBias * 0.24 + jitter(0.12)
    case "Submarket Occupancy":
      return context.occupancySignal * 0.78 + jitter(0.12)
    case "Submarket Office Density":
      return context.marketBias * 0.42 + jitter(0.12)
    case "Submarket Rent Growth":
      return (
        context.marketBias * 0.82 +
        context.occupancySignal * 0.18 +
        jitter(0.12)
      )
    case "Sunlight Score":
      return context.sunSignal * 0.9 + jitter(0.1)
    case "View Score":
      return context.viewSignal * 0.94 + jitter(0.1)
    case "Year Built":
      return (
        context.marketBias * 0.24 +
        context.historicalSignal * 0.34 +
        jitter(0.14)
      )
  }
}

function buildFloorValueDrivers({
  assetId,
  assetGroup,
  assetOccupiedPercent,
  floorSeed,
  floorTenants,
  allFloorSeeds,
  occupancyPercent,
  vacancyPercent,
}: {
  assetId: string
  assetGroup: string
  assetOccupiedPercent: number
  floorSeed: FloorSeed
  floorTenants: StackingPlanTenant[]
  allFloorSeeds: readonly FloorSeed[]
  occupancyPercent: number
  vacancyPercent: number
}): StackingFloorValueDrivers {
  const occupiedTenants = floorTenants.filter((tenant) => !tenant.isVacant)
  const predictedRentPsf = roundToHundredths(
    getWeightedAverageTenantValue(floorTenants, "predictedRentPsfValue") ??
      44 +
        clamp(
          floorSeed.floor / Math.max(allFloorSeeds.length, 1) - 0.5,
          -0.5,
          0.5
        ) *
          3
  )
  const contractRentPsf = roundToHundredths(
    getWeightedAverageTenantValue(floorTenants, "contractRatePsfValue") ??
      predictedRentPsf - 1.8
  )
  const averageSunScore =
    getWeightedAverageTenantValue(floorTenants, "sunScore") ?? 60
  const averageViewScore =
    getWeightedAverageTenantValue(floorTenants, "viewScore") ?? 58
  const averageRemainingLeaseYears =
    getAverageRemainingLeaseYears(occupiedTenants) ?? 4.5
  const averageFloorplate =
    allFloorSeeds.reduce((sum, seed) => sum + seed.totalSqft, 0) /
    Math.max(allFloorSeeds.length, 1)
  const averageSuiteSqft =
    floorSeed.totalSqft / Math.max(floorTenants.length, 1)
  const averageGlobalSuiteSqft =
    allFloorSeeds.reduce(
      (sum, seed) => sum + seed.totalSqft / Math.max(seed.tenants.length, 1),
      0
    ) / Math.max(allFloorSeeds.length, 1)
  const totalFloors = allFloorSeeds.length
  const floorPositionSignal =
    totalFloors <= 1
      ? 0
      : clamp(
          (floorSeed.floor - (totalFloors + 1) / 2) /
            Math.max((totalFloors - 1) / 2, 1),
          -1,
          1
        )
  const floorplateSignal = clamp(
    (floorSeed.totalSqft - averageFloorplate) /
      Math.max(averageFloorplate * 0.3, 1),
    -1,
    1
  )
  const suiteSizeSignal = clamp(
    (averageSuiteSqft - averageGlobalSuiteSqft) /
      Math.max(averageGlobalSuiteSqft * 0.35, 1),
    -1,
    1
  )
  const occupancySignal = clamp((occupancyPercent - 78) / 20, -1, 1)
  const vacancySignal = clamp((vacancyPercent - 22) / 20, -1, 1)
  const sunSignal = clamp((averageSunScore - 60) / 24, -1, 1)
  const viewSignal = clamp((averageViewScore - 60) / 24, -1, 1)
  const contractToPredictedSignal = clamp(
    (predictedRentPsf - contractRentPsf) / 3,
    -1,
    1
  )
  const leaseTermSignal = clamp((averageRemainingLeaseYears - 4.5) / 2.5, -1, 1)
  const leaseTypeSignal = clamp(
    (getSqftShare(occupiedTenants, (tenant) => tenant.leaseType === "NNN") -
      0.5) /
      0.35,
    -1,
    1
  )
  const buildoutSignal = clamp(
    (getSqftShare(
      floorTenants,
      (tenant) => tenant.buildout === "Fully Built-Out"
    ) -
      getSqftShare(floorTenants, (tenant) => tenant.buildout === "Shell")) /
      0.55,
    -1,
    1
  )
  const relativeFloorSignal = clamp(
    floorPositionSignal * 0.9 + viewSignal * 0.2 + sunSignal * 0.15,
    -1,
    1
  )
  const rentableSizeSignal = clamp(
    suiteSizeSignal * 0.8 + floorplateSignal * 0.25,
    -1,
    1
  )
  const numberOfFloorsSignal = clamp(
    (totalFloors - 12) / 10 + signedSeedJitter(`${assetId}:floors`, 0.18),
    -1,
    1
  )
  const groupBias =
    assetGroup === "office" ? 0.12 : assetGroup === "retail" ? 0.08 : -0.04
  const marketBias = clamp(
    (assetOccupiedPercent - 78) / 18 +
      groupBias +
      signedSeedJitter(`${assetId}:market`, 0.2),
    -1,
    1
  )
  const exposureBias = clamp(
    (assetGroup === "industrial"
      ? 0.14
      : assetGroup === "retail"
        ? 0.02
        : -0.04) + signedSeedJitter(`${assetId}:exposure`, 0.22),
    -1,
    1
  )
  const amenityBias = clamp(
    (assetGroup === "office" ? 0.28 : assetGroup === "retail" ? 0.42 : -0.18) +
      viewSignal * 0.22 +
      sunSignal * 0.1 +
      floorPositionSignal * 0.08 +
      signedSeedJitter(`${assetId}:amenities`, 0.16),
    -1,
    1
  )
  const historicalSignal = clamp(
    signedSeedJitter(`${assetId}:historic`, 0.8) +
      (assetId.includes("empire") || assetId.includes("vanderbilt") ? 0.25 : 0),
    -1,
    1
  )
  const sustainabilitySignal = clamp(
    sunSignal * 0.32 +
      occupancySignal * 0.18 +
      signedSeedJitter(`${assetId}:sustainability`, 0.18),
    -1,
    1
  )

  const context: FloorValueDriverContext = {
    assetId,
    assetGroup,
    floorNumber: floorSeed.floor,
    totalFloorCount: totalFloors,
    assetOccupiedPercent,
    occupancyPercent,
    vacancyPercent,
    floorPositionSignal,
    floorplateSignal,
    suiteSizeSignal,
    occupancySignal,
    vacancySignal,
    marketBias,
    exposureBias,
    amenityBias,
    historicalSignal,
    sustainabilitySignal,
    contractToPredictedSignal,
    leaseTermSignal,
    leaseTypeSignal,
    buildoutSignal,
    relativeFloorSignal,
    rentableSizeSignal,
    numberOfFloorsSignal,
    sunSignal,
    viewSignal,
  }

  let targetNetImpact = clamp(
    marketBias * 1.05 +
      relativeFloorSignal * 0.92 +
      occupancySignal * 0.72 +
      contractToPredictedSignal * 0.6 +
      sunSignal * 0.52 +
      viewSignal * 0.7 +
      buildoutSignal * 0.38 +
      leaseTypeSignal * 0.24 -
      getSqftShare(floorTenants, (tenant) => tenant.isVacant) * 1.15 +
      signedSeedJitter(`${assetId}:${floorSeed.floor}:net`, 0.26),
    -4.25,
    5.25
  )

  if (Math.abs(targetNetImpact) < 0.85) {
    const signSource =
      marketBias + relativeFloorSignal + viewSignal - vacancySignal * 0.5
    targetNetImpact = signSource >= 0 ? 0.95 : -0.95
  }

  targetNetImpact = roundToHundredths(targetNetImpact)

  const rawFactors = VALUE_DRIVER_FEATURE_CATEGORIES.map((factor) => ({
    factor,
    impact: getValueDriverSignal(factor, context),
  }))
  const rawTotal = rawFactors.reduce((sum, factor) => sum + factor.impact, 0)
  const scaleFactor =
    Math.abs(rawTotal) < 0.001 ? 1 : targetNetImpact / rawTotal

  const scaledFactors = rawFactors.map((factor) => ({
    factor: factor.factor,
    impact: roundToHundredths(factor.impact * scaleFactor),
  }))

  const adjustedTotal = scaledFactors.reduce(
    (sum, factor) => sum + factor.impact,
    0
  )
  const residual = roundToHundredths(targetNetImpact - adjustedTotal)

  if (Math.abs(residual) >= 0.01) {
    const largestFactor = [...scaledFactors]
      .map((factor, index) => ({ factor, index }))
      .sort(
        (left, right) =>
          Math.abs(right.factor.impact) - Math.abs(left.factor.impact)
      )[0]

    if (largestFactor != null) {
      scaledFactors[largestFactor.index] = {
        ...scaledFactors[largestFactor.index],
        impact: roundToHundredths(
          scaledFactors[largestFactor.index]!.impact + residual
        ),
      }
    }
  }

  const rankedFactors = [...scaledFactors].sort(
    (left, right) => Math.abs(right.impact) - Math.abs(left.impact)
  )
  const visibleFactorCount = 5
  const waterfallFactors = rankedFactors.slice(0, visibleFactorCount)
  const otherFactors = rankedFactors.slice(visibleFactorCount)

  return {
    marketBaselineRentPsf: roundToHundredths(
      predictedRentPsf - targetNetImpact
    ),
    predictedRentPsf,
    waterfallFactors,
    otherFactors,
    summary: {
      contractRentPsf,
      deltaFromMarketPsf: targetNetImpact,
      totalPositiveImpact: roundToHundredths(
        scaledFactors.reduce(
          (sum, factor) => sum + (factor.impact > 0 ? factor.impact : 0),
          0
        )
      ),
      totalNegativeImpact: roundToHundredths(
        scaledFactors.reduce(
          (sum, factor) => sum + (factor.impact < 0 ? factor.impact : 0),
          0
        )
      ),
      visibleFactorCount: waterfallFactors.length,
      otherFactorCount: otherFactors.length,
    },
  }
}

type RandomFn = () => number

function hashText(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

function createPrng(seed: number): RandomFn {
  let state = seed === 0 ? 0x9e3779b9 : seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x1_0000_0000
  }
}

function randomInt(random: RandomFn, min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min
}

function pickOne<T>(random: RandomFn, values: readonly T[]): T {
  return values[randomInt(random, 0, values.length - 1)]!
}

function shuffle<T>(random: RandomFn, values: T[]): T[] {
  const next = [...values]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(random, 0, index)
    const current = next[index]
    next[index] = next[swapIndex]!
    next[swapIndex] = current!
  }
  return next
}

function formatSqft(value: number): string {
  return `${value.toLocaleString()} SF`
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

function formatCurrencyPerSf(value: number): string {
  return `$${value.toFixed(2)} / SF`
}

/** ISO `YYYY-MM-DD` (or any string starting with year); drives legend + segment hex. */
export function stackingPlanExpirationColor(
  expiration?: string,
  isVacant?: boolean
): string {
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

function formatExpiration(expiration?: string, isVacant?: boolean): string {
  if (isVacant) return "Available"
  if (expiration == null || expiration === "") return "N/A"
  const date = new Date(expiration)
  if (Number.isNaN(date.getTime())) return "N/A"
  return dateFormatter.format(date)
}

export function formatLongDate(dateValue?: string): string {
  if (dateValue == null || dateValue === "") return "N/A"
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return "N/A"
  return longDateFormatter.format(date)
}

function formatPhone(seed: number): string {
  const blockOne = 200 + (seed % 700)
  const blockTwo = 100 + ((seed >> 3) % 900)
  const blockThree = 1000 + ((seed >> 5) % 9000)
  return `(${blockOne}) ${blockTwo}-${blockThree}`
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function deriveLeaseCommencementDate(expiration: string, seed: number): string {
  const date = new Date(expiration)
  const termYears = 4 + (seed % 4)
  date.setFullYear(date.getFullYear() - termYears)
  return toIsoDate(date)
}

function deriveLastUpdatedDate(seed: number): string {
  const date = new Date("2026-03-31T12:00:00Z")
  const daysAgo = 7 + (seed % 75)
  date.setUTCDate(date.getUTCDate() - daysAgo)
  return toIsoDate(date)
}

function buildContacts(
  assetId: string,
  tenantName: string,
  owner: string,
  isVacant: boolean
): StackingPlanContact[] {
  const seed = hashText(`${assetId}:${tenantName}`)
  const broker = BROKER_NAMES[seed % BROKER_NAMES.length]!
  const tenantRep =
    TENANT_CONTACT_NAMES[(seed + 1) % TENANT_CONTACT_NAMES.length]!
  const brokerEmail = broker.name.toLowerCase().replace(/\s+/g, ".")
  const tenantEmail = tenantRep.name.toLowerCase().replace(/\s+/g, ".")

  const contacts: StackingPlanContact[] = [
    {
      role: "Broker",
      name: broker.name,
      title: broker.title,
      phone: formatPhone(seed),
      email: `${brokerEmail}@leasing.example.com`,
    },
    {
      role: "Owner",
      name: owner,
      title: "Asset Manager",
      phone: formatPhone(seed + 17),
      email: `asset.manager.${seed % 9}@owner.example.com`,
    },
  ]

  if (!isVacant) {
    contacts.push({
      role: "Tenant",
      name: tenantRep.name,
      title: tenantRep.title,
      phone: formatPhone(seed + 31),
      email: `${tenantEmail}@tenant.example.com`,
    })
  }

  return contacts
}

function buildQuarterEndDate(random: RandomFn): string {
  const year = 2025 + randomInt(random, 0, 9)
  const month = [3, 6, 9, 12][randomInt(random, 0, 3)]!
  const day = month === 3 ? 31 : month === 12 ? 31 : 30
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function buildTenantName(
  assetGroupId: string,
  random: RandomFn,
  usedNames: Set<string>
): string {
  const suffixes =
    TENANT_SUFFIXES_BY_GROUP[
      assetGroupId === "industrial" || assetGroupId === "retail"
        ? assetGroupId
        : "office"
    ]

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidate = `${pickOne(random, TENANT_PREFIXES)} ${pickOne(random, suffixes)}`
    const key = candidate.toLowerCase()
    if (!usedNames.has(key)) {
      usedNames.add(key)
      return candidate
    }
  }

  const fallback = `${pickOne(random, TENANT_PREFIXES)} ${pickOne(
    random,
    suffixes
  )} ${usedNames.size + 1}`
  usedNames.add(fallback.toLowerCase())
  return fallback
}

function buildSuiteSqfts(
  totalSqft: number,
  suiteCount: number,
  random: RandomFn
): number[] {
  const sizes: number[] = []
  let remainingSqft = totalSqft

  for (let index = 0; index < suiteCount; index += 1) {
    if (index === suiteCount - 1) {
      sizes.push(remainingSqft)
      break
    }

    const remainingSuites = suiteCount - index - 1
    const minRemainingSqft = remainingSuites * 1800
    const averageSqft = remainingSqft / (remainingSuites + 1)
    const minCurrentSqft = Math.max(1800, Math.floor(averageSqft * 0.55))
    const maxCurrentSqft = Math.max(
      minCurrentSqft,
      Math.min(remainingSqft - minRemainingSqft, Math.floor(averageSqft * 1.45))
    )

    let nextSqft = randomInt(random, minCurrentSqft, maxCurrentSqft)
    nextSqft = Math.round(nextSqft / 10) * 10
    nextSqft = Math.min(nextSqft, remainingSqft - minRemainingSqft)
    nextSqft = Math.max(nextSqft, 1800)

    sizes.push(nextSqft)
    remainingSqft -= nextSqft
  }

  return sizes.sort((left, right) => right - left)
}

function buildFloorSeedsForAsset(assetId: string): FloorSeed[] {
  const asset = getAssetById(assetId)
  const seed = hashText(`stacking:${assetId}`)
  const random = createPrng(seed)
  const floorCount = 12 + (seed % 17)
  const targetOccupancyPct = asset?.occupiedPercent ?? 68 + (seed % 24)
  const targetOccupiedShare = Math.max(
    0.58,
    Math.min(0.96, targetOccupancyPct / 100)
  )
  const usedTenantNames = new Set<string>()

  const floors: FloorSeed[] = []

  for (let floor = floorCount; floor >= 1; floor -= 1) {
    const totalSqft = 14500 + randomInt(random, 0, 8500)
    const suiteCount = randomInt(random, 2, 5)
    const suiteSqfts = buildSuiteSqfts(totalSqft, suiteCount, random)
    const vacancyOrder = shuffle(
      random,
      Array.from({ length: suiteCount }, (_, index) => index)
    )
    const targetVacancySqft = Math.round(
      totalSqft * (1 - targetOccupiedShare) * (0.78 + random() * 0.5)
    )
    const vacantIndices = new Set<number>()
    let remainingVacancySqft = targetVacancySqft

    for (const suiteIndex of vacancyOrder) {
      if (vacantIndices.size >= suiteCount - 1) break

      const suiteSqft = suiteSqfts[suiteIndex] ?? 0
      const shouldVacate =
        remainingVacancySqft > totalSqft * 0.08 &&
        (random() < 0.72 || remainingVacancySqft > totalSqft * 0.18)

      if (!shouldVacate) continue

      vacantIndices.add(suiteIndex)
      remainingVacancySqft -= suiteSqft
    }

    const tenants = suiteSqfts.map((sqft, suiteIndex) => {
      const suiteLabel = `${floor}${String.fromCharCode(65 + suiteIndex)}`
      const isVacant = vacantIndices.has(suiteIndex)

      return {
        name: isVacant
          ? "Vacant"
          : buildTenantName(
              asset?.groupId ?? "office",
              random,
              usedTenantNames
            ),
        space: suiteLabel,
        sqft,
        expiration: isVacant ? undefined : buildQuarterEndDate(random),
        note: isVacant ? pickOne(random, VACANCY_NOTES) : undefined,
        isVacant,
      }
    })

    floors.push({
      floor,
      totalSqft: suiteSqfts.reduce((sum, sqft) => sum + sqft, 0),
      tenants,
    })
  }

  return floors
}

export function getSampleStackingPlanData(
  assetId: string
): StackingPlanDataset {
  const asset = getAssetById(assetId)
  const floorSeeds = buildFloorSeedsForAsset(assetId)
  const address = asset?.address ?? "Address unavailable"

  const floors = floorSeeds
    .map((floorSeed) => {
      const occupiedSqft = floorSeed.tenants.reduce(
        (sum, tenant) => sum + (tenant.isVacant ? 0 : tenant.sqft),
        0
      )
      const occupancyPercent = Math.round(
        (occupiedSqft / floorSeed.totalSqft) * 100
      )
      const vacancyPercent = Math.max(0, 100 - occupancyPercent)

      const tenants = floorSeed.tenants.map((tenant, index) => {
        const tenantSeed = hashText(
          `${assetId}:${floorSeed.floor}:${tenant.space}:${tenant.name}`
        )
        const leaseCommencementDate =
          tenant.isVacant || tenant.expiration == null
            ? undefined
            : deriveLeaseCommencementDate(tenant.expiration, tenantSeed)
        const contractRatePerSfValue = 36 + (tenantSeed % 15) * 1.15
        const rentPremiumPerSfValue = 1.4 + ((tenantSeed >> 2) % 8) * 0.45
        const predictedRentPerSfValue =
          contractRatePerSfValue + rentPremiumPerSfValue
        const rentPremiumPct =
          (rentPremiumPerSfValue / contractRatePerSfValue) * 100
        const floorLift = Math.max(0, floorSeed.floor - 10)
        const sunScore = Math.min(
          98,
          24 + ((tenantSeed >> 4) % 42) + floorLift * 2
        )
        const viewScore = Math.min(
          99,
          20 + ((tenantSeed >> 7) % 44) + Math.round(floorLift * 2.4)
        )
        const owner = OWNER_NAMES[tenantSeed % OWNER_NAMES.length]!
        const isVacant = tenant.isVacant === true
        const buildout = getSampleBuildout(tenantSeed, isVacant)
        const lastUpdatedDate = deriveLastUpdatedDate(tenantSeed)

        return {
          id: `${floorSeed.floor}-${index}-${tenant.space}`,
          name: tenant.name,
          space: `Ste ${tenant.space}`,
          sqft: tenant.sqft,
          sqftLabel: formatSqft(tenant.sqft),
          expiration: formatExpiration(tenant.expiration, tenant.isVacant),
          color: stackingPlanExpirationColor(tenant.expiration, tenant.isVacant),
          widthPercent: Number(
            ((tenant.sqft / floorSeed.totalSqft) * 100).toFixed(2)
          ),
          isVacant,
          address,
          floorLabel: `Floor ${floorSeed.floor}`,
          owner,
          buildout,
          verificationStatus: isVacant
            ? "Marketing ready"
            : "Lease abstract verified",
          availabilityStatus: isVacant ? "Available now" : "Occupied",
          leaseType: isVacant
            ? undefined
            : tenantSeed % 2 === 0
              ? "Modified Gross"
              : "NNN",
          leaseCommencementDate,
          leaseExpirationDate: isVacant ? undefined : tenant.expiration,
          lastUpdatedDate,
          annualRent: isVacant
            ? undefined
            : formatCurrency(tenant.sqft * contractRatePerSfValue),
          rentPerSf: isVacant
            ? undefined
            : formatCurrencyPerSf(contractRatePerSfValue),
          contractRatePsfValue: isVacant ? undefined : contractRatePerSfValue,
          predictedRentPsfValue: predictedRentPerSfValue,
          rentPremiumPctValue: isVacant ? undefined : rentPremiumPct,
          sunScore,
          viewScore,
          contractRate: isVacant
            ? undefined
            : formatCurrencyPerSf(contractRatePerSfValue),
          predictedRent: formatCurrencyPerSf(predictedRentPerSfValue),
          rentPremium: isVacant
            ? undefined
            : `+$${rentPremiumPerSfValue.toFixed(2)} / SF (${rentPremiumPct.toFixed(1)}%)`,
          contacts: buildContacts(assetId, tenant.name, owner, isVacant),
          note: tenant.note,
        }
      })

      return {
        floor: floorSeed.floor,
        sqft: formatSqft(floorSeed.totalSqft),
        occupancy: `${occupancyPercent}%`,
        occupancyPercent,
        vacancyPercent,
        tenants,
        valueDrivers: buildFloorValueDrivers({
          assetId,
          assetGroup: asset?.groupId ?? "office",
          assetOccupiedPercent: asset?.occupiedPercent ?? occupancyPercent,
          floorSeed,
          floorTenants: tenants,
          allFloorSeeds: floorSeeds,
          occupancyPercent,
          vacancyPercent,
        }),
      }
    })
    .sort((a, b) => b.floor - a.floor)

  const totalSqft = floors.reduce((sum, floor) => {
    return (
      sum +
      floor.tenants.reduce((floorSum, tenant) => floorSum + tenant.sqft, 0)
    )
  }, 0)

  const occupiedSqft = floors.reduce((sum, floor) => {
    return (
      sum +
      floor.tenants.reduce(
        (floorSum, tenant) => floorSum + (tenant.isVacant ? 0 : tenant.sqft),
        0
      )
    )
  }, 0)

  const uniqueTenants = new Set(
    floors
      .flatMap((floor) => floor.tenants)
      .filter((tenant) => !tenant.isVacant)
      .map((tenant) => tenant.name.toLowerCase())
  )

  return {
    floors,
    summary: {
      totalSqft,
      totalTenants: uniqueTenants.size,
      overallOccupancyPercent: Number(
        ((occupiedSqft / totalSqft) * 100).toFixed(2)
      ),
    },
  }
}
