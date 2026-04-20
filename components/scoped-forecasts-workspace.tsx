"use client"

import * as React from "react"

import { AssetForecastCharts } from "@/components/asset-forecast-charts"
import { AssetForecastSummaryStrip } from "@/components/asset-forecast-summary-strip"
import { ScopedForecastSelectorPanel } from "@/components/scoped-forecast-selector-panel"
import { ScopedForecastsTable } from "@/components/scoped-forecasts-table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useScopedForecastState } from "@/hooks/use-scoped-forecast-state"
import { resolveAssetGroupLabel } from "@/lib/assets"
import type { ForecastAssumptions, ForecastStatementRow } from "@/lib/forecast-data"
import { humanizeScenarioSlug } from "@/lib/scenario-slug"
import type { ScopedForecastScope } from "@/lib/scoped-forecast"
import { buildScopedForecastRollup } from "@/lib/scoped-forecast-rollup"
import { formatUsdPortfolioCompact } from "@/lib/scenario-kpi-format"
import { BUILTIN_SCENARIO } from "@/lib/user-scenarios"

function averageSeries(values: number[]) {
  if (values.length === 0) return 0
  const total = values.reduce((sum, value) => sum + value, 0)
  return total / values.length
}

function getStatementRowAverage(rows: ForecastStatementRow[], rowId: string) {
  return averageSeries(rows.find((row) => row.id === rowId)?.values ?? [])
}

export function ScopedForecastsWorkspace({
  scope,
}: {
  scope: ScopedForecastScope
}) {
  const {
    assetSelections,
    assumptions,
    setAssumptions,
    resetSelections,
    setSelectedBuildingVersionId,
    setSelectedOutlookSetId,
  } = useScopedForecastState(scope)

  const scopeLabel = React.useMemo(() => {
    if (scope.kind === "scenario") {
      return scope.scenarioSlug === BUILTIN_SCENARIO.slug
        ? BUILTIN_SCENARIO.name
        : humanizeScenarioSlug(scope.scenarioSlug)
    }
    if (scope.portfolioScopeId != null) {
      return resolveAssetGroupLabel(scope.portfolioScopeId)
    }
    return "Portfolio Overview"
  }, [scope])

  const rollup = React.useMemo(
    () =>
      buildScopedForecastRollup({
        scopeLabel,
        assetSelections,
        assumptions,
      }),
    [assetSelections, assumptions, scopeLabel]
  )

  const [activeComparisonId, setActiveComparisonId] = React.useState(
    rollup.selectedModel.scenario.id
  )

  React.useEffect(() => {
    const validIds = new Set(rollup.comparisonModels.map((model) => model.scenario.id))
    if (!validIds.has(activeComparisonId)) {
      setActiveComparisonId(rollup.selectedModel.scenario.id)
    }
  }, [activeComparisonId, rollup.comparisonModels, rollup.selectedModel.scenario.id])

  const activeModel =
    rollup.comparisonModels.find(
      (model) => model.scenario.id === activeComparisonId
    ) ?? rollup.selectedModel
  const activeVariant =
    activeModel.scenario.id === rollup.baselineModel.scenario.id
      ? "baseline"
      : "selected"
  const activeAssetModels =
    activeVariant === "baseline"
      ? rollup.baselineAssetModels
      : rollup.selectedAssetModels

  const updateAssumptions = React.useCallback(
    (updates: Partial<ForecastAssumptions>) => {
      setAssumptions((current) => ({
        ...current,
        ...updates,
        markToMarketEnabled: true,
      }))
    },
    [setAssumptions]
  )

  const forecastSummaryItems = React.useMemo(() => {
    const averageGrossRevenue =
      getStatementRowAverage(activeModel.statementRows, "grossRevenue") * 4
    const averageOpex =
      getStatementRowAverage(activeModel.statementRows, "opex") * 4
    const averageNoi = getStatementRowAverage(activeModel.statementRows, "noi") * 4
    const averageAssetValue = getStatementRowAverage(
      activeModel.statementRows,
      "salePrice"
    )

    return [
      {
        label: "Gross Revenue",
        value: formatUsdPortfolioCompact(averageGrossRevenue),
        valueSuffix: "/ yr",
      },
      {
        label: "OpEx",
        value: formatUsdPortfolioCompact(Math.abs(averageOpex)),
        valueSuffix: "/ yr",
      },
      {
        label: "NOI",
        value: formatUsdPortfolioCompact(averageNoi),
        valueSuffix: "/ yr",
      },
      {
        label: "Asset Value",
        value: formatUsdPortfolioCompact(averageAssetValue),
      },
    ]
  }, [activeModel.statementRows])

  return (
    <div className="flex min-h-0 w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <ScopedForecastSelectorPanel
        assetSelections={assetSelections}
        assumptions={assumptions}
        onAssumptionsChange={updateAssumptions}
        onSelectBuildingVersion={setSelectedBuildingVersionId}
        onSelectOutlookSet={setSelectedOutlookSetId}
        onReset={resetSelections}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <AssetForecastCharts models={rollup.comparisonModels} />

        <section
          className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          aria-label={`${scopeLabel} forecast statement`}
        >
          <div className="space-y-4 border-b border-border/60 px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground">
                  Forecast Statement
                </h2>
                <p className="text-xs text-muted-foreground">
                  {scopeLabel} aggregated across {assetSelections.length} building
                  {assetSelections.length === 1 ? "" : "s"}.
                </p>
              </div>
              <ToggleGroup
                value={[activeComparisonId]}
                onValueChange={(values) => {
                  const next = values[0]
                  if (typeof next === "string" && next !== "") {
                    setActiveComparisonId(next)
                  }
                }}
                aria-label="Switch between baseline and selected forecast"
                className="w-fit"
              >
                {rollup.comparisonModels.map((model) => (
                  <ToggleGroupItem key={model.scenario.id} value={model.scenario.id}>
                    {model.scenario.name}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <AssetForecastSummaryStrip items={forecastSummaryItems} />
          </div>

          <ScopedForecastsTable
            key={activeComparisonId}
            periods={activeModel.periods}
            rows={activeModel.statementRows}
            assetModels={activeAssetModels}
            variant={activeVariant}
            topAccessory={
              <div className="text-xs text-muted-foreground">
                Viewing <span className="font-medium text-foreground">{activeModel.scenario.name}</span>{" "}
                contributions across {activeAssetModels.length} building
                {activeAssetModels.length === 1 ? "" : "s"}.
              </div>
            }
          />
        </section>
      </div>
    </div>
  )
}
