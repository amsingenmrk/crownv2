import { getAssetById } from "@/lib/assets"
import {
  curatedBenchmarkMarketAreas,
  US_NATIONAL_BENCHMARK_AREA,
  type BenchmarkArea,
  type BenchmarkAreaBounds,
} from "@/lib/benchmark-area-search"
import { getMarketListingPinById } from "@/lib/market-search-demo-listings"
import { fallbackLngLatForPortfolioAsset } from "@/lib/portfolio-asset-lng-lat"

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

/**
 * Pick the closest curated benchmark market for a map coordinate.
 */
export function resolveBenchmarkAreaForCoordinates(
  lng: number,
  lat: number
): BenchmarkArea {
  const markets = curatedBenchmarkMarketAreas()

  const containing = markets.find((market) =>
    pointInBounds(lng, lat, market.bounds)
  )
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
  const asset = getAssetById(assetId)
  if (asset) {
    const [lng, lat] = fallbackLngLatForPortfolioAsset(assetId, asset.groupId)
    return resolveBenchmarkAreaForCoordinates(lng, lat)
  }

  const pin = getMarketListingPinById(assetId)
  if (pin) {
    return resolveBenchmarkAreaForCoordinates(pin.longitude, pin.latitude)
  }

  return US_NATIONAL_BENCHMARK_AREA
}
