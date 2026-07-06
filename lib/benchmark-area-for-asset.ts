import { getAssetById } from "@/lib/assets"
import { getOtherRealAssetById } from "@/lib/real-properties/other-assets"
import {
  curatedBenchmarkMarketAreas,
  US_NATIONAL_BENCHMARK_AREA,
  type BenchmarkArea,
  type BenchmarkAreaBounds,
} from "@/lib/benchmark-area-search"
import { getMarketListingPinById } from "@/lib/market-search-demo-listings"
import { fallbackLngLatForPortfolioAsset } from "@/lib/portfolio-asset-lng-lat"
import { curatedZipAssignmentsForZipCode } from "@/lib/benchmark-submarket-assignments"
import { getBenchmarkAreaById } from "@/lib/benchmark-area-hierarchy"

function presetCenter(bounds: BenchmarkAreaBounds): [number, number] {
  const [[west, south], [east, north]] = bounds
  return [(west + east) / 2, (south + north) / 2]
}

function pointInBounds(
  lng: number,
  lat: number,
  bounds: BenchmarkAreaBounds
): boolean {
  const [[west, south], [east, north]] = bounds
  return lng >= west && lng <= east && lat >= south && lat <= north
}

function distanceSq(
  a: readonly [number, number],
  b: readonly [number, number]
): number {
  const dlng = a[0] - b[0]
  const dlat = a[1] - b[1]
  return dlng * dlng + dlat * dlat
}

function zipCodeFromText(value: string | undefined): string | null {
  if (!value) return null
  const match = value.match(/\b(\d{5})(?:-\d{4})?\b/)
  return match?.[1] ?? null
}

function bestContainingMarketForPoint(
  markets: readonly BenchmarkArea[],
  lng: number,
  lat: number
): BenchmarkArea | null {
  const containing = markets.filter((market) =>
    pointInBounds(lng, lat, market.bounds)
  )
  if (containing.length === 0) return null

  let best = containing[0]!
  let bestDistance = distanceSq([lng, lat], presetCenter(best.bounds))
  for (let index = 1; index < containing.length; index += 1) {
    const candidate = containing[index]!
    const distance = distanceSq([lng, lat], presetCenter(candidate.bounds))
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }
  return best
}

/**
 * Pick the closest curated benchmark market for a map coordinate.
 */
export function resolveBenchmarkAreaForCoordinates(
  lng: number,
  lat: number
): BenchmarkArea {
  const markets = curatedBenchmarkMarketAreas()

  const containing = bestContainingMarketForPoint(markets, lng, lat)
  if (containing) return containing

  let nearest = markets[0]!
  let bestDistance = Infinity
  for (const market of markets) {
    const d = distanceSq([lng, lat], presetCenter(market.bounds))
    if (d < bestDistance) {
      bestDistance = d
      nearest = market
    }
  }
  return nearest
}

/**
 * Pick the closest curated benchmark market for an asset using its synthetic
 * coordinates (stable fallback when geocoding is unavailable on the server).
 */
export function resolveBenchmarkAreaForAsset(assetId: string): BenchmarkArea {
  const asset = getAssetById(assetId) ?? getOtherRealAssetById(assetId)
  if (asset) {
    const zipCode = zipCodeFromText(asset.address)
    if (zipCode) {
      const assignment = curatedZipAssignmentsForZipCode(zipCode)[0]
      if (assignment) {
        const assignedMarket = getBenchmarkAreaById(assignment.marketId)
        if (assignedMarket) return assignedMarket
      }
    }
    const [lng, lat] = fallbackLngLatForPortfolioAsset(assetId, asset.groupId)
    return resolveBenchmarkAreaForCoordinates(lng, lat)
  }

  const pin = getMarketListingPinById(assetId)
  if (pin) {
    const zipCode = zipCodeFromText(pin.location)
    if (zipCode) {
      const assignment = curatedZipAssignmentsForZipCode(zipCode)[0]
      if (assignment) {
        const assignedMarket = getBenchmarkAreaById(assignment.marketId)
        if (assignedMarket) return assignedMarket
      }
    }
    return resolveBenchmarkAreaForCoordinates(pin.longitude, pin.latitude)
  }

  return US_NATIONAL_BENCHMARK_AREA
}
