import type { BenchmarkArea, BenchmarkAreaBounds } from "@/lib/benchmark-area-types"
import { US_NATIONAL_BENCHMARK_AREA } from "@/lib/benchmark-market-boundaries"
import { stateBenchmarkAreaForCode } from "@/lib/benchmark-state-areas"
import { zipBenchmarkAreaForCode } from "@/lib/benchmark-zip-areas"

const GEO_AREA_PREFIX = "geo:"

const US_BOUNDS: BenchmarkAreaBounds = [
  [-125, 24],
  [-66, 50],
]

const CBSA_GEOCODE_QUERY: Record<string, string> = {
  "14860": "Bridgeport-Stamford-Norwalk, CT",
  "35620": "New York-Newark-Jersey City, NY-NJ",
}

/** Parse a synthetic comparison-area id back into its geo key. */
export function geoKeyFromAreaId(
  areaId: string
): { geoLevel: string; statsKey: string } | null {
  if (!areaId.startsWith(GEO_AREA_PREFIX)) return null
  const rest = areaId.slice(GEO_AREA_PREFIX.length)
  const sep = rest.indexOf(":")
  if (sep < 0) return null
  return { geoLevel: rest.slice(0, sep), statsKey: rest.slice(sep + 1) }
}

function geocodeQueryForGeoLevel(
  geoLevel: string,
  statsKey: string,
  label: string
): string | undefined {
  if (geoLevel === "cbsa") {
    return CBSA_GEOCODE_QUERY[statsKey] ?? label
  }
  if (geoLevel === "national") return "United States"
  if (label) return label
  return statsKey || undefined
}

/**
 * Attach map-friendly bounds and geocode hints to exported `geo:*` areas.
 * Exported hierarchy nodes default to continental US bounds; this prepares them
 * for Mapbox boundary resolution without changing their ids/stats keys.
 */
export function enrichGeoBenchmarkAreaForMap(area: BenchmarkArea): BenchmarkArea {
  const geoKey = geoKeyFromAreaId(area.id)
  if (geoKey == null) return area

  const { geoLevel, statsKey } = geoKey
  const label = area.label

  if (geoLevel === "national") {
    return {
      ...area,
      bounds: US_NATIONAL_BENCHMARK_AREA.bounds,
      boundaryGeometry: US_NATIONAL_BENCHMARK_AREA.boundaryGeometry,
      boundary: US_NATIONAL_BENCHMARK_AREA.boundary,
      level: "country",
    }
  }

  if (geoLevel === "state") {
    const stateArea = stateBenchmarkAreaForCode(statsKey)
    if (stateArea) {
      return {
        ...area,
        bounds: stateArea.bounds,
        geocodeQuery: stateArea.geocodeQuery,
        geocodeHint: stateArea.geocodeHint,
        boundary: stateArea.boundary,
        boundaryGeometry: stateArea.boundaryGeometry,
      }
    }
  }

  if (geoLevel === "zip") {
    const zipArea = zipBenchmarkAreaForCode(statsKey)
    if (zipArea) {
      return {
        ...area,
        bounds: zipArea.bounds,
        geocodeQuery: zipArea.geocodeQuery,
        geocodeHint: zipArea.geocodeHint,
        boundary: zipArea.boundary,
        boundaryGeometry: zipArea.boundaryGeometry,
      }
    }
  }

  if (geoLevel === "county") {
    return {
      ...area,
      geocodeQuery: label,
      geocodeHint: {
        placeTypes: ["district"],
        districtName: label,
        countryShortCode: "us",
      },
    }
  }

  return {
    ...area,
    bounds: area.bounds ?? US_BOUNDS,
    geocodeQuery: geocodeQueryForGeoLevel(geoLevel, statsKey, label),
  }
}
