import { describe, expect, it } from "vitest"

import { buildRealStackingPlanDataset } from "@/lib/real-properties"

describe("real property stacking value drivers", () => {
  it("uses space-level predicted rent instead of stale floor metrics", () => {
    const dataset = buildRealStackingPlanDataset("340-mt-kemble")
    const floor3 = dataset?.floors.find((floor) => floor.floor === 3)

    expect(floor3).toBeDefined()
    expect(floor3!.valueDrivers.predictedRentPsf).toBeCloseTo(36.08, 1)
    expect(floor3!.valueDrivers.predictedRentPsf).not.toBeCloseTo(40.55, 0)
    expect(floor3!.tenants[0]?.predictedRentPsfValue).toBeCloseTo(36.08, 1)
  })

  it("keeps positive and negative SHAP in the waterfall and other SHAP expandable", () => {
    const dataset = buildRealStackingPlanDataset("340-mt-kemble")
    const floor3 = dataset?.floors.find((floor) => floor.floor === 3)

    expect(floor3).toBeDefined()

    const waterfallLabels = floor3!.valueDrivers.waterfallFactors.map(
      (factor) => factor.factor
    )
    const otherLabels = floor3!.valueDrivers.otherFactors.map(
      (factor) => factor.factor
    )

    expect(waterfallLabels).toEqual(
      expect.arrayContaining([
        "Structure Value",
        "Interest Rate Effects",
        "Last Major Renovation",
        "Nearby Commuter Transit",
      ])
    )
    expect(waterfallLabels).not.toContain("Other")
    expect(otherLabels.length).toBeGreaterThan(0)
    expect(otherLabels).toContain("Other")

    const negativeWaterfall = floor3!.valueDrivers.waterfallFactors.filter(
      (factor) => factor.impact < 0
    )
    expect(negativeWaterfall.length).toBeGreaterThan(0)
  })

  it("reconciles market baseline plus SHAP impacts to predicted rent", () => {
    const dataset = buildRealStackingPlanDataset("340-mt-kemble")

    for (const floor of dataset?.floors ?? []) {
      const { marketBaselineRentPsf, predictedRentPsf, waterfallFactors, otherFactors } =
        floor.valueDrivers
      const shapSum = [...waterfallFactors, ...otherFactors].reduce(
        (sum, factor) => sum + factor.impact,
        0
      )

      expect(marketBaselineRentPsf + shapSum).toBeCloseTo(predictedRentPsf, 0)
    }
  })
})
