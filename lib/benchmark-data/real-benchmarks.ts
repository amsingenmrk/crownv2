/**
 * Real benchmark statistics loaded from the exported benchmark query CSV
 * (preprocessed into ./benchmarks.json). Provides percentile/average stats per
 * geography (national, state, county, ZIP, CBSA/market, submarket, regional hub)
 * so the benchmark screens read real data instead of synthetic seeds.
 *
 * Metrics absent from the export (value/SF, and cap rates / amenity quality where
 * peer counts are too low to be usable) are returned as NaN, which the benchmark
 * formatters render as "—".
 */
import type { BenchmarkArea } from "@/lib/benchmark-area-types"
import type { BenchmarkStatsRaw } from "@/lib/benchmark-area-model"

import benchmarks from "./benchmarks.json"

type MetricCell = { v: number; lo?: number; hi?: number; u?: boolean }
type BenchmarkRow = Record<string, MetricCell | number | undefined> & {
  _count?: number
}

type BenchmarkData = {
  national: BenchmarkRow | null
  state: Record<string, BenchmarkRow>
  zip: Record<string, BenchmarkRow>
  county: Record<string, BenchmarkRow>
  cbsa: Record<string, BenchmarkRow>
  cbsaTitle: Record<string, BenchmarkRow>
  submarket: Record<string, BenchmarkRow>
  regionalHub: Record<string, BenchmarkRow>
}

const DATA = benchmarks as unknown as BenchmarkData

function norm(value: string): string {
  return value.trim().toLowerCase()
}

function cell(row: BenchmarkRow, key: string): number {
  const entry = row[key]
  if (entry != null && typeof entry === "object" && "v" in entry) {
    if (entry.u === false) return Number.NaN
    return entry.v
  }
  return Number.NaN
}

/** Resolve a row directly from an exported geo key (level + benchmarks key). */
function rowForGeoKey(geoLevel: string, statsKey: string): BenchmarkRow | null {
  switch (geoLevel) {
    case "national":
      return DATA.national
    case "regional_hub":
      return DATA.regionalHub[norm(statsKey)] ?? null
    case "state":
      return DATA.state[statsKey.toUpperCase()] ?? null
    case "cbsa":
      return DATA.cbsa[statsKey] ?? null
    case "county":
      return DATA.county[statsKey] ?? null
    case "submarket":
      return DATA.submarket[norm(statsKey)] ?? null
    case "zip":
      return DATA.zip[statsKey] ?? null
    default:
      return null
  }
}

/** Resolve the CSV row for a benchmark area, by geography level + identity. */
function rowForArea(area: BenchmarkArea): BenchmarkRow | null {
  // Synthetic comparison areas carry their geo key in the id: `geo:<level>:<key>`.
  if (area.id.startsWith("geo:")) {
    const rest = area.id.slice(4)
    const sep = rest.indexOf(":")
    if (sep < 0) return null
    return rowForGeoKey(rest.slice(0, sep), rest.slice(sep + 1))
  }

  switch (area.level) {
    case "country":
      return DATA.national
    case "msaState": {
      const code = area.id.replace(/^state-/, "").toUpperCase()
      return DATA.state[code] ?? null
    }
    case "zip": {
      const zip = area.id.replace(/^zip-/, "").trim()
      return DATA.zip[zip] ?? null
    }
    case "county": {
      // id shape: county-<name-slug>-<stateCode>
      const rest = area.id.replace(/^county-/, "")
      const lastDash = rest.lastIndexOf("-")
      if (lastDash <= 0) return null
      const stateCode = rest.slice(lastDash + 1).toUpperCase()
      const name = rest.slice(0, lastDash).replace(/-/g, " ")
      return DATA.county[`${norm(name)}|${stateCode}`] ?? null
    }
    case "market":
      return marketRow(area)
    case "submarket":
      return submarketRow(area)
    default:
      return null
  }
}

/** Match a curated market to a CBSA by title (best effort). */
function marketRow(area: BenchmarkArea): BenchmarkRow | null {
  const candidates = [area.label, ...(area.aliases ?? [])]
    .map(norm)
    .filter(Boolean)
  for (const candidate of candidates) {
    const titles = Object.keys(DATA.cbsaTitle)
    // Prefer a CBSA title whose leading city matches the market label.
    const exactLead = titles.find(
      (title) => title.split(/[,-]/)[0]!.trim() === candidate
    )
    if (exactLead != null) return DATA.cbsaTitle[exactLead]!
    const startsWith = titles.find((title) => title.startsWith(candidate))
    if (startsWith != null) return DATA.cbsaTitle[startsWith]!
  }
  return null
}

/** Match a curated submarket to an office submarket name (best effort). */
function submarketRow(area: BenchmarkArea): BenchmarkRow | null {
  const candidates = [area.label, ...(area.aliases ?? [])].map(norm)
  for (const candidate of candidates) {
    if (DATA.submarket[candidate] != null) return DATA.submarket[candidate]!
    const contains = Object.keys(DATA.submarket).find(
      (name) => name.includes(candidate) || candidate.includes(name)
    )
    if (contains != null) return DATA.submarket[contains]!
  }
  return null
}

/**
 * Real benchmark stats for an area, or null when the export has no matching
 * geography (caller falls back to synthetic seeds).
 */
export function realBenchmarkStatsForArea(
  area: BenchmarkArea
): BenchmarkStatsRaw | null {
  const row = rowForArea(area)
  if (row == null) return null

  const count = typeof row._count === "number" ? row._count : 0

  return {
    askingRentPsf: cell(row, "askingRentPsf"),
    inPlaceRentPsf: cell(row, "inPlaceRentPsf"),
    occupancyPct: cell(row, "occupancyPct"),
    intrinsicRentPsf: cell(row, "intrinsicRentPsf"),
    observedCapRatePct: cell(row, "observedCapRatePct"),
    intrinsicCapRatePct: cell(row, "intrinsicCapRatePct"),
    // Not present in the benchmark export → rendered as "—".
    valuePerSfUsd: Number.NaN,
    sunScore: cell(row, "sunScore"),
    viewScore: cell(row, "viewScore"),
    amenityQuality: cell(row, "amenityQuality"),
    accessibilityScore: cell(row, "accessibilityScore"),
    buildingCount: count,
    fullParticipantCount: count,
    coverageAreaId: area.id,
    coverageAreaLabel: area.label,
  }
}

const REAL_STATS_PRIMARY_METRIC_KEYS = [
  "occupancyPct",
  "askingRentPsf",
  "inPlaceRentPsf",
  "intrinsicRentPsf",
] as const

/** True when the export has at least one core benchmark metric for this area. */
export function benchmarkAreaHasRealStats(area: BenchmarkArea): boolean {
  const raw = realBenchmarkStatsForArea(area)
  if (raw == null) return false
  return REAL_STATS_PRIMARY_METRIC_KEYS.some((key) => Number.isFinite(raw[key]))
}

/** Supporting p5–p95 range for a metric, when present in the export. */
export function realBenchmarkRange(
  area: BenchmarkArea,
  metricKey: string
): { lo: number; hi: number } | null {
  const row = rowForArea(area)
  const entry = row?.[metricKey]
  if (
    entry != null &&
    typeof entry === "object" &&
    entry.u !== false &&
    entry.lo != null &&
    entry.hi != null
  ) {
    return { lo: entry.lo, hi: entry.hi }
  }
  return null
}
