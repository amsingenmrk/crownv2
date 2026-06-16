import type { BenchmarkArea } from "@/lib/benchmark-area-search"
import { getTrackedMarketStats } from "@/lib/benchmark-market-stats"
import { ASSETS } from "@/lib/assets"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import {
  isMarketListingPinId,
  MARKET_SEARCH_LISTING_COUNT,
  marketSearchDemoHash32,
  marketSearchDemoPinsBase,
} from "@/lib/market-search-demo-listings"
import { lngLatForPortfolioAsset } from "@/lib/portfolio-asset-lng-lat"
import { getSampleStackingPlanData } from "@/lib/stacking-plan-data"

export type BenchmarkKpiKey =
  | "askingRent"
  | "inPlaceRent"
  | "occupancy"
  | "intrinsicRent"
  | "sunScore"
  | "viewScore"
  | "amenityQuality"
  | "accessibilityScore"

export type BenchmarkKpiDefinition = {
  key: BenchmarkKpiKey
  label: string
  methodology: string
  format: "rentPsf" | "percent" | "score"
}

export const BENCHMARK_KPI_DEFINITIONS: readonly BenchmarkKpiDefinition[] = [
  {
    key: "askingRent",
    label: "Asking rent",
    methodology:
      "Near-current market signal, refreshed on a 90-day cycle.",
    format: "rentPsf",
  },
  {
    key: "inPlaceRent",
    label: "In-place rent",
    methodology:
      "Active leases only, with a secondary commencement-date guardrail of 2018–present.",
    format: "rentPsf",
  },
  {
    key: "occupancy",
    label: "Occupancy / vacancy",
    methodology:
      "Leased sqft divided by total building sqft, aggregated at the building level.",
    format: "percent",
  },
  {
    key: "intrinsicRent",
    label: "Intrinsic rent",
    methodology:
      "Model-derived rent for full participants only; recency tied to the last training run.",
    format: "rentPsf",
  },
  {
    key: "sunScore",
    label: "Sun score",
    methodology:
      "Time-stable geospatial score, available for all buildings; no recency filter.",
    format: "score",
  },
  {
    key: "viewScore",
    label: "View score",
    methodology:
      "Time-stable geospatial score, available for all buildings; no recency filter.",
    format: "score",
  },
  {
    key: "amenityQuality",
    label: "Amenity quality",
    methodology:
      "Composite neighborhood-quality score for full participants; revalidate when underlying amenity data is refreshed.",
    format: "score",
  },
  {
    key: "accessibilityScore",
    label: "Accessibility score",
    methodology:
      "Time-stable geospatial score, available for all buildings; no recency filter.",
    format: "score",
  },
] as const

export type BenchmarkKpiValue = {
  key: BenchmarkKpiKey
  value: string
  participantNote?: string
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

function weightedAverage(
  items: { weight: number; value: number }[]
): number | null {
  const valid = items.filter((i) => i.weight > 0 && Number.isFinite(i.value))
  if (valid.length === 0) return null
  const totalWeight = valid.reduce((sum, i) => sum + i.weight, 0)
  if (totalWeight <= 0) return null
  return (
    valid.reduce((sum, i) => sum + i.value * i.weight, 0) / totalWeight
  )
}

function getWeightedTenantScore(
  assetId: string,
  field: "sunScore" | "viewScore"
): number {
  const dataset = getSampleStackingPlanData(assetId)
  const tenants = dataset.floors.flatMap((floor) => floor.tenants)
  const withScore = tenants.filter(
    (t) => t[field] != null && t.sqft > 0
  )
  if (withScore.length === 0) {
    return syntheticScore(`${assetId}:${field}`, 58, 18)
  }
  const totalSqft = withScore.reduce((sum, t) => sum + t.sqft, 0)
  if (totalSqft <= 0) return syntheticScore(`${assetId}:${field}`, 58, 18)
  const weighted =
    withScore.reduce((sum, t) => sum + t.sqft * (t[field] ?? 0), 0) /
    totalSqft
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
  const sunScore = getWeightedTenantScore(id, "sunScore")
  const viewScore = getWeightedTenantScore(id, "viewScore")
  const amenityQuality = syntheticScore(`amenity:${id}`, 62, 22)
  const accessibilityScore = syntheticScore(`access:${id}`, 64, 20)

  return {
    id,
    longitude,
    latitude,
    rsfSqft: fin.rsfSqft,
    occupiedSqft: fin.occupiedSqft,
    askingRentPsf: fin.marketRentPsf,
    inPlaceRentPsf: fin.inPlaceRentPsf,
    intrinsicRentPsf: fin.predictedRentPsf,
    sunScore,
    viewScore,
    amenityQuality,
    accessibilityScore,
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
  }).filter((b): b is BenchmarkBuildingSample => b != null)

  const market = marketSearchDemoPinsBase(MARKET_SEARCH_LISTING_COUNT)
    .map((pin) =>
      buildBenchmarkBuildingSample(pin.id, pin.longitude, pin.latitude)
    )
    .filter((b): b is BenchmarkBuildingSample => b != null)

  return [...portfolio, ...market]
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

function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return `${value.toFixed(1)}%`
}

function formatScore(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return String(Math.round(value))
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
  sunScore: number
  viewScore: number
  amenityQuality: number
  accessibilityScore: number
  buildingCount: number
  fullParticipantCount: number
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
    },
    inPlaceRent: {
      key: "inPlaceRent",
      value: formatRentPsf(raw.inPlaceRentPsf),
    },
    occupancy: {
      key: "occupancy",
      value: formatPercent(raw.occupancyPct),
    },
    intrinsicRent: {
      key: "intrinsicRent",
      value: formatRentPsf(raw.intrinsicRentPsf),
      participantNote: participantNote(fullCount, total, "full participants"),
    },
    sunScore: {
      key: "sunScore",
      value: formatScore(raw.sunScore),
    },
    viewScore: {
      key: "viewScore",
      value: formatScore(raw.viewScore),
    },
    amenityQuality: {
      key: "amenityQuality",
      value: formatScore(raw.amenityQuality),
      participantNote: participantNote(fullCount, total, "full participants"),
    },
    accessibilityScore: {
      key: "accessibilityScore",
      value: formatScore(raw.accessibilityScore),
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
  coordinates: Record<string, readonly [number, number]> = {}
): BenchmarkStatsRaw | null {
  const tracked = getTrackedMarketStats(area.id)
  if (tracked) {
    return {
      askingRentPsf: tracked.askingRentPsf,
      inPlaceRentPsf: tracked.inPlaceRentPsf,
      occupancyPct: tracked.occupancyPct,
      intrinsicRentPsf: tracked.intrinsicRentPsf,
      sunScore: tracked.sunScore,
      viewScore: tracked.viewScore,
      amenityQuality: tracked.amenityQuality,
      accessibilityScore: tracked.accessibilityScore,
      buildingCount: tracked.buildingCount,
      fullParticipantCount: tracked.fullParticipantCount,
    }
  }

  const buildings = benchmarkBuildingCatalog(coordinates).filter((b) =>
    isInBounds(b.longitude, b.latitude, area.bounds)
  )
  const fullParticipants = buildings.filter((b) => b.isFullParticipant)
  const total = buildings.length
  const fullCount = fullParticipants.length

  const askingRent = weightedAverage(
    buildings.map((b) => ({ weight: b.rsfSqft, value: b.askingRentPsf }))
  )
  const inPlaceRent = weightedAverage(
    buildings.map((b) => ({
      weight: b.occupiedSqft,
      value: b.inPlaceRentPsf,
    }))
  )
  const totalRsf = buildings.reduce((sum, b) => sum + b.rsfSqft, 0)
  const totalOccupied = buildings.reduce((sum, b) => sum + b.occupiedSqft, 0)
  const occupancy =
    totalRsf > 0 ? (totalOccupied / totalRsf) * 100 : null
  const intrinsicRent = weightedAverage(
    fullParticipants.map((b) => ({
      weight: b.rsfSqft,
      value: b.intrinsicRentPsf,
    }))
  )
  const sunScore = weightedAverage(
    buildings.map((b) => ({ weight: b.rsfSqft, value: b.sunScore }))
  )
  const viewScore = weightedAverage(
    buildings.map((b) => ({ weight: b.rsfSqft, value: b.viewScore }))
  )
  const amenityQuality = weightedAverage(
    fullParticipants.map((b) => ({
      weight: b.rsfSqft,
      value: b.amenityQuality,
    }))
  )
  const accessibilityScore = weightedAverage(
    buildings.map((b) => ({
      weight: b.rsfSqft,
      value: b.accessibilityScore,
    }))
  )

  if (total === 0) {
    return null
  }

  return {
    askingRentPsf: askingRent ?? 0,
    inPlaceRentPsf: inPlaceRent ?? askingRent ?? 0,
    occupancyPct: occupancy ?? 0,
    intrinsicRentPsf: intrinsicRent ?? askingRent ?? inPlaceRent ?? 0,
    sunScore: sunScore ?? 0,
    viewScore: viewScore ?? 0,
    amenityQuality: amenityQuality ?? 0,
    accessibilityScore: accessibilityScore ?? 0,
    buildingCount: total,
    fullParticipantCount: fullCount,
  }
}

export function benchmarkAreaSnapshot(
  area: BenchmarkArea,
  coordinates: Record<string, readonly [number, number]> = {}
): BenchmarkAreaSnapshot {
  const raw = benchmarkAreaStats(area, coordinates)
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
