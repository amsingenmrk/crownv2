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
import type { ScopedForecastRollup } from "@/lib/scoped-forecast-rollup"
import {
  formatCapRatePts,
  formatPctChange,
  formatUsdDeltaCompact,
  formatUsdPortfolioCompact,
} from "@/lib/scenario-kpi-format"

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

function scenarioDeltaDirection(d: number): "up" | "down" | "neutral" {
  if (d > 1e-6) return "up"
  if (d < -1e-6) return "down"
  return "neutral"
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
}): ForecastSummaryKpi[] {
  if (isPortfolioScope && portfolioOverview != null) {
    const currentMetrics = getForecastSummaryMetricValues(
      portfolioOverview.expectedModel.statementRows,
      true
    )
    const referenceMetrics = getForecastSummaryMetricValues(
      portfolioOverview.referenceExpectedModel.statementRows,
      true
    )
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

  const selectedMetrics = getForecastSummaryMetricValues(activeModelStatementRows, true)
  const baselineMetrics = getForecastSummaryMetricValues(baselineModelStatementRows, true)

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
