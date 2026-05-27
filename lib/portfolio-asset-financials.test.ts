import { describe, expect, it } from "vitest"

import { ASSETS } from "@/lib/assets"
import { financialMetricsForAssetAtIndex } from "@/lib/portfolio-asset-financials"
import { getSampleStackingPlanData } from "@/lib/stacking-plan-data"

function inPlaceAnnualRevenueUsd(assetId: string) {
  const dataset = getSampleStackingPlanData(assetId)
  return dataset.floors.reduce(
    (total, floor) =>
      total +
      floor.tenants.reduce((floorTotal, tenant) => {
        if (tenant.isVacant) {
          return floorTotal
        }
        return floorTotal + tenant.sqft * (tenant.contractRatePsfValue ?? 0)
      }, 0),
    0
  )
}

describe("financialMetricsForAssetAtIndex", () => {
  it("stays internally consistent and anchored to stacking-plan revenue", () => {
    const asset = ASSETS[0]
    expect(asset).toBeDefined()
    if (asset == null) {
      return
    }

    const metrics = financialMetricsForAssetAtIndex(asset, 0)
    const dataset = getSampleStackingPlanData(asset.id, asset)

    expect(metrics.annualRevenueUsd).toBeCloseTo(inPlaceAnnualRevenueUsd(asset.id), 2)
    expect(metrics.rsfSqft).toBe(dataset.summary.totalSqft)
    expect(metrics.annualOpexUsd + metrics.noiUsd).toBeCloseTo(
      metrics.annualRevenueUsd,
      2
    )
    expect(metrics.noiUsd).toBeCloseTo(
      (metrics.valueUsd * metrics.capRatePct) / 100,
      2
    )
    expect(metrics.pricePerSfN).toBe(
      Math.max(1, Math.round(metrics.valueUsd / metrics.rsfSqft))
    )
  })
})
