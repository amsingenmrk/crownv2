import { describe, expect, it } from "vitest"

import { ASSETS } from "@/lib/assets"
import { INITIAL_MOD_VALUES } from "@/lib/building-modifications"
import {
  buildAssetForecastModel,
  buildDefaultForecastScenarios,
  defaultForecastAssumptionsForAsset,
} from "@/lib/forecast-data"
import { upliftFromModValues } from "@/lib/scenario-modification-uplift"

describe("buildAssetForecastModel", () => {
  it("derives terminal value from the live NOI path instead of a stale base NOI", () => {
    const asset = ASSETS[0]
    expect(asset).toBeDefined()
    if (asset == null) {
      return
    }

    const scenario = buildDefaultForecastScenarios()[0]
    expect(scenario).toBeDefined()
    if (scenario == null) {
      return
    }

    const modValues = {
      ...INITIAL_MOD_VALUES,
      gym: "specialty-fitness",
      leed: "leed-gold",
    }
    const capexUsd = upliftFromModValues(modValues).upfrontCapexUsd
    const model = buildAssetForecastModel({
      assetId: asset.id,
      scenario,
      assumptions: defaultForecastAssumptionsForAsset(asset.id),
      modValues,
    })
    const noiRow = model.statementRows.find((row) => row.id === "noi")
    const capRateRow = model.statementRows.find((row) => row.id === "capRate")
    const salePriceRow = model.statementRows.find((row) => row.id === "salePrice")

    expect(noiRow).toBeDefined()
    expect(capRateRow).toBeDefined()
    expect(salePriceRow).toBeDefined()
    if (noiRow == null || capRateRow == null || salePriceRow == null) {
      return
    }

    salePriceRow.values.forEach((value, index) => {
      const expected = Math.max(
        0,
        ((noiRow.values[index] ?? 0) * 4) /
          ((capRateRow.values[index] ?? model.summary.exitCapRatePct) / 100) -
          capexUsd
      )
      expect(value).toBeCloseTo(expected, 2)
    })
  })

  it("lets the mark-to-market assumption change lease rollover revenue", () => {
    const asset = ASSETS[0]
    expect(asset).toBeDefined()
    if (asset == null) {
      return
    }

    const scenario = buildDefaultForecastScenarios()[0]
    expect(scenario).toBeDefined()
    if (scenario == null) {
      return
    }

    const baseAssumptions = defaultForecastAssumptionsForAsset(asset.id)
    const mtmOn = buildAssetForecastModel({
      assetId: asset.id,
      scenario,
      assumptions: { ...baseAssumptions, markToMarketEnabled: true },
    })
    const mtmOff = buildAssetForecastModel({
      assetId: asset.id,
      scenario,
      assumptions: { ...baseAssumptions, markToMarketEnabled: false },
    })

    const onRevenue = mtmOn.statementRows.find((row) => row.id === "grossRevenue")
    const offRevenue = mtmOff.statementRows.find((row) => row.id === "grossRevenue")

    expect(onRevenue).toBeDefined()
    expect(offRevenue).toBeDefined()
    if (onRevenue == null || offRevenue == null) {
      return
    }

    const changedPeriods = onRevenue.values.filter(
      (value, index) => Math.abs(value - (offRevenue.values[index] ?? 0)) > 1e-6
    )
    expect(changedPeriods.length).toBeGreaterThan(0)
  })
})
