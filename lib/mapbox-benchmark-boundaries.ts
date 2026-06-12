import type { FilterSpecification } from "mapbox-gl"

import { applyStoredBoundary } from "@/lib/benchmark-market-boundaries"
import type {
  BenchmarkArea,
  BenchmarkAreaBounds,
  BenchmarkAreaGeocodeHint,
  BenchmarkBoundarySpec,
} from "@/lib/benchmark-area-types"

export type { BenchmarkAreaGeocodeHint, BenchmarkBoundarySpec } from "@/lib/benchmark-area-types"

type BoundaryTileset = {
  tilesetId: string
  tilesetUrl: string
  sourceLayer: string
}

const US_WORLDVIEW_FILTER: FilterSpecification = [
  "all",
  [
    "any",
    ["==", ["get", "disputed"], false],
    ["==", ["get", "disputed"], "false"],
  ],
  [
    "any",
    ["==", ["get", "worldview"], "all"],
    ["==", ["get", "worldview"], "US"],
  ],
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

const tilesetAccessCache = new Map<string, boolean>()
let boundariesLicensedCache: boolean | null = null

function tilesetIdFromUrl(tilesetUrl: string): string {
  return tilesetUrl.replace(/^mapbox:\/\//, "")
}

export async function mapboxBoundariesLicensed(
  accessToken: string
): Promise<boolean> {
  if (boundariesLicensedCache !== null) return boundariesLicensedCache
  boundariesLicensedCache = await isBoundaryTilesetAccessible(
    BOUNDARY_TILESETS.adm1.tilesetUrl,
    accessToken
  )
  return boundariesLicensedCache
}

export async function isBoundaryTilesetAccessible(
  tilesetUrl: string,
  accessToken: string
): Promise<boolean> {
  const tilesetId = tilesetIdFromUrl(tilesetUrl)
  const cached = tilesetAccessCache.get(tilesetId)
  if (cached !== undefined) return cached

  try {
    const url = new URL(`https://api.mapbox.com/v4/${tilesetId}.json`)
    url.searchParams.set("access_token", accessToken)
    const res = await fetch(url.toString())
    const ok = res.ok
    tilesetAccessCache.set(tilesetId, ok)
    return ok
  } catch {
    tilesetAccessCache.set(tilesetId, false)
    return false
  }
}

async function boundaryIfAccessible(
  area: BenchmarkArea,
  boundary: BenchmarkBoundarySpec | null,
  accessToken: string
): Promise<BenchmarkArea> {
  if (!boundary) return { ...area, boundary: undefined }
  const accessible = await isBoundaryTilesetAccessible(
    boundary.tilesetUrl,
    accessToken
  )
  if (!accessible) return { ...area, boundary: undefined }
  return { ...area, boundary }
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

const US_CONTINENTAL_BOUNDARY = boundarySpec(
  "us-national",
  BOUNDARY_TILESETS.adm1,
  "adm1-lower48",
  [
    "all",
    US_WORLDVIEW_FILTER,
    ["==", ["get", "iso_3166_1"], "US"],
    ["!=", ["get", "iso_3166_2"], "US-AK"],
    ["!=", ["get", "iso_3166_2"], "US-HI"],
    ["!=", ["get", "iso_3166_2"], "us-ak"],
    ["!=", ["get", "iso_3166_2"], "us-hi"],
  ]
)

/** Lower 48 + DC state outlines — excludes Alaska and Hawaii. */
export function usContinentalBoundarySpec(
  areaId = "us-national"
): BenchmarkBoundarySpec {
  if (areaId === "us-national") return US_CONTINENTAL_BOUNDARY
  return boundarySpec(
    areaId,
    BOUNDARY_TILESETS.adm1,
    "adm1-lower48",
    [
      "all",
      US_WORLDVIEW_FILTER,
      ["==", ["get", "iso_3166_1"], "US"],
      ["!=", ["get", "iso_3166_2"], "US-AK"],
      ["!=", ["get", "iso_3166_2"], "US-HI"],
      ["!=", ["get", "iso_3166_2"], "us-ak"],
      ["!=", ["get", "iso_3166_2"], "us-hi"],
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
  accessToken: string,
  limit = 5
): Promise<TilequeryFeature[]> {
  const url = new URL(
    `https://api.mapbox.com/v4/${tilesetId}/tilequery/${lng},${lat}.json`
  )
  url.searchParams.set("geometry", "polygon")
  url.searchParams.set("limit", String(limit))
  url.searchParams.set("access_token", accessToken)

  try {
    const res = await fetch(url.toString())
    if (!res.ok) return []
    const data = (await res.json()) as TilequeryResponse
    return data.features ?? []
  } catch {
    return []
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
  const features = await tilequeryAt(
    tileset.tilesetId,
    center[0],
    center[1],
    accessToken
  )

  for (const feature of features) {
    const mapboxId = mapboxIdFromTilequery(feature)
    if (mapboxId) {
      return boundarySpecFromMapboxId(areaId, tileset, tilesetKey, mapboxId)
    }
  }

  return null
}

async function resolveBoundaryFromHint(
  area: BenchmarkArea,
  hint: BenchmarkAreaGeocodeHint,
  accessToken: string
): Promise<BenchmarkBoundarySpec | null> {
  const placeType = hint.placeTypes?.[0]
  const center = hint.center ?? boundsCenter(area.bounds)

  if (placeType === "country" || hint.countryShortCode === "us") {
    return usContinentalBoundarySpec(area.id)
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
              { tileset: BOUNDARY_TILESETS.adm3, key: "adm3" },
              { tileset: BOUNDARY_TILESETS.adm2, key: "adm2" },
              { tileset: BOUNDARY_TILESETS.statistical, key: "statistical" },
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
  const withStored = applyStoredBoundary(area)
  if (withStored.boundaryGeometry) {
    return withStored
  }

  if (!(await mapboxBoundariesLicensed(accessToken))) {
    return { ...area, boundary: undefined }
  }

  if (area.id === "us-national") {
    return boundaryIfAccessible(
      area,
      usContinentalBoundarySpec(area.id),
      accessToken
    )
  }

  const boundary =
    hint != null
      ? await resolveBoundaryFromHint(area, hint, accessToken)
      : await resolveBoundaryFromHint(
          area,
          { placeTypes: ["place"], center: boundsCenter(area.bounds) },
          accessToken
        )

  return boundaryIfAccessible(area, boundary, accessToken)
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
