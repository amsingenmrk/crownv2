/**
 * Per-asset benchmark percentiles loaded from the exported per-asset schema
 * (preprocessed into ./asset-percentiles.json). For each asset and each
 * geography level it belongs to (national → regional hub → state → CBSA →
 * county → submarket → ZIP), this provides the asset's percentile for every KPI.
 *
 * This is the source of truth for:
 *  - the percentile badge on each KPI (asset benchmarks page + compare panel),
 *  - which hierarchy levels are available as comparison areas for an asset,
 *  - which assets can be compared at a given hierarchy level (shared geo).
 *
 * Comparison areas are surfaced as synthetic BenchmarkAreas with id
 * `geo:<geoLevel>:<statsKey>`, where statsKey matches the area-benchmark
 * dataset keys so area-level stats resolve directly.
 */
import type {
  BenchmarkArea,
  BenchmarkAreaLevel,
} from "@/lib/benchmark-area-types"
import type { BenchmarkKpiKey } from "@/lib/benchmark-area-model"
import {
  enrichGeoBenchmarkAreaForMap,
  geoKeyFromAreaId,
} from "@/lib/benchmark-data/geo-area-map"

import data from "./asset-percentiles.json"

type KpiCell = {
  value: number | null
  percentile: number | null
  isUsable: boolean
  peerBucket: string | null
}
type LevelRow = {
  geoLevel: string
  geoId: string
  geoLabel: string
  statsKey: string
  kpis: Record<string, KpiCell>
}
type AssetEntry = {
  buildingId: string
  propertyId: string
  levels: LevelRow[]
}

const DATA = data as unknown as Record<string, AssetEntry>

/** Exported (snake) KPI keys → app BenchmarkKpiKey. */
const KPI_KEY_MAP: Record<string, BenchmarkKpiKey> = {
  occupancy: "occupancy",
  intrinsic_cap_rate: "intrinsicCapRate",
  value: "valuePerSf",
  asking_rent: "askingRent",
  in_place_rent: "inPlaceRent",
  intrinsic_rent: "intrinsicRent",
  sun_score: "sunScore",
  view_score: "viewScore",
  amenity_quality_score: "amenityQuality",
  accessibility_score: "accessibilityScore",
}

/** Exported geo level → closest BenchmarkAreaLevel (for display grouping). */
const LEVEL_MAP: Record<string, BenchmarkAreaLevel> = {
  national: "country",
  regional_hub: "market",
  state: "msaState",
  cbsa: "market",
  county: "county",
  submarket: "submarket",
  zip: "zip",
}

const GEO_AREA_PREFIX = "geo:"

function sanitizeLabel(label: string): string {
  const trimmed = label.trim()
  if (trimmed === "" || trimmed.toLowerCase() === "null") return ""
  return trimmed
}

export { geoKeyFromAreaId }

export function isPercentileAsset(assetId: string): boolean {
  return assetId in DATA
}

function comparisonAreaId(geoLevel: string, statsKey: string): string {
  return `${GEO_AREA_PREFIX}${geoLevel}:${statsKey}`
}

/**
 * Ordered (broad → narrow) comparison areas for an asset, one per hierarchy
 * level present in the export.
 */
export function assetPercentileGeoAreas(assetId: string): BenchmarkArea[] {
  const entry = DATA[assetId]
  if (entry == null) return []
  return entry.levels.map((row) => {
    const rawLabel = sanitizeLabel(row.geoLabel)
    const label =
      rawLabel ||
      (row.geoLevel === "cbsa" ? `CBSA ${row.statsKey}` : row.statsKey)

    return enrichGeoBenchmarkAreaForMap({
      id: comparisonAreaId(row.geoLevel, row.statsKey),
      label,
      bounds: [
        [-125, 24],
        [-66, 50],
      ],
      level: LEVEL_MAP[row.geoLevel] ?? "market",
      isCurated: false,
      aliases: [label],
      geocodeQuery: label,
    })
  })
}

function levelRow(assetId: string, geoLevel: string): LevelRow | null {
  return DATA[assetId]?.levels.find((row) => row.geoLevel === geoLevel) ?? null
}

/** Per-KPI percentiles for an asset at a given exported geo level. */
export function assetKpiPercentilesForGeoLevel(
  assetId: string,
  geoLevel: string
): Partial<Record<BenchmarkKpiKey, number | null>> | null {
  const row = levelRow(assetId, geoLevel)
  if (row == null) return null
  const out: Partial<Record<BenchmarkKpiKey, number | null>> = {}
  for (const [snakeKey, cell] of Object.entries(row.kpis)) {
    const key = KPI_KEY_MAP[snakeKey]
    if (key == null) continue
    out[key] = cell.isUsable ? cell.percentile : null
  }
  return out
}

/** Per-KPI values for an asset at a given exported geo level (constant per asset). */
export function assetKpiValuesForGeoLevel(
  assetId: string,
  geoLevel: string
): Partial<Record<BenchmarkKpiKey, number | null>> | null {
  const row = levelRow(assetId, geoLevel)
  if (row == null) return null
  const out: Partial<Record<BenchmarkKpiKey, number | null>> = {}
  for (const [snakeKey, cell] of Object.entries(row.kpis)) {
    const key = KPI_KEY_MAP[snakeKey]
    if (key == null) continue
    out[key] = cell.isUsable ? cell.value : null
  }
  return out
}

/** Assets whose hierarchy includes the given (geoLevel, statsKey). */
export function assetsSharingGeo(geoLevel: string, statsKey: string): string[] {
  const out: string[] = []
  for (const [assetId, entry] of Object.entries(DATA)) {
    if (
      entry.levels.some(
        (row) => row.geoLevel === geoLevel && row.statsKey === statsKey
      )
    ) {
      out.push(assetId)
    }
  }
  return out
}

/** Resolve a benchmark area (synthetic geo: id, or a regular app area) to a geo key. */
export function geoKeyForBenchmarkArea(
  area: Pick<BenchmarkArea, "id" | "level" | "label">
): { geoLevel: string; statsKey: string } | null {
  const fromGeo = geoKeyFromAreaId(area.id)
  if (fromGeo != null) return fromGeo

  if (area.id === "us-national") return { geoLevel: "national", statsKey: "national" }
  const stateMatch = /^state-([a-z]{2})$/.exec(area.id)
  if (stateMatch) return { geoLevel: "state", statsKey: stateMatch[1]!.toUpperCase() }
  const zipMatch = /^zip-(\d{5})$/.exec(area.id)
  if (zipMatch) return { geoLevel: "zip", statsKey: zipMatch[1]! }
  const countyMatch = /^county-(.+)-([a-z]{2})$/.exec(area.id)
  if (countyMatch) {
    return {
      geoLevel: "county",
      statsKey: `${countyMatch[1]!.replace(/-/g, " ")}|${countyMatch[2]!.toUpperCase()}`,
    }
  }
  return null
}
