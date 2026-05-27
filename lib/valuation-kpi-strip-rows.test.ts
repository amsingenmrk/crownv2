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
})
