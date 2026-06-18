import type {
  BenchmarkArea,
  BenchmarkAreaBounds,
  BenchmarkBoundaryGeometry,
} from "@/lib/benchmark-area-types"

import marketGenerated from "@/lib/benchmark-market-boundaries.generated.json"
import submarketGenerated from "@/lib/benchmark-submarket-boundaries.generated.json"

export type StoredBenchmarkBoundary = {
  id: string
  bounds: BenchmarkAreaBounds
  geometry: BenchmarkBoundaryGeometry
}

const STORED_BOUNDARIES = {
  ...(marketGenerated as Record<string, unknown>),
  ...(submarketGenerated as Record<string, unknown>),
} as unknown as Record<string, StoredBenchmarkBoundary>

const US_NATIONAL_BASE: BenchmarkArea = {
  id: "us-national",
  label: "United States",
  bounds: [
    [-125, 24],
    [-66, 50],
  ],
  level: "country",
  childLevel: "market",
  isCurated: true,
  aliases: ["us", "usa", "united states", "national", "country"],
}

/** Default benchmark area with stored lower-48 Census outline (no Mapbox Boundaries). */
export const US_NATIONAL_BENCHMARK_AREA: BenchmarkArea =
  applyStoredBoundary(US_NATIONAL_BASE)

export function getStoredBoundary(areaId: string): StoredBenchmarkBoundary | null {
  return STORED_BOUNDARIES[areaId] ?? null
}

export function hasStoredBoundary(areaId: string): boolean {
  return areaId in STORED_BOUNDARIES
}

/** Attach stored benchmark boundary vectors when available. */
export function applyStoredBoundary(area: BenchmarkArea): BenchmarkArea {
  const stored = getStoredBoundary(area.id)
  if (!stored) return area

  return {
    ...area,
    bounds: stored.bounds,
    boundary: undefined,
    boundaryGeometry: stored.geometry,
  }
}

/** @deprecated Use applyStoredBoundary */
export const applyStoredPresetBoundary = applyStoredBoundary
