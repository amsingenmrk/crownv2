import { describe, expect, it } from "vitest"

import type { ForecastStatementRow } from "@/lib/forecast-data"
import {
  DEFAULT_SCOPED_FORECAST_PORTFOLIO_SCENARIO_PROBABILITIES,
  SCOPED_FORECAST_BASELINE_BUILDING_VERSION_ID,
  SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID,
  type ScopedForecastAssetSelection,
} from "@/lib/scoped-forecast"
import {
  buildScopedForecastSummaryKpis,
  buildScopedForecastValuationKpiStripRows,
} from "@/lib/scoped-forecast-summary-kpis"
import {
  DEFAULT_VALUATION_CONDITION_ID,
  VALUATION_CONDITION_OPTIONS,
} from "@/lib/valuation-condition-config"

function sampleStatementRows(): ForecastStatementRow[] {
  return [
    { id: "grossRevenue", label: "Gross Revenue", kind: "currency", values: [100, 200] },
    { id: "opex", label: "OpEx", kind: "expense", values: [-20, -30] },
    { id: "noi", label: "NOI", kind: "currency", values: [80, 170] },
    { id: "salePrice", label: "Value", kind: "currency", values: [1000, 2000] },
    { id: "capRate", label: "Cap Rate", kind: "percent", values: [5, 5.5] },
  ]
}

const baselineSelection = {
  selectedBuildingVersionId: SCOPED_FORECAST_BASELINE_BUILDING_VERSION_ID,
  selectedOutlookSetId: SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID,
} as unknown as ScopedForecastAssetSelection

describe("buildScopedForecastSummaryKpis", () => {
  it("returns five KPI labels for scenario baseline view", () => {
    const rows = sampleStatementRows()
    const items = buildScopedForecastSummaryKpis({
      isPortfolioScope: false,
      scopeKind: "scenario",
      portfolioOverview: undefined,
      portfolioModificationMode: "baseline",
      portfolioScenarioProbabilities: DEFAULT_SCOPED_FORECAST_PORTFOLIO_SCENARIO_PROBABILITIES,
      activeModelStatementRows: rows,
      baselineModelStatementRows: rows,
      activeVariant: "baseline",
      assetSelections: [baselineSelection],
      selectedValuationCondition: DEFAULT_VALUATION_CONDITION_ID,
      activeAssetModels: [],
      baselineAssetModels: [],
    })
    expect(items.map((i) => i.label)).toEqual([
      "Gross Revenue",
      "OpEx",
      "NOI",
      "Asset Value",
      "Cap Rate",
    ])
  })
})

describe("buildScopedForecastValuationKpiStripRows", () => {
  it("returns five strip rows with one formatted value per valuation condition", () => {
    const rows = sampleStatementRows()
    const strip = buildScopedForecastValuationKpiStripRows({
      isPortfolioScope: false,
      scopeKind: "scenario",
      portfolioOverview: undefined,
      portfolioModificationMode: "baseline",
      portfolioScenarioProbabilities: DEFAULT_SCOPED_FORECAST_PORTFOLIO_SCENARIO_PROBABILITIES,
      activeModelStatementRows: rows,
      baselineModelStatementRows: rows,
      activeVariant: "baseline",
      assetSelections: [baselineSelection],
      activeAssetModels: [],
      baselineAssetModels: [],
    })
    expect(strip.map((r) => r.label)).toEqual([
      "Gross Revenue",
      "OpEx",
      "NOI",
      "Asset Value",
      "Cap Rate",
    ])
    const conditionIds = VALUATION_CONDITION_OPTIONS.map((o) => o.id)
    for (const row of strip) {
      for (const id of conditionIds) {
        expect(row.conditionValues[id]).toMatch(/\S/)
      }
    }
  })
})
