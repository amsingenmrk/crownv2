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
  scenarioDeltaTone,
} from "@/lib/scenario-kpi-format"
import {
  VALUATION_CONDITION_OPTIONS,
  type ValuationConditionId,
} from "@/lib/valuation-condition-config"
import { shouldShowValuationConditionDelta } from "@/lib/valuation-condition-delta-visibility"
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

type ForecastValuationStripField = keyof ForecastSummaryMetricValues

const FORECAST_VALUATION_ROW_META: readonly {
  label: string
  field: ForecastValuationStripField
  rowSuffix: string
}[] = [
  { label: "Gross Revenue", field: "grossRevenue", rowSuffix: "2-yr total" },
  { label: "OpEx", field: "opex", rowSuffix: "2-yr total" },
  { label: "NOI", field: "noi", rowSuffix: "2-yr total" },
  { label: "Asset Value", field: "assetValue", rowSuffix: "terminal" },
  { label: "Cap Rate", field: "capRate", rowSuffix: "terminal" },
] as const

function formatForecastValuationField(
  field: ForecastValuationStripField,
  value: number
) {
  if (field === "capRate") {
    return `${value.toFixed(2)}%`
  }
  return formatUsdPortfolioCompact(value)
}

function compareForecastValuationField(
  field: ForecastValuationStripField,
  baseline: number,
  current: number
) {
  const delta = current - baseline
  if (field === "capRate") {
    return {
      deltaLine: formatCapRatePts(delta),
      deltaDirection: scenarioDeltaDirection(delta),
      deltaTone: scenarioDeltaTone(delta),
    }
  }
  return {
    deltaLine: formatUsdDeltaCompact(delta),
    pctLine: formatPctChange(baseline, current),
    deltaDirection: scenarioDeltaDirection(delta),
    deltaTone: scenarioDeltaTone(delta, field === "opex" ? "inverse" : "normal"),
  }
}

function buildForecastValuationStripRowsFromConditionMaps(
  currentByCondition: Record<ValuationConditionId, ForecastSummaryMetricValues>,
  baselineByCondition?: Record<ValuationConditionId, ForecastSummaryMetricValues>
): ValuationKpiStripRowModel[] {
  return FORECAST_VALUATION_ROW_META.map(({ label, field, rowSuffix }) => ({
    label,
    rowSuffix,
    conditionValues: Object.fromEntries(
      VALUATION_CONDITION_OPTIONS.map((option) => {
        const currentValue = currentByCondition[option.id][field]
        const baselineValue = baselineByCondition?.[option.id]?.[field]
        return [
          option.id,
          {
            value: formatForecastValuationField(field, currentValue),
            compare:
              baselineValue != null &&
              shouldShowValuationConditionDelta(option.id, field)
                ? compareForecastValuationField(field, baselineValue, currentValue)
                : undefined,
          },
        ] as const
      })
    ) as ValuationKpiStripRowModel["conditionValues"],
  }))
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
      baseAnnualMetrics: probabilityWeightedValuationMetricsForOutlooks(
        portfolioOverview.outlookModels,
        "inPlace"
      ),
      selectedAnnualMetrics: probabilityWeightedValuationMetricsForOutlooks(
        portfolioOverview.outlookModels,
        selectedValuationCondition
      ),
    })
    const referenceMetrics = scaleDisplayedMetricsForValuationCondition({
      displayedMetrics: referenceBaseMetrics,
      baseAnnualMetrics: probabilityWeightedValuationMetricsForOutlooks(
        portfolioOverview.referenceOutlookModels,
        "inPlace"
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
    baseAnnualMetrics: valuationMetricsForResolvedAssetModels(
      activeAssetModels,
      "inPlace"
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
    baseAnnualMetrics: valuationMetricsForResolvedAssetModels(
      baselineAssetModels,
      "inPlace"
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
    baseAnnualMetrics: probabilityWeightedValuationMetricsForOutlooks(
      outlookModels,
      "inPlace"
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
    baseAnnualMetrics: valuationMetricsForResolvedAssetModels(
      assetModels,
      "inPlace"
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
    const currentByCondition = Object.fromEntries(
      VALUATION_CONDITION_OPTIONS.map((option) => [
        option.id,
        portfolioForecastScaled(portfolioOverview, false, option.id),
      ])
    ) as Record<ValuationConditionId, ForecastSummaryMetricValues>
    const baselineByCondition = showPortfolioPair
      ? (Object.fromEntries(
          VALUATION_CONDITION_OPTIONS.map((option) => [
            option.id,
            portfolioForecastScaled(portfolioOverview, true, option.id),
          ])
        ) as Record<ValuationConditionId, ForecastSummaryMetricValues>)
      : undefined

    return buildForecastValuationStripRowsFromConditionMaps(
      currentByCondition,
      baselineByCondition
    )
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

  const currentByCondition = Object.fromEntries(
    VALUATION_CONDITION_OPTIONS.map((option) => [
      option.id,
      assetForecastScaled(activeModelStatementRows, activeAssetModels, option.id),
    ])
  ) as Record<ValuationConditionId, ForecastSummaryMetricValues>
  const baselineByCondition = showScenarioPair
    ? (Object.fromEntries(
        VALUATION_CONDITION_OPTIONS.map((option) => [
          option.id,
          assetForecastScaled(
            baselineModelStatementRows,
            baselineAssetModels,
            option.id
          ),
        ])
      ) as Record<ValuationConditionId, ForecastSummaryMetricValues>)
    : undefined

  return buildForecastValuationStripRowsFromConditionMaps(
    currentByCondition,
    baselineByCondition
  )
}
