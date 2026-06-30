/**
 * Real portfolio properties loaded from exported baseline + modification JSON.
 *
 * These three buildings replace the synthetic demo portfolio in "Your Assets".
 * The baseline file carries the current rent roll (floors → spaces → leases) plus
 * a building-level `asset` financial block and per-space ML explainability (SHAP).
 * The modifications file carries 17 projection scenarios (LEED tiers + amenity
 * concepts) with a re-underwritten `asset` block per scenario.
 *
 * The loaders here adapt that raw shape into the app's existing types so the
 * portfolio table, map, stacking plan, value drivers, and modification
 * recommendation surfaces all render real data without touching the UI.
 */
import type { Asset } from "@/lib/assets"
import type { AssetFinancialMetrics } from "@/lib/portfolio-asset-financials"
import type { ModificationRecommendation } from "@/lib/modification-recommendations"
import type { ModId } from "@/lib/building-modifications"
import type {
  StackingFloorValueDrivers,
  StackingPlanContact,
  StackingPlanDataset,
  StackingPlanFloor,
  StackingPlanTenant,
  StackingValueDriverFactor,
} from "@/lib/stacking-plan-data"

import mtKembleBaseline from "./data/mt-kemble.baseline.json"
import mtKembleModifications from "./data/mt-kemble.modifications.json"
import mtKembleForecast from "./data/340-mt-kemble.forecast.json"
import eastPutnamBaseline from "./data/east-putnam.baseline.json"
import eastPutnamModifications from "./data/east-putnam.modifications.json"
import eastPutnamForecast from "./data/1700-east-putnam.forecast.json"
import mackCentreBaseline from "./data/mack-centre-iv.baseline.json"
import mackCentreModifications from "./data/mack-centre-iv.modifications.json"
import mackCentreForecast from "./data/mack-centre-iv.forecast.json"

/* ------------------------------------------------------------------ */
/* Forecast JSON (per-building quarterly projection by scenario)      */
/* ------------------------------------------------------------------ */

export type RealForecastSpace = {
  space_id: string
  suite: string
  tenant_name: string
  rentable_sq_ft: number
  occupancy_status: string
  lease_id: string
  predicted_rent_psf_per_quarter: number[]
  revenue_per_quarter: number[]
}
export type RealForecastFloor = {
  floor_id: string
  floor_number: number
  floor_rsf: number
  revenue_per_quarter: number[]
  spaces: RealForecastSpace[]
}
export type RealForecastScenarioTree = {
  name: string
  label: string
  gross_revenue_per_quarter: number[]
  floors: RealForecastFloor[]
}
export type RealForecastJson = {
  building_id: string
  as_of_date: string
  forecast_horizon_quarters: number
  quarter_labels: string[]
  wale_years: number | null
  occupied_pct: number | null
  vacant_pct: number | null
  in_place_rent_psf: number | null
  mark_to_market_psf: number | null
  gross_potential_psf: number | null
  floor_tree: RealForecastScenarioTree[]
}

const FORECASTS_BY_ID: Record<string, RealForecastJson> = {
  "340-mt-kemble": mtKembleForecast as unknown as RealForecastJson,
  "1700-east-putnam": eastPutnamForecast as unknown as RealForecastJson,
  "mack-centre-iv": mackCentreForecast as unknown as RealForecastJson,
}

/** Per-building forecast JSON for a real asset, or null. */
export function getRealForecastJson(assetId: string): RealForecastJson | null {
  return FORECASTS_BY_ID[assetId] ?? null
}

/* ------------------------------------------------------------------ */
/* Raw JSON shapes (loose; the export omits/null-fills various fields) */
/* ------------------------------------------------------------------ */

type RawSpaceMetrics = {
  rsf?: number
  occupancy_status?: string
  contract_rate_psf?: number
  annual_rent?: number
  lease_type?: string
  expiration_date?: string
  commencement_date?: string
  lease_end_date?: string
  predicted_rent_psf?: number
  renewal_prob?: number | null
  suite?: string | number
  tenant_name?: string
}

type RawExplainability = {
  positive?: Record<string, number | null>
  negative?: Record<string, number | null>
  other?: Record<string, number | null>
}

type RawSpace = {
  lease_id?: string
  metrics?: RawSpaceMetrics
  ml_output?: { predictions?: Array<{ explainability?: RawExplainability }> }
}

type RawFloorMetrics = {
  floor_number?: number
  floor_label?: string
  occupancy_pct?: number
  vacancy_pct?: number
  predicted_rent_psf?: number
  contract_rent_psf?: number
  sun_score?: number
  view_score?: number
}

type RawFloor = {
  metrics?: RawFloorMetrics
  spaces?: Record<string, RawSpace>
}

type RawAssetBlock = {
  building_rsf?: number
  as_is_value?: number
  as_is_value_per_sqft?: number
  as_is_revenue?: number
  as_is_expense?: number
  as_is_noi?: number
  as_is_cap_rate?: number
  mark_to_market_value?: number
  mark_to_market_revenue?: number
  mark_to_market_expense?: number
  mark_to_market_noi?: number
  mark_to_market_cap_rate?: number
  gross_potential_value?: number
  gross_potential_revenue?: number
  gross_potential_expense?: number
  gross_potential_noi?: number
  gross_potential_cap_rate?: number
}

type RawMetrics = {
  building_name?: string
  address?: string
  rsf_total?: number
  occupied_pct?: number
  vacant_pct?: number
  wale?: number
  predicted_rent_psf?: number
  market_rent?: number
  spaces_count?: number
}

type RawBaseline = {
  building_id: string
  property_id: string
  metrics?: RawMetrics
  asset?: RawAssetBlock
  floors?: Record<string, RawFloor>
}

type RawScenario = {
  scenario: string
  asset?: RawAssetBlock
}

type RawModifications = {
  property_id: string
  scenarios?: RawScenario[]
}

/* ------------------------------------------------------------------ */
/* Registry                                                           */
/* ------------------------------------------------------------------ */

const BUILDING_IMAGES = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1516344301847-92e6c9ff876f?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop",
] as const

type RealPropertyDef = {
  id: string
  name: string
  address: string
  imageUrl: string
  baseline: RawBaseline
  modifications: RawModifications
}

const REAL_PROPERTY_DEFS: RealPropertyDef[] = [
  {
    id: "340-mt-kemble",
    name: "340 Mt. Kemble",
    address: "340 Mt. Kemble Avenue, Morristown, NJ 07960",
    imageUrl: BUILDING_IMAGES[0]!,
    baseline: mtKembleBaseline as unknown as RawBaseline,
    modifications: mtKembleModifications as unknown as RawModifications,
  },
  {
    id: "1700-east-putnam",
    name: "1700 East Putnam",
    address: "1700 East Putnam Avenue, Greenwich, CT 06870",
    imageUrl: BUILDING_IMAGES[1]!,
    baseline: eastPutnamBaseline as unknown as RawBaseline,
    modifications: eastPutnamModifications as unknown as RawModifications,
  },
  {
    id: "mack-centre-iv",
    name: "Mack Centre IV",
    address: "61 S Paramus Road, Paramus, NJ 07652",
    imageUrl: BUILDING_IMAGES[2]!,
    baseline: mackCentreBaseline as unknown as RawBaseline,
    modifications: mackCentreModifications as unknown as RawModifications,
  },
]

/** Single portfolio group these owned assets live under (matches Fund I seed id). */
export const REAL_PROPERTY_GROUP_ID = "office"
export const REAL_PROPERTY_GROUP_LABEL = "Fund I"

const DEFS_BY_ID = new Map(REAL_PROPERTY_DEFS.map((def) => [def.id, def]))

export function isRealAssetId(assetId: string): boolean {
  return DEFS_BY_ID.has(assetId)
}

export const REAL_ASSET_IDS: readonly string[] = REAL_PROPERTY_DEFS.map(
  (def) => def.id
)

export function realAssetList(): Asset[] {
  return REAL_PROPERTY_DEFS.map((def) => ({
    id: def.id,
    name: def.name,
    groupId: REAL_PROPERTY_GROUP_ID,
    groupIds: [REAL_PROPERTY_GROUP_ID],
    groupLabel: REAL_PROPERTY_GROUP_LABEL,
    address: def.address,
    imageUrl: def.imageUrl,
    occupiedPercent: Math.round(def.baseline.metrics?.occupied_pct ?? 100),
  }))
}

/* ------------------------------------------------------------------ */
/* Small formatting helpers (kept local to avoid import cycles)       */
/* ------------------------------------------------------------------ */

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
})

function formatSqft(value: number): string {
  return `${Math.round(value).toLocaleString()} SF`
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

function formatSignedCurrencyPerSf(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return `${sign}$${Math.abs(value).toFixed(2)} / SF`
}

function expirationColor(expiration?: string, isVacant?: boolean): string {
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

function roundToHundredths(value: number) {
  return Number(value.toFixed(2))
}

const LEASE_REFERENCE_DATE = new Date("2026-04-08T00:00:00Z")

function yearsUntil(dateValue?: string): number | null {
  if (dateValue == null || dateValue === "") return null
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null
  return Math.max(
    0.25,
    (date.getTime() - LEASE_REFERENCE_DATE.getTime()) /
      (1000 * 60 * 60 * 24 * 365.25)
  )
}

function normalizeLeaseType(
  raw?: string
): "Modified Gross" | "NNN" | "Full Service" | undefined {
  if (raw == null) return undefined
  const value = raw.toLowerCase()
  if (value.includes("nnn") || value.includes("net")) return "NNN"
  if (value.includes("full")) return "Full Service"
  if (value.includes("modified") || value.includes("gross"))
    return "Modified Gross"
  return undefined
}

function suiteLabel(suite?: string | number): string {
  if (suite == null || suite === "") return "—"
  const text = typeof suite === "number" ? String(Math.round(suite)) : suite
  return `Ste ${text}`
}

/* ------------------------------------------------------------------ */
/* Value drivers (real SHAP explainability)                           */
/* ------------------------------------------------------------------ */

const FACTOR_LABELS: Record<string, string> = {
  leed: "LEED",
  energy_star: "Energy Star",
  view_score: "View Score",
  sunlight_score: "Sunlight Score",
  sun_score: "Sunlight Score",
  year_built: "Year Built",
  in_building_gym: "In-Building Gym",
  in_building_bar: "In-Building Bar",
  in_building_cafe: "In-Building Cafe",
  in_building_restaurant: "In-Building Restaurant",
  in_building_retail_density: "In-Building Retail Density",
  interest_rate_effects: "Interest Rate Effects",
  inflation_effects: "Inflation Effects",
  nearby_restaurant_density: "Nearby Restaurants",
  transit_accessibility: "Nearby Commuter Transit",
  bike_share: "Nearby BikeShare",
  road_accessibility: "Road Accessibility",
  submarket_hospitality_density: "Submarket Hospitality Density",
  submarket_occupancy: "Submarket Occupancy",
  submarket_rent_growth: "Submarket Rent Growth",
  average_floorplate: "Average Floorplate",
  relative_floor_effects: "Relative Floor Effects",
  number_of_floors: "Number of Floors",
  lease_economics: "Lease Economics",
  lease_type: "Lease Type",
  market_effects: "Market Effects",
  structure_value: "Structure Value",
  seasonality_effects: "Seasonality Effects",
  last_major_renovation: "Last Major Renovation",
  building_class: "Building Class",
  building_risk_at_purchase: "Building Risk at Purchase",
  historical_significance: "Historical Significance",
}

function humanizeFactor(key: string): string {
  if (FACTOR_LABELS[key]) return FACTOR_LABELS[key]!
  return key
    .split("_")
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ")
}

function explainabilityEntries(space: RawSpace): Array<[string, number]> {
  const prediction = space.ml_output?.predictions?.[0]
  const explain = prediction?.explainability
  if (explain == null) return []
  const entries: Array<[string, number]> = []
  for (const group of [explain.positive, explain.negative, explain.other]) {
    if (group == null) continue
    for (const [key, value] of Object.entries(group)) {
      if (value == null || !Number.isFinite(value)) continue
      entries.push([key, value])
    }
  }
  return entries
}

function buildFloorValueDrivers(args: {
  spaces: RawSpace[]
  floorMetrics: RawFloorMetrics | undefined
  marketRentPsf: number
}): StackingFloorValueDrivers {
  const { spaces, floorMetrics, marketRentPsf } = args

  // Weight each space's SHAP contribution by its share of floor RSF.
  const totalRsf = spaces.reduce((sum, s) => sum + (s.metrics?.rsf ?? 0), 0)
  const aggregated = new Map<string, number>()
  for (const space of spaces) {
    const weight = totalRsf > 0 ? (space.metrics?.rsf ?? 0) / totalRsf : 0
    if (weight <= 0) continue
    for (const [key, impact] of explainabilityEntries(space)) {
      const label = humanizeFactor(key)
      aggregated.set(label, (aggregated.get(label) ?? 0) + impact * weight)
    }
  }

  const factors: StackingValueDriverFactor[] = [...aggregated.entries()]
    .map(([factor, impact]) => ({ factor, impact: roundToHundredths(impact) }))
    .filter((entry) => Math.abs(entry.impact) >= 0.01)
    .sort((left, right) => Math.abs(right.impact) - Math.abs(left.impact))

  const visibleFactorCount = 5
  const waterfallFactors = sortForDisplay(factors.slice(0, visibleFactorCount))
  const otherFactors = sortForDisplay(factors.slice(visibleFactorCount))

  const predictedRentPsf = roundToHundredths(
    floorMetrics?.predicted_rent_psf ?? marketRentPsf
  )
  const contractRentPsf = roundToHundredths(
    floorMetrics?.contract_rent_psf ?? predictedRentPsf
  )
  const totalPositiveImpact = roundToHundredths(
    factors.reduce((sum, f) => sum + (f.impact > 0 ? f.impact : 0), 0)
  )
  const totalNegativeImpact = roundToHundredths(
    factors.reduce((sum, f) => sum + (f.impact < 0 ? f.impact : 0), 0)
  )

  return {
    marketBaselineRentPsf: roundToHundredths(marketRentPsf),
    predictedRentPsf,
    waterfallFactors,
    otherFactors,
    summary: {
      contractRentPsf,
      deltaFromMarketPsf: roundToHundredths(predictedRentPsf - marketRentPsf),
      totalPositiveImpact,
      totalNegativeImpact,
      visibleFactorCount: waterfallFactors.length,
      otherFactorCount: otherFactors.length,
    },
  }
}

function sortForDisplay(
  factors: StackingValueDriverFactor[]
): StackingValueDriverFactor[] {
  return [...factors].sort((left, right) => {
    const leftPositive = left.impact >= 0
    const rightPositive = right.impact >= 0
    if (leftPositive !== rightPositive) return leftPositive ? -1 : 1
    return Math.abs(right.impact) - Math.abs(left.impact)
  })
}

/* ------------------------------------------------------------------ */
/* Stacking plan dataset                                              */
/* ------------------------------------------------------------------ */

function buildContacts(
  ownerName: string,
  isVacant: boolean
): StackingPlanContact[] {
  const contacts: StackingPlanContact[] = [
    {
      role: "Broker",
      name: "Newmark Leasing",
      title: "Managing Director",
      phone: "(212) 555-0142",
      email: "leasing@nmrk.com",
    },
    {
      role: "Owner",
      name: ownerName,
      title: "Asset Manager",
      phone: "(212) 555-0188",
      email: "asset.manager@owner.example.com",
    },
  ]
  if (!isVacant) {
    contacts.push({
      role: "Tenant",
      name: "Tenant Representative",
      title: "Head of Real Estate",
      phone: "(212) 555-0119",
      email: "realestate@tenant.example.com",
    })
  }
  return contacts
}

const stackingCache = new Map<string, StackingPlanDataset>()

export function buildRealStackingPlanDataset(
  assetId: string
): StackingPlanDataset | null {
  const cached = stackingCache.get(assetId)
  if (cached != null) return cached

  const def = DEFS_BY_ID.get(assetId)
  if (def == null) return null

  const baseline = def.baseline
  const marketRentPsf = baseline.metrics?.market_rent ?? 0
  const rawFloors = baseline.floors ?? {}

  const floors: StackingPlanFloor[] = Object.entries(rawFloors)
    .map(([floorId, rawFloor]) => {
      const floorMetrics = rawFloor.metrics
      const spaceEntries = Object.entries(rawFloor.spaces ?? {})
      const spaces = spaceEntries.map(([, space]) => space)
      const floorTotalRsf = spaces.reduce(
        (sum, space) => sum + (space.metrics?.rsf ?? 0),
        0
      )
      const floorNumber = Math.round(floorMetrics?.floor_number ?? 0)

      const tenants: StackingPlanTenant[] = spaceEntries.map(
        ([spaceId, space], index) => {
          const m = space.metrics ?? {}
          const isVacant =
            (m.occupancy_status ?? "occupied").toLowerCase() !== "occupied"
          const rsf = m.rsf ?? 0
          const contractRatePsfValue = isVacant
            ? undefined
            : m.contract_rate_psf
          const predictedRentPsfValue =
            m.predicted_rent_psf ?? marketRentPsf
          const rentPremiumPerSfValue = predictedRentPsfValue - marketRentPsf
          const rentPremiumPct =
            marketRentPsf > 0
              ? (rentPremiumPerSfValue / marketRentPsf) * 100
              : 0
          const leaseType = normalizeLeaseType(m.lease_type)
          const expiration = m.expiration_date ?? m.lease_end_date
          const widthPercent =
            floorTotalRsf > 0
              ? Number(((rsf / floorTotalRsf) * 100).toFixed(2))
              : 0

          return {
            id: `${spaceId}-${index}`,
            name: isVacant ? "Vacant" : m.tenant_name ?? "Tenant",
            space: suiteLabel(m.suite),
            sqft: rsf,
            sqftLabel: formatSqft(rsf),
            expiration: formatExpiration(expiration, isVacant),
            color: expirationColor(expiration, isVacant),
            widthPercent,
            isVacant,
            address: def.address,
            floorLabel:
              floorMetrics?.floor_label ?? `Floor ${floorNumber}`,
            owner: def.name,
            buildout: isVacant ? "White Box" : "Fully Built-Out",
            verificationStatus: isVacant
              ? "Leasing assumptions calibrated"
              : "Verified rent roll",
            availabilityStatus: isVacant ? "Available now" : "Occupied",
            leaseType,
            leaseCommencementDate: m.commencement_date,
            leaseExpirationDate: expiration,
            lastUpdatedDate: "2026-03-31",
            annualRent:
              isVacant || contractRatePsfValue == null
                ? undefined
                : formatCurrency(m.annual_rent ?? rsf * contractRatePsfValue),
            rentPerSf:
              isVacant || contractRatePsfValue == null
                ? undefined
                : formatCurrencyPerSf(contractRatePsfValue),
            contractRatePsfValue,
            marketRentPsfValue: marketRentPsf,
            predictedRentPsfValue,
            renewalProbabilityPct:
              m.renewal_prob == null
                ? undefined
                : Math.round(m.renewal_prob * 100),
            rentPremiumPctValue: rentPremiumPct,
            sunScore: floorMetrics?.sun_score,
            viewScore: floorMetrics?.view_score,
            contractRate:
              isVacant || contractRatePsfValue == null
                ? undefined
                : formatCurrencyPerSf(contractRatePsfValue),
            marketRent: formatCurrencyPerSf(marketRentPsf),
            predictedRent: formatCurrencyPerSf(predictedRentPsfValue),
            rentPremium: `${formatSignedCurrencyPerSf(
              rentPremiumPerSfValue
            )} (${rentPremiumPct >= 0 ? "+" : "−"}${Math.abs(
              rentPremiumPct
            ).toFixed(1)}% vs market rent)`,
            contacts: buildContacts(def.name, isVacant),
          }
        }
      )

      const occupiedSqft = tenants.reduce(
        (sum, tenant) => sum + (tenant.isVacant ? 0 : tenant.sqft),
        0
      )
      const occupancyPercent =
        floorTotalRsf > 0
          ? Math.round((occupiedSqft / floorTotalRsf) * 100)
          : Math.round(floorMetrics?.occupancy_pct ?? 100)
      const vacancyPercent = Math.max(0, 100 - occupancyPercent)

      return {
        floor: floorNumber,
        sqft: formatSqft(floorTotalRsf),
        occupancy: `${occupancyPercent}%`,
        occupancyPercent,
        vacancyPercent,
        tenants,
        valueDrivers: buildFloorValueDrivers({
          spaces,
          floorMetrics,
          marketRentPsf,
        }),
      }
    })
    .sort((left, right) => right.floor - left.floor)

  const allTenants = floors.flatMap((floor) => floor.tenants)
  const occupiedTenants = allTenants.filter((tenant) => !tenant.isVacant)
  const totalSqft = allTenants.reduce((sum, tenant) => sum + tenant.sqft, 0)
  const occupiedSqft = occupiedTenants.reduce(
    (sum, tenant) => sum + tenant.sqft,
    0
  )

  const weightedAverage = (
    rows: StackingPlanTenant[],
    pick: (tenant: StackingPlanTenant) => number | undefined
  ): number => {
    const usable = rows.filter((tenant) => pick(tenant) != null)
    const weight = usable.reduce((sum, tenant) => sum + tenant.sqft, 0)
    if (weight === 0) return 0
    return (
      usable.reduce(
        (sum, tenant) => sum + tenant.sqft * (pick(tenant) ?? 0),
        0
      ) / weight
    )
  }

  const waleYears = (() => {
    const dated = occupiedTenants.filter(
      (tenant) => tenant.leaseExpirationDate != null
    )
    const weight = dated.reduce((sum, tenant) => sum + tenant.sqft, 0)
    if (weight === 0) return baseline.metrics?.wale ?? 0
    const total = dated.reduce((sum, tenant) => {
      const years = yearsUntil(tenant.leaseExpirationDate) ?? 0
      return sum + tenant.sqft * years
    }, 0)
    return total / weight
  })()

  const dataset: StackingPlanDataset = {
    floors,
    summary: {
      totalSqft,
      occupiedSqft,
      vacantSqft: Math.max(0, totalSqft - occupiedSqft),
      totalTenants: new Set(
        occupiedTenants.map((tenant) => tenant.name.toLowerCase())
      ).size,
      overallOccupancyPercent:
        totalSqft > 0
          ? Number(((occupiedSqft / totalSqft) * 100).toFixed(2))
          : 100,
      averageContractRentPsf: roundToHundredths(
        weightedAverage(occupiedTenants, (t) => t.contractRatePsfValue)
      ),
      averageMarketRentPsf: roundToHundredths(
        weightedAverage(allTenants, (t) => t.marketRentPsfValue)
      ),
      averagePredictedRentPsf: roundToHundredths(
        weightedAverage(allTenants, (t) => t.predictedRentPsfValue)
      ),
      waleYears: roundToHundredths(waleYears),
    },
  }

  stackingCache.set(assetId, dataset)
  return dataset
}

export function realStackingPlanSpaceCount(assetId: string): number {
  const def = DEFS_BY_ID.get(assetId)
  if (def == null) return 0
  return Object.values(def.baseline.floors ?? {}).reduce(
    (sum, floor) => sum + Object.keys(floor.spaces ?? {}).length,
    0
  )
}

/* ------------------------------------------------------------------ */
/* Financial metrics                                                  */
/* ------------------------------------------------------------------ */

function classLabelFor(asset: RawAssetBlock | undefined): "A" | "B" | "C" {
  const psf = asset?.as_is_value_per_sqft ?? 0
  if (psf >= 350) return "A"
  if (psf >= 200) return "B"
  return "C"
}

const financialCache = new Map<string, AssetFinancialMetrics | null>()

export function buildRealFinancialMetrics(
  assetId: string
): AssetFinancialMetrics | null {
  if (financialCache.has(assetId)) return financialCache.get(assetId) ?? null

  const def = DEFS_BY_ID.get(assetId)
  if (def == null) {
    financialCache.set(assetId, null)
    return null
  }

  const baseline = def.baseline
  const block = baseline.asset ?? {}
  const metrics = baseline.metrics ?? {}
  const dataset = buildRealStackingPlanDataset(assetId)

  const rsfSqft = block.building_rsf ?? metrics.rsf_total ?? 0
  const occupancyPct = metrics.occupied_pct ?? 100
  const occupiedSqft = Math.round(rsfSqft * (occupancyPct / 100))
  const valueUsd = block.as_is_value ?? 0
  const noiUsd = block.as_is_noi ?? 0
  const annualRevenueUsd = block.as_is_revenue ?? 0
  const annualOpexUsd = block.as_is_expense ?? 0
  const capRatePct = (block.as_is_cap_rate ?? 0) * 100
  const marketRentPsf = metrics.market_rent ?? 0
  const predictedRentPsf =
    dataset?.summary.averagePredictedRentPsf ??
    metrics.predicted_rent_psf ??
    0
  const inPlaceRentPsf =
    dataset?.summary.averageContractRentPsf ??
    (occupiedSqft > 0 ? annualRevenueUsd / occupiedSqft : 0)

  const metricsResult: AssetFinancialMetrics = {
    assetId,
    assetName: def.name,
    groupId: REAL_PROPERTY_GROUP_ID,
    groupLabel: REAL_PROPERTY_GROUP_LABEL,
    scope: "owned",
    valueMills: valueUsd / 1_000_000,
    valueUsd,
    noiTenthM: noiUsd / 1_000_000,
    noiUsd,
    annualRevenueUsd,
    annualMarketRevenueUsd: marketRentPsf * rsfSqft,
    annualPredictedRevenueUsd: predictedRentPsf * rsfSqft,
    annualOpexUsd,
    currentExpenseRatio:
      annualRevenueUsd > 0 ? annualOpexUsd / annualRevenueUsd : 0,
    capRatePct: roundToHundredths(capRatePct),
    rsfSqft,
    occupiedSqft,
    vacantSqft: Math.max(0, rsfSqft - occupiedSqft),
    occupancyPct,
    vacancyPct: Math.max(0, 100 - occupancyPct),
    inPlaceRentPsf: roundToHundredths(inPlaceRentPsf),
    marketRentPsf: roundToHundredths(marketRentPsf),
    predictedRentPsf: roundToHundredths(predictedRentPsf),
    pricePerSfN:
      block.as_is_value_per_sqft != null
        ? Math.round(block.as_is_value_per_sqft)
        : rsfSqft > 0
          ? Math.round(valueUsd / rsfSqft)
          : 0,
    waleYears: roundToHundredths(metrics.wale ?? dataset?.summary.waleYears ?? 0),
    classLabel: classLabelFor(block),
    status:
      occupancyPct >= 90 && (metrics.wale ?? 0) >= 4.5
        ? "Stabilized"
        : occupancyPct >= 74
          ? "Lease-up"
          : "Redevelopment",
  }

  financialCache.set(assetId, metricsResult)
  return metricsResult
}

/* ------------------------------------------------------------------ */
/* Modification recommendation (best projection scenario)             */
/* ------------------------------------------------------------------ */

/** Maps an exported scenario name to the app's modification id + option. */
const SCENARIO_TO_MOD: Record<string, { id: ModId; optionValue: string }> = {
  leed_certified: { id: "leed", optionValue: "leed-certified" },
  leed_silver: { id: "leed", optionValue: "leed-silver" },
  leed_gold: { id: "leed", optionValue: "leed-gold" },
  leed_platinum: { id: "leed", optionValue: "leed-platinum" },
  amenity_gym_general: { id: "gym", optionValue: "general-fitness" },
  amenity_gym_specialized: { id: "gym", optionValue: "specialty-fitness" },
  amenity_gym_studio_mind_body: { id: "gym", optionValue: "mind-body-studio" },
  amenity_bar_beer_pub: { id: "bar", optionValue: "beer-bar-pub" },
  amenity_bar_lounge: { id: "bar", optionValue: "lounge-bar" },
  amenity_bar_wine_spirits: { id: "bar", optionValue: "wine-spirits-bar" },
  amenity_cafe_bakery: { id: "cafe", optionValue: "bakery-cafe" },
  amenity_cafe_coffee: { id: "cafe", optionValue: "coffee-cafe" },
  amenity_cafe_tea: { id: "cafe", optionValue: "tea-cafe" },
  amenity_restaurant_white_tablecloth: {
    id: "restaurant",
    optionValue: "white-cloth",
  },
  amenity_restaurant_full_service: {
    id: "restaurant",
    optionValue: "full-service-restaurant",
  },
  amenity_restaurant_fast_casual: {
    id: "restaurant",
    optionValue: "fast-casual-quick-service",
  },
  amenity_restaurant_specialty_dining: {
    id: "restaurant",
    optionValue: "specialty-dietary-dining",
  },
}

const MOD_CHECKBOX_LABEL: Record<ModId, string> = {
  gym: "Add Gym",
  bar: "Add Bar",
  cafe: "Add Cafe",
  restaurant: "Add Restaurant",
  leed: "LEED certification",
}

const MOD_OPTION_TITLE: Record<string, string> = {
  "general-fitness": "General Fitness",
  "mind-body-studio": "Mind-Body Studio",
  "specialty-fitness": "Specialty Fitness",
  "wine-spirits-bar": "Wine & Spirits Bar",
  "beer-bar-pub": "Beer Bar / Pub",
  "lounge-bar": "Lounge Bar",
  "coffee-cafe": "Coffee Cafe",
  "tea-cafe": "Tea Cafe",
  "bakery-cafe": "Bakery Cafe",
  "white-cloth": "White Cloth",
  "full-service-restaurant": "Full-Service Restaurant",
  "fast-casual-quick-service": "Fast Casual / Quick Service",
  "specialty-dietary-dining": "Specialty Dietary Dining",
  "leed-certified": "Certified",
  "leed-silver": "Silver",
  "leed-gold": "Gold",
  "leed-platinum": "Platinum",
}

const recommendationCache = new Map<string, ModificationRecommendation | null>()

export function buildRealModificationRecommendation(
  assetId: string
): ModificationRecommendation | null {
  if (recommendationCache.has(assetId)) {
    return recommendationCache.get(assetId) ?? null
  }

  const def = DEFS_BY_ID.get(assetId)
  if (def == null) {
    recommendationCache.set(assetId, null)
    return null
  }

  const baselineValue = def.baseline.asset?.mark_to_market_value ?? 0
  const baselinePredictedPsf =
    def.baseline.metrics?.predicted_rent_psf ?? 0
  const scenarios = def.modifications.scenarios ?? []

  let best: { scenario: RawScenario; value: number } | null = null
  for (const scenario of scenarios) {
    if (SCENARIO_TO_MOD[scenario.scenario] == null) continue
    const value = scenario.asset?.mark_to_market_value ?? 0
    if (best == null || value > best.value) {
      best = { scenario, value }
    }
  }

  if (best == null || baselineValue <= 0) {
    recommendationCache.set(assetId, null)
    return null
  }

  const mapping = SCENARIO_TO_MOD[best.scenario.scenario]!
  const averageLiftPct = roundToHundredths(
    (best.value / baselineValue - 1) * 100
  )
  // Per-RSF dollar lift implied by the scenario value gain.
  const rsf = def.baseline.asset?.building_rsf ?? 1
  const valueGainPsf = (best.value - baselineValue) / Math.max(rsf, 1)
  const averageLiftPsf = roundToHundredths(
    Math.max(valueGainPsf, baselinePredictedPsf * (averageLiftPct / 100))
  )

  const recommendation: ModificationRecommendation = {
    id: mapping.id,
    checkboxLabel: MOD_CHECKBOX_LABEL[mapping.id],
    optionValue: mapping.optionValue,
    optionTitle: MOD_OPTION_TITLE[mapping.optionValue] ?? mapping.optionValue,
    averageLiftPsf,
    averageLiftPct,
  }

  recommendationCache.set(assetId, recommendation)
  return recommendation
}

/* ------------------------------------------------------------------ */
/* Valuation condition metrics (In-Place / Mark-to-Market / Gross)    */
/* ------------------------------------------------------------------ */

export type RealConditionMetrics = {
  grossRevenue: number
  opex: number
  noi: number
  assetValue: number
  capRate: number
}

export type RealConditionMetricMap = {
  inPlace: RealConditionMetrics
  markToMarket: RealConditionMetrics
  grossPotential: RealConditionMetrics
}

/**
 * The exact In-Place / Mark-to-Market / Gross Potential figures from the
 * export's `asset` block. Values are used verbatim (not recomputed from
 * NOI ÷ cap) because the source states value/revenue/NOI/cap independently —
 * e.g. gross_potential_value can differ from gross_potential_noi ÷ cap.
 */
export function realValuationConditionMetrics(
  assetId: string
): RealConditionMetricMap | null {
  const def = DEFS_BY_ID.get(assetId)
  if (def == null) return null
  const a = def.baseline.asset ?? {}

  return {
    inPlace: {
      grossRevenue: a.as_is_revenue ?? 0,
      opex: a.as_is_expense ?? 0,
      noi: a.as_is_noi ?? 0,
      assetValue: a.as_is_value ?? 0,
      capRate: roundToHundredths((a.as_is_cap_rate ?? 0) * 100),
    },
    markToMarket: {
      grossRevenue: a.mark_to_market_revenue ?? 0,
      opex: a.mark_to_market_expense ?? 0,
      noi: a.mark_to_market_noi ?? 0,
      assetValue: a.mark_to_market_value ?? 0,
      capRate: roundToHundredths((a.mark_to_market_cap_rate ?? 0) * 100),
    },
    grossPotential: {
      grossRevenue: a.gross_potential_revenue ?? 0,
      opex: a.gross_potential_expense ?? 0,
      noi: a.gross_potential_noi ?? 0,
      assetValue: a.gross_potential_value ?? 0,
      capRate: roundToHundredths((a.gross_potential_cap_rate ?? 0) * 100),
    },
  }
}
