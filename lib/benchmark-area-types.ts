import type { FilterSpecification } from "mapbox-gl"

export type BenchmarkAreaBounds = [[number, number], [number, number]]

export type BenchmarkBoundarySpec = {
  sourceId: string
  tilesetUrl: string
  sourceLayer: string
  filter: FilterSpecification
}

export type BenchmarkAreaGeocodeHint = {
  placeTypes?: string[]
  center?: [number, number]
  regionName?: string
  regionShortCode?: string
  districtName?: string
  districtShortCode?: string
  countryShortCode?: string
}

export type BenchmarkBoundaryGeometry =
  GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>

export type BenchmarkAreaLevel =
  | "country"
  | "market"
  | "submarket"
  | "msaState"
  | "county"
  | "zip"

export type BenchmarkArea = {
  id: string
  label: string
  bounds: BenchmarkAreaBounds
  level: BenchmarkAreaLevel
  geocodeQuery?: string
  boundary?: BenchmarkBoundarySpec
  /** Stored polygon for preset markets (Census CBSA / state outlines). */
  boundaryGeometry?: BenchmarkBoundaryGeometry
  geocodeHint?: BenchmarkAreaGeocodeHint
  parentId?: string
  childLevel?: BenchmarkAreaLevel
  isCurated?: boolean
  aliases?: string[]
}
