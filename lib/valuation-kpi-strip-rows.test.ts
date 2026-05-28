import { describe, expect, it } from "vitest"

import { valuationKpiStripRowsFromBaselineModifiedMaps } from "@/lib/valuation-kpi-strip-rows"
import type { ValuationConditionMetrics } from "@/lib/valuation-condition-metrics"

function metricMap(metrics: ValuationConditionMetrics) {
  return {
    inPlace: metrics,
    markToMarket: metrics,
    grossPotential: metrics,
  }
}

describe("valuationKpiStripRowsFromBaselineModifiedMaps", () => {
  it("keeps OpEx delta direction signed while reversing tone semantics", () => {
    const baseline = metricMap({
      grossRevenue: 100,
      opex: 40,
      noi: 60,
      assetValue: 1_000,
      capRate: 6,
    })
    const modified = metricMap({
      grossRevenue: 110,
      opex: 50,
      noi: 60,
      assetValue: 1_000,
      capRate: 6,
    })

    const rows = valuationKpiStripRowsFromBaselineModifiedMaps(
      baseline,
      modified,
      true
    )
    const opexRow = rows.find((row) => row.label === "OpEx")
    const revenueRow = rows.find((row) => row.label === "Gross Revenue")

    expect(opexRow?.conditionValues.markToMarket.compare?.deltaDirection).toBe("up")
    expect(opexRow?.conditionValues.markToMarket.compare?.deltaTone).toBe("down")
    expect(revenueRow?.conditionValues.markToMarket.compare?.deltaDirection).toBe(
      "up"
    )
    expect(revenueRow?.conditionValues.markToMarket.compare?.deltaTone).toBe("up")
  })

  it("shows in-place deltas only for asset value and cap rate", () => {
    const baseline = metricMap({
      grossRevenue: 100,
      opex: 40,
      noi: 60,
      assetValue: 1_000,
      capRate: 6,
    })
    const modified = metricMap({
      grossRevenue: 110,
      opex: 50,
      noi: 60,
      assetValue: 1_120,
      capRate: 5.7,
    })

    const rows = valuationKpiStripRowsFromBaselineModifiedMaps(
      baseline,
      modified,
      true
    )
    const revenueRow = rows.find((row) => row.label === "Gross Revenue")
    const opexRow = rows.find((row) => row.label === "OpEx")
    const noiRow = rows.find((row) => row.label === "NOI")
    const valueRow = rows.find((row) => row.label === "Asset Value")
    const capRateRow = rows.find((row) => row.label === "Cap Rate")

    expect(revenueRow?.conditionValues.inPlace.compare).toBeUndefined()
    expect(opexRow?.conditionValues.inPlace.compare).toBeUndefined()
    expect(noiRow?.conditionValues.inPlace.compare).toBeUndefined()
    expect(valueRow?.conditionValues.inPlace.compare?.deltaLine).toBeTruthy()
    expect(capRateRow?.conditionValues.inPlace.compare?.deltaLine).toBeTruthy()
  })
})
