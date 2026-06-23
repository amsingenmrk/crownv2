import { describe, expect, it } from "vitest"

import {
  BENCHMARK_ROOT_AREA,
  listBenchmarkAreaChildren,
} from "@/lib/benchmark-area-hierarchy"
import { getTrackedMarketStats } from "@/lib/benchmark-market-stats"

describe("benchmark hierarchy integrity", () => {
  it("ensures every market has submarket/county/zip representation with tracked stats", () => {
    const markets = listBenchmarkAreaChildren(BENCHMARK_ROOT_AREA).filter(
      (area) => area.level === "market"
    )
    expect(markets.length).toBeGreaterThan(0)

    const missingMarketStats: string[] = []
    const marketsWithoutSubmarkets: string[] = []
    const marketsWithoutCounties: string[] = []
    const marketsWithoutZips: string[] = []
    const nodesMissingTrackedStats: string[] = []

    for (const market of markets) {
      if (getTrackedMarketStats(market.id) == null) {
        missingMarketStats.push(market.id)
      }

      const submarkets = listBenchmarkAreaChildren(market).filter(
        (area) => area.level === "submarket"
      )
      if (submarkets.length === 0) {
        marketsWithoutSubmarkets.push(market.id)
        continue
      }

      let marketCountyCount = 0
      let marketZipCount = 0
      for (const submarket of submarkets) {
        if (getTrackedMarketStats(submarket.id) == null) {
          nodesMissingTrackedStats.push(submarket.id)
        }

        const counties = listBenchmarkAreaChildren(submarket).filter(
          (area) => area.level === "county"
        )
        const directZips = listBenchmarkAreaChildren(submarket).filter(
          (area) => area.level === "zip"
        )
        marketCountyCount += counties.length
        marketZipCount += directZips.length

        for (const county of counties) {
          if (getTrackedMarketStats(county.id) == null) {
            nodesMissingTrackedStats.push(county.id)
          }
          const zips = listBenchmarkAreaChildren(county).filter(
            (area) => area.level === "zip"
          )
          if (zips.length === 0) {
            continue
          }
          marketZipCount += zips.length
          for (const zip of zips) {
            if (getTrackedMarketStats(zip.id) == null) {
              nodesMissingTrackedStats.push(zip.id)
            }
          }
        }

        for (const zip of directZips) {
          if (getTrackedMarketStats(zip.id) == null) {
            nodesMissingTrackedStats.push(zip.id)
          }
        }
      }

      if (marketCountyCount === 0) {
        marketsWithoutCounties.push(market.id)
      }
      if (marketZipCount === 0) {
        marketsWithoutZips.push(market.id)
      }
    }

    expect(missingMarketStats).toEqual([])
    expect(marketsWithoutSubmarkets).toEqual([])
    expect(marketsWithoutCounties).toEqual([])
    expect(marketsWithoutZips).toEqual([])
    expect(nodesMissingTrackedStats).toEqual([])
  })
})
