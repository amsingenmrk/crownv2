export type BenchmarkAreaBounds = [[number, number], [number, number]]

export type BenchmarkArea = {
  id: string
  label: string
  bounds: BenchmarkAreaBounds
}

export const US_NATIONAL_BENCHMARK_AREA: BenchmarkArea = {
  id: "us-national",
  label: "United States",
  bounds: [
    [-125, 24],
    [-66, 50],
  ],
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
}

type GeocodeResponse = {
  features?: GeocodeFeature[]
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
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

function areaFromCenter(
  id: string,
  label: string,
  center: [number, number],
  spanLng = 0.45,
  spanLat = 0.35
): BenchmarkArea {
  const [lng, lat] = center
  return {
    id,
    label,
    bounds: [
      [lng - spanLng, lat - spanLat],
      [lng + spanLng, lat + spanLat],
    ],
  }
}

function presetMatches(query: string): BenchmarkArea | null {
  const q = normalizeQuery(query)
  if (!q) return null

  const exact = BENCHMARK_SEARCH_PRESETS.find(
    (preset) =>
      normalizeQuery(preset.label) === q ||
      preset.id === q.replace(/\s+/g, "-")
  )
  if (exact) return exact

  if (
    q === "us" ||
    q === "usa" ||
    q === "united states" ||
    q === "national" ||
    q === "country"
  ) {
    return US_NATIONAL_BENCHMARK_AREA
  }

  const partial = BENCHMARK_SEARCH_PRESETS.find((preset) =>
    normalizeQuery(preset.label).includes(q)
  )
  return partial ?? null
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
  const presetExact = presetMatches(trimmed)

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json`
  )
  url.searchParams.set("access_token", accessToken)
  url.searchParams.set("country", "US")
  url.searchParams.set(
    "types",
    "country,region,district,place,locality,neighborhood"
  )
  url.searchParams.set("limit", "5")

  let geocodeFeatures: GeocodeFeature[] = []
  try {
    const res = await fetch(url.toString())
    if (res.ok) {
      const data = (await res.json()) as GeocodeResponse
      geocodeFeatures = data.features ?? []
    }
  } catch {
    // fall back to presets only
  }

  const geocodeAreas = geocodeFeatures.map((feature) => {
    const label = shortLabel(feature.place_name)
    if (feature.bbox && feature.bbox.length === 4) {
      return areaFromBounds(feature.id, label, feature.bbox)
    }
    if (feature.center && feature.center.length === 2) {
      const isCountry = feature.place_type?.includes("country")
      if (isCountry) return US_NATIONAL_BENCHMARK_AREA
      return areaFromCenter(feature.id, label, feature.center)
    }
    return null
  }).filter((area): area is BenchmarkArea => area != null)

  const merged: BenchmarkArea[] = []
  const seen = new Set<string>()

  if (presetExact) {
    merged.push(presetExact)
    seen.add(presetExact.id)
  }

  for (const area of [...presetHits, ...geocodeAreas]) {
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
  if (!trimmed) return US_NATIONAL_BENCHMARK_AREA

  const preset = presetMatches(trimmed)
  if (preset) return preset

  const results = await searchBenchmarkAreas(trimmed, accessToken)
  return results[0] ?? US_NATIONAL_BENCHMARK_AREA
}
