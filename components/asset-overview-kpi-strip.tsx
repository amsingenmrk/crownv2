"use client"

import * as React from "react"

import {
  MetricStripCell,
  MetricStripLabel,
  metricStripSectionClassName,
} from "@/components/metric-strip"
import { ScenarioMetricInlinePair } from "@/components/portfolio/scenario-comparative-kpis"
import { ValuationConditionToggle } from "@/components/valuation-condition-toggle"
import { INITIAL_MOD_VALUES, type ModValues } from "@/lib/building-modifications"
import {
  buildDefaultForecastScenarios,
  defaultForecastAssumptionsForAsset,
} from "@/lib/forecast-data"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import {
  formatCapRatePts,
  formatPctChange,
  formatUsdDeltaCompact,
  formatUsdPortfolioCompact,
} from "@/lib/scenario-kpi-format"
import { getSampleStackingPlanData } from "@/lib/stacking-plan-data"
import {
  buildValuationConditionMetricMap,
  type ValuationConditionMetrics,
} from "@/lib/valuation-condition-metrics"
import {
  DEFAULT_VALUATION_CONDITION_ID,
  type ValuationConditionId,
} from "@/lib/valuation-condition-config"
import { cn } from "@/lib/utils"

const EMPTY_METRICS: ValuationConditionMetrics = {
  grossRevenue: 0,
  opex: 0,
  noi: 0,
  assetValue: 0,
  capRate: 0,
}

function scenarioDeltaDirection(d: number): "up" | "down" | "neutral" {
  if (d > 1e-6) return "up"
  if (d < -1e-6) return "down"
  return "neutral"
}

export function AssetOverviewKpiStrip({
  assetId,
  compareModValues,
}: {
  assetId: string
  compareModValues?: ModValues
}) {
  const [selectedValuationCondition, setSelectedValuationCondition] =
    React.useState<ValuationConditionId>(DEFAULT_VALUATION_CONDITION_ID)

  const hasComparison = React.useMemo(
    () =>
      compareModValues != null &&
      Object.values(compareModValues).some((value) => value.trim() !== ""),
    [compareModValues]
  )

  const metrics = React.useMemo(() => {
    const baselineScenario = buildDefaultForecastScenarios()[0]
    if (baselineScenario == null) {
      return { baseline: EMPTY_METRICS, modified: EMPTY_METRICS }
    }

    const assumptions = defaultForecastAssumptionsForAsset(assetId)
    const financials = financialMetricsForAssetId(assetId)
    const baseCapRatePct = financials?.capRatePct ?? assumptions.exitCapRatePct
    const dataset = getSampleStackingPlanData(assetId)

    const baselineMetricMap = buildValuationConditionMetricMap({
      assetId,
      dataset,
      assumptions,
      scenario: baselineScenario,
      baseCapRatePct,
      modValues: INITIAL_MOD_VALUES,
    })
    const modifiedMetricMap = buildValuationConditionMetricMap({
      assetId,
      dataset,
      assumptions,
      scenario: baselineScenario,
      baseCapRatePct,
      modValues: compareModValues ?? INITIAL_MOD_VALUES,
    })

    return {
      baseline: baselineMetricMap[selectedValuationCondition],
      modified: modifiedMetricMap[selectedValuationCondition],
    }
  }, [assetId, compareModValues, selectedValuationCondition])

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ValuationConditionToggle
        value={selectedValuationCondition}
        onValueChange={setSelectedValuationCondition}
        className="max-w-full"
      />
      <section
        className={cn(
          metricStripSectionClassName,
          "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
          "h-fit shrink-0"
        )}
        aria-label="Asset overview KPI strip"
      >
        <MetricStripCell>
          <MetricStripLabel>Gross Revenue</MetricStripLabel>
          <ScenarioMetricInlinePair
            baseFormatted={formatUsdPortfolioCompact(metrics.baseline.grossRevenue)}
            scenarioFormatted={formatUsdPortfolioCompact(metrics.modified.grossRevenue)}
            showScenario={hasComparison}
            deltaLine={
              hasComparison
                ? formatUsdDeltaCompact(
                    metrics.modified.grossRevenue - metrics.baseline.grossRevenue
                  )
                : undefined
            }
            pctLine={
              hasComparison
                ? formatPctChange(
                    metrics.baseline.grossRevenue,
                    metrics.modified.grossRevenue
                  )
                : undefined
            }
            deltaDirection={
              hasComparison
                ? scenarioDeltaDirection(
                    metrics.modified.grossRevenue - metrics.baseline.grossRevenue
                  )
                : undefined
            }
          />
        </MetricStripCell>
        <MetricStripCell>
          <MetricStripLabel>OpEx</MetricStripLabel>
          <ScenarioMetricInlinePair
            baseFormatted={formatUsdPortfolioCompact(metrics.baseline.opex)}
            scenarioFormatted={formatUsdPortfolioCompact(metrics.modified.opex)}
            showScenario={hasComparison}
            deltaLine={
              hasComparison
                ? formatUsdDeltaCompact(metrics.modified.opex - metrics.baseline.opex)
                : undefined
            }
            pctLine={
              hasComparison
                ? formatPctChange(metrics.baseline.opex, metrics.modified.opex)
                : undefined
            }
            deltaDirection={
              hasComparison
                ? scenarioDeltaDirection(metrics.modified.opex - metrics.baseline.opex)
                : undefined
            }
          />
        </MetricStripCell>
        <MetricStripCell>
          <MetricStripLabel>NOI</MetricStripLabel>
          <ScenarioMetricInlinePair
            baseFormatted={formatUsdPortfolioCompact(metrics.baseline.noi)}
            scenarioFormatted={formatUsdPortfolioCompact(metrics.modified.noi)}
            showScenario={hasComparison}
            deltaLine={
              hasComparison
                ? formatUsdDeltaCompact(metrics.modified.noi - metrics.baseline.noi)
                : undefined
            }
            pctLine={
              hasComparison
                ? formatPctChange(metrics.baseline.noi, metrics.modified.noi)
                : undefined
            }
            deltaDirection={
              hasComparison
                ? scenarioDeltaDirection(metrics.modified.noi - metrics.baseline.noi)
                : undefined
            }
          />
        </MetricStripCell>
        <MetricStripCell>
          <MetricStripLabel>Asset Value</MetricStripLabel>
          <ScenarioMetricInlinePair
            baseFormatted={formatUsdPortfolioCompact(metrics.baseline.assetValue)}
            scenarioFormatted={formatUsdPortfolioCompact(metrics.modified.assetValue)}
            showScenario={hasComparison}
            deltaLine={
              hasComparison
                ? formatUsdDeltaCompact(
                    metrics.modified.assetValue - metrics.baseline.assetValue
                  )
                : undefined
            }
            pctLine={
              hasComparison
                ? formatPctChange(
                    metrics.baseline.assetValue,
                    metrics.modified.assetValue
                  )
                : undefined
            }
            deltaDirection={
              hasComparison
                ? scenarioDeltaDirection(
                    metrics.modified.assetValue - metrics.baseline.assetValue
                  )
                : undefined
            }
          />
        </MetricStripCell>
        <MetricStripCell>
          <MetricStripLabel>Cap Rate</MetricStripLabel>
          <ScenarioMetricInlinePair
            baseFormatted={`${metrics.baseline.capRate.toFixed(2)}%`}
            scenarioFormatted={`${metrics.modified.capRate.toFixed(2)}%`}
            showScenario={hasComparison}
            deltaLine={
              hasComparison
                ? formatCapRatePts(metrics.modified.capRate - metrics.baseline.capRate)
                : undefined
            }
            pctLine={
              hasComparison
                ? formatPctChange(metrics.baseline.capRate, metrics.modified.capRate)
                : undefined
            }
            deltaDirection={
              hasComparison
                ? scenarioDeltaDirection(
                    metrics.modified.capRate - metrics.baseline.capRate
                  )
                : undefined
            }
          />
        </MetricStripCell>
      </section>
    </div>
  )
}
