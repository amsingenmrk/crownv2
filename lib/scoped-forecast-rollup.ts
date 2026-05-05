import { INITIAL_MOD_VALUES } from "@/lib/building-modifications"
import {
  buildAssetForecastModel,
  buildDefaultForecastScenarios,
  buildForecastPeriods,
  type AssetForecastModel,
  type ForecastAssumptions,
  type ForecastEconomicOutlookScenario,
  type ForecastStatementRow,
} from "@/lib/forecast-data"
import {
  buildRecommendedModificationValues,
  getTopSingleModificationRecommendationForAsset,
} from "@/lib/modification-recommendations"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import {
  DEFAULT_SCOPED_FORECAST_PORTFOLIO_SCENARIO_PROBABILITIES,
  buildDefaultScopedForecastAssumptions,
  type ScopedForecastAssetSelection,
  type ScopedForecastPortfolioControlState,
  type ScopedForecastPortfolioModificationMode,
  type ScopedForecastPortfolioScenarioId,
} from "@/lib/scoped-forecast"
import {
  applyStackingPlanTenantForecastOverrides,
  getStackingPlanTenantForecastOverrideSnapshot,
  parseStackingPlanTenantForecastOverrideSnapshot,
} from "@/lib/stacking-plan-tenant-forecast-overrides"
import { getSampleStackingPlanData } from "@/lib/stacking-plan-data"

type ScopedForecastVariant = "baseline" | "selected"

export type ScopedForecastResolvedAssetModel = {
  selection: ScopedForecastAssetSelection
  model: AssetForecastModel
}

export type ScopedForecastPortfolioOutlookModel = {
  scenarioId: ScopedForecastPortfolioScenarioId
  probabilityPct: number
  portfolioModel: AssetForecastModel
  assetModels: ScopedForecastResolvedAssetModel[]
}

export type ScopedForecastRollup = {
  baselineModel: AssetForecastModel
  selectedModel: AssetForecastModel
  comparisonModels: AssetForecastModel[]
  baselineAssetModels: ScopedForecastResolvedAssetModel[]
  selectedAssetModels: ScopedForecastResolvedAssetModel[]
  portfolioOverview?: {
    expectedModel: AssetForecastModel
    referenceExpectedModel: AssetForecastModel
    outlookModels: ScopedForecastPortfolioOutlookModel[]
    chartModels: AssetForecastModel[]
  }
}

function scenarioForAggregateModel(
  template: ForecastEconomicOutlookScenario,
  scenarioName: string,
  scenarioId: string
): ForecastEconomicOutlookScenario {
  return {
    ...template,
    id: scenarioId,
    name: scenarioName,
  }
}

function sumSeries(models: AssetForecastModel[], rowId: string) {
  const periodCount = models[0]?.periods.length ?? 0
  return Array.from({ length: periodCount }, (_, index) =>
    models.reduce((sum, model) => {
      const row = model.statementRows.find((statementRow) => statementRow.id === rowId)
      return sum + (row?.values[index] ?? 0)
    }, 0)
  )
}

function sumUncertaintyBand(
  models: AssetForecastModel[],
  rowId: string
): ForecastStatementRow["uncertaintyBand"] {
  const hasAnyBand = models.some((model) =>
    model.statementRows.find((row) => row.id === rowId)?.uncertaintyBand != null
  )
  if (!hasAnyBand) return undefined

  const periodCount = models[0]?.periods.length ?? 0
  const lowerValues = Array.from({ length: periodCount }, (_, index) =>
    models.reduce((sum, model) => {
      const band = model.statementRows.find((row) => row.id === rowId)?.uncertaintyBand
      return sum + (band?.lowerValues[index] ?? 0)
    }, 0)
  )
  const upperValues = Array.from({ length: periodCount }, (_, index) =>
    models.reduce((sum, model) => {
      const band = model.statementRows.find((row) => row.id === rowId)?.uncertaintyBand
      return sum + (band?.upperValues[index] ?? 0)
    }, 0)
  )

  return {
    lowerValues,
    upperValues,
    label: "Heuristic aggregate range across selected assets.",
  }
}

function weightedSeries(
  models: AssetForecastModel[],
  rowId: string,
  weightRowId: string
) {
  const periodCount = models[0]?.periods.length ?? 0
  return Array.from({ length: periodCount }, (_, index) => {
    let weightedTotal = 0
    let totalWeight = 0

    for (const model of models) {
      const rowValue =
        model.statementRows.find((statementRow) => statementRow.id === rowId)?.values[index] ?? 0
      const weight = Math.abs(
        model.statementRows.find((statementRow) => statementRow.id === weightRowId)?.values[index] ??
          0
      )

      weightedTotal += rowValue * weight
      totalWeight += weight
    }

    return totalWeight > 0 ? Number((weightedTotal / totalWeight).toFixed(2)) : 0
  })
}

function weightedUncertaintyBand(
  models: AssetForecastModel[],
  rowId: string,
  weightRowId: string
): ForecastStatementRow["uncertaintyBand"] {
  const hasAnyBand = models.some((model) =>
    model.statementRows.find((statementRow) => statementRow.id === rowId)?.uncertaintyBand != null
  )
  if (!hasAnyBand) return undefined

  const periodCount = models[0]?.periods.length ?? 0
  const lowerValues = Array.from({ length: periodCount }, (_, index) => {
    let weightedTotal = 0
    let totalWeight = 0

    for (const model of models) {
      const band =
        model.statementRows.find((statementRow) => statementRow.id === rowId)?.uncertaintyBand
      const weight = Math.abs(
        model.statementRows.find((statementRow) => statementRow.id === weightRowId)?.values[index] ??
          0
      )
      weightedTotal += (band?.lowerValues[index] ?? 0) * weight
      totalWeight += weight
    }

    return totalWeight > 0 ? Number((weightedTotal / totalWeight).toFixed(2)) : 0
  })
  const upperValues = Array.from({ length: periodCount }, (_, index) => {
    let weightedTotal = 0
    let totalWeight = 0

    for (const model of models) {
      const band =
        model.statementRows.find((statementRow) => statementRow.id === rowId)?.uncertaintyBand
      const weight = Math.abs(
        model.statementRows.find((statementRow) => statementRow.id === weightRowId)?.values[index] ??
          0
      )
      weightedTotal += (band?.upperValues[index] ?? 0) * weight
      totalWeight += weight
    }

    return totalWeight > 0 ? Number((weightedTotal / totalWeight).toFixed(2)) : 0
  })

  return {
    lowerValues,
    upperValues,
    label: "Heuristic weighted range across selected assets.",
  }
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
        model.statementRows.find((statementRow) => statementRow.id === rowId)?.values[index] ?? 0
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
  const hasAnyBand = models.some((model) =>
    model.statementRows.find((statementRow) => statementRow.id === rowId)?.uncertaintyBand != null
  )
  if (!hasAnyBand) return undefined

  const periodCount = models[0]?.periods.length ?? 0
  const lowerValues = Array.from({ length: periodCount }, (_, index) => {
    let weightedTotal = 0
    let totalWeight = 0

    for (const [modelIndex, model] of models.entries()) {
      const weight = weights[modelIndex] ?? 0
      const band =
        model.statementRows.find((statementRow) => statementRow.id === rowId)?.uncertaintyBand
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
      const band =
        model.statementRows.find((statementRow) => statementRow.id === rowId)?.uncertaintyBand
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

function weightedOccupancyPercent(models: AssetForecastModel[]) {
  let weightedOccupied = 0
  let totalSqft = 0

  for (const model of models) {
    const sqft = financialMetricsForAssetId(model.assetId)?.rsfSqft ?? 0
    weightedOccupied += model.summary.currentOccupancyPct * sqft
    totalSqft += sqft
  }

  return totalSqft > 0 ? weightedOccupied / totalSqft : 0
}

function aggregateAssetForecastModels({
  scopeLabel,
  scenarioName,
  scenarioId,
  models,
  assumptions,
}: {
  scopeLabel: string
  scenarioName: string
  scenarioId: string
  models: AssetForecastModel[]
  assumptions: ForecastAssumptions
}): AssetForecastModel {
  const baselineScenarioTemplate = buildDefaultForecastScenarios()[0]!

  if (models.length === 0) {
    const periods = buildForecastPeriods()
    const zeros = periods.map(() => 0)

    return {
      assetId: `${scenarioId}-empty`,
      assetName: scopeLabel,
      scenario: scenarioForAggregateModel(
        baselineScenarioTemplate,
        scenarioName,
        scenarioId
      ),
      assumptions,
      periods,
      statementRows: [
        {
          id: "grossRevenue",
          label: "Gross Revenue",
          kind: "currency",
          values: [...zeros],
          uncertaintyBand: {
            lowerValues: [...zeros],
            upperValues: [...zeros],
            label: "Heuristic aggregate range across selected assets.",
          },
        },
        {
          id: "opex",
          label: "OpEx",
          kind: "expense",
          values: [...zeros],
          uncertaintyBand: {
            lowerValues: [...zeros],
            upperValues: [...zeros],
            label: "Heuristic aggregate range across selected assets.",
          },
        },
        {
          id: "noi",
          label: "NOI",
          kind: "currency",
          values: [...zeros],
          uncertaintyBand: {
            lowerValues: [...zeros],
            upperValues: [...zeros],
            label: "Heuristic aggregate range across selected assets.",
          },
        },
        {
          id: "salePrice",
          label: "Asset Value",
          kind: "currency",
          values: [...zeros],
          uncertaintyBand: {
            lowerValues: [...zeros],
            upperValues: [...zeros],
            label: "Heuristic aggregate range across selected assets.",
          },
        },
        {
          id: "capRate",
          label: "Cap Rate",
          kind: "percent",
          values: [...zeros],
          uncertaintyBand: {
            lowerValues: [...zeros],
            upperValues: [...zeros],
            label: "Heuristic weighted range across selected assets.",
          },
        },
      ],
      revenueBreakdown: [],
      summary: {
        currentOccupancyPct: 0,
        targetOccupancyPct: assumptions.occupancyTargetPct,
        currentAnnualRevenue: 0,
        currentAnnualOpex: 0,
        currentAnnualNoi: 0,
        exitCapRatePct: assumptions.exitCapRatePct,
      },
    }
  }

  const grossRevenue = sumSeries(models, "grossRevenue")
  const opex = sumSeries(models, "opex")
  const noi = sumSeries(models, "noi")
  const salePrice = sumSeries(models, "salePrice")
  const capRate = weightedSeries(models, "capRate", "salePrice")

  const statementRows: ForecastStatementRow[] = [
    {
      id: "grossRevenue",
      label: "Gross Revenue",
      kind: "currency",
      values: grossRevenue,
      uncertaintyBand: sumUncertaintyBand(models, "grossRevenue"),
    },
    {
      id: "opex",
      label: "OpEx",
      kind: "expense",
      values: opex,
      uncertaintyBand: sumUncertaintyBand(models, "opex"),
    },
    {
      id: "noi",
      label: "NOI",
      kind: "currency",
      values: noi,
      uncertaintyBand: sumUncertaintyBand(models, "noi"),
    },
    {
      id: "salePrice",
      label: "Asset Value",
      kind: "currency",
      values: salePrice,
      uncertaintyBand: sumUncertaintyBand(models, "salePrice"),
    },
    {
      id: "capRate",
      label: "Cap Rate",
      kind: "percent",
      values: capRate,
      uncertaintyBand: weightedUncertaintyBand(models, "capRate", "salePrice"),
    },
  ]

  return {
    assetId: scenarioId,
    assetName: scopeLabel,
    scenario: scenarioForAggregateModel(
      baselineScenarioTemplate,
      scenarioName,
      scenarioId
    ),
    assumptions,
    periods: models[0]!.periods,
    statementRows,
    revenueBreakdown: [],
    summary: {
      currentOccupancyPct: weightedOccupancyPercent(models),
      targetOccupancyPct: assumptions.occupancyTargetPct,
      currentAnnualRevenue: (grossRevenue[0] ?? 0) * 4,
      currentAnnualOpex: models.reduce(
        (sum, model) => sum + model.summary.currentAnnualOpex,
        0
      ),
      currentAnnualNoi: (noi[0] ?? 0) * 4,
      exitCapRatePct: capRate[capRate.length - 1] ?? assumptions.exitCapRatePct,
    },
  }
}

function stackingPlanDataForAsset(assetId: string) {
  const overrides = parseStackingPlanTenantForecastOverrideSnapshot(
    getStackingPlanTenantForecastOverrideSnapshot(assetId)
  )

  return applyStackingPlanTenantForecastOverrides(
    getSampleStackingPlanData(assetId),
    overrides
  )
}

function buildResolvedAssetModel({
  selection,
  assumptions,
  scenario,
  modValues,
}: {
  selection: ScopedForecastAssetSelection
  assumptions: ForecastAssumptions
  scenario: ForecastEconomicOutlookScenario
  modValues: typeof INITIAL_MOD_VALUES
}): ScopedForecastResolvedAssetModel {
  const model = buildAssetForecastModel({
    assetId: selection.row.id,
    scenario,
    assumptions,
    modValues,
    stackingPlanData: stackingPlanDataForAsset(selection.row.id),
  })

  return {
    selection,
    model: {
      ...model,
      assetName: selection.row.building,
    },
  }
}

function buildVariantAssetModel({
  selection,
  assumptions,
  variant,
}: {
  selection: ScopedForecastAssetSelection
  assumptions: ForecastAssumptions
  variant: ScopedForecastVariant
}): ScopedForecastResolvedAssetModel {
  return buildResolvedAssetModel({
    selection,
    assumptions,
    scenario:
      variant === "baseline"
        ? buildDefaultForecastScenarios()[0]!
        : selection.selectedOutlookSet.activeScenario,
    modValues:
      variant === "baseline"
        ? INITIAL_MOD_VALUES
        : selection.selectedBuildingVersion.values,
  })
}

function recommendedModValuesForSelection(selection: ScopedForecastAssetSelection) {
  return buildRecommendedModificationValues(
    getTopSingleModificationRecommendationForAsset(selection.row.id)
  )
}

function buildPortfolioOutlookModels({
  scopeLabel,
  assetSelections,
  assumptions,
  modificationMode,
  scenarioProbabilities,
}: {
  scopeLabel: string
  assetSelections: readonly ScopedForecastAssetSelection[]
  assumptions: ForecastAssumptions
  modificationMode: ScopedForecastPortfolioModificationMode
  scenarioProbabilities: ScopedForecastPortfolioControlState["scenarioProbabilities"]
}): ScopedForecastPortfolioOutlookModel[] {
  const defaultScenarios = buildDefaultForecastScenarios()

  return defaultScenarios.map((scenario) => {
    const assetModels = assetSelections.map((selection) =>
      buildResolvedAssetModel({
        selection,
        assumptions,
        scenario,
        modValues:
          modificationMode === "recommended"
            ? recommendedModValuesForSelection(selection)
            : INITIAL_MOD_VALUES,
      })
    )
    const probabilityPct =
      scenarioProbabilities[scenario.id as ScopedForecastPortfolioScenarioId] ?? 0

    return {
      scenarioId: scenario.id as ScopedForecastPortfolioScenarioId,
      probabilityPct,
      portfolioModel: aggregateAssetForecastModels({
        scopeLabel,
        scenarioName: scenario.name,
        scenarioId: `scoped-portfolio-${scenario.id}`,
        models: assetModels.map((entry) => entry.model),
        assumptions,
      }),
      assetModels,
    } satisfies ScopedForecastPortfolioOutlookModel
  })
}

function buildProbabilityWeightedPortfolioModel({
  scopeLabel,
  assumptions,
  models,
  weights,
}: {
  scopeLabel: string
  assumptions: ForecastAssumptions
  models: AssetForecastModel[]
  weights: readonly number[]
}): AssetForecastModel {
  const baselineScenarioTemplate = buildDefaultForecastScenarios()[0]!

  if (models.length === 0) {
    return aggregateAssetForecastModels({
      scopeLabel,
      scenarioName: "Probability-weighted",
      scenarioId: "scoped-portfolio-expected",
      models,
      assumptions,
    })
  }

  const grossRevenue = probabilityWeightedSeries(models, weights, "grossRevenue")
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
    assetId: "scoped-portfolio-expected",
    assetName: scopeLabel,
    scenario: scenarioForAggregateModel(
      baselineScenarioTemplate,
      "Probability-weighted",
      "scoped-portfolio-expected"
    ),
    assumptions,
    periods: models[0]!.periods,
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
      exitCapRatePct: weightedSummaryValue(
        (model) => model.summary.exitCapRatePct
      ),
    },
  }
}

export function buildScopedForecastRollup({
  scopeLabel,
  assetSelections,
  assumptions,
  portfolioControls,
}: {
  scopeLabel: string
  assetSelections: readonly ScopedForecastAssetSelection[]
  assumptions: ForecastAssumptions
  portfolioControls?: ScopedForecastPortfolioControlState
}): ScopedForecastRollup {
  const normalizedAssumptions =
    assetSelections.length > 0
      ? assumptions
      : buildDefaultScopedForecastAssumptions([])

  const baselineAssetModels = assetSelections.map((selection) =>
    buildVariantAssetModel({
      selection,
      assumptions: normalizedAssumptions,
      variant: "baseline",
    })
  )
  const selectedAssetModels = assetSelections.map((selection) =>
    buildVariantAssetModel({
      selection,
      assumptions: normalizedAssumptions,
      variant: "selected",
    })
  )

  const baselineModel = aggregateAssetForecastModels({
    scopeLabel,
    scenarioName: "Baseline",
    scenarioId: "scoped-baseline",
    models: baselineAssetModels.map((entry) => entry.model),
    assumptions: normalizedAssumptions,
  })
  const selectedModel = aggregateAssetForecastModels({
    scopeLabel,
    scenarioName: "Selected",
    scenarioId: "scoped-selected",
    models: selectedAssetModels.map((entry) => entry.model),
    assumptions: normalizedAssumptions,
  })

  const portfolioOverview =
    portfolioControls == null
      ? undefined
      : (() => {
          const portfolioOutlookModels = buildPortfolioOutlookModels({
            scopeLabel,
            assetSelections,
            assumptions: normalizedAssumptions,
            modificationMode: portfolioControls.modificationMode,
            scenarioProbabilities: portfolioControls.scenarioProbabilities,
          })
          const expectedModel = buildProbabilityWeightedPortfolioModel({
            scopeLabel,
            assumptions: normalizedAssumptions,
            models: portfolioOutlookModels.map((entry) => entry.portfolioModel),
            weights: portfolioOutlookModels.map((entry) => entry.probabilityPct),
          })
          const referenceOutlookModels = buildPortfolioOutlookModels({
            scopeLabel,
            assetSelections,
            assumptions: normalizedAssumptions,
            modificationMode: "baseline",
            scenarioProbabilities:
              DEFAULT_SCOPED_FORECAST_PORTFOLIO_SCENARIO_PROBABILITIES,
          })
          const referenceExpectedModel = buildProbabilityWeightedPortfolioModel({
            scopeLabel,
            assumptions: normalizedAssumptions,
            models: referenceOutlookModels.map((entry) => entry.portfolioModel),
            weights: referenceOutlookModels.map((entry) => entry.probabilityPct),
          })

          return {
            expectedModel,
            referenceExpectedModel,
            outlookModels: portfolioOutlookModels,
            chartModels: [
              expectedModel,
              ...portfolioOutlookModels.map((entry) => entry.portfolioModel),
            ],
          }
        })()

  return {
    baselineModel,
    selectedModel,
    comparisonModels: [baselineModel, selectedModel],
    baselineAssetModels,
    selectedAssetModels,
    portfolioOverview,
  }
}
