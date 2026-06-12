import {
  benchmarkSnapshotFromRaw,
  type BenchmarkAreaSnapshot,
} from "@/lib/benchmark-area-model"
import { marketSearchDemoHash32 } from "@/lib/market-search-demo-listings"

type TrackedMarketStatsSeed = {
  askingRentPsf: number
  inPlaceRentPsf: number
  occupancyPct: number
  intrinsicRentPsf: number
  sunScore: number
  viewScore: number
  amenityQuality: number
  accessibilityScore: number
  buildingCount: number
  fullParticipantCount: number
}

function u01(seed: string): number {
  return marketSearchDemoHash32(seed) / 0xffff_ffff
}

function jitter(areaId: string, key: string, magnitude: number): number {
  return (u01(`${areaId}:${key}`) - 0.5) * 2 * magnitude
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function seedStats(
  areaId: string,
  base: Omit<TrackedMarketStatsSeed, "buildingCount" | "fullParticipantCount"> & {
    buildingCount: number
    fullParticipantShare: number
  }
): TrackedMarketStatsSeed {
  const buildingCount = Math.round(
    base.buildingCount + (u01(`${areaId}:bldg`) - 0.5) * base.buildingCount * 0.08
  )
  const fullParticipantCount = Math.max(
    1,
    Math.round(buildingCount * base.fullParticipantShare)
  )

  return {
    askingRentPsf: round2(base.askingRentPsf + jitter(areaId, "ask", 1.8)),
    inPlaceRentPsf: round2(base.inPlaceRentPsf + jitter(areaId, "inplace", 1.5)),
    occupancyPct: round1(
      clamp(base.occupancyPct + jitter(areaId, "occ", 1.2), 72, 97)
    ),
    intrinsicRentPsf: round2(
      base.intrinsicRentPsf + jitter(areaId, "intrinsic", 1.6)
    ),
    sunScore: Math.round(base.sunScore + jitter(areaId, "sun", 4)),
    viewScore: Math.round(base.viewScore + jitter(areaId, "view", 4)),
    amenityQuality: Math.round(
      base.amenityQuality + jitter(areaId, "amenity", 5)
    ),
    accessibilityScore: Math.round(
      base.accessibilityScore + jitter(areaId, "access", 4)
    ),
    buildingCount,
    fullParticipantCount,
  }
}

/**
 * Illustrative market-level benchmarks for curated areas.
 * Replace with live aggregation when market feeds are available.
 */
const TRACKED_MARKET_BASES: Record<
  string,
  Omit<TrackedMarketStatsSeed, "buildingCount" | "fullParticipantCount"> & {
    buildingCount: number
    fullParticipantShare: number
  }
> = {
  "us-national": {
    askingRentPsf: 34.5,
    inPlaceRentPsf: 31.2,
    occupancyPct: 86.4,
    intrinsicRentPsf: 33.8,
    sunScore: 61,
    viewScore: 58,
    amenityQuality: 63,
    accessibilityScore: 66,
    buildingCount: 12_400,
    fullParticipantShare: 0.22,
  },
  "market-new-york": {
    askingRentPsf: 78.5,
    inPlaceRentPsf: 71.2,
    occupancyPct: 90.8,
    intrinsicRentPsf: 76.4,
    sunScore: 54,
    viewScore: 62,
    amenityQuality: 74,
    accessibilityScore: 82,
    buildingCount: 2_840,
    fullParticipantShare: 0.31,
  },
  "market-san-jose": {
    askingRentPsf: 72.0,
    inPlaceRentPsf: 66.8,
    occupancyPct: 88.2,
    intrinsicRentPsf: 70.1,
    sunScore: 72,
    viewScore: 58,
    amenityQuality: 71,
    accessibilityScore: 68,
    buildingCount: 620,
    fullParticipantShare: 0.28,
  },
  "market-dc": {
    askingRentPsf: 52.4,
    inPlaceRentPsf: 48.6,
    occupancyPct: 89.1,
    intrinsicRentPsf: 51.2,
    sunScore: 58,
    viewScore: 55,
    amenityQuality: 70,
    accessibilityScore: 76,
    buildingCount: 1_120,
    fullParticipantShare: 0.29,
  },
  "market-los-angeles": {
    askingRentPsf: 44.8,
    inPlaceRentPsf: 41.2,
    occupancyPct: 87.5,
    intrinsicRentPsf: 43.6,
    sunScore: 78,
    viewScore: 64,
    amenityQuality: 68,
    accessibilityScore: 62,
    buildingCount: 1_960,
    fullParticipantShare: 0.26,
  },
  "market-seattle": {
    askingRentPsf: 48.2,
    inPlaceRentPsf: 44.5,
    occupancyPct: 86.8,
    intrinsicRentPsf: 47.0,
    sunScore: 52,
    viewScore: 71,
    amenityQuality: 69,
    accessibilityScore: 70,
    buildingCount: 780,
    fullParticipantShare: 0.27,
  },
  "market-san-diego": {
    askingRentPsf: 46.5,
    inPlaceRentPsf: 42.8,
    occupancyPct: 88.4,
    intrinsicRentPsf: 45.2,
    sunScore: 80,
    viewScore: 66,
    amenityQuality: 67,
    accessibilityScore: 64,
    buildingCount: 540,
    fullParticipantShare: 0.25,
  },
  "market-chicago": {
    askingRentPsf: 38.6,
    inPlaceRentPsf: 35.4,
    occupancyPct: 85.2,
    intrinsicRentPsf: 37.5,
    sunScore: 55,
    viewScore: 60,
    amenityQuality: 66,
    accessibilityScore: 72,
    buildingCount: 1_540,
    fullParticipantShare: 0.24,
  },
  "market-philadelphia": {
    askingRentPsf: 36.2,
    inPlaceRentPsf: 33.1,
    occupancyPct: 84.6,
    intrinsicRentPsf: 35.0,
    sunScore: 57,
    viewScore: 54,
    amenityQuality: 65,
    accessibilityScore: 71,
    buildingCount: 720,
    fullParticipantShare: 0.23,
  },
  "market-new-jersey": {
    askingRentPsf: 39.4,
    inPlaceRentPsf: 36.0,
    occupancyPct: 86.1,
    intrinsicRentPsf: 38.2,
    sunScore: 60,
    viewScore: 56,
    amenityQuality: 67,
    accessibilityScore: 73,
    buildingCount: 1_180,
    fullParticipantShare: 0.25,
  },
  "market-minneapolis-st-paul": {
    askingRentPsf: 28.6,
    inPlaceRentPsf: 26.4,
    occupancyPct: 83.8,
    intrinsicRentPsf: 27.8,
    sunScore: 48,
    viewScore: 52,
    amenityQuality: 64,
    accessibilityScore: 68,
    buildingCount: 640,
    fullParticipantShare: 0.22,
  },
  "market-houston": {
    askingRentPsf: 31.8,
    inPlaceRentPsf: 29.2,
    occupancyPct: 84.9,
    intrinsicRentPsf: 30.6,
    sunScore: 74,
    viewScore: 50,
    amenityQuality: 62,
    accessibilityScore: 58,
    buildingCount: 1_420,
    fullParticipantShare: 0.21,
  },
  "market-phoenix": {
    askingRentPsf: 29.4,
    inPlaceRentPsf: 27.0,
    occupancyPct: 85.6,
    intrinsicRentPsf: 28.5,
    sunScore: 82,
    viewScore: 48,
    amenityQuality: 61,
    accessibilityScore: 56,
    buildingCount: 980,
    fullParticipantShare: 0.2,
  },
  "market-utah": {
    askingRentPsf: 30.2,
    inPlaceRentPsf: 27.8,
    occupancyPct: 86.8,
    intrinsicRentPsf: 29.4,
    sunScore: 76,
    viewScore: 62,
    amenityQuality: 64,
    accessibilityScore: 60,
    buildingCount: 410,
    fullParticipantShare: 0.24,
  },
  "market-portland": {
    askingRentPsf: 34.8,
    inPlaceRentPsf: 31.6,
    occupancyPct: 82.4,
    intrinsicRentPsf: 33.6,
    sunScore: 50,
    viewScore: 68,
    amenityQuality: 68,
    accessibilityScore: 69,
    buildingCount: 460,
    fullParticipantShare: 0.26,
  },
  "market-miami": {
    askingRentPsf: 42.6,
    inPlaceRentPsf: 38.8,
    occupancyPct: 86.2,
    intrinsicRentPsf: 41.2,
    sunScore: 79,
    viewScore: 58,
    amenityQuality: 66,
    accessibilityScore: 61,
    buildingCount: 860,
    fullParticipantShare: 0.24,
  },
  "market-fort-lauderdale": {
    askingRentPsf: 40.2,
    inPlaceRentPsf: 36.8,
    occupancyPct: 85.8,
    intrinsicRentPsf: 39.0,
    sunScore: 77,
    viewScore: 56,
    amenityQuality: 64,
    accessibilityScore: 59,
    buildingCount: 320,
    fullParticipantShare: 0.22,
  },
  "market-tampa-bay": {
    askingRentPsf: 32.4,
    inPlaceRentPsf: 29.6,
    occupancyPct: 85.0,
    intrinsicRentPsf: 31.4,
    sunScore: 75,
    viewScore: 52,
    amenityQuality: 63,
    accessibilityScore: 57,
    buildingCount: 510,
    fullParticipantShare: 0.21,
  },
  "market-cincinnati": {
    askingRentPsf: 24.8,
    inPlaceRentPsf: 22.6,
    occupancyPct: 82.6,
    intrinsicRentPsf: 24.0,
    sunScore: 54,
    viewScore: 50,
    amenityQuality: 61,
    accessibilityScore: 63,
    buildingCount: 280,
    fullParticipantShare: 0.19,
  },
  "market-sacramento": {
    askingRentPsf: 33.6,
    inPlaceRentPsf: 30.8,
    occupancyPct: 84.2,
    intrinsicRentPsf: 32.4,
    sunScore: 73,
    viewScore: 55,
    amenityQuality: 62,
    accessibilityScore: 58,
    buildingCount: 340,
    fullParticipantShare: 0.2,
  },
  "market-charlotte": {
    askingRentPsf: 30.8,
    inPlaceRentPsf: 28.2,
    occupancyPct: 85.4,
    intrinsicRentPsf: 29.8,
    sunScore: 68,
    viewScore: 51,
    amenityQuality: 63,
    accessibilityScore: 60,
    buildingCount: 430,
    fullParticipantShare: 0.22,
  },
  "market-pittsburgh": {
    askingRentPsf: 26.2,
    inPlaceRentPsf: 24.0,
    occupancyPct: 81.8,
    intrinsicRentPsf: 25.4,
    sunScore: 49,
    viewScore: 57,
    amenityQuality: 62,
    accessibilityScore: 65,
    buildingCount: 310,
    fullParticipantShare: 0.2,
  },
  "market-cleveland": {
    askingRentPsf: 23.6,
    inPlaceRentPsf: 21.4,
    occupancyPct: 80.4,
    intrinsicRentPsf: 22.8,
    sunScore: 47,
    viewScore: 53,
    amenityQuality: 60,
    accessibilityScore: 64,
    buildingCount: 260,
    fullParticipantShare: 0.18,
  },
  "market-columbus": {
    askingRentPsf: 25.4,
    inPlaceRentPsf: 23.2,
    occupancyPct: 83.0,
    intrinsicRentPsf: 24.6,
    sunScore: 52,
    viewScore: 49,
    amenityQuality: 61,
    accessibilityScore: 62,
    buildingCount: 350,
    fullParticipantShare: 0.19,
  },
}

const TRACKED_MARKET_STATS = Object.fromEntries(
  Object.entries(TRACKED_MARKET_BASES).map(([areaId, base]) => [
    areaId,
    seedStats(areaId, base),
  ])
) as Record<string, TrackedMarketStatsSeed>

export function isTrackedBenchmarkArea(areaId: string): boolean {
  return areaId in TRACKED_MARKET_STATS
}

export function trackedBenchmarkSnapshot(
  areaLabel: string,
  areaId: string
): BenchmarkAreaSnapshot | null {
  const stats = TRACKED_MARKET_STATS[areaId]
  if (!stats) return null

  return benchmarkSnapshotFromRaw(areaLabel, stats)
}
