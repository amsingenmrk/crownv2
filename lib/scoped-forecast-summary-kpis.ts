import type { ForecastStatementRow } from "@/lib/forecast-data"
import type { ForecastSummaryKpi } from "@/lib/forecast-summary-kpi"
import {
  DEFAULT_SCOPED_FORECAST_PORTFOLIO_SCENARIO_PROBABILITIES,
  SCOPED_FORECAST_BASELINE_BUILDING_VERSION_ID,
  SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID,
  type ScopedForecastAssetSelection,
  type ScopedForecastPortfolioModificationMode,
  type ScopedForecastPortfolioScenarioProbabilities,
} from "@/lib/scoped-forecast"
import type {
  ScopedForecastPortfolioOutlookModel,
  ScopedForecastResolvedAssetModel,
  ScopedForecastRollup,
} from "@/lib/scoped-forecast-rollup"
import type { ValuationKpiStripRowModel } from "@/lib/valuation-kpi-strip-model"
import {
  formatCapRatePts,
  formatPctChange,
  formatUsdDeltaCompact,
  formatUsdPortfolioCompact,
  scenarioDeltaDirection,
} from "@/lib/scenario-kpi-format"
import {
  VALUATION_CONDITION_OPTIONS,
  type ValuationConditionId,
} from "@/lib/valuation-condition-config"
import {
  aggregateValuationConditionMetrics,
  buildValuationConditionMetricMap,
  probabilityWeightedValuationConditionMetrics,
  scaleDisplayedMetricsForValuationCondition,
} from "@/lib/valuation-condition-metrics"

function sumSeries(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0)
}

function getStatementRowValues(rows: ForecastStatementRow[], rowId: string) {
  return rows.find((row) => row.id === rowId)?.values ?? []
}

function getStatementRowCumulativeValue(rows: ForecastStatementRow[], rowId: string) {
  return sumSeries(getStatementRowValues(rows, rowId))
}

function getStatementRowTerminalValue(rows: ForecastStatementRow[], rowId: string) {
  const values = getStatementRowValues(rows, rowId)
  return values[values.length - 1] ?? 0
}

type ForecastSummaryMetricValues = {
  grossRevenue: number
  opex: number
  noi: number
  assetValue: number
  capRate: number
}

function getForecastSummaryMetricValues(
  rows: ForecastStatementRow[],
  useDisplayedExpenseMagnitude = false
): ForecastSummaryMetricValues {
  return {
    grossRevenue: getStatementRowCumulativeValue(rows, "grossRevenue"),
    opex: useDisplayedExpenseMagnitude
      ? Math.abs(getStatementRowCumulativeValue(rows, "opex"))
      : getStatementRowCumulativeValue(rows, "opex"),
    noi: getStatementRowCumulativeValue(rows, "noi"),
    assetValue: getStatementRowTerminalValue(rows, "salePrice"),
    capRate: getStatementRowTerminalValue(rows, "capRate"),
  }
}

function portfolioProbabilitiesMatchDefault(
  probabilities: ScopedForecastPortfolioScenarioProbabilities
) {
  return (
    probabilities.baseline ===
      DEFAULT_SCOPED_FORECAST_PORTFOLIO_SCENARIO_PROBABILITIES.baseline &&
    probabilities.optimistic ===
      DEFAULT_SCOPED_FORECAST_PORTFOLIO_SCENARIO_PROBABILITIES.optimistic &&
    probabilities.pessimistic ===
      DEFAULT_SCOPED_FORECAST_PORTFOLIO_SCENARIO_PROBABILITIES.pessimistic
  )
}

function valuationMetricsForResolvedAssetModels(
  assetModels: readonly ScopedForecastResolvedAssetModel[],
  valuationCondition: ValuationConditionId
) {
  return aggregateValuationConditionMetrics(
    assetModels.map((entry) => {
      const metricMap = buildValuationConditionMetricMap({
        assetId: entry.selection.row.id,
        dataset: entry.stackingPlanData,
        assumptions: entry.model.assumptions,
        scenario: entry.model.scenario,
        baseCapRatePct: entry.model.summary.exitCapRatePct,
        modValues: entry.modValues,
      })
      return metricMap[valuationCondition]
    })
  )
}

function probabilityWeightedValuationMetricsForOutlooks(
  outlookModels: readonly ScopedForecastPortfolioOutlookModel[],
  valuationCondition: ValuationConditionId
) {
  return probabilityWeightedValuationConditionMetrics({
    metrics: outlookModels.map((outlook) =>
      valuationMetricsForResolvedAssetModels(
        outlook.assetModels,
        valuationCondition
      )
    ),
    weights: outlookModels.map((outlook) => outlook.probabilityPct),
  })
}

export function buildScopedForecastSummaryKpis({
  isPortfolioScope,
  scopeKind,
  portfolioOverview,
  portfolioModificationMode,
  portfolioScenarioProbabilities,
  activeModelStatementRows,
  baselineModelStatementRows,
  activeVariant,
  assetSelections,
  selectedValuationCondition,
  activeAssetModels,
  baselineAssetModels,
}: {
  isPortfolioScope: boolean
  scopeKind: "portfolio" | "scenario"
  portfolioOverview: ScopedForecastRollup["portfolioOverview"]
  portfolioModificationMode: ScopedForecastPortfolioModificationMode
  portfolioScenarioProbabilities: ScopedForecastPortfolioScenarioProbabilities
  activeModelStatementRows: ForecastStatementRow[]
  baselineModelStatementRows: ForecastStatementRow[]
  activeVariant: "baseline" | "selected"
  assetSelections: readonly ScopedForecastAssetSelection[]
  selectedValuationCondition: ValuationConditionId
  activeAssetModels: readonly ScopedForecastResolvedAssetModel[]
  baselineAssetModels: readonly ScopedForecastResolvedAssetModel[]
}): ForecastSummaryKpi[] {
  if (isPortfolioScope && portfolioOverview != null) {
    const currentBaseMetrics = getForecastSummaryMetricValues(
      portfolioOverview.expectedModel.statementRows,
      true
    )
    const referenceBaseMetrics = getForecastSummaryMetricValues(
      portfolioOverview.referenceExpectedModel.statementRows,
      true
    )
    const currentMetrics = scaleDisplayedMetricsForValuationCondition({
      displayedMetrics: currentBaseMetrics,
      marketAnnualMetrics: probabilityWeightedValuationMetricsForOutlooks(
        portfolioOverview.outlookModels,
        "market"
      ),
      selectedAnnualMetrics: probabilityWeightedValuationMetricsForOutlooks(
        portfolioOverview.outlookModels,
        selectedValuationCondition
      ),
    })
    const referenceMetrics = scaleDisplayedMetricsForValuationCondition({
      displayedMetrics: referenceBaseMetrics,
      marketAnnualMetrics: probabilityWeightedValuationMetricsForOutlooks(
        portfolioOverview.referenceOutlookModels,
        "market"
      ),
      selectedAnnualMetrics: probabilityWeightedValuationMetricsForOutlooks(
        portfolioOverview.referenceOutlookModels,
        selectedValuationCondition
      ),
    })
    const showPortfolioPair =
      portfolioModificationMode !== "baseline" ||
      !portfolioProbabilitiesMatchDefault(portfolioScenarioProbabilities)

    const portfolioItems: ForecastSummaryKpi[] = [
      {
        label: "Gross Revenue",
        value: formatUsdPortfolioCompact(currentMetrics.grossRevenue),
        valueSuffix: "2-yr total",
        ...(showPortfolioPair
          ? {
              baseFormatted: formatUsdPortfolioCompact(referenceMetrics.grossRevenue),
              scenarioFormatted: formatUsdPortfolioCompact(currentMetrics.grossRevenue),
              showScenario: true,
              deltaLine: formatUsdDeltaCompact(
                currentMetrics.grossRevenue - referenceMetrics.grossRevenue
              ),
              pctLine: formatPctChange(
                referenceMetrics.grossRevenue,
                currentMetrics.grossRevenue
              ),
              deltaDirection: scenarioDeltaDirection(
                currentMetrics.grossRevenue - referenceMetrics.grossRevenue
              ),
            }
          : {}),
      },
      {
        label: "OpEx",
        value: formatUsdPortfolioCompact(currentMetrics.opex),
        valueSuffix: "2-yr total",
        ...(showPortfolioPair
          ? {
              baseFormatted: formatUsdPortfolioCompact(referenceMetrics.opex),
              scenarioFormatted: formatUsdPortfolioCompact(currentMetrics.opex),
              showScenario: true,
              deltaLine: formatUsdDeltaCompact(currentMetrics.opex - referenceMetrics.opex),
              pctLine: formatPctChange(referenceMetrics.opex, currentMetrics.opex),
              deltaDirection: scenarioDeltaDirection(
                currentMetrics.opex - referenceMetrics.opex
              ),
            }
          : {}),
      },
      {
        label: "NOI",
        value: formatUsdPortfolioCompact(currentMetrics.noi),
        valueSuffix: "2-yr total",
        ...(showPortfolioPair
          ? {
              baseFormatted: formatUsdPortfolioCompact(referenceMetrics.noi),
              scenarioFormatted: formatUsdPortfolioCompact(currentMetrics.noi),
              showScenario: true,
              deltaLine: formatUsdDeltaCompact(currentMetrics.noi - referenceMetrics.noi),
              pctLine: formatPctChange(referenceMetrics.noi, currentMetrics.noi),
              deltaDirection: scenarioDeltaDirection(
                currentMetrics.noi - referenceMetrics.noi
              ),
            }
          : {}),
      },
      {
        label: "Asset Value",
        value: formatUsdPortfolioCompact(currentMetrics.assetValue),
        valueSuffix: "terminal",
        ...(showPortfolioPair
          ? {
              baseFormatted: formatUsdPortfolioCompact(referenceMetrics.assetValue),
              scenarioFormatted: formatUsdPortfolioCompact(currentMetrics.assetValue),
              showScenario: true,
              deltaLine: formatUsdDeltaCompact(
                currentMetrics.assetValue - referenceMetrics.assetValue
              ),
              pctLine: formatPctChange(
                referenceMetrics.assetValue,
                currentMetrics.assetValue
              ),
              deltaDirection: scenarioDeltaDirection(
                currentMetrics.assetValue - referenceMetrics.assetValue
              ),
            }
          : {}),
      },
      {
        label: "Cap Rate",
        value: `${currentMetrics.capRate.toFixed(2)}%`,
        valueSuffix: "terminal",
        ...(showPortfolioPair
          ? {
              baseFormatted: `${referenceMetrics.capRate.toFixed(2)}%`,
              scenarioFormatted: `${currentMetrics.capRate.toFixed(2)}%`,
              showScenario: true,
              deltaLine: formatCapRatePts(
                currentMetrics.capRate - referenceMetrics.capRate
              ),
              deltaDirection: scenarioDeltaDirection(
                currentMetrics.capRate - referenceMetrics.capRate
              ),
            }
          : {}),
      },
    ]
    return portfolioItems
  }

  const selectedMetrics = scaleDisplayedMetricsForValuationCondition({
    displayedMetrics: getForecastSummaryMetricValues(activeModelStatementRows, true),
    marketAnnualMetrics: valuationMetricsForResolvedAssetModels(
      activeAssetModels,
      "market"
    ),
    selectedAnnualMetrics: valuationMetricsForResolvedAssetModels(
      activeAssetModels,
      selectedValuationCondition
    ),
  })
  const baselineMetrics = scaleDisplayedMetricsForValuationCondition({
    displayedMetrics: getForecastSummaryMetricValues(
      baselineModelStatementRows,
      true
    ),
    marketAnnualMetrics: valuationMetricsForResolvedAssetModels(
      baselineAssetModels,
      "market"
    ),
    selectedAnnualMetrics: valuationMetricsForResolvedAssetModels(
      baselineAssetModels,
      selectedValuationCondition
    ),
  })

  const hasAnySelectedModifications =
    scopeKind === "scenario" &&
    assetSelections.some(
      (s) => s.selectedBuildingVersionId !== SCOPED_FORECAST_BASELINE_BUILDING_VERSION_ID
    )
  const hasAnySelectedOutlookChanges =
    scopeKind === "scenario" &&
    assetSelections.some(
      (s) => s.selectedOutlookSetId !== SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID
    )

  const showScenarioPair =
    scopeKind === "scenario" &&
    activeVariant === "selected" &&
    (hasAnySelectedModifications || hasAnySelectedOutlookChanges)

  return [
    {
      label: "Gross Revenue",
      value: formatUsdPortfolioCompact(selectedMetrics.grossRevenue),
      valueSuffix: "2-yr total",
      ...(showScenarioPair
        ? {
            baseFormatted: formatUsdPortfolioCompact(baselineMetrics.grossRevenue),
            scenarioFormatted: formatUsdPortfolioCompact(selectedMetrics.grossRevenue),
            showScenario: true,
            deltaLine: `${formatUsdDeltaCompact(
              selectedMetrics.grossRevenue - baselineMetrics.grossRevenue
            )}`,
            pctLine: formatPctChange(
              baselineMetrics.grossRevenue,
              selectedMetrics.grossRevenue
            ),
            deltaDirection: scenarioDeltaDirection(
              selectedMetrics.grossRevenue - baselineMetrics.grossRevenue
            ),
          }
        : {}),
    },
    {
      label: "OpEx",
      value: formatUsdPortfolioCompact(selectedMetrics.opex),
      valueSuffix: "2-yr total",
      ...(showScenarioPair
        ? {
            baseFormatted: formatUsdPortfolioCompact(baselineMetrics.opex),
            scenarioFormatted: formatUsdPortfolioCompact(selectedMetrics.opex),
            showScenario: true,
            deltaLine: `${formatUsdDeltaCompact(selectedMetrics.opex - baselineMetrics.opex)}`,
            pctLine: formatPctChange(baselineMetrics.opex, selectedMetrics.opex),
            deltaDirection: scenarioDeltaDirection(
              selectedMetrics.opex - baselineMetrics.opex
            ),
          }
        : {}),
    },
    {
      label: "NOI",
      value: formatUsdPortfolioCompact(selectedMetrics.noi),
      valueSuffix: "2-yr total",
      ...(showScenarioPair
        ? {
            baseFormatted: formatUsdPortfolioCompact(baselineMetrics.noi),
            scenarioFormatted: formatUsdPortfolioCompact(selectedMetrics.noi),
            showScenario: true,
            deltaLine: `${formatUsdDeltaCompact(selectedMetrics.noi - baselineMetrics.noi)}`,
            pctLine: formatPctChange(baselineMetrics.noi, selectedMetrics.noi),
            deltaDirection: scenarioDeltaDirection(
              selectedMetrics.noi - baselineMetrics.noi
            ),
          }
        : {}),
    },
    {
      label: "Asset Value",
      value: formatUsdPortfolioCompact(selectedMetrics.assetValue),
      valueSuffix: "terminal",
      ...(showScenarioPair
        ? {
            baseFormatted: formatUsdPortfolioCompact(baselineMetrics.assetValue),
            scenarioFormatted: formatUsdPortfolioCompact(selectedMetrics.assetValue),
            showScenario: true,
            deltaLine: `${formatUsdDeltaCompact(
              selectedMetrics.assetValue - baselineMetrics.assetValue
            )}`,
            pctLine: formatPctChange(
              baselineMetrics.assetValue,
              selectedMetrics.assetValue
            ),
            deltaDirection: scenarioDeltaDirection(
              selectedMetrics.assetValue - baselineMetrics.assetValue
            ),
          }
        : {}),
    },
    {
      label: "Cap Rate",
      value: `${selectedMetrics.capRate.toFixed(2)}%`,
      valueSuffix: "terminal",
      ...(showScenarioPair
        ? {
            baseFormatted: `${baselineMetrics.capRate.toFixed(2)}%`,
            scenarioFormatted: `${selectedMetrics.capRate.toFixed(2)}%`,
            showScenario: true,
            deltaLine: formatCapRatePts(
              selectedMetrics.capRate - baselineMetrics.capRate
            ),
            deltaDirection: scenarioDeltaDirection(
              selectedMetrics.capRate - baselineMetrics.capRate
            ),
          }
        : {}),
    },
  ]
}

function portfolioForecastScaled(
  portfolioOverview: NonNullable<ScopedForecastRollup["portfolioOverview"]>,
  useReferenceModel: boolean,
  condition: ValuationConditionId
): ForecastSummaryMetricValues {
  const statementRows = useReferenceModel
    ? portfolioOverview.referenceExpectedModel.statementRows
    : portfolioOverview.expectedModel.statementRows
  const base = getForecastSummaryMetricValues(statementRows, true)
  const outlookModels = useReferenceModel
    ? portfolioOverview.referenceOutlookModels
    : portfolioOverview.outlookModels
  return scaleDisplayedMetricsForValuationCondition({
    displayedMetrics: base,
    marketAnnualMetrics: probabilityWeightedValuationMetricsForOutlooks(
      outlookModels,
      "market"
    ),
    selectedAnnualMetrics: probabilityWeightedValuationMetricsForOutlooks(
      outlookModels,
      condition
    ),
  })
}

function assetForecastScaled(
  statementRows: ForecastStatementRow[],
  assetModels: readonly ScopedForecastResolvedAssetModel[],
  condition: ValuationConditionId
): ForecastSummaryMetricValues {
  return scaleDisplayedMetricsForValuationCondition({
    displayedMetrics: getForecastSummaryMetricValues(statementRows, true),
    marketAnnualMetrics: valuationMetricsForResolvedAssetModels(
      assetModels,
      "market"
    ),
    selectedAnnualMetrics: valuationMetricsForResolvedAssetModels(
      assetModels,
      condition
    ),
  })
}

/** Multi-condition KPI strip for scoped forecasts (replaces valuation toggle + summary strip). */
export function buildScopedForecastValuationKpiStripRows({
  isPortfolioScope,
  scopeKind,
  portfolioOverview,
  portfolioModificationMode,
  portfolioScenarioProbabilities,
  activeModelStatementRows,
  baselineModelStatementRows,
  activeVariant,
  assetSelections,
  activeAssetModels,
  baselineAssetModels,
}: {
  isPortfolioScope: boolean
  scopeKind: "portfolio" | "scenario"
  portfolioOverview: ScopedForecastRollup["portfolioOverview"]
  portfolioModificationMode: ScopedForecastPortfolioModificationMode
  portfolioScenarioProbabilities: ScopedForecastPortfolioScenarioProbabilities
  activeModelStatementRows: ForecastStatementRow[]
  baselineModelStatementRows: ForecastStatementRow[]
  activeVariant: "baseline" | "selected"
  assetSelections: readonly ScopedForecastAssetSelection[]
  activeAssetModels: readonly ScopedForecastResolvedAssetModel[]
  baselineAssetModels: readonly ScopedForecastResolvedAssetModel[]
}): ValuationKpiStripRowModel[] {
  if (isPortfolioScope && portfolioOverview != null) {
    const showPortfolioPair =
      portfolioModificationMode !== "baseline" ||
      !portfolioProbabilitiesMatchDefault(portfolioScenarioProbabilities)

    const conditionValuesFor = (
      pick: (m: ForecastSummaryMetricValues) => number,
      format: (n: number) => string
    ) =>
      Object.fromEntries(
        VALUATION_CONDITION_OPTIONS.map((o) => [
          o.id,
          format(pick(portfolioForecastScaled(portfolioOverview, false, o.id))),
        ])
      ) as Record<ValuationConditionId, string>

    const marketCur = portfolioForecastScaled(portfolioOverview, false, "market")
    const marketRef = portfolioForecastScaled(portfolioOverview, true, "market")

    const grossRow: ValuationKpiStripRowModel = {
      label: "Gross Revenue",
      primaryText: formatUsdPortfolioCompact(marketCur.grossRevenue),
      primarySuffix: "2-yr total",
      conditionValues: conditionValuesFor(
        (m) => m.grossRevenue,
        formatUsdPortfolioCompact
      ),
      marketCompare: showPortfolioPair
        ? {
            showScenario: true,
            baseFormatted: formatUsdPortfolioCompact(marketRef.grossRevenue),
            modifiedFormatted: formatUsdPortfolioCompact(marketCur.grossRevenue),
            deltaLine: formatUsdDeltaCompact(
              marketCur.grossRevenue - marketRef.grossRevenue
            ),
            pctLine: formatPctChange(
              marketRef.grossRevenue,
              marketCur.grossRevenue
            ),
            deltaDirection: scenarioDeltaDirection(
              marketCur.grossRevenue - marketRef.grossRevenue
            ),
          }
        : undefined,
    }

    const opexRow: ValuationKpiStripRowModel = {
      label: "OpEx",
      primaryText: formatUsdPortfolioCompact(marketCur.opex),
      primarySuffix: "2-yr total",
      conditionValues: conditionValuesFor((m) => m.opex, formatUsdPortfolioCompact),
      marketCompare: showPortfolioPair
        ? {
            showScenario: true,
            baseFormatted: formatUsdPortfolioCompact(marketRef.opex),
            modifiedFormatted: formatUsdPortfolioCompact(marketCur.opex),
            deltaLine: formatUsdDeltaCompact(marketCur.opex - marketRef.opex),
            pctLine: formatPctChange(marketRef.opex, marketCur.opex),
            deltaDirection: scenarioDeltaDirection(marketCur.opex - marketRef.opex),
          }
        : undefined,
    }

    const noiRow: ValuationKpiStripRowModel = {
      label: "NOI",
      primaryText: formatUsdPortfolioCompact(marketCur.noi),
      primarySuffix: "2-yr total",
      conditionValues: conditionValuesFor((m) => m.noi, formatUsdPortfolioCompact),
      marketCompare: showPortfolioPair
        ? {
            showScenario: true,
            baseFormatted: formatUsdPortfolioCompact(marketRef.noi),
            modifiedFormatted: formatUsdPortfolioCompact(marketCur.noi),
            deltaLine: formatUsdDeltaCompact(marketCur.noi - marketRef.noi),
            pctLine: formatPctChange(marketRef.noi, marketCur.noi),
            deltaDirection: scenarioDeltaDirection(marketCur.noi - marketRef.noi),
          }
        : undefined,
    }

    const valueRow: ValuationKpiStripRowModel = {
      label: "Asset Value",
      primaryText: formatUsdPortfolioCompact(marketCur.assetValue),
      primarySuffix: "terminal",
      conditionValues: conditionValuesFor(
        (m) => m.assetValue,
        formatUsdPortfolioCompact
      ),
      marketCompare: showPortfolioPair
        ? {
            showScenario: true,
            baseFormatted: formatUsdPortfolioCompact(marketRef.assetValue),
            modifiedFormatted: formatUsdPortfolioCompact(marketCur.assetValue),
            deltaLine: formatUsdDeltaCompact(
              marketCur.assetValue - marketRef.assetValue
            ),
            pctLine: formatPctChange(
              marketRef.assetValue,
              marketCur.assetValue
            ),
            deltaDirection: scenarioDeltaDirection(
              marketCur.assetValue - marketRef.assetValue
            ),
          }
        : undefined,
    }

    const capRow: ValuationKpiStripRowModel = {
      label: "Cap Rate",
      primaryText: `${marketCur.capRate.toFixed(2)}%`,
      primarySuffix: "terminal",
      conditionValues: Object.fromEntries(
        VALUATION_CONDITION_OPTIONS.map((o) => {
          const m = portfolioForecastScaled(portfolioOverview, false, o.id)
          return [o.id, `${m.capRate.toFixed(2)}%`] as const
        })
      ) as Record<ValuationConditionId, string>,
      marketCompare: showPortfolioPair
        ? {
            showScenario: true,
            baseFormatted: `${marketRef.capRate.toFixed(2)}%`,
            modifiedFormatted: `${marketCur.capRate.toFixed(2)}%`,
            deltaLine: formatCapRatePts(marketCur.capRate - marketRef.capRate),
            deltaDirection: scenarioDeltaDirection(
              marketCur.capRate - marketRef.capRate
            ),
          }
        : undefined,
    }

    return [grossRow, opexRow, noiRow, valueRow, capRow]
  }

  const hasAnySelectedModifications =
    scopeKind === "scenario" &&
    assetSelections.some(
      (s) => s.selectedBuildingVersionId !== SCOPED_FORECAST_BASELINE_BUILDING_VERSION_ID
    )
  const hasAnySelectedOutlookChanges =
    scopeKind === "scenario" &&
    assetSelections.some(
      (s) => s.selectedOutlookSetId !== SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID
    )

  const showScenarioPair =
    scopeKind === "scenario" &&
    activeVariant === "selected" &&
    (hasAnySelectedModifications || hasAnySelectedOutlookChanges)

  const selectedMarket = assetForecastScaled(
    activeModelStatementRows,
    activeAssetModels,
    "market"
  )
  const baselineMarket = assetForecastScaled(
    baselineModelStatementRows,
    baselineAssetModels,
    "market"
  )

  const cv = (
    condition: ValuationConditionId,
    pick: (m: ForecastSummaryMetricValues) => number,
    fmt: (n: number) => string
  ) =>
    fmt(
      pick(
        assetForecastScaled(activeModelStatementRows, activeAssetModels, condition)
      )
    )

  const grossRow: ValuationKpiStripRowModel = {
    label: "Gross Revenue",
    primaryText: formatUsdPortfolioCompact(selectedMarket.grossRevenue),
    primarySuffix: "2-yr total",
    conditionValues: Object.fromEntries(
      VALUATION_CONDITION_OPTIONS.map((o) => [
        o.id,
        cv(o.id, (m) => m.grossRevenue, formatUsdPortfolioCompact),
      ])
    ) as Record<ValuationConditionId, string>,
    marketCompare: showScenarioPair
      ? {
          showScenario: true,
          baseFormatted: formatUsdPortfolioCompact(baselineMarket.grossRevenue),
          modifiedFormatted: formatUsdPortfolioCompact(selectedMarket.grossRevenue),
          deltaLine: formatUsdDeltaCompact(
            selectedMarket.grossRevenue - baselineMarket.grossRevenue
          ),
          pctLine: formatPctChange(
            baselineMarket.grossRevenue,
            selectedMarket.grossRevenue
          ),
          deltaDirection: scenarioDeltaDirection(
            selectedMarket.grossRevenue - baselineMarket.grossRevenue
          ),
        }
      : undefined,
  }

  const opexRow: ValuationKpiStripRowModel = {
    label: "OpEx",
    primaryText: formatUsdPortfolioCompact(selectedMarket.opex),
    primarySuffix: "2-yr total",
    conditionValues: Object.fromEntries(
      VALUATION_CONDITION_OPTIONS.map((o) => [
        o.id,
        cv(o.id, (m) => m.opex, formatUsdPortfolioCompact),
      ])
    ) as Record<ValuationConditionId, string>,
    marketCompare: showScenarioPair
      ? {
          showScenario: true,
          baseFormatted: formatUsdPortfolioCompact(baselineMarket.opex),
          modifiedFormatted: formatUsdPortfolioCompact(selectedMarket.opex),
          deltaLine: formatUsdDeltaCompact(selectedMarket.opex - baselineMarket.opex),
          pctLine: formatPctChange(baselineMarket.opex, selectedMarket.opex),
          deltaDirection: scenarioDeltaDirection(
            selectedMarket.opex - baselineMarket.opex
          ),
        }
      : undefined,
  }

  const noiRow: ValuationKpiStripRowModel = {
    label: "NOI",
    primaryText: formatUsdPortfolioCompact(selectedMarket.noi),
    primarySuffix: "2-yr total",
    conditionValues: Object.fromEntries(
      VALUATION_CONDITION_OPTIONS.map((o) => [
        o.id,
        cv(o.id, (m) => m.noi, formatUsdPortfolioCompact),
      ])
    ) as Record<ValuationConditionId, string>,
    marketCompare: showScenarioPair
      ? {
          showScenario: true,
          baseFormatted: formatUsdPortfolioCompact(baselineMarket.noi),
          modifiedFormatted: formatUsdPortfolioCompact(selectedMarket.noi),
          deltaLine: formatUsdDeltaCompact(selectedMarket.noi - baselineMarket.noi),
          pctLine: formatPctChange(baselineMarket.noi, selectedMarket.noi),
          deltaDirection: scenarioDeltaDirection(
            selectedMarket.noi - baselineMarket.noi
          ),
        }
      : undefined,
  }

  const valueRow: ValuationKpiStripRowModel = {
    label: "Asset Value",
    primaryText: formatUsdPortfolioCompact(selectedMarket.assetValue),
    primarySuffix: "terminal",
    conditionValues: Object.fromEntries(
      VALUATION_CONDITION_OPTIONS.map((o) => [
        o.id,
        cv(o.id, (m) => m.assetValue, formatUsdPortfolioCompact),
      ])
    ) as Record<ValuationConditionId, string>,
    marketCompare: showScenarioPair
      ? {
          showScenario: true,
          baseFormatted: formatUsdPortfolioCompact(baselineMarket.assetValue),
          modifiedFormatted: formatUsdPortfolioCompact(selectedMarket.assetValue),
          deltaLine: formatUsdDeltaCompact(
            selectedMarket.assetValue - baselineMarket.assetValue
          ),
          pctLine: formatPctChange(
            baselineMarket.assetValue,
            selectedMarket.assetValue
          ),
          deltaDirection: scenarioDeltaDirection(
            selectedMarket.assetValue - baselineMarket.assetValue
          ),
        }
      : undefined,
  }

  const capRow: ValuationKpiStripRowModel = {
    label: "Cap Rate",
    primaryText: `${selectedMarket.capRate.toFixed(2)}%`,
    primarySuffix: "terminal",
    conditionValues: Object.fromEntries(
      VALUATION_CONDITION_OPTIONS.map((o) => {
        const m = assetForecastScaled(
          activeModelStatementRows,
          activeAssetModels,
          o.id
        )
        return [o.id, `${m.capRate.toFixed(2)}%`] as const
      })
    ) as Record<ValuationConditionId, string>,
    marketCompare: showScenarioPair
      ? {
          showScenario: true,
          baseFormatted: `${baselineMarket.capRate.toFixed(2)}%`,
          modifiedFormatted: `${selectedMarket.capRate.toFixed(2)}%`,
          deltaLine: formatCapRatePts(
            selectedMarket.capRate - baselineMarket.capRate
          ),
          deltaDirection: scenarioDeltaDirection(
            selectedMarket.capRate - baselineMarket.capRate
          ),
        }
      : undefined,
  }

  return [grossRow, opexRow, noiRow, valueRow, capRow]
}
