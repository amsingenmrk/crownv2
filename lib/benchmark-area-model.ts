import type { BenchmarkArea } from "@/lib/benchmark-area-search"
import { resolveBenchmarkAreaForCoordinates } from "@/lib/benchmark-area-for-asset"
import { getTrackedMarketStats } from "@/lib/benchmark-market-stats"
import { ASSETS, getAssetById } from "@/lib/assets"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import {
  isMarketListingPinId,
  MARKET_SEARCH_LISTING_COUNT,
  getMarketListingPinById,
  marketSearchDemoHash32,
  marketSearchDemoPinsBase,
} from "@/lib/market-search-demo-listings"
import { lngLatForPortfolioAsset } from "@/lib/portfolio-asset-lng-lat"
import { stateCodeFromAddressLike } from "@/lib/benchmark-state-areas"
import { zipCodeFromAddressLike } from "@/lib/benchmark-zip-areas"
import { getSampleStackingPlanData } from "@/lib/stacking-plan-data"

export type BenchmarkKpiKey =
  | "askingRent"
  | "inPlaceRent"
  | "occupancy"
  | "observedCapRate"
  | "intrinsicRent"
  | "intrinsicCapRate"
  | "valuePerSf"
  | "sunScore"
  | "viewScore"
  | "amenityQuality"
  | "accessibilityScore"

export type BenchmarkKpiDefinition = {
  key: BenchmarkKpiKey
  label: string
  methodology: string
  format: "rentPsf" | "valuePsf" | "percent" | "score"
  section: "fundamentals" | "rents" | "scores"
}

export const BENCHMARK_KPI_DEFINITIONS: readonly BenchmarkKpiDefinition[] = [
  {
    key: "askingRent",
    label: "Asking",
    methodology:
      "Near-current market signal, refreshed on a 90-day cycle.",
    format: "rentPsf",
    section: "rents",
  },
  {
    key: "inPlaceRent",
    label: "In-Place",
    methodology:
      "Active leases only, with a secondary commencement-date guardrail of 2018–present.",
    format: "rentPsf",
    section: "rents",
  },
  {
    key: "occupancy",
    label: "Occupancy / vacancy",
    methodology:
      "Leased sqft divided by total building sqft, aggregated at the building level.",
    format: "percent",
    section: "fundamentals",
  },
  {
    key: "intrinsicRent",
    label: "Predicted",
    methodology:
      "Model-derived rent for full participants only; recency tied to the last training run.",
    format: "rentPsf",
    section: "rents",
  },
  {
    key: "observedCapRate",
    label: "Observed cap rate",
    methodology:
      "Observed cap rate benchmark from market participants in view, refreshed with benchmark data updates.",
    format: "percent",
    section: "fundamentals",
  },
  {
    key: "intrinsicCapRate",
    label: "Intrinsic cap rate",
    methodology:
      "Model-derived cap rate for full participants only; aggregated value-weighted across the buildings in view.",
    format: "percent",
    section: "fundamentals",
  },
  {
    key: "valuePerSf",
    label: "Value / SF",
    methodology:
      "Model-derived value per square foot for full participants; aggregated as total modeled value divided by total building area in view.",
    format: "valuePsf",
    section: "fundamentals",
  },
  {
    key: "sunScore",
    label: "Sun",
    methodology:
      "Time-stable geospatial score, available for all buildings; no recency filter.",
    format: "score",
    section: "scores",
  },
  {
    key: "viewScore",
    label: "View",
    methodology:
      "Time-stable geospatial score, available for all buildings; no recency filter.",
    format: "score",
    section: "scores",
  },
  {
    key: "amenityQuality",
    label: "Amenity",
    methodology:
      "Composite neighborhood-quality score for full participants; revalidate when underlying amenity data is refreshed.",
    format: "score",
    section: "scores",
  },
  {
    key: "accessibilityScore",
    label: "Accessibility",
    methodology:
      "Time-stable geospatial score, available for all buildings; no recency filter.",
    format: "score",
    section: "scores",
  },
] as const

export type BenchmarkKpiValue = {
  key: BenchmarkKpiKey
  value: string
  supportingRange?: string
  participantNote?: string
}

export type BenchmarkKpiDisplayValue = {
  value: string
  supportingRange?: string
}

export type BenchmarkAreaSnapshot = {
  areaLabel: string
  buildingCount: number
  fullParticipantCount: number
  kpis: BenchmarkKpiValue[]
}

type BenchmarkBuildingSample = {
  id: string
  longitude: number
  latitude: number
  rsfSqft: number
  occupiedSqft: number
  askingRentPsf: number
  inPlaceRentPsf: number
  intrinsicRentPsf: number
  observedCapRatePct: number
  intrinsicCapRatePct: number
  valuePerSfUsd: number
  sunScore: number
  viewScore: number
  amenityQuality: number
  accessibilityScore: number
  isFullParticipant: boolean
}

function u01(seed: string): number {
  return marketSearchDemoHash32(seed) / 0xffff_ffff
}

function syntheticScore(seed: string, base: number, spread: number): number {
  return Math.round(base + (u01(seed) - 0.5) * spread * 2)
}

function getWeightedTenantScore(
  assetId: string,
  field: "sunScore" | "viewScore"
): number {
  const dataset = getSampleStackingPlanData(assetId)
  const tenants = dataset.floors.flatMap((floor) => floor.tenants)
  const withScore = tenants.filter(
    (tenant) => tenant[field] != null && tenant.sqft > 0
  )
  if (withScore.length === 0) {
    return syntheticScore(`${assetId}:${field}`, 58, 18)
  }
  const totalSqft = withScore.reduce((sum, tenant) => sum + tenant.sqft, 0)
  if (totalSqft <= 0) {
    return syntheticScore(`${assetId}:${field}`, 58, 18)
  }
  const weighted =
    withScore.reduce(
      (sum, tenant) => sum + tenant.sqft * (tenant[field] ?? 0),
      0
    ) / totalSqft
  return Math.round(weighted)
}

function buildBenchmarkBuildingSample(
  id: string,
  longitude: number,
  latitude: number
): BenchmarkBuildingSample | null {
  const fin = financialMetricsForAssetId(id)
  if (fin == null) return null

  const isFullParticipant = !isMarketListingPinId(id)
  return {
    id,
    longitude,
    latitude,
    rsfSqft: fin.rsfSqft,
    occupiedSqft: fin.occupiedSqft,
    askingRentPsf: fin.marketRentPsf,
    inPlaceRentPsf: fin.inPlaceRentPsf,
    intrinsicRentPsf: fin.predictedRentPsf,
    observedCapRatePct: fin.capRatePct,
    intrinsicCapRatePct: fin.capRatePct,
    valuePerSfUsd: fin.pricePerSfN,
    sunScore: getWeightedTenantScore(id, "sunScore"),
    viewScore: getWeightedTenantScore(id, "viewScore"),
    amenityQuality: syntheticScore(`amenity:${id}`, 62, 22),
    accessibilityScore: syntheticScore(`access:${id}`, 64, 20),
    isFullParticipant,
  }
}

function benchmarkBuildingCatalog(
  coordinates: Record<string, readonly [number, number]>
): BenchmarkBuildingSample[] {
  const portfolio = ASSETS.map((asset) => {
    const [longitude, latitude] = lngLatForPortfolioAsset(
      asset.id,
      asset.groupId,
      coordinates
    )
    return buildBenchmarkBuildingSample(asset.id, longitude, latitude)
  }).filter((sample): sample is BenchmarkBuildingSample => sample != null)

  const market = marketSearchDemoPinsBase(MARKET_SEARCH_LISTING_COUNT)
    .map((pin) => buildBenchmarkBuildingSample(pin.id, pin.longitude, pin.latitude))
    .filter((sample): sample is BenchmarkBuildingSample => sample != null)

  return [...portfolio, ...market]
}

function benchmarkAreaPeerCount(area: BenchmarkArea): number {
  return benchmarkAreaStats(area)?.buildingCount ?? 0
}

export function benchmarkAreaHasSufficientCoverage(
  area: BenchmarkArea,
  minimumPeers = 2
): boolean {
  return benchmarkAreaPeerCount(area) >= minimumPeers
}

function isInBounds(
  longitude: number,
  latitude: number,
  bounds: [[number, number], [number, number]]
): boolean {
  const [[west, south], [east, north]] = bounds
  return (
    longitude >= west &&
    longitude <= east &&
    latitude >= south &&
    latitude <= north
  )
}

function formatRentPsf(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return `$${value.toFixed(2)} / SF`
}

function formatValuePsf(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return `$${Math.round(value).toLocaleString("en-US")} / SF`
}

function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return `${value.toFixed(1)}%`
}

function formatScore(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return String(Math.round(value))
}

function rangeBounds(
  value: number,
  spread: number,
  {
    min = 0,
    max,
  }: {
    min?: number
    max?: number
  } = {}
): [number, number] {
  const lower = Math.max(min, value - spread)
  const upperRaw = value + spread
  const upper = max == null ? upperRaw : Math.min(max, upperRaw)
  return [lower, upper]
}

function formatRentRange(value: number, spread: number): string {
  const [lower, upper] = rangeBounds(value, spread)
  return `${formatRentPsf(lower)} - ${formatRentPsf(upper)}`
}

function formatValuePsfRange(value: number, spread: number): string {
  const [lower, upper] = rangeBounds(value, spread)
  return `${formatValuePsf(lower)} - ${formatValuePsf(upper)}`
}

function formatPercentRange(
  value: number,
  spread: number,
  options?: {
    min?: number
    max?: number
  }
): string {
  const [lower, upper] = rangeBounds(value, spread, options)
  return `${lower.toFixed(1)}% - ${upper.toFixed(1)}%`
}

function formatScoreRange(value: number, spread: number): string {
  const [lower, upper] = rangeBounds(value, spread, { min: 0, max: 100 })
  return `${Math.round(lower)} - ${Math.round(upper)}`
}

function supportingRangeForKpi(
  key: BenchmarkKpiKey,
  raw: BenchmarkStatsRaw
): string | undefined {
  switch (key) {
    case "askingRent":
      return formatRentRange(raw.askingRentPsf, 1.75)
    case "inPlaceRent":
      return formatRentRange(raw.inPlaceRentPsf, 1.5)
    case "occupancy":
      return formatPercentRange(raw.occupancyPct, 1.8, { min: 0, max: 100 })
    case "intrinsicRent":
      return formatRentRange(raw.intrinsicRentPsf, 2.25)
    case "observedCapRate":
      return formatPercentRange(raw.observedCapRatePct, 0.25, { min: 0 })
    case "intrinsicCapRate":
      return formatPercentRange(raw.intrinsicCapRatePct, 0.35, { min: 0 })
    case "valuePerSf":
      return formatValuePsfRange(raw.valuePerSfUsd, 60)
    case "sunScore":
      return formatScoreRange(raw.sunScore, 4)
    case "viewScore":
      return formatScoreRange(raw.viewScore, 4)
    case "amenityQuality":
      return formatScoreRange(raw.amenityQuality, 5)
    case "accessibilityScore":
      return formatScoreRange(raw.accessibilityScore, 4)
    default:
      return undefined
  }
}

function participantNote(
  count: number,
  total: number,
  label: string
): string | undefined {
  if (count === 0) return `No ${label} in view`
  if (count < total) {
    return `${count} of ${total} buildings (full participants)`
  }
  return undefined
}

export type BenchmarkStatsRaw = {
  askingRentPsf: number
  inPlaceRentPsf: number
  occupancyPct: number
  intrinsicRentPsf: number
  observedCapRatePct: number
  intrinsicCapRatePct: number
  valuePerSfUsd: number
  sunScore: number
  viewScore: number
  amenityQuality: number
  accessibilityScore: number
  buildingCount: number
  fullParticipantCount: number
  coverageAreaId?: string
  coverageAreaLabel?: string
}

function weightedAverage(
  items: { weight: number; value: number }[]
): number | null {
  const valid = items.filter((item) => item.weight > 0 && Number.isFinite(item.value))
  if (valid.length === 0) return null
  const totalWeight = valid.reduce((sum, item) => sum + item.weight, 0)
  if (totalWeight <= 0) return null
  return valid.reduce((sum, item) => sum + item.weight * item.value, 0) / totalWeight
}

function statsRawFromBuildings(
  buildings: BenchmarkBuildingSample[]
): BenchmarkStatsRaw | null {
  const fullParticipants = buildings.filter((building) => building.isFullParticipant)
  const total = buildings.length
  const fullCount = fullParticipants.length
  if (total === 0) return null

  const totalRsf = buildings.reduce((sum, building) => sum + building.rsfSqft, 0)
  const totalOccupied = buildings.reduce(
    (sum, building) => sum + building.occupiedSqft,
    0
  )
  const occupancyPct = totalRsf > 0 ? (totalOccupied / totalRsf) * 100 : null

  const askingRentPsf = weightedAverage(
    buildings.map((building) => ({
      weight: building.rsfSqft,
      value: building.askingRentPsf,
    }))
  )
  const inPlaceRentPsf = weightedAverage(
    buildings.map((building) => ({
      weight: building.occupiedSqft,
      value: building.inPlaceRentPsf,
    }))
  )
  const intrinsicRentPsf = weightedAverage(
    fullParticipants.map((building) => ({
      weight: building.rsfSqft,
      value: building.intrinsicRentPsf,
    }))
  )
  const intrinsicCapRatePct = weightedAverage(
    fullParticipants.map((building) => ({
      weight: building.rsfSqft,
      value: building.intrinsicCapRatePct,
    }))
  )
  const observedCapRatePct = weightedAverage(
    buildings.map((building) => ({
      weight: building.rsfSqft,
      value: building.observedCapRatePct,
    }))
  )
  const valuePerSfUsd = weightedAverage(
    fullParticipants.map((building) => ({
      weight: building.rsfSqft,
      value: building.valuePerSfUsd,
    }))
  )
  const sunScore = weightedAverage(
    buildings.map((building) => ({
      weight: building.rsfSqft,
      value: building.sunScore,
    }))
  )
  const viewScore = weightedAverage(
    buildings.map((building) => ({
      weight: building.rsfSqft,
      value: building.viewScore,
    }))
  )
  const amenityQuality = weightedAverage(
    fullParticipants.map((building) => ({
      weight: building.rsfSqft,
      value: building.amenityQuality,
    }))
  )
  const accessibilityScore = weightedAverage(
    buildings.map((building) => ({
      weight: building.rsfSqft,
      value: building.accessibilityScore,
    }))
  )

  return {
    askingRentPsf: askingRentPsf ?? 0,
    inPlaceRentPsf: inPlaceRentPsf ?? askingRentPsf ?? 0,
    occupancyPct: occupancyPct ?? 0,
    intrinsicRentPsf: intrinsicRentPsf ?? askingRentPsf ?? inPlaceRentPsf ?? 0,
    observedCapRatePct: observedCapRatePct ?? intrinsicCapRatePct ?? 0,
    intrinsicCapRatePct: intrinsicCapRatePct ?? 0,
    valuePerSfUsd: valuePerSfUsd ?? 0,
    sunScore: sunScore ?? 0,
    viewScore: viewScore ?? 0,
    amenityQuality: amenityQuality ?? 0,
    accessibilityScore: accessibilityScore ?? 0,
    buildingCount: total,
    fullParticipantCount: fullCount,
  }
}

function emptyBenchmarkSnapshot(areaLabel: string): BenchmarkAreaSnapshot {
  return {
    areaLabel,
    buildingCount: 0,
    fullParticipantCount: 0,
    kpis: BENCHMARK_KPI_DEFINITIONS.map((definition) => ({
      key: definition.key,
      value: "—",
    })),
  }
}

export function benchmarkSnapshotFromRaw(
  areaLabel: string,
  raw: BenchmarkStatsRaw
): BenchmarkAreaSnapshot {
  const total = raw.buildingCount
  const fullCount = raw.fullParticipantCount

  const values: Record<BenchmarkKpiKey, BenchmarkKpiValue> = {
    askingRent: {
      key: "askingRent",
      value: formatRentPsf(raw.askingRentPsf),
      supportingRange: supportingRangeForKpi("askingRent", raw),
    },
    inPlaceRent: {
      key: "inPlaceRent",
      value: formatRentPsf(raw.inPlaceRentPsf),
      supportingRange: supportingRangeForKpi("inPlaceRent", raw),
    },
    occupancy: {
      key: "occupancy",
      value: formatPercent(raw.occupancyPct),
      supportingRange: supportingRangeForKpi("occupancy", raw),
    },
    observedCapRate: {
      key: "observedCapRate",
      value: formatPercent(raw.observedCapRatePct),
      supportingRange: supportingRangeForKpi("observedCapRate", raw),
    },
    intrinsicRent: {
      key: "intrinsicRent",
      value: formatRentPsf(raw.intrinsicRentPsf),
      supportingRange: supportingRangeForKpi("intrinsicRent", raw),
      participantNote: participantNote(fullCount, total, "full participants"),
    },
    intrinsicCapRate: {
      key: "intrinsicCapRate",
      value: formatPercent(raw.intrinsicCapRatePct),
      supportingRange: supportingRangeForKpi("intrinsicCapRate", raw),
      participantNote: participantNote(fullCount, total, "full participants"),
    },
    valuePerSf: {
      key: "valuePerSf",
      value: formatValuePsf(raw.valuePerSfUsd),
      supportingRange: supportingRangeForKpi("valuePerSf", raw),
      participantNote: participantNote(fullCount, total, "full participants"),
    },
    sunScore: {
      key: "sunScore",
      value: formatScore(raw.sunScore),
      supportingRange: supportingRangeForKpi("sunScore", raw),
    },
    viewScore: {
      key: "viewScore",
      value: formatScore(raw.viewScore),
      supportingRange: supportingRangeForKpi("viewScore", raw),
    },
    amenityQuality: {
      key: "amenityQuality",
      value: formatScore(raw.amenityQuality),
      supportingRange: supportingRangeForKpi("amenityQuality", raw),
      participantNote: participantNote(fullCount, total, "full participants"),
    },
    accessibilityScore: {
      key: "accessibilityScore",
      value: formatScore(raw.accessibilityScore),
      supportingRange: supportingRangeForKpi("accessibilityScore", raw),
    },
  }

  return {
    areaLabel,
    buildingCount: total,
    fullParticipantCount: fullCount,
    kpis: BENCHMARK_KPI_DEFINITIONS.map((def) => values[def.key]),
  }
}

export function benchmarkAreaStats(
  area: BenchmarkArea,
  _coordinates: Record<string, readonly [number, number]> = {}
): BenchmarkStatsRaw | null {
  const tracked = getTrackedMarketStats(area.id)
  if (tracked) {
    return {
      askingRentPsf: tracked.askingRentPsf,
      inPlaceRentPsf: tracked.inPlaceRentPsf,
      occupancyPct: tracked.occupancyPct,
      intrinsicRentPsf: tracked.intrinsicRentPsf,
      observedCapRatePct: tracked.observedCapRatePct,
      intrinsicCapRatePct: tracked.intrinsicCapRatePct,
      valuePerSfUsd: tracked.valuePerSfUsd,
      sunScore: tracked.sunScore,
      viewScore: tracked.viewScore,
      amenityQuality: tracked.amenityQuality,
      accessibilityScore: tracked.accessibilityScore,
      buildingCount: tracked.buildingCount,
      fullParticipantCount: tracked.fullParticipantCount,
      coverageAreaId: area.id,
      coverageAreaLabel: area.label,
    }
  }
  return null
}

export function benchmarkAreaSnapshot(
  area: BenchmarkArea,
  _coordinates: Record<string, readonly [number, number]> = {}
): BenchmarkAreaSnapshot {
  const raw = benchmarkAreaStats(area)
  if (raw == null) {
    return {
      areaLabel: area.label,
      buildingCount: 0,
      fullParticipantCount: 0,
      kpis: BENCHMARK_KPI_DEFINITIONS.map((def) => ({
        key: def.key,
        value: "—",
      })),
    }
  }

  return benchmarkSnapshotFromRaw(area.label, raw)
}

export function benchmarkZipCodeSnapshot(
  zipCode: string | null,
  coordinates: Record<string, readonly [number, number]> = {}
): BenchmarkAreaSnapshot {
  const normalizedZip = zipCode?.trim().slice(0, 5)
  const areaLabel = normalizedZip ?? "ZIP code"
  if (!normalizedZip) return emptyBenchmarkSnapshot(areaLabel)

  const buildings = ASSETS.filter((asset) => {
    return zipCodeFromAddressLike(asset.address) === normalizedZip
  })
    .map((asset) => {
      const [longitude, latitude] = lngLatForPortfolioAsset(
        asset.id,
        asset.groupId,
        coordinates
      )
      return buildBenchmarkBuildingSample(asset.id, longitude, latitude)
    })
    .filter((sample): sample is BenchmarkBuildingSample => sample != null)

  const raw = statsRawFromBuildings(buildings)
  if (raw == null) return emptyBenchmarkSnapshot(areaLabel)
  return benchmarkSnapshotFromRaw(areaLabel, raw)
}

export function benchmarkStateSnapshot(
  stateCode: string | null,
  stateLabel: string,
  coordinates: Record<string, readonly [number, number]> = {}
): BenchmarkAreaSnapshot {
  const normalizedStateCode = stateCode?.trim().toUpperCase()
  if (!normalizedStateCode) return emptyBenchmarkSnapshot(stateLabel)

  const portfolioBuildings = ASSETS.filter((asset) => {
    return stateCodeFromAddressLike(asset.address) === normalizedStateCode
  }).map((asset) => {
    const [longitude, latitude] = lngLatForPortfolioAsset(
      asset.id,
      asset.groupId,
      coordinates
    )
    return buildBenchmarkBuildingSample(asset.id, longitude, latitude)
  })

  const marketBuildings = marketSearchDemoPinsBase(MARKET_SEARCH_LISTING_COUNT)
    .filter((pin) => stateCodeFromAddressLike(pin.location) === normalizedStateCode)
    .map((pin) => buildBenchmarkBuildingSample(pin.id, pin.longitude, pin.latitude))

  const raw = statsRawFromBuildings(
    [...portfolioBuildings, ...marketBuildings].filter(
      (sample): sample is BenchmarkBuildingSample => sample != null
    )
  )
  if (raw == null) return emptyBenchmarkSnapshot(stateLabel)
  return benchmarkSnapshotFromRaw(stateLabel, raw)
}

export type BenchmarkBuildingTableRow = {
  id: string
  buildingName: string
  regionLabel: string
  kpis: Record<BenchmarkKpiKey, BenchmarkKpiDisplayValue>
  isFullParticipant: boolean
}

export type BenchmarkKpiPercentileByKey = Record<BenchmarkKpiKey, number | null>

function benchmarkBuildingDisplayName(id: string): string {
  const asset = getAssetById(id)
  if (asset) return asset.name
  const pin = getMarketListingPinById(id)
  if (pin) return pin.building
  return id
}

function benchmarkKpisForBuilding(
  sample: BenchmarkBuildingSample
): Record<BenchmarkKpiKey, BenchmarkKpiDisplayValue> {
  const occupancyPct =
    sample.rsfSqft > 0
      ? (sample.occupiedSqft / sample.rsfSqft) * 100
      : null

  return {
    askingRent: {
      value: formatRentPsf(sample.askingRentPsf),
      supportingRange: formatRentRange(sample.askingRentPsf, 1.75),
    },
    inPlaceRent: {
      value: formatRentPsf(sample.inPlaceRentPsf),
      supportingRange: formatRentRange(sample.inPlaceRentPsf, 1.5),
    },
    occupancy: {
      value: formatPercent(occupancyPct),
      supportingRange:
        occupancyPct == null
          ? undefined
          : formatPercentRange(occupancyPct, 1.8, { min: 0, max: 100 }),
    },
    observedCapRate: {
      value: formatPercent(sample.observedCapRatePct),
      supportingRange: formatPercentRange(sample.observedCapRatePct, 0.25, {
        min: 0,
      }),
    },
    intrinsicRent: sample.isFullParticipant
      ? {
          value: formatRentPsf(sample.intrinsicRentPsf),
          supportingRange: formatRentRange(sample.intrinsicRentPsf, 2.25),
        }
      : { value: "—" },
    intrinsicCapRate: sample.isFullParticipant
      ? {
          value: formatPercent(sample.intrinsicCapRatePct),
          supportingRange: formatPercentRange(sample.intrinsicCapRatePct, 0.35, {
            min: 0,
          }),
        }
      : { value: "—" },
    valuePerSf: sample.isFullParticipant
      ? {
          value: formatValuePsf(sample.valuePerSfUsd),
          supportingRange: formatValuePsfRange(sample.valuePerSfUsd, 60),
        }
      : { value: "—" },
    sunScore: {
      value: formatScore(sample.sunScore),
      supportingRange: formatScoreRange(sample.sunScore, 4),
    },
    viewScore: {
      value: formatScore(sample.viewScore),
      supportingRange: formatScoreRange(sample.viewScore, 4),
    },
    amenityQuality: sample.isFullParticipant
      ? {
          value: formatScore(sample.amenityQuality),
          supportingRange: formatScoreRange(sample.amenityQuality, 5),
        }
      : { value: "—" },
    accessibilityScore: {
      value: formatScore(sample.accessibilityScore),
      supportingRange: formatScoreRange(sample.accessibilityScore, 4),
    },
  }
}

function benchmarkSampleForAssetId(
  assetId: string,
  coordinates: Record<string, readonly [number, number]>
): BenchmarkBuildingSample | null {
  const asset = getAssetById(assetId)
  if (asset) {
    const [longitude, latitude] = lngLatForPortfolioAsset(
      asset.id,
      asset.groupId,
      coordinates
    )
    return buildBenchmarkBuildingSample(asset.id, longitude, latitude)
  }

  const pin = getMarketListingPinById(assetId)
  if (pin) {
    return buildBenchmarkBuildingSample(
      pin.id,
      pin.longitude,
      pin.latitude
    )
  }

  return null
}

function benchmarkKpiNumericValue(
  sample: BenchmarkBuildingSample,
  key: BenchmarkKpiKey
): number | null {
  switch (key) {
    case "askingRent":
      return sample.askingRentPsf
    case "inPlaceRent":
      return sample.inPlaceRentPsf
    case "occupancy":
      return sample.rsfSqft > 0 ? (sample.occupiedSqft / sample.rsfSqft) * 100 : null
    case "observedCapRate":
      return sample.observedCapRatePct
    case "intrinsicRent":
      return sample.isFullParticipant ? sample.intrinsicRentPsf : null
    case "intrinsicCapRate":
      return sample.isFullParticipant ? sample.intrinsicCapRatePct : null
    case "valuePerSf":
      return sample.isFullParticipant ? sample.valuePerSfUsd : null
    case "sunScore":
      return sample.sunScore
    case "viewScore":
      return sample.viewScore
    case "amenityQuality":
      return sample.isFullParticipant ? sample.amenityQuality : null
    case "accessibilityScore":
      return sample.accessibilityScore
    default:
      return null
  }
}

function benchmarkAreaKpiMean(
  area: BenchmarkArea,
  key: BenchmarkKpiKey
): number | null {
  const raw = benchmarkAreaStats(area)
  if (raw == null) return null
  switch (key) {
    case "askingRent":
      return raw.askingRentPsf
    case "inPlaceRent":
      return raw.inPlaceRentPsf
    case "occupancy":
      return raw.occupancyPct
    case "observedCapRate":
      return raw.observedCapRatePct
    case "intrinsicRent":
      return raw.intrinsicRentPsf
    case "intrinsicCapRate":
      return raw.intrinsicCapRatePct
    case "valuePerSf":
      return raw.valuePerSfUsd
    case "sunScore":
      return raw.sunScore
    case "viewScore":
      return raw.viewScore
    case "amenityQuality":
      return raw.amenityQuality
    case "accessibilityScore":
      return raw.accessibilityScore
    default:
      return null
  }
}

function benchmarkKpiSpread(
  key: BenchmarkKpiKey,
  areaMean: number
): number {
  switch (key) {
    case "askingRent":
    case "inPlaceRent":
    case "intrinsicRent":
      return Math.max(1.25, areaMean * 0.08)
    case "occupancy":
      return 3.5
    case "observedCapRate":
    case "intrinsicCapRate":
      return 0.35
    case "valuePerSf":
      return Math.max(35, areaMean * 0.12)
    case "sunScore":
    case "viewScore":
    case "amenityQuality":
    case "accessibilityScore":
      return 7
    default:
      return 5
  }
}

function percentileFromAreaMean(
  target: number,
  areaMean: number,
  spread: number
): number {
  const safeSpread = Math.max(0.001, spread)
  const z = (target - areaMean) / safeSpread
  const percentile = 50 + z * 18
  return Math.round(Math.max(0, Math.min(100, percentile)))
}

export function benchmarkAssetKpiPercentilesForArea(
  area: BenchmarkArea,
  assetId: string,
  coordinates: Record<string, readonly [number, number]> = {}
): BenchmarkKpiPercentileByKey {
  const empty = Object.fromEntries(
    BENCHMARK_KPI_DEFINITIONS.map((definition) => [definition.key, null])
  ) as BenchmarkKpiPercentileByKey

  const sample = benchmarkSampleForAssetId(assetId, coordinates)
  if (sample == null) return empty

  const out = { ...empty }
  for (const definition of BENCHMARK_KPI_DEFINITIONS) {
    const target = benchmarkKpiNumericValue(sample, definition.key)
    const areaMean = benchmarkAreaKpiMean(area, definition.key)
    if (target == null || areaMean == null || !Number.isFinite(areaMean)) {
      out[definition.key] = null
      continue
    }
    const spread = benchmarkKpiSpread(definition.key, areaMean)
    out[definition.key] = percentileFromAreaMean(target, areaMean, spread)
  }
  return out
}

/** Per-building KPI row for a single asset (ignores benchmark area bounds). */
export function benchmarkBuildingTableRowForAsset(
  assetId: string,
  coordinates: Record<string, readonly [number, number]> = {}
): BenchmarkBuildingTableRow | null {
  const sample = benchmarkSampleForAssetId(assetId, coordinates)
  if (sample == null) return null

  return {
    id: sample.id,
    buildingName: benchmarkBuildingDisplayName(sample.id),
    regionLabel: resolveBenchmarkAreaForCoordinates(
      sample.longitude,
      sample.latitude
    ).label,
    kpis: benchmarkKpisForBuilding(sample),
    isFullParticipant: sample.isFullParticipant,
  }
}

/** Buildings in a benchmark area with per-building KPI values for table display. */
export function benchmarkBuildingTableRows(
  area: BenchmarkArea,
  coordinates: Record<string, readonly [number, number]> = {},
  options?: { highlightAssetId?: string }
): BenchmarkBuildingTableRow[] {
  const buildings = benchmarkBuildingCatalog(coordinates).filter((b) =>
    isInBounds(b.longitude, b.latitude, area.bounds)
  )

  const rows = buildings.map((building) => ({
    id: building.id,
    buildingName: benchmarkBuildingDisplayName(building.id),
    regionLabel: resolveBenchmarkAreaForCoordinates(
      building.longitude,
      building.latitude
    ).label,
    kpis: benchmarkKpisForBuilding(building),
    isFullParticipant: building.isFullParticipant,
  }))

  const highlightId = options?.highlightAssetId
  return rows.sort((left, right) => {
    if (highlightId) {
      if (left.id === highlightId && right.id !== highlightId) return -1
      if (right.id === highlightId && left.id !== highlightId) return 1
    }
    return left.buildingName.localeCompare(right.buildingName, undefined, {
      sensitivity: "base",
    })
  })
}
