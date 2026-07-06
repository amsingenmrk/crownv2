import { describe, expect, it } from "vitest"

import {
  benchmarkAreaHasRealStats,
  realBenchmarkStatsForArea,
} from "@/lib/benchmark-data/real-benchmarks"
import { hierarchyAreaById } from "@/lib/benchmark-data/benchmark-hierarchy"

describe("realBenchmarkStatsForArea", () => {
  it("suppresses metrics flagged as not usable in the export", () => {
    const stats = realBenchmarkStatsForArea({
      id: "geo:county:union|NJ",
      label: "Union County, NJ",
      bounds: [
        [-75, 39],
        [-73, 41],
      ],
      level: "county",
    })

    expect(stats).not.toBeNull()
    expect(Number.isNaN(stats!.inPlaceRentPsf)).toBe(true)
    expect(Number.isFinite(stats!.occupancyPct)).toBe(true)
  })
})

describe("benchmarkAreaHasRealStats", () => {
  it("returns false when the export has no row for the geography", () => {
    expect(
      benchmarkAreaHasRealStats({
        id: "geo:cbsa:14860",
        label: "CBSA 14860",
        bounds: [
          [-125, 24],
          [-66, 50],
        ],
        level: "market",
      })
    ).toBe(false)
  })

  it("returns true when at least one metric is present", () => {
    const state = hierarchyAreaById("geo:state:CT")!
    expect(benchmarkAreaHasRealStats(state)).toBe(true)
  })

  it("returns false when only non-core metrics are usable", () => {
    expect(
      benchmarkAreaHasRealStats({
        id: "geo:zip:07901",
        label: "Summit, NJ, 07901",
        bounds: [
          [-125, 24],
          [-66, 50],
        ],
        level: "zip",
      })
    ).toBe(false)
  })
})
