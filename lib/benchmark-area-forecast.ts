import type { BenchmarkArea } from "@/lib/benchmark-area-search"
import {
  buildDefaultForecastScenarios,
  buildForecastPeriods,
  scenarioEffectsForPeriod,
  type AssetForecastModel,
  type ForecastAssumptions,
  type ForecastRevenueFloorRow,
  type ForecastRowKind,
  type ForecastStatementRow,
} from "@/lib/forecast-data"
import { getTrackedMarketStats } from "@/lib/benchmark-market-stats"
import { marketSearchDemoHash32 } from "@/lib/market-search-demo-listings"

const AVG_MARKET_BUILDING_RSF = 175_000

const MARKET_REVENUE_SEGMENTS = [
  { id: "segment-class-a", label: "Class A office", share: 0.68 },
  { id: "segment-class-bc", label: "Class B/C office", share: 0.24 },
  { id: "segment-other", label: "Retail & other", share: 0.08 },
] as const

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function heuristicUncertaintySpread({
  rowId,
  kind,
  value,
  index,
}: {
  rowId: string
  kind: ForecastRowKind
  value: number
  index: number
}) {
  if (kind === "percent") {
    const base = rowId === "capRate" ? 0.18 : 0.3
    const step = rowId === "capRate" ? 0.05 : 0.08
    return Number((base + index * step).toFixed(2))
  }

  const absoluteValue = Math.abs(value)
  const basePct =
    rowId === "salePrice"
      ? 0.06
      : rowId === "noi"
        ? 0.05
        : rowId === "opex"
          ? 0.035
          : 0.04
  const periodStep =
    rowId === "salePrice"
      ? 0.02
      : rowId === "noi"
        ? 0.017
        : rowId === "opex"
          ? 0.01
          : 0.013

  return Number((absoluteValue * (basePct + index * periodStep)).toFixed(2))
}

function withUncertaintyBand(
  rowId: string,
  kind: ForecastRowKind,
  values: number[]
): ForecastStatementRow {
  const lowerValues = values.map((value, index) => {
    const spread = heuristicUncertaintySpread({ rowId, kind, value, index })
    if (kind === "percent") {
      return clamp(Number((value - spread).toFixed(2)), 0, 100)
    }
    return Math.max(0, Number((value - spread).toFixed(2)))
  })
  const upperValues = values.map((value, index) => {
    const spread = heuristicUncertaintySpread({ rowId, kind, value, index })
    if (kind === "percent") {
      return clamp(Number((value + spread).toFixed(2)), 0, 100)
    }
    return Math.max(0, Number((value + spread).toFixed(2)))
  })

  return {
    id: rowId,
    label:
      rowId === "salePrice"
        ? "Asset Value"
        : rowId === "grossRevenue"
          ? "Gross Revenue"
          : rowId === "opex"
            ? "OpEx"
            : rowId === "noi"
              ? "NOI"
              : "Cap Rate",
    kind,
    values,
    uncertaintyBand: {
      lowerValues,
      upperValues,
      label: "Estimated uncertainty envelope for the market aggregate.",
    },
  }
}

function marketExitCapRatePct(askingRentPsf: number): number {
  return clamp(Number((7.15 - askingRentPsf * 0.014).toFixed(2)), 5.75, 7.85)
}

function baseQuarterlyGrossRevenue(
  buildingCount: number,
  occupancyPct: number,
  askingRentPsf: number
): number {
  const annualRevenue =
    buildingCount *
    AVG_MARKET_BUILDING_RSF *
    (occupancyPct / 100) *
    askingRentPsf
  return annualRevenue / 4
}

function buildMarketRevenueBreakdown(
  grossRevenue: number[],
  buildingCount: number
): ForecastRevenueFloorRow[] {
  const totalSqft = buildingCount * AVG_MARKET_BUILDING_RSF

  return MARKET_REVENUE_SEGMENTS.map((segment) => {
    const sqft = Math.round(totalSqft * segment.share)
    const values = grossRevenue.map((value) =>
      Number((value * segment.share).toFixed(2))
    )

    return {
      id: segment.id,
      floor: 0,
      label: segment.label,
      sqft,
      values,
      spaces: [],
    }
  })
}

function marketAssumptions(
  occupancyPct: number,
  askingRentPsf: number
): ForecastAssumptions {
  return {
    markToMarketEnabled: true,
    timeToLeaseMonths: 9,
    occupancyTargetPct: clamp(Math.round(occupancyPct + 2), 75, 96),
    defaultRenewalProbabilityPct: 62,
    exitCapRatePct: marketExitCapRatePct(askingRentPsf),
  }
}

export function buildBenchmarkAreaForecastModel(
  area: BenchmarkArea
): AssetForecastModel {
  const stats = getTrackedMarketStats(area.id)
  const scenario = buildDefaultForecastScenarios()[0]!
  const periods = buildForecastPeriods()

  const buildingCount = stats?.buildingCount ?? 420
  const occupancyPct = stats?.occupancyPct ?? 86
  const askingRentPsf = stats?.askingRentPsf ?? 34.5
  const assumptions = marketAssumptions(occupancyPct, askingRentPsf)

  const baseRevenue = baseQuarterlyGrossRevenue(
    buildingCount,
    occupancyPct,
    askingRentPsf
  )
  const opexRatio = clamp(0.58 + (marketSearchDemoHash32(area.id) % 80) / 1000, 0.54, 0.66)

  const grossRevenue = periods.map((period) => {
    const macro = scenario.macroPeriods[
      Math.min(period.index, scenario.macroPeriods.length - 1)
    ]!
    const effects = scenarioEffectsForPeriod(macro)
    const trend = Math.pow(effects.rentFactor, period.index)
    const occupancyLift = 1 + (occupancyPct - 85) * 0.0025
    return Number((baseRevenue * trend * occupancyLift).toFixed(2))
  })

  const opex = grossRevenue.map((value, index) => {
    const macro = scenario.macroPeriods[
      Math.min(index, scenario.macroPeriods.length - 1)
    ]!
    const effects = scenarioEffectsForPeriod(macro)
    return Number((value * opexRatio * effects.opexFactor).toFixed(2))
  })

  const noi = grossRevenue.map((value, index) =>
    Number((value - (opex[index] ?? 0)).toFixed(2))
  )

  const capRate = periods.map((period) => {
    const macro = scenario.macroPeriods[
      Math.min(period.index, scenario.macroPeriods.length - 1)
    ]!
    const effects = scenarioEffectsForPeriod(macro)
    return clamp(
      Number(
        (
          assumptions.exitCapRatePct + effects.exitCapAdjustmentPct
        ).toFixed(2)
      ),
      5.5,
      8.25
    )
  })

  const salePrice = noi.map((value, index) =>
    Math.max(
      0,
      Number(
        (
          (value * 4) /
          ((capRate[index] ?? assumptions.exitCapRatePct) / 100)
        ).toFixed(2)
      )
    )
  )

  const statementRows: ForecastStatementRow[] = [
    withUncertaintyBand("grossRevenue", "currency", grossRevenue),
    withUncertaintyBand("opex", "expense", opex),
    withUncertaintyBand("noi", "currency", noi),
    withUncertaintyBand("salePrice", "currency", salePrice),
    withUncertaintyBand("capRate", "percent", capRate),
  ]

  return {
    assetId: area.id,
    assetName: area.label,
    scenario,
    assumptions,
    periods,
    statementRows,
    revenueBreakdown: buildMarketRevenueBreakdown(grossRevenue, buildingCount),
    summary: {
      currentOccupancyPct: occupancyPct,
      targetOccupancyPct: assumptions.occupancyTargetPct,
      currentAnnualRevenue: (grossRevenue[0] ?? 0) * 4,
      currentAnnualOpex: (opex[0] ?? 0) * 4,
      currentAnnualNoi: (noi[0] ?? 0) * 4,
      exitCapRatePct: capRate[capRate.length - 1] ?? assumptions.exitCapRatePct,
    },
  }
}
