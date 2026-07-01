import { applyStoredBoundary } from "@/lib/benchmark-market-boundaries"
import { curatedZipAssignmentsForZipCode } from "@/lib/benchmark-submarket-assignments"
import {
  benchmarkAreaCenter,
  benchmarkAreaContainsPoint,
  bestBenchmarkMarketForPoint,
  BENCHMARK_ROOT_AREA,
  getBenchmarkAreaById,
  getBenchmarkAreaLevelLabel,
  getBenchmarkAreaPath,
  isCuratedBenchmarkMarket,
  listBenchmarkAreaChildren,
  searchBenchmarkHierarchyAreas,
} from "@/lib/benchmark-area-hierarchy"
import { stateBenchmarkAreaById } from "@/lib/benchmark-state-areas"
import { zipBenchmarkAreaById } from "@/lib/benchmark-zip-areas"
import { enrichBenchmarkAreaWithBoundary } from "@/lib/mapbox-benchmark-boundaries"
import type {
  BenchmarkArea,
  BenchmarkAreaBounds,
  BenchmarkAreaGeocodeHint,
  BenchmarkAreaLevel,
  BenchmarkBoundarySpec,
} from "@/lib/benchmark-area-types"

export type {
  BenchmarkArea,
  BenchmarkAreaBounds,
  BenchmarkAreaGeocodeHint,
  BenchmarkAreaLevel,
  BenchmarkBoundarySpec,
} from "@/lib/benchmark-area-types"

export { BENCHMARK_ROOT_AREA as US_NATIONAL_BENCHMARK_AREA }

/** Curated top-level benchmark markets under the U.S. root. */
export function curatedBenchmarkMarketAreas(): BenchmarkArea[] {
  return [...listBenchmarkAreaChildren(BENCHMARK_ROOT_AREA)]
}

/** Resolve any supported benchmark area id from URL or deep links. */
export function resolveBenchmarkAreaById(
  areaId: string | null | undefined
): BenchmarkArea | null {
  const id = areaId?.trim()
  if (!id) return null
  if (id === BENCHMARK_ROOT_AREA.id) return BENCHMARK_ROOT_AREA
  return (
    getBenchmarkAreaById(id) ??
    stateBenchmarkAreaById(id) ??
    zipBenchmarkAreaById(id) ??
    null
  )
}

type GeocodeFeature = {
  id: string
  place_name: string
  center?: [number, number]
  bbox?: [number, number, number, number]
  place_type?: string[]
  context?: Array<{ id: string; short_code?: string; text?: string }>
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

const LEVEL_ZOOM: Record<BenchmarkAreaLevel, number> = {
  country: 4.5,
  regionalHub: 6,
  state: 6.5,
  market: 8.5,
  submarket: 10.5,
  msaState: 11.5,
  county: 12.5,
  zip: 14,
}

const resolvedSelectionCache = new Map<string, Promise<BenchmarkArea>>()

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

function normalizeAliases(values: Array<string | undefined>): string[] {
  return values
    .flatMap((value) => (value ? [value.trim()] : []))
    .filter((value, index, array) => value.length > 0 && array.indexOf(value) === index)
}

export function isBenchmarkMarketPreset(area: BenchmarkArea): boolean {
  return isCuratedBenchmarkMarket(area)
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
  const placeType = area.geocodeHint?.placeTypes?.[0]
  if (placeType && placeType in PLACE_TYPE_ZOOM) {
    return Math.max(LEVEL_ZOOM[area.level], PLACE_TYPE_ZOOM[placeType])
  }
  return LEVEL_ZOOM[area.level]
}

function areaFromBounds(
  id: string,
  label: string,
  bbox: [number, number, number, number],
  level: BenchmarkAreaLevel
): BenchmarkArea {
  const [west, south, east, north] = bbox
  return {
    id,
    label,
    bounds: [
      [west, south],
      [east, north],
    ],
    level,
    childLevel: nextChildLevel(level),
    isCurated: false,
    aliases: [label],
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

function nextChildLevel(level: BenchmarkAreaLevel): BenchmarkAreaLevel | undefined {
  switch (level) {
    case "country":
      return "market"
    case "market":
      return "submarket"
    case "submarket":
    case "msaState":
    case "county":
    case "zip":
      return undefined
  }
}

function areaFromCenter(
  id: string,
  label: string,
  center: [number, number],
  placeTypes: string[] | undefined,
  level: BenchmarkAreaLevel
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
    level,
    childLevel: nextChildLevel(level),
    isCurated: false,
    aliases: [label],
  }
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
  context?: Array<{ id: string; short_code?: string; text?: string }>
}): BenchmarkAreaGeocodeHint {
  const context = feature.context ?? []
  const region = context.find((item) => item.id.startsWith("region."))
  const district = context.find((item) => item.id.startsWith("district."))
  const country = context.find((item) => item.id.startsWith("country."))

  return {
    placeTypes: feature.place_type,
    center: feature.center,
    regionName: region?.text,
    regionShortCode: region?.short_code,
    districtName: district?.text,
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
    q.includes("cbsa")

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

function inferredLevelForFeature(feature: GeocodeFeature): BenchmarkAreaLevel {
  if (feature.place_type?.includes("country")) return "country"
  if (feature.place_type?.includes("postcode")) return "zip"
  if (feature.place_type?.includes("district")) return "county"
  if (feature.place_type?.includes("region")) return "msaState"
  return "submarket"
}

function shortLabel(placeName: string): string {
  const first = placeName.split(",")[0]?.trim()
  return first && first.length > 0 ? first : placeName
}

function areaFromGeocodeFeature(feature: GeocodeFeature): BenchmarkArea | null {
  const geocodeHint = geocodeHintFromFeature(feature)
  const level = inferredLevelForFeature(feature)
  const label = shortLabel(feature.place_name)

  if (level === "country") {
    return BENCHMARK_ROOT_AREA
  }

  if (feature.bbox && feature.bbox.length === 4) {
    return {
      ...areaFromBounds(feature.id, label, feature.bbox, level),
      geocodeHint,
    }
  }

  if (feature.center && feature.center.length === 2) {
    return {
      ...areaFromCenter(feature.id, label, feature.center, feature.place_type, level),
      geocodeHint,
    }
  }

  return null
}

function mergedArea(baseArea: BenchmarkArea, resolvedArea: BenchmarkArea): BenchmarkArea {
  return {
    ...baseArea,
    bounds: resolvedArea.bounds,
    boundary: resolvedArea.boundary,
    boundaryGeometry: resolvedArea.boundaryGeometry,
    geocodeHint: resolvedArea.geocodeHint ?? baseArea.geocodeHint,
    aliases: normalizeAliases([
      ...(baseArea.aliases ?? []),
      ...(resolvedArea.aliases ?? []),
      resolvedArea.label,
    ]),
  }
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

function boundsFromGeoJsonGeometry(
  geometry: GeoJSON.Geometry
): BenchmarkAreaBounds | null {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  const visit = (coords: unknown): void => {
    if (!Array.isArray(coords)) return
    if (
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
    for (const part of coords) visit(part)
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

/** Tight bbox for map fit — prefers stored outline geometry over preset rectangles. */
export function benchmarkAreaFitBounds(area: BenchmarkArea): BenchmarkAreaBounds {
  const geometry = area.boundaryGeometry?.geometry
  if (geometry) {
    const fromGeometry = boundsFromGeoJsonGeometry(geometry)
    if (fromGeometry) return fromGeometry
  }
  return area.bounds
}

export function filterBenchmarkAreaPresets(
  query: string,
  currentArea?: BenchmarkArea
): BenchmarkArea[] {
  return searchBenchmarkHierarchyAreas(query, currentArea)
}

/** Best matching curated or hierarchical benchmark area for a query, or null if none match. */
export function matchBenchmarkPresetFromQuery(
  query: string,
  currentArea?: BenchmarkArea
): BenchmarkArea | null {
  const trimmed = query.trim()
  if (!trimmed) return null

  return (
    searchBenchmarkHierarchyAreas(trimmed, currentArea).find((area) => {
      const normalized = normalizeQuery(trimmed)
      if (normalizeQuery(area.label) === normalized) return true
      return (area.aliases ?? []).some(
        (alias) => normalizeQuery(alias) === normalized
      )
    }) ?? null
  )
}

async function resolveAreaBoundary(
  area: BenchmarkArea,
  accessToken?: string
): Promise<BenchmarkArea> {
  const withStoredBoundary = applyStoredBoundary({
    ...area,
    boundary: undefined,
  })

  if (
    withStoredBoundary.id === BENCHMARK_ROOT_AREA.id ||
    withStoredBoundary.boundaryGeometry ||
    !accessToken ||
    withStoredBoundary.geocodeHint == null
  ) {
    return withStoredBoundary
  }

  return enrichBenchmarkAreaWithBoundary(
    withStoredBoundary,
    accessToken,
    withStoredBoundary.geocodeHint
  )
}

async function resolveAreaFromGeocodeQuery(
  area: BenchmarkArea,
  accessToken: string
): Promise<BenchmarkArea> {
  const cacheKey = `${area.id}:${area.geocodeQuery ?? ""}`
  const cached = resolvedSelectionCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const promise = (async () => {
    if (!area.geocodeQuery) {
      return resolveAreaBoundary(area, accessToken)
    }

    const features = await fetchGeocodeFeatures(area.geocodeQuery, accessToken)
    const bestFeature = pickBestGeocodeFeature(features, area.geocodeQuery)
    if (bestFeature == null) {
      return resolveAreaBoundary(area, accessToken)
    }

    const geocodedArea = areaFromGeocodeFeature(bestFeature)
    if (geocodedArea == null) {
      return resolveAreaBoundary(area, accessToken)
    }

    return resolveAreaBoundary(mergedArea(area, geocodedArea), accessToken)
  })()

  resolvedSelectionCache.set(cacheKey, promise)
  return promise
}

function sameBounds(
  left: BenchmarkAreaBounds,
  right: BenchmarkAreaBounds
): boolean {
  return (
    left[0][0] === right[0][0] &&
    left[0][1] === right[0][1] &&
    left[1][0] === right[1][0] &&
    left[1][1] === right[1][1]
  )
}

async function resolveHierarchyChildren(
  area: BenchmarkArea,
  accessToken?: string
): Promise<BenchmarkArea[]> {
  const children = [...listBenchmarkAreaChildren(area)]
  if (children.length === 0) return []
  return Promise.all(
    children.map((child) => resolveBenchmarkAreaSelection(child, accessToken))
  )
}

function normalizedCountyKey(
  label: string | undefined,
  stateCode: string | undefined
): string | null {
  if (!label || !stateCode) return null
  const normalizedLabel = normalizeQuery(label).replace(/\bcounty\b/g, "").trim()
  if (!normalizedLabel) return null
  const normalizedStateCode = stateCode.toUpperCase().replace(/^US-/, "")
  return `${normalizedStateCode}:${normalizedLabel}`
}

function countyNodeKey(area: BenchmarkArea): string | null {
  return normalizedCountyKey(area.label, area.geocodeHint?.regionShortCode)
}

function countyKeyFromDerivedArea(area: BenchmarkArea): string | null {
  const countyName = area.geocodeHint?.districtName ?? area.label
  return normalizedCountyKey(countyName, area.geocodeHint?.regionShortCode)
}

function zipCodeFromValue(value: string | undefined): string | null {
  if (!value) return null
  const match = value.match(/\b\d{5}\b/)
  return match?.[0] ?? null
}

function marketContextForArea(area: BenchmarkArea): BenchmarkArea | null {
  if (area.level === "market") return area
  return getBenchmarkAreaPath(area).find((entry) => entry.level === "market") ?? null
}

async function classifyDerivedAreaIntoHierarchy(
  area: BenchmarkArea,
  currentArea: BenchmarkArea,
  accessToken?: string
): Promise<BenchmarkArea | null> {
  const center = area.geocodeHint?.center ?? benchmarkAreaCenter(area)
  const currentMarket = marketContextForArea(currentArea)
  const targetMarket =
    currentMarket && benchmarkAreaContainsPoint(currentMarket, center)
      ? currentMarket
      : bestBenchmarkMarketForPoint(center)

  if (targetMarket == null) {
    return null
  }

  const resolvedMarket = await resolveBenchmarkAreaSelection(targetMarket, accessToken)
  const resolvedSubmarkets = await resolveHierarchyChildren(resolvedMarket, accessToken)

  if (area.level === "submarket") {
    const exactSubmarket =
      [...listBenchmarkAreaChildren(resolvedMarket)].find((candidate) => {
        const normalized = normalizeQuery(area.label)
        if (normalizeQuery(candidate.label) === normalized) return true
        return (candidate.aliases ?? []).some(
          (alias) => normalizeQuery(alias) === normalized
        )
      }) ?? null

    if (exactSubmarket) {
      return resolveBenchmarkAreaSelection(exactSubmarket, accessToken)
    }
    return null
  }

  const countyCandidates = (
    await Promise.all(
      resolvedSubmarkets.map((submarket) =>
        resolveHierarchyChildren(submarket, accessToken)
      )
    )
  ).flat()
  const derivedCountyKey = countyKeyFromDerivedArea(area)
  const matchedCounty =
    derivedCountyKey == null
      ? null
      : countyCandidates.find(
          (candidate) => countyNodeKey(candidate) === derivedCountyKey
        ) ?? null

  if (area.level === "county" && matchedCounty) {
    return resolveBenchmarkAreaSelection(matchedCounty, accessToken)
  }
  if (area.level === "county") {
    return null
  }

  if (area.level !== "zip") {
    return null
  }

  const zipCode =
    zipCodeFromValue(area.label) ??
    zipCodeFromValue(area.geocodeHint?.districtName) ??
    zipCodeFromValue(area.geocodeQuery)
  if (zipCode == null) return null

  const matchingZipAssignments = curatedZipAssignmentsForZipCode(zipCode)
  const matchingZipNode =
    matchingZipAssignments
      .filter((assignment) => assignment.marketId === resolvedMarket.id)
      .map((assignment) => getBenchmarkAreaById(assignment.id))
      .find((candidate): candidate is BenchmarkArea => candidate != null) ??
    matchingZipAssignments
      .map((assignment) => getBenchmarkAreaById(assignment.id))
      .find((candidate): candidate is BenchmarkArea => candidate != null) ??
    null

  if (matchingZipNode == null) {
    return null
  }

  return resolveBenchmarkAreaSelection(matchingZipNode, accessToken)
}

export async function resolveBenchmarkAreaSelection(
  area: BenchmarkArea,
  accessToken?: string
): Promise<BenchmarkArea> {
  const registered = getBenchmarkAreaById(area.id) ?? area
  if (
    accessToken &&
    registered.geocodeQuery &&
    registered.boundaryGeometry == null &&
    (registered.geocodeHint == null || registered.geocodeHint.center == null)
  ) {
    return resolveAreaFromGeocodeQuery(registered, accessToken)
  }

  return resolveAreaBoundary(registered, accessToken)
}

function dedupeAreas(areas: BenchmarkArea[]): BenchmarkArea[] {
  const seen = new Set<string>()
  const next: BenchmarkArea[] = []
  for (const area of areas) {
    if (seen.has(area.id)) continue
    seen.add(area.id)
    next.push(area)
  }
  return next
}

export async function searchBenchmarkAreas(
  query: string,
  currentArea: BenchmarkArea = BENCHMARK_ROOT_AREA,
  accessToken?: string
): Promise<BenchmarkArea[]> {
  const trimmed = query.trim()
  const hierarchyMatches = searchBenchmarkHierarchyAreas(trimmed, currentArea)

  if (!trimmed) return hierarchyMatches
  if (!accessToken || trimmed.length < 3 || hierarchyMatches.length >= 8) {
    return hierarchyMatches.slice(0, 8)
  }

  const geocodeFeatures = await fetchGeocodeFeatures(trimmed, accessToken)
  const geocodedAreas = await Promise.all(
    geocodeFeatures
      .map(areaFromGeocodeFeature)
      .filter((area): area is BenchmarkArea => area != null)
      .map((area) =>
        classifyDerivedAreaIntoHierarchy(area, currentArea, accessToken)
      )
  )

  return dedupeAreas([
    ...hierarchyMatches,
    ...geocodedAreas.filter((area): area is BenchmarkArea => area != null),
  ]).slice(0, 8)
}

export async function resolveBenchmarkAreaFromSearch(
  query: string,
  currentArea: BenchmarkArea = BENCHMARK_ROOT_AREA,
  accessToken?: string
): Promise<BenchmarkArea> {
  const trimmed = query.trim()
  if (!trimmed || isNationalAreaQuery(trimmed)) {
    return BENCHMARK_ROOT_AREA
  }

  const hierarchyMatch = matchBenchmarkPresetFromQuery(trimmed, currentArea)
  if (hierarchyMatch) {
    return resolveBenchmarkAreaSelection(hierarchyMatch, accessToken)
  }

  if (!accessToken) {
    return BENCHMARK_ROOT_AREA
  }

  const geocodeFeatures = await fetchGeocodeFeatures(trimmed, accessToken)
  const bestFeature = pickBestGeocodeFeature(geocodeFeatures, trimmed)
  if (bestFeature == null) {
    return BENCHMARK_ROOT_AREA
  }

  const geocodedArea = areaFromGeocodeFeature(bestFeature)
  if (geocodedArea == null) {
    return BENCHMARK_ROOT_AREA
  }

  const classified = await classifyDerivedAreaIntoHierarchy(
    geocodedArea,
    currentArea,
    accessToken
  )
  if (classified == null) {
    return BENCHMARK_ROOT_AREA
  }
  return resolveBenchmarkAreaSelection(classified, accessToken)
}

export function benchmarkAreaLevelLabel(area: BenchmarkArea): string {
  return getBenchmarkAreaLevelLabel(area.level)
}
