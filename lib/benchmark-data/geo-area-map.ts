import type { BenchmarkArea, BenchmarkAreaBounds } from "@/lib/benchmark-area-types"
import { US_NATIONAL_BENCHMARK_AREA, getStoredBoundary } from "@/lib/benchmark-market-boundaries"
import {
  stateBenchmarkAreaForCode,
  stateBenchmarkAreaForRegionalHub,
} from "@/lib/benchmark-state-areas"
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

/** Stored market presets keyed by CBSA code (for metro outline on asset maps). */
const CBSA_STORED_MARKET_ID: Record<string, string> = {
  "35620": "market-new-york",
}

function countyContextFromStatsKey(
  statsKey: string,
  label: string
): {
  countyName: string
  stateCode: string
  stateArea: ReturnType<typeof stateBenchmarkAreaForCode>
} | null {
  const pipeIndex = statsKey.indexOf("|")
  if (pipeIndex < 0) return null

  const stateCode = statsKey.slice(pipeIndex + 1).trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(stateCode)) return null

  const countyName =
    label.split(",")[0]?.trim() ||
    `${statsKey
      .slice(0, pipeIndex)
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())} County`

  return {
    countyName,
    stateCode,
    stateArea: stateBenchmarkAreaForCode(stateCode),
  }
}

function boundsCenter(bounds: BenchmarkAreaBounds): [number, number] {
  const [[west, south], [east, north]] = bounds
  return [(west + east) / 2, (south + north) / 2]
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

function boundsFromGeoJsonGeometry(
  geometry: GeoJSON.Geometry
): BenchmarkAreaBounds | null {
  let minLng = Infinity
  let maxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity

  const visit = (coords: unknown): void => {
    if (
      Array.isArray(coords) &&
      coords.length >= 2 &&
      typeof coords[0] === "number" &&
      typeof coords[1] === "number"
    ) {
      const [lng, lat] = coords as [number, number]
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
      return
    }
    if (Array.isArray(coords)) {
      for (const part of coords) visit(part)
    }
  }

  if ("coordinates" in geometry) {
    visit(geometry.coordinates)
  }

  if (!Number.isFinite(minLng)) return null
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ]
}

function areaFitBounds(area: BenchmarkArea): BenchmarkAreaBounds {
  const geometry = area.boundaryGeometry?.geometry
  if (geometry) {
    const fromGeometry = boundsFromGeoJsonGeometry(geometry)
    if (fromGeometry) return fromGeometry
  }
  return area.bounds
}

function boundsContains(
  outer: BenchmarkAreaBounds,
  inner: BenchmarkAreaBounds,
  tolerance = 0.01
): boolean {
  const [[ow, os], [oe, on]] = outer
  const [[iw, is], [ie, in_]] = inner
  return (
    iw >= ow - tolerance &&
    ie <= oe + tolerance &&
    is >= os - tolerance &&
    in_ <= on + tolerance
  )
}

function intersectBounds(
  left: BenchmarkAreaBounds,
  right: BenchmarkAreaBounds
): BenchmarkAreaBounds | null {
  const [[lw, ls], [le, ln]] = left
  const [[rw, rs], [re, rn]] = right
  const west = Math.max(lw, rw)
  const south = Math.max(ls, rs)
  const east = Math.min(le, re)
  const north = Math.min(ln, rn)
  if (west >= east || south >= north) return null
  return [
    [west, south],
    [east, north],
  ]
}

/**
 * Clip a child geo area for map preview when its stored outline spans outside
 * the parent (e.g. NYC metro under New Jersey state).
 */
export function constrainGeoChildAreaForMap(
  parent: BenchmarkArea,
  child: BenchmarkArea
): BenchmarkArea {
  const parentGeo = geoKeyFromAreaId(parent.id)
  const childGeo = geoKeyFromAreaId(child.id)
  if (
    parentGeo == null ||
    childGeo == null ||
    (parentGeo.geoLevel !== "state" && parentGeo.geoLevel !== "regional_hub")
  ) {
    return child
  }

  if (child.boundaryGeometry == null && child.boundary == null) {
    return child
  }

  const parentBounds = areaFitBounds(enrichGeoBenchmarkAreaForMap(parent))
  const childBounds = areaFitBounds(child)
  if (boundsContains(parentBounds, childBounds)) {
    return child
  }

  const clippedBounds = intersectBounds(parentBounds, childBounds)
  return {
    ...child,
    boundaryGeometry: undefined,
    boundary: undefined,
    bounds: clippedBounds ?? child.bounds,
  }
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

  if (geoLevel === "regional_hub") {
    const stateArea = stateBenchmarkAreaForRegionalHub(statsKey, label)
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

  if (geoLevel === "cbsa") {
    const storedMarketId = CBSA_STORED_MARKET_ID[statsKey]
    const storedMarket = storedMarketId
      ? getStoredBoundary(storedMarketId)
      : null
    if (storedMarket) {
      return {
        ...area,
        bounds: storedMarket.bounds,
        geocodeQuery: geocodeQueryForGeoLevel(geoLevel, statsKey, label),
        boundaryGeometry: storedMarket.geometry,
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
    const countyContext = countyContextFromStatsKey(statsKey, label)
    if (countyContext != null) {
      const { countyName, stateCode, stateArea } = countyContext
      const stateLabel = stateArea?.label ?? stateCode
      const center =
        stateArea?.geocodeHint?.center ??
        (stateArea ? boundsCenter(stateArea.bounds) : undefined)

      return {
        ...area,
        bounds: stateArea?.bounds ?? area.bounds,
        geocodeQuery: `${countyName}, ${stateLabel}`,
        geocodeHint: {
          placeTypes: ["district"],
          districtName: countyName,
          regionName: stateLabel,
          regionShortCode: `US-${stateCode}`,
          countryShortCode: "us",
          center,
        },
      }
    }

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
