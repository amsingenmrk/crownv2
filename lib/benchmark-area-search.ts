import {
  applyStoredBoundary,
  US_NATIONAL_BENCHMARK_AREA,
} from "@/lib/benchmark-market-boundaries"
import type {
  BenchmarkArea,
  BenchmarkAreaBounds,
  BenchmarkAreaGeocodeHint,
  BenchmarkBoundarySpec,
} from "@/lib/benchmark-area-types"

export type {
  BenchmarkArea,
  BenchmarkAreaBounds,
  BenchmarkAreaGeocodeHint,
  BenchmarkBoundarySpec,
} from "@/lib/benchmark-area-types"

export { US_NATIONAL_BENCHMARK_AREA }

type BenchmarkMarketPreset = BenchmarkArea & {
  aliases?: string[]
  geocodeQuery: string
}

/** Curated benchmark markets shown in the typeahead starter list. */
const BENCHMARK_MARKET_PRESETS: BenchmarkMarketPreset[] = [
  {
    id: "market-los-angeles",
    label: "Los Angeles",
    geocodeQuery: "Los Angeles, CA",
    bounds: [
      [-118.95, 33.65],
      [-117.65, 34.35],
    ],
    aliases: ["la"],
  },
  {
    id: "market-dc",
    label: "D.C.",
    geocodeQuery: "Washington, DC",
    bounds: [
      [-77.5, 38.75],
      [-76.8, 39.15],
    ],
    aliases: ["dc", "washington dc", "washington d.c."],
  },
  {
    id: "market-phoenix",
    label: "Phoenix",
    geocodeQuery: "Phoenix, AZ",
    bounds: [
      [-112.45, 33.2],
      [-111.55, 33.85],
    ],
  },
  {
    id: "market-seattle",
    label: "Seattle",
    geocodeQuery: "Seattle, WA",
    bounds: [
      [-122.55, 47.35],
      [-122.05, 47.85],
    ],
  },
  {
    id: "market-philadelphia",
    label: "Philadelphia",
    geocodeQuery: "Philadelphia, PA",
    bounds: [
      [-75.45, 39.8],
      [-74.9, 40.2],
    ],
    aliases: ["philly"],
  },
  {
    id: "market-new-jersey",
    label: "New Jersey",
    geocodeQuery: "New Jersey",
    bounds: [
      [-75.6, 38.9],
      [-73.9, 41.4],
    ],
    aliases: ["nj"],
  },
  {
    id: "market-minneapolis-st-paul",
    label: "Minneapolis/St. Paul",
    geocodeQuery: "Minneapolis, MN",
    bounds: [
      [-93.55, 44.7],
      [-92.9, 45.25],
    ],
    aliases: ["minneapolis", "st paul", "twin cities"],
  },
  {
    id: "market-chicago",
    label: "Chicago",
    geocodeQuery: "Chicago, IL",
    bounds: [
      [-88.15, 41.55],
      [-87.35, 42.15],
    ],
  },
  {
    id: "market-houston",
    label: "Houston",
    geocodeQuery: "Houston, TX",
    bounds: [
      [-95.85, 29.45],
      [-95.0, 30.15],
    ],
  },
  {
    id: "market-san-diego",
    label: "San Diego",
    geocodeQuery: "San Diego, CA",
    bounds: [
      [-117.35, 32.5],
      [-116.9, 33.15],
    ],
  },
  {
    id: "market-utah",
    label: "Utah",
    geocodeQuery: "Utah",
    bounds: [
      [-114.2, 36.9],
      [-109.0, 42.1],
    ],
  },
  {
    id: "market-portland",
    label: "Portland",
    geocodeQuery: "Portland, OR",
    bounds: [
      [-123.0, 45.3],
      [-122.4, 45.65],
    ],
  },
  {
    id: "market-fort-lauderdale",
    label: "Fort Lauderdale",
    geocodeQuery: "Fort Lauderdale, FL",
    bounds: [
      [-80.4, 26.0],
      [-80.0, 26.35],
    ],
    aliases: ["ft lauderdale"],
  },
  {
    id: "market-cincinnati",
    label: "Cincinnati",
    geocodeQuery: "Cincinnati, OH",
    bounds: [
      [-84.75, 39.0],
      [-84.35, 39.35],
    ],
  },
  {
    id: "market-tampa-bay",
    label: "Tampa Bay",
    geocodeQuery: "Tampa, FL",
    bounds: [
      [-82.85, 27.7],
      [-82.2, 28.25],
    ],
    aliases: ["tampa"],
  },
  {
    id: "market-miami",
    label: "Miami",
    geocodeQuery: "Miami, FL",
    bounds: [
      [-80.45, 25.55],
      [-80.05, 26.05],
    ],
  },
  {
    id: "market-sacramento",
    label: "Sacramento",
    geocodeQuery: "Sacramento, CA",
    bounds: [
      [-121.65, 38.4],
      [-121.2, 38.75],
    ],
  },
  {
    id: "market-charlotte",
    label: "Charlotte",
    geocodeQuery: "Charlotte, NC",
    bounds: [
      [-81.05, 35.05],
      [-80.6, 35.45],
    ],
  },
  {
    id: "market-san-jose",
    label: "San Jose",
    geocodeQuery: "San Jose, CA",
    bounds: [
      [-122.15, 37.2],
      [-121.7, 37.55],
    ],
  },
  {
    id: "market-pittsburgh",
    label: "Pittsburgh",
    geocodeQuery: "Pittsburgh, PA",
    bounds: [
      [-80.25, 40.3],
      [-79.75, 40.65],
    ],
  },
  {
    id: "market-cleveland",
    label: "Cleveland",
    geocodeQuery: "Cleveland, OH",
    bounds: [
      [-81.95, 41.3],
      [-81.45, 41.65],
    ],
  },
  {
    id: "market-columbus",
    label: "Columbus",
    geocodeQuery: "Columbus, OH",
    bounds: [
      [-83.2, 39.85],
      [-82.8, 40.2],
    ],
  },
  {
    id: "market-new-york",
    label: "New York",
    geocodeQuery: "New York, NY",
    bounds: [
      [-74.45, 40.35],
      [-73.45, 41.05],
    ],
    aliases: ["nyc", "new york city"],
  },
]

const BENCHMARK_SEARCH_PRESETS: BenchmarkArea[] = BENCHMARK_MARKET_PRESETS.map(
  (preset) => applyStoredBoundary(preset)
)

export function isBenchmarkMarketPreset(area: BenchmarkArea): boolean {
  return area.id.startsWith("market-")
}

function findMarketPreset(query: string): BenchmarkMarketPreset | null {
  const q = normalizeQuery(query)
  if (!q) return null

  return (
    BENCHMARK_MARKET_PRESETS.find((preset) => {
      if (normalizeQuery(preset.label) === q) return true
      if (preset.id === q.replace(/\s+/g, "-")) return true
      return (preset.aliases ?? []).some((alias) => normalizeQuery(alias) === q)
    }) ?? null
  )
}

function marketPresetMatchesQuery(
  preset: BenchmarkMarketPreset,
  query: string
): boolean {
  const q = normalizeQuery(query)
  if (!q) return true

  const label = normalizeQuery(preset.label)
  if (label.includes(q)) return true

  return (preset.aliases ?? []).some((alias) =>
    normalizeQuery(alias).includes(q)
  )
}

async function resolveMarketPreset(
  preset: BenchmarkMarketPreset
): Promise<BenchmarkArea> {
  return applyStoredBoundary(preset)
}

export async function resolveBenchmarkAreaSelection(
  area: BenchmarkArea,
  _accessToken?: string
): Promise<BenchmarkArea> {
  if (area.id === "us-national") {
    return US_NATIONAL_BENCHMARK_AREA
  }

  const preset = BENCHMARK_MARKET_PRESETS.find((item) => item.id === area.id)
  if (preset) return resolveMarketPreset(preset)

  return applyStoredBoundary({
    ...area,
    boundary: undefined,
  })
}

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
  if (area.id.startsWith("market-")) return 10
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

function presetMatchesExact(query: string): BenchmarkMarketPreset | null {
  const q = normalizeQuery(query)
  if (!q) return null

  const exact = findMarketPreset(query)
  if (exact) return exact

  if (isNationalAreaQuery(query)) {
    return null
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

function geocodeHintFromFeature(feature: {
  place_type?: string[]
  center?: [number, number]
  context?: Array<{ id: string; short_code?: string }>
}): BenchmarkAreaGeocodeHint {
  const context = feature.context ?? []
  const region = context.find((item) => item.id.startsWith("region."))
  const district = context.find((item) => item.id.startsWith("district."))
  const country = context.find((item) => item.id.startsWith("country."))

  return {
    placeTypes: feature.place_type,
    center: feature.center,
    regionShortCode: region?.short_code,
    districtShortCode: district?.short_code,
    countryShortCode: country?.short_code,
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
  if (!q) return BENCHMARK_SEARCH_PRESETS

  return BENCHMARK_MARKET_PRESETS.filter((preset) =>
    marketPresetMatchesQuery(preset, q)
  ).map((preset) => applyStoredBoundary(preset))
}

/** Best matching curated market for a query, or null if none match. */
export function matchBenchmarkPresetFromQuery(
  query: string
): BenchmarkArea | null {
  const exact = findMarketPreset(query)
  if (exact) {
    return (
      BENCHMARK_SEARCH_PRESETS.find((preset) => preset.id === exact.id) ??
      applyStoredBoundary(exact)
    )
  }
  return filterBenchmarkAreaPresets(query)[0] ?? null
}

export async function searchBenchmarkAreas(
  query: string,
  _accessToken?: string
): Promise<BenchmarkArea[]> {
  const trimmed = query.trim()
  if (!trimmed) return BENCHMARK_SEARCH_PRESETS
  return filterBenchmarkAreaPresets(trimmed).slice(0, 8)
}

export async function resolveBenchmarkAreaFromSearch(
  query: string,
  _accessToken?: string
): Promise<BenchmarkArea> {
  const trimmed = query.trim()
  if (!trimmed || isNationalAreaQuery(trimmed)) {
    return US_NATIONAL_BENCHMARK_AREA
  }

  const exactPreset = presetMatchesExact(trimmed)
  if (exactPreset) {
    return resolveMarketPreset(exactPreset)
  }

  const presetFallback = BENCHMARK_MARKET_PRESETS.find((preset) =>
    marketPresetMatchesQuery(preset, trimmed)
  )
  if (presetFallback) {
    return resolveMarketPreset(presetFallback)
  }

  return US_NATIONAL_BENCHMARK_AREA
}
