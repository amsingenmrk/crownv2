import {
  enrichBenchmarkAreaWithBoundary,
  geocodeHintFromFeature,
  usCountryBoundarySpec,
  type BenchmarkAreaGeocodeHint,
  type BenchmarkBoundarySpec,
} from "@/lib/mapbox-benchmark-boundaries"

export type BenchmarkAreaBounds = [[number, number], [number, number]]

export type BenchmarkArea = {
  id: string
  label: string
  bounds: BenchmarkAreaBounds
  boundary?: BenchmarkBoundarySpec
  geocodeHint?: BenchmarkAreaGeocodeHint
}

export const US_NATIONAL_BENCHMARK_AREA: BenchmarkArea = {
  id: "us-national",
  label: "United States",
  bounds: [
    [-125, 24],
    [-66, 50],
  ],
  boundary: usCountryBoundarySpec("us-national"),
}

const BENCHMARK_SEARCH_PRESETS: BenchmarkArea[] = [
  US_NATIONAL_BENCHMARK_AREA,
  {
    id: "metro-new-york",
    label: "New York metro",
    bounds: [
      [-74.45, 40.35],
      [-73.45, 41.05],
    ],
  },
  {
    id: "metro-chicago",
    label: "Chicago metro",
    bounds: [
      [-88.15, 41.55],
      [-87.35, 42.15],
    ],
  },
  {
    id: "metro-los-angeles",
    label: "Los Angeles metro",
    bounds: [
      [-118.65, 33.65],
      [-117.95, 34.35],
    ],
  },
  {
    id: "metro-denver",
    label: "Denver metro",
    bounds: [
      [-105.2, 39.55],
      [-104.65, 39.95],
    ],
  },
  {
    id: "metro-seattle",
    label: "Seattle metro",
    bounds: [
      [-122.55, 47.35],
      [-122.05, 47.85],
    ],
  },
  {
    id: "metro-dallas",
    label: "Dallas metro",
    bounds: [
      [-97.15, 32.55],
      [-96.45, 33.15],
    ],
  },
  {
    id: "metro-atlanta",
    label: "Atlanta metro",
    bounds: [
      [-84.65, 33.55],
      [-84.15, 34.05],
    ],
  },
  {
    id: "metro-miami",
    label: "Miami metro",
    bounds: [
      [-80.45, 25.55],
      [-80.05, 26.05],
    ],
  },
  {
    id: "metro-san-francisco",
    label: "San Francisco metro",
    bounds: [
      [-122.65, 37.55],
      [-122.15, 37.95],
    ],
  },
  {
    id: "metro-boston",
    label: "Boston metro",
    bounds: [
      [-71.25, 42.2],
      [-70.85, 42.55],
    ],
  },
]

type GeocodeFeature = {
  id: string
  place_name: string
  center?: [number, number]
  bbox?: [number, number, number, number]
  place_type?: string[]
  context?: Array<{ id: string; short_code?: string }>
}

type GeocodeResponse = {
  features?: GeocodeFeature[]
}

const GEOCODE_TYPES =
  "country,region,district,place,locality,neighborhood,postcode"

const PLACE_TYPE_ZOOM: Record<string, number> = {
  postcode: 14,
  neighborhood: 13,
  locality: 12,
  place: 12,
  district: 11,
  region: 8,
  country: 4.5,
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

export function isUsPostcodeQuery(query: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(query.trim())
}

function isNationalAreaQuery(query: string): boolean {
  const q = normalizeQuery(query)
  return (
    q === "us" ||
    q === "usa" ||
    q === "united states" ||
    q === "national" ||
    q === "country"
  )
}

export function maxZoomForBenchmarkArea(area: BenchmarkArea): number {
  if (area.id === "us-national") return PLACE_TYPE_ZOOM.country
  const placeType = area.geocodeHint?.placeTypes?.[0]
  if (placeType && placeType in PLACE_TYPE_ZOOM) {
    return PLACE_TYPE_ZOOM[placeType]
  }
  if (area.id.startsWith("metro-")) return 10
  return 11
}

function areaFromBounds(
  id: string,
  label: string,
  bbox: [number, number, number, number]
): BenchmarkArea {
  const [west, south, east, north] = bbox
  return {
    id,
    label,
    bounds: [
      [west, south],
      [east, north],
    ],
  }
}

function centerSpanForPlaceTypes(placeTypes?: string[]): {
  spanLng: number
  spanLat: number
} {
  if (placeTypes?.includes("postcode")) {
    return { spanLng: 0.06, spanLat: 0.05 }
  }
  if (placeTypes?.includes("neighborhood")) {
    return { spanLng: 0.04, spanLat: 0.035 }
  }
  if (placeTypes?.includes("place") || placeTypes?.includes("locality")) {
    return { spanLng: 0.22, spanLat: 0.18 }
  }
  if (placeTypes?.includes("district")) {
    return { spanLng: 0.35, spanLat: 0.28 }
  }
  return { spanLng: 0.45, spanLat: 0.35 }
}

function areaFromCenter(
  id: string,
  label: string,
  center: [number, number],
  placeTypes?: string[]
): BenchmarkArea {
  const [lng, lat] = center
  const { spanLng, spanLat } = centerSpanForPlaceTypes(placeTypes)
  return {
    id,
    label,
    bounds: [
      [lng - spanLng, lat - spanLat],
      [lng + spanLng, lat + spanLat],
    ],
  }
}

function presetMatchesExact(query: string): BenchmarkArea | null {
  const q = normalizeQuery(query)
  if (!q) return null

  const exact = BENCHMARK_SEARCH_PRESETS.find(
    (preset) =>
      normalizeQuery(preset.label) === q ||
      preset.id === q.replace(/\s+/g, "-")
  )
  if (exact) return exact

  if (isNationalAreaQuery(query)) {
    return US_NATIONAL_BENCHMARK_AREA
  }

  return null
}

async function fetchGeocodeFeatures(
  query: string,
  accessToken: string
): Promise<GeocodeFeature[]> {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query.trim())}.json`
  )
  url.searchParams.set("access_token", accessToken)
  url.searchParams.set("country", "US")
  url.searchParams.set("types", GEOCODE_TYPES)
  url.searchParams.set("limit", "6")

  try {
    const res = await fetch(url.toString())
    if (!res.ok) return []
    const data = (await res.json()) as GeocodeResponse
    return data.features ?? []
  } catch {
    return []
  }
}

const PLACE_TYPE_RANK: Record<string, number> = {
  postcode: 0,
  neighborhood: 1,
  locality: 2,
  place: 3,
  district: 4,
  region: 5,
  country: 6,
}

function pickBestGeocodeFeature(
  features: GeocodeFeature[],
  query: string
): GeocodeFeature | null {
  if (features.length === 0) return null

  if (isUsPostcodeQuery(query)) {
    const postcode = features.find((feature) =>
      feature.place_type?.includes("postcode")
    )
    if (postcode) return postcode
  }

  const q = normalizeQuery(query)
  const wantsRegion =
    q.includes("state") ||
    q.endsWith(" county") ||
    q.includes(" metro") ||
    q.includes(" cbsa")

  const ranked = [...features].sort((a, b) => {
    const aType = a.place_type?.[0] ?? "unknown"
    const bType = b.place_type?.[0] ?? "unknown"
    const aRank = PLACE_TYPE_RANK[aType] ?? 99
    const bRank = PLACE_TYPE_RANK[bType] ?? 99

    if (!wantsRegion) {
      if (aType === "region" && (bType === "place" || bType === "locality")) {
        return 1
      }
      if (bType === "region" && (aType === "place" || aType === "locality")) {
        return -1
      }
    }

    return aRank - bRank
  })

  return ranked[0] ?? features[0]
}

function areaFromGeocodeFeature(feature: GeocodeFeature): BenchmarkArea | null {
  const label = shortLabel(feature.place_name)
  const geocodeHint = geocodeHintFromFeature(feature)

  if (feature.place_type?.includes("country")) {
    return US_NATIONAL_BENCHMARK_AREA
  }

  if (feature.bbox && feature.bbox.length === 4) {
    return {
      ...areaFromBounds(feature.id, label, feature.bbox),
      geocodeHint,
    }
  }

  if (feature.center && feature.center.length === 2) {
    return {
      ...areaFromCenter(feature.id, label, feature.center, feature.place_type),
      geocodeHint,
    }
  }

  return null
}

function shortLabel(placeName: string): string {
  const first = placeName.split(",")[0]?.trim()
  return first && first.length > 0 ? first : placeName
}

export function benchmarkAreaPolygon(
  bounds: BenchmarkAreaBounds
): GeoJSON.Feature<GeoJSON.Polygon> {
  const [[west, south], [east, north]] = bounds
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ],
      ],
    },
  }
}

export function filterBenchmarkAreaPresets(query: string): BenchmarkArea[] {
  const q = normalizeQuery(query)
  if (!q) return BENCHMARK_SEARCH_PRESETS.slice(0, 6)

  return BENCHMARK_SEARCH_PRESETS.filter((preset) =>
    normalizeQuery(preset.label).includes(q)
  ).slice(0, 8)
}

export async function searchBenchmarkAreas(
  query: string,
  accessToken: string
): Promise<BenchmarkArea[]> {
  const trimmed = query.trim()
  if (!trimmed) return [US_NATIONAL_BENCHMARK_AREA]

  const presetHits = filterBenchmarkAreaPresets(trimmed)
  const presetExact = presetMatchesExact(trimmed)
  const geocodeFeatures = await fetchGeocodeFeatures(trimmed, accessToken)

  const geocodeAreas = geocodeFeatures
    .map((feature) => areaFromGeocodeFeature(feature))
    .filter((area): area is BenchmarkArea => area != null)

  const merged: BenchmarkArea[] = []
  const seen = new Set<string>()

  for (const area of geocodeAreas) {
    if (seen.has(area.id)) continue
    seen.add(area.id)
    merged.push(area)
  }

  if (presetExact) {
    if (!seen.has(presetExact.id)) {
      merged.unshift(presetExact)
      seen.add(presetExact.id)
    }
  }

  for (const area of presetHits) {
    if (seen.has(area.id)) continue
    seen.add(area.id)
    merged.push(area)
  }

  return merged.slice(0, 8)
}

export async function resolveBenchmarkAreaFromSearch(
  query: string,
  accessToken: string
): Promise<BenchmarkArea> {
  const trimmed = query.trim()
  if (!trimmed || isNationalAreaQuery(trimmed)) {
    return US_NATIONAL_BENCHMARK_AREA
  }

  const exactPreset = presetMatchesExact(trimmed)
  if (exactPreset) {
    return enrichBenchmarkAreaWithBoundary(exactPreset, accessToken)
  }

  const geocodeFeatures = await fetchGeocodeFeatures(trimmed, accessToken)
  const bestFeature = pickBestGeocodeFeature(geocodeFeatures, trimmed)
  if (bestFeature) {
    const area = areaFromGeocodeFeature(bestFeature)
    if (area) {
      return enrichBenchmarkAreaWithBoundary(
        area,
        accessToken,
        area.geocodeHint
      )
    }
  }

  const presetFallback = filterBenchmarkAreaPresets(trimmed)[0]
  if (presetFallback) {
    return enrichBenchmarkAreaWithBoundary(presetFallback, accessToken)
  }

  return US_NATIONAL_BENCHMARK_AREA
}
