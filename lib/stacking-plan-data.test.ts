import { describe, expect, it } from "vitest"

import { ASSETS } from "@/lib/assets"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import { getSampleStackingPlanData } from "@/lib/stacking-plan-data"

const SAMPLE_ASSET_IDS = [ASSETS[0]?.id, ASSETS[6]?.id, ASSETS[12]?.id, "mkt-0"].filter(
  (value): value is string => value != null
)

const MARKET_RENT_BANDS = {
  office: { min: 35, max: 110 },
  industrial: { min: 8, max: 30 },
  retail: { min: 25, max: 130 },
} as const

describe("getSampleStackingPlanData", () => {
  it("stays aligned with the canonical financial snapshot and plausible rent bands", () => {
    for (const assetId of SAMPLE_ASSET_IDS) {
      const dataset = getSampleStackingPlanData(assetId)
      const metrics = financialMetricsForAssetId(assetId)

      expect(metrics).not.toBeNull()
      if (metrics == null) {
        continue
      }

      const marketBand = MARKET_RENT_BANDS[metrics.groupId as keyof typeof MARKET_RENT_BANDS]
      expect(dataset.summary.totalSqft).toBeGreaterThan(0)
      expect(dataset.summary.occupiedSqft + dataset.summary.vacantSqft).toBe(
        dataset.summary.totalSqft
      )
      expect(metrics.occupancyPct).toBeCloseTo(
        dataset.summary.overallOccupancyPercent,
        2
      )
      expect(metrics.waleYears).toBeCloseTo(dataset.summary.waleYears, 2)
      expect(metrics.marketRentPsf).toBeGreaterThanOrEqual(marketBand.min)
      expect(metrics.marketRentPsf).toBeLessThanOrEqual(marketBand.max)

      for (const tenant of dataset.floors.flatMap((floor) => floor.tenants)) {
        if (
          tenant.marketRentPsfValue == null ||
          tenant.predictedRentPsfValue == null ||
          tenant.marketRentPsfValue <= 0
        ) {
          continue
        }

        const ratio = tenant.predictedRentPsfValue / tenant.marketRentPsfValue
        expect(ratio).toBeGreaterThanOrEqual(0.939)
        expect(ratio).toBeLessThanOrEqual(1.08)
      }
    }
  })
})
