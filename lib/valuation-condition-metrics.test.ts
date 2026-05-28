import { describe, expect, it } from "vitest"

import { ASSETS } from "@/lib/assets"
import { INITIAL_MOD_VALUES } from "@/lib/building-modifications"
import {
  buildDefaultForecastScenarios,
  defaultForecastAssumptionsForAsset,
} from "@/lib/forecast-data"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import { getSampleStackingPlanData } from "@/lib/stacking-plan-data"
import { buildValuationConditionMetricMap } from "@/lib/valuation-condition-metrics"

describe("buildValuationConditionMetricMap", () => {
  it("keeps in-place revenue, opex, and NOI unchanged while still repricing value and cap rate", () => {
    const asset = ASSETS[0]
    expect(asset).toBeDefined()
    if (asset == null) {
      return
    }

    const dataset = getSampleStackingPlanData(asset.id, asset)
    const scenario = buildDefaultForecastScenarios()[0]
    expect(scenario).toBeDefined()
    if (scenario == null) {
      return
    }

    const assumptions = defaultForecastAssumptionsForAsset(asset.id, dataset)
    const financials = financialMetricsForAssetId(asset.id)
    const baseCapRatePct = financials?.capRatePct ?? assumptions.exitCapRatePct
    const modifiedValues = {
      ...INITIAL_MOD_VALUES,
      gym: "full-service",
    }

    const baseline = buildValuationConditionMetricMap({
      assetId: asset.id,
      dataset,
      assumptions,
      scenario,
      baseCapRatePct,
      modValues: INITIAL_MOD_VALUES,
    })
    const modified = buildValuationConditionMetricMap({
      assetId: asset.id,
      dataset,
      assumptions,
      scenario,
      baseCapRatePct,
      modValues: modifiedValues,
    })

    expect(modified.inPlace.grossRevenue).toBeCloseTo(
      baseline.inPlace.grossRevenue,
      2
    )
    expect(modified.inPlace.opex).toBeCloseTo(baseline.inPlace.opex, 2)
    expect(modified.inPlace.noi).toBeCloseTo(baseline.inPlace.noi, 2)
    expect(modified.inPlace.assetValue).not.toBeCloseTo(
      baseline.inPlace.assetValue,
      2
    )
    expect(modified.inPlace.capRate).not.toBeCloseTo(
      baseline.inPlace.capRate,
      2
    )
    expect(modified.markToMarket.opex).not.toBeCloseTo(
      baseline.markToMarket.opex,
      2
    )
  })
})
