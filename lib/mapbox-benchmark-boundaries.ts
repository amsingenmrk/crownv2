import type { FilterSpecification } from "mapbox-gl"

import type { BenchmarkArea, BenchmarkAreaBounds } from "@/lib/benchmark-area-search"

export type BenchmarkBoundarySpec = {
  sourceId: string
  tilesetUrl: string
  sourceLayer: string
  filter: FilterSpecification
}

export type BenchmarkAreaGeocodeHint = {
  placeTypes?: string[]
  center?: [number, number]
  regionShortCode?: string
  districtShortCode?: string
  countryShortCode?: string
}

type BoundaryTileset = {
  tilesetId: string
  tilesetUrl: string
  sourceLayer: string
}

const US_WORLDVIEW_FILTER: FilterSpecification = [
  "all",
  [
    "any",
    ["==", ["get", "worldview"], "all"],
    ["in", "US", ["get", "worldview"]],
  ],
  ["==", ["get", "disputed"], "false"],
]

const BOUNDARY_TILESETS = {
  country: {
    tilesetId: "mapbox.country-boundaries-v1",
    tilesetUrl: "mapbox://mapbox.country-boundaries-v1",
    sourceLayer: "country_boundaries",
  },
  adm1: {
    tilesetId: "mapbox.boundaries-adm1-v4",
    tilesetUrl: "mapbox://mapbox.boundaries-adm1-v4",
    sourceLayer: "boundaries_admin_1",
  },
  adm2: {
    tilesetId: "mapbox.boundaries-adm2-v4",
    tilesetUrl: "mapbox://mapbox.boundaries-adm2-v4",
    sourceLayer: "boundaries_admin_2",
  },
  adm3: {
    tilesetId: "mapbox.boundaries-adm3-v4",
    tilesetUrl: "mapbox://mapbox.boundaries-adm3-v4",
    sourceLayer: "boundaries_admin_3",
  },
  statistical: {
    tilesetId: "mapbox.enterprise-boundaries-statistical-a2-v2",
    tilesetUrl: "mapbox://mapbox.enterprise-boundaries-statistical-a2-v2",
    sourceLayer: "boundaries_statistical_2",
  },
} as const satisfies Record<string, BoundaryTileset>

type TilequeryFeature = {
  properties?: Record<string, unknown>
}

type TilequeryResponse = {
  features?: TilequeryFeature[]
}

function boundsCenter(bounds: BenchmarkAreaBounds): [number, number] {
  const [[west, south], [east, north]] = bounds
  return [(west + east) / 2, (south + north) / 2]
}

function boundarySourceId(areaId: string, tilesetKey: string): string {
  return `benchmark-boundary-${areaId}-${tilesetKey}`.replace(/[^a-zA-Z0-9-_]/g, "-")
}

function boundarySpec(
  areaId: string,
  tileset: BoundaryTileset,
  tilesetKey: string,
  filter: FilterSpecification
): BenchmarkBoundarySpec {
  return {
    sourceId: boundarySourceId(areaId, tilesetKey),
    tilesetUrl: tileset.tilesetUrl,
    sourceLayer: tileset.sourceLayer,
    filter,
  }
}

export function usCountryBoundarySpec(areaId = "us-national"): BenchmarkBoundarySpec {
  return boundarySpec(
    areaId,
    BOUNDARY_TILESETS.country,
    "country",
    [
      "all",
      US_WORLDVIEW_FILTER,
      ["==", ["get", "iso_3166_1"], "US"],
    ]
  )
}

function adm1BoundarySpecByIso(
  areaId: string,
  iso3166_2: string
): BenchmarkBoundarySpec {
  return boundarySpec(
    areaId,
    BOUNDARY_TILESETS.adm1,
    "adm1",
    [
      "all",
      US_WORLDVIEW_FILTER,
      ["==", ["get", "iso_3166_2"], iso3166_2],
    ]
  )
}

function boundarySpecFromMapboxId(
  areaId: string,
  tileset: BoundaryTileset,
  tilesetKey: string,
  mapboxId: string
): BenchmarkBoundarySpec {
  return boundarySpec(areaId, tileset, tilesetKey, [
    "all",
    US_WORLDVIEW_FILTER,
    ["==", ["get", "mapbox_id"], mapboxId],
  ])
}

async function tilequeryAt(
  tilesetId: string,
  lng: number,
  lat: number,
  accessToken: string
): Promise<TilequeryFeature | null> {
  const url = new URL(
    `https://api.mapbox.com/v4/${tilesetId}/tilequery/${lng},${lat}.json`
  )
  url.searchParams.set("geometry", "polygon")
  url.searchParams.set("limit", "1")
  url.searchParams.set("access_token", accessToken)

  try {
    const res = await fetch(url.toString())
    if (!res.ok) return null
    const data = (await res.json()) as TilequeryResponse
    return data.features?.[0] ?? null
  } catch {
    return null
  }
}

function mapboxIdFromTilequery(feature: TilequeryFeature): string | null {
  const props = feature.properties ?? {}
  const id = props.mapbox_id ?? props.id
  if (typeof id === "string" && id.length > 0) return id
  if (typeof id === "number") return String(id)
  return null
}

async function tilequeryBoundarySpec(
  areaId: string,
  tileset: BoundaryTileset,
  tilesetKey: string,
  center: [number, number],
  accessToken: string
): Promise<BenchmarkBoundarySpec | null> {
  const feature = await tilequeryAt(
    tileset.tilesetId,
    center[0],
    center[1],
    accessToken
  )
  if (!feature) return null

  const mapboxId = mapboxIdFromTilequery(feature)
  if (!mapboxId) return null

  return boundarySpecFromMapboxId(areaId, tileset, tilesetKey, mapboxId)
}

async function resolveBoundaryFromHint(
  area: BenchmarkArea,
  hint: BenchmarkAreaGeocodeHint,
  accessToken: string
): Promise<BenchmarkBoundarySpec | null> {
  const placeType = hint.placeTypes?.[0]
  const center = hint.center ?? boundsCenter(area.bounds)

  if (placeType === "country" || hint.countryShortCode === "us") {
    return usCountryBoundarySpec(area.id)
  }

  if (placeType === "region" && hint.regionShortCode) {
    return adm1BoundarySpecByIso(area.id, hint.regionShortCode.toUpperCase())
  }

  const tilesetChain: Array<{
    tileset: BoundaryTileset
    key: keyof typeof BOUNDARY_TILESETS
  }> =
    placeType === "postcode" || placeType === "neighborhood"
      ? [
          { tileset: BOUNDARY_TILESETS.adm3, key: "adm3" },
          { tileset: BOUNDARY_TILESETS.adm2, key: "adm2" },
        ]
      : placeType === "district"
        ? [
            { tileset: BOUNDARY_TILESETS.adm2, key: "adm2" },
            { tileset: BOUNDARY_TILESETS.adm3, key: "adm3" },
            { tileset: BOUNDARY_TILESETS.statistical, key: "statistical" },
          ]
        : placeType === "place" || placeType === "locality"
          ? [
              { tileset: BOUNDARY_TILESETS.statistical, key: "statistical" },
              { tileset: BOUNDARY_TILESETS.adm3, key: "adm3" },
              { tileset: BOUNDARY_TILESETS.adm2, key: "adm2" },
            ]
          : [
              { tileset: BOUNDARY_TILESETS.statistical, key: "statistical" },
              { tileset: BOUNDARY_TILESETS.adm2, key: "adm2" },
              { tileset: BOUNDARY_TILESETS.adm3, key: "adm3" },
            ]

  for (const { tileset, key } of tilesetChain) {
    const spec = await tilequeryBoundarySpec(
      area.id,
      tileset,
      key,
      center,
      accessToken
    )
    if (spec) return spec
  }

  return null
}

export async function enrichBenchmarkAreaWithBoundary(
  area: BenchmarkArea,
  accessToken: string,
  hint?: BenchmarkAreaGeocodeHint
): Promise<BenchmarkArea> {
  if (area.id === "us-national") {
    return { ...area, boundary: usCountryBoundarySpec(area.id) }
  }

  const boundary =
    hint != null
      ? await resolveBoundaryFromHint(area, hint, accessToken)
      : await resolveBoundaryFromHint(
          area,
          { placeTypes: ["place"], center: boundsCenter(area.bounds) },
          accessToken
        )

  if (!boundary) return area
  return { ...area, boundary }
}

export function geocodeHintFromFeature(feature: {
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
