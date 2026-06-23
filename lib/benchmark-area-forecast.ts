import type { BenchmarkArea } from "@/lib/benchmark-area-search"
import type { BenchmarkStatsRaw } from "@/lib/benchmark-area-model"
import {
  buildDefaultForecastScenarios,
  buildForecastPeriods,
  deriveLeaseUpShare,
  scenarioEffectsForPeriod,
  type AssetForecastModel,
  type ForecastAssumptions,
  type ForecastEconomicOutlookScenario,
  type ForecastRevenueFloorRow,
  type ForecastRowKind,
  type ForecastStatementRow,
} from "@/lib/forecast-data"
import { getTrackedMarketStats } from "@/lib/benchmark-market-stats"
import { marketSearchDemoHash32 } from "@/lib/market-search-demo-listings"
import {
  DEFAULT_SCOPED_FORECAST_PORTFOLIO_SCENARIO_PROBABILITIES,
  normalizeScopedForecastPortfolioScenarioProbabilities,
  type ScopedForecastPortfolioScenarioProbabilities,
} from "@/lib/scoped-forecast"
import type {
  ScopedForecastPortfolioOutlookModel,
} from "@/lib/scoped-forecast-rollup"

const AVG_MARKET_BUILDING_RSF = 175_000

const MARKET_REVENUE_SEGMENTS = [
  { id: "segment-class-a", label: "Class A office", share: 0.68 },
  { id: "segment-class-bc", label: "Class B/C office", share: 0.24 },
  { id: "segment-other", label: "Retail & other", share: 0.08 },
] as const

export type BenchmarkAreaForecastRollup = {
  expectedModel: AssetForecastModel
  outlookModels: ScopedForecastPortfolioOutlookModel[]
  chartModels: AssetForecastModel[]
}

export type BenchmarkAreaForecastInputs = Pick<
  BenchmarkStatsRaw,
  | "buildingCount"
  | "occupancyPct"
  | "askingRentPsf"
  | "inPlaceRentPsf"
  | "intrinsicRentPsf"
>

type BuildBenchmarkAreaForecastModelArgs = {
  area: BenchmarkArea
  scenario: ForecastEconomicOutlookScenario
  marketInputs: BenchmarkAreaForecastInputs
  assumptions: ForecastAssumptions
}

type BuildBenchmarkAreaForecastRollupArgs = {
  area: BenchmarkArea
  marketInputs?: BenchmarkAreaForecastInputs | null
  assumptions?: ForecastAssumptions
  scenarioProbabilities?: ScopedForecastPortfolioScenarioProbabilities
}

const DEFAULT_BENCHMARK_FORECAST_INPUTS: BenchmarkAreaForecastInputs = {
  buildingCount: 420,
  occupancyPct: 86,
  askingRentPsf: 34.5,
  inPlaceRentPsf: 31.2,
  intrinsicRentPsf: 33.8,
}

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
          : rowId === "intrinsicRent"
            ? "Predicted Rent"
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

export function benchmarkAreaForecastInputs(
  area: BenchmarkArea,
  rawStats?: BenchmarkAreaForecastInputs | null
): BenchmarkAreaForecastInputs {
  if (rawStats != null) {
    return {
      buildingCount: rawStats.buildingCount,
      occupancyPct: rawStats.occupancyPct,
      askingRentPsf: rawStats.askingRentPsf,
      inPlaceRentPsf: rawStats.inPlaceRentPsf,
      intrinsicRentPsf: rawStats.intrinsicRentPsf,
    }
  }

  const tracked = getTrackedMarketStats(area.id)
  if (tracked != null) {
    return {
      buildingCount: tracked.buildingCount,
      occupancyPct: tracked.occupancyPct,
      askingRentPsf: tracked.askingRentPsf,
      inPlaceRentPsf: tracked.inPlaceRentPsf,
      intrinsicRentPsf: tracked.intrinsicRentPsf,
    }
  }

  return { ...DEFAULT_BENCHMARK_FORECAST_INPUTS }
}

export function defaultBenchmarkForecastAssumptions(
  inputs: BenchmarkAreaForecastInputs
): ForecastAssumptions {
  return {
    markToMarketEnabled: true,
    timeToLeaseMonths: 9,
    occupancyTargetPct: clamp(Math.round(inputs.occupancyPct + 2), 75, 96),
    defaultRenewalProbabilityPct: 62,
    exitCapRatePct: marketExitCapRatePct(inputs.askingRentPsf),
  }
}

function marketOpexRatio(areaId: string) {
  return clamp(0.58 + (marketSearchDemoHash32(areaId) % 80) / 1000, 0.54, 0.66)
}

function probabilityWeightedSeries(
  models: AssetForecastModel[],
  weights: readonly number[],
  rowId: string
) {
  const periodCount = models[0]?.periods.length ?? 0
  return Array.from({ length: periodCount }, (_, index) => {
    let weightedTotal = 0
    let totalWeight = 0

    for (const [modelIndex, model] of models.entries()) {
      const weight = weights[modelIndex] ?? 0
      const rowValue =
        model.statementRows.find((statementRow) => statementRow.id === rowId)?.values[
          index
        ] ?? 0
      weightedTotal += rowValue * weight
      totalWeight += weight
    }

    return totalWeight > 0 ? Number((weightedTotal / totalWeight).toFixed(2)) : 0
  })
}

function probabilityWeightedUncertaintyBand(
  models: AssetForecastModel[],
  weights: readonly number[],
  rowId: string
): ForecastStatementRow["uncertaintyBand"] {
  const hasAnyBand = models.some(
    (model) =>
      model.statementRows.find((statementRow) => statementRow.id === rowId)
        ?.uncertaintyBand != null
  )
  if (!hasAnyBand) return undefined

  const periodCount = models[0]?.periods.length ?? 0
  const lowerValues = Array.from({ length: periodCount }, (_, index) => {
    let weightedTotal = 0
    let totalWeight = 0

    for (const [modelIndex, model] of models.entries()) {
      const weight = weights[modelIndex] ?? 0
      const band = model.statementRows.find(
        (statementRow) => statementRow.id === rowId
      )?.uncertaintyBand
      weightedTotal += (band?.lowerValues[index] ?? 0) * weight
      totalWeight += weight
    }

    return totalWeight > 0 ? Number((weightedTotal / totalWeight).toFixed(2)) : 0
  })
  const upperValues = Array.from({ length: periodCount }, (_, index) => {
    let weightedTotal = 0
    let totalWeight = 0

    for (const [modelIndex, model] of models.entries()) {
      const weight = weights[modelIndex] ?? 0
      const band = model.statementRows.find(
        (statementRow) => statementRow.id === rowId
      )?.uncertaintyBand
      weightedTotal += (band?.upperValues[index] ?? 0) * weight
      totalWeight += weight
    }

    return totalWeight > 0 ? Number((weightedTotal / totalWeight).toFixed(2)) : 0
  })

  return {
    lowerValues,
    upperValues,
    label: "Probability-weighted range across outlooks.",
  }
}

function buildProbabilityWeightedMarketModel({
  area,
  models,
  weights,
  assumptions,
}: {
  area: BenchmarkArea
  models: AssetForecastModel[]
  weights: readonly number[]
  assumptions: ForecastAssumptions
}): AssetForecastModel {
  const baselineScenario = buildDefaultForecastScenarios()[0]!
  const grossRevenue = probabilityWeightedSeries(models, weights, "grossRevenue")
  const intrinsicRent = probabilityWeightedSeries(models, weights, "intrinsicRent")
  const opex = probabilityWeightedSeries(models, weights, "opex")
  const noi = probabilityWeightedSeries(models, weights, "noi")
  const salePrice = probabilityWeightedSeries(models, weights, "salePrice")
  const capRate = probabilityWeightedSeries(models, weights, "capRate")

  const statementRows: ForecastStatementRow[] = [
    {
      id: "grossRevenue",
      label: "Gross Revenue",
      kind: "currency",
      values: grossRevenue,
      uncertaintyBand: probabilityWeightedUncertaintyBand(
        models,
        weights,
        "grossRevenue"
      ),
    },
    {
      id: "intrinsicRent",
      label: "Predicted Rent",
      kind: "rentPsf",
      values: intrinsicRent,
      uncertaintyBand: probabilityWeightedUncertaintyBand(
        models,
        weights,
        "intrinsicRent"
      ),
    },
    {
      id: "opex",
      label: "OpEx",
      kind: "expense",
      values: opex,
      uncertaintyBand: probabilityWeightedUncertaintyBand(models, weights, "opex"),
    },
    {
      id: "noi",
      label: "NOI",
      kind: "currency",
      values: noi,
      uncertaintyBand: probabilityWeightedUncertaintyBand(models, weights, "noi"),
    },
    {
      id: "salePrice",
      label: "Asset Value",
      kind: "currency",
      values: salePrice,
      uncertaintyBand: probabilityWeightedUncertaintyBand(
        models,
        weights,
        "salePrice"
      ),
    },
    {
      id: "capRate",
      label: "Cap Rate",
      kind: "percent",
      values: capRate,
      uncertaintyBand: probabilityWeightedUncertaintyBand(models, weights, "capRate"),
    },
  ]

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const weightedSummaryValue = (
    read: (model: AssetForecastModel) => number,
    digits = 2
  ) => {
    if (totalWeight <= 0) return 0
    const value =
      models.reduce((sum, model, index) => {
        return sum + read(model) * (weights[index] ?? 0)
      }, 0) / totalWeight
    return Number(value.toFixed(digits))
  }

  return {
    assetId: area.id,
    assetName: area.label,
    scenario: {
      ...baselineScenario,
      id: "benchmark-market-expected",
      name: "Probability-weighted",
    },
    assumptions,
    periods: models[0]?.periods ?? buildForecastPeriods(),
    statementRows,
    revenueBreakdown: [],
    summary: {
      currentOccupancyPct: weightedSummaryValue(
        (model) => model.summary.currentOccupancyPct
      ),
      targetOccupancyPct: weightedSummaryValue(
        (model) => model.summary.targetOccupancyPct
      ),
      currentAnnualRevenue: weightedSummaryValue(
        (model) => model.summary.currentAnnualRevenue
      ),
      currentAnnualOpex: weightedSummaryValue(
        (model) => model.summary.currentAnnualOpex
      ),
      currentAnnualNoi: weightedSummaryValue(
        (model) => model.summary.currentAnnualNoi
      ),
      exitCapRatePct: weightedSummaryValue((model) => model.summary.exitCapRatePct),
    },
  }
}

export function buildBenchmarkAreaForecastModelForScenario({
  area,
  scenario,
  marketInputs,
  assumptions,
}: BuildBenchmarkAreaForecastModelArgs): AssetForecastModel {
  const periods = buildForecastPeriods()
  const buildingCount = marketInputs.buildingCount
  const currentOccupancyPct = clamp(marketInputs.occupancyPct, 0, 100)
  const currentInPlaceRentPsf = Math.max(0, marketInputs.inPlaceRentPsf)
  const intrinsicRentBasePsf = Math.max(
    0,
    marketInputs.intrinsicRentPsf || marketInputs.askingRentPsf * 0.98
  )
  const timeToLeaseQuarters = Math.max(
    1,
    Math.ceil(clamp(assumptions.timeToLeaseMonths, 3, 24) / 3)
  )
  const renewalProbability = clamp(
    assumptions.defaultRenewalProbabilityPct / 100,
    0.1,
    0.95
  )
  const opexRatio = marketOpexRatio(area.id)

  const effectiveOccupancyPctSeries = periods.map((period) => {
    const macro =
      scenario.macroPeriods[Math.min(period.index, scenario.macroPeriods.length - 1)]!
    const effects = scenarioEffectsForPeriod(macro)
    const horizonProgress = clamp((period.index + 1) / periods.length, 0, 1)
    const releaseProgress = clamp(
      (period.index + 1) / timeToLeaseQuarters,
      0,
      1
    )
    const effectiveTargetOccupancyPct = clamp(
      assumptions.occupancyTargetPct + effects.occupancyTargetAdjustmentPct,
      65,
      99
    )
    const renewalHeadwindPct = (1 - renewalProbability) * 6 * horizonProgress
    const retainedOccupancyPct = clamp(
      currentOccupancyPct - renewalHeadwindPct,
      55,
      99
    )

    if (effectiveTargetOccupancyPct >= retainedOccupancyPct) {
      const leaseUpShare = deriveLeaseUpShare(
        retainedOccupancyPct,
        effectiveTargetOccupancyPct
      )
      const absorbedVacancyPct =
        Math.max(0, 100 - retainedOccupancyPct) *
        leaseUpShare *
        releaseProgress *
        effects.releaseFactor
      return Number(
        clamp(retainedOccupancyPct + absorbedVacancyPct, 0, 100).toFixed(2)
      )
    }

    return Number(
      clamp(
        retainedOccupancyPct +
          (effectiveTargetOccupancyPct - retainedOccupancyPct) * releaseProgress,
        0,
        100
      ).toFixed(2)
    )
  })

  const intrinsicRent = periods.map((period) => {
    const macro =
      scenario.macroPeriods[Math.min(period.index, scenario.macroPeriods.length - 1)]!
    const effects = scenarioEffectsForPeriod(macro)
    const trend = Math.pow(effects.rentFactor, period.index)
    const tightnessLift = clamp(
      1 +
        ((effectiveOccupancyPctSeries[period.index] ?? currentOccupancyPct) -
          currentOccupancyPct) *
          0.0035,
      0.9,
      1.15
    )
    return Number((intrinsicRentBasePsf * trend * tightnessLift).toFixed(2))
  })

  const grossRevenue = periods.map((period) => {
    const macro =
      scenario.macroPeriods[Math.min(period.index, scenario.macroPeriods.length - 1)]!
    const effects = scenarioEffectsForPeriod(macro)
    const repricingProgress = assumptions.markToMarketEnabled
      ? clamp((period.index + 1) / (timeToLeaseQuarters + 2), 0, 1) *
        effects.releaseFactor
      : 0
    const realizedRentPsf =
      currentInPlaceRentPsf +
      ((intrinsicRent[period.index] ?? intrinsicRentBasePsf) -
        currentInPlaceRentPsf) *
        repricingProgress

    return Number(
      (
        baseQuarterlyGrossRevenue(
          buildingCount,
          effectiveOccupancyPctSeries[period.index] ?? currentOccupancyPct,
          realizedRentPsf
        )
      ).toFixed(2)
    )
  })

  const opex = grossRevenue.map((value, index) => {
    const macro =
      scenario.macroPeriods[Math.min(index, scenario.macroPeriods.length - 1)]!
    const effects = scenarioEffectsForPeriod(macro)
    return Number((value * opexRatio * effects.opexFactor).toFixed(2))
  })

  const noi = grossRevenue.map((value, index) =>
    Number((value - (opex[index] ?? 0)).toFixed(2))
  )

  const capRate = periods.map((period) => {
    const macro =
      scenario.macroPeriods[Math.min(period.index, scenario.macroPeriods.length - 1)]!
    const effects = scenarioEffectsForPeriod(macro)
    return clamp(
      Number((assumptions.exitCapRatePct + effects.exitCapAdjustmentPct).toFixed(2)),
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
    withUncertaintyBand("intrinsicRent", "rentPsf", intrinsicRent),
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
      currentOccupancyPct: currentOccupancyPct,
      targetOccupancyPct: assumptions.occupancyTargetPct,
      currentAnnualRevenue: (grossRevenue[0] ?? 0) * 4,
      currentAnnualOpex: (opex[0] ?? 0) * 4,
      currentAnnualNoi: (noi[0] ?? 0) * 4,
      exitCapRatePct: capRate[capRate.length - 1] ?? assumptions.exitCapRatePct,
    },
  }
}

export function buildBenchmarkAreaForecastModel(
  area: BenchmarkArea
): AssetForecastModel {
  const marketInputs = benchmarkAreaForecastInputs(area)
  return buildBenchmarkAreaForecastModelForScenario({
    area,
    scenario: buildDefaultForecastScenarios()[0]!,
    marketInputs,
    assumptions: defaultBenchmarkForecastAssumptions(marketInputs),
  })
}

export function buildBenchmarkAreaForecastRollup(
  {
    area,
    marketInputs,
    assumptions,
    scenarioProbabilities,
  }: BuildBenchmarkAreaForecastRollupArgs
): BenchmarkAreaForecastRollup {
  const scenarios = buildDefaultForecastScenarios()
  const resolvedMarketInputs = benchmarkAreaForecastInputs(
    area,
    marketInputs
  )
  const resolvedAssumptions =
    assumptions ?? defaultBenchmarkForecastAssumptions(resolvedMarketInputs)
  const normalizedProbabilities =
    normalizeScopedForecastPortfolioScenarioProbabilities(
      scenarioProbabilities ??
        DEFAULT_SCOPED_FORECAST_PORTFOLIO_SCENARIO_PROBABILITIES
    )

  const outlookModels: ScopedForecastPortfolioOutlookModel[] = scenarios.map(
    (scenario) => {
      const portfolioModel = buildBenchmarkAreaForecastModelForScenario({
        area,
        scenario,
        marketInputs: resolvedMarketInputs,
        assumptions: resolvedAssumptions,
      })
      const probabilityPct =
        normalizedProbabilities[
          scenario.id as keyof typeof normalizedProbabilities
        ] ?? 0

      return {
        scenarioId: scenario.id as ScopedForecastPortfolioOutlookModel["scenarioId"],
        probabilityPct,
        portfolioModel,
        assetModels: [],
      }
    }
  )

  const expectedModel = buildProbabilityWeightedMarketModel({
    area,
    models: outlookModels.map((entry) => entry.portfolioModel),
    weights: outlookModels.map((entry) => entry.probabilityPct),
    assumptions: resolvedAssumptions,
  })

  return {
    expectedModel,
    outlookModels,
    chartModels: [
      expectedModel,
      ...outlookModels.map((entry) => entry.portfolioModel),
    ],
  }
}
