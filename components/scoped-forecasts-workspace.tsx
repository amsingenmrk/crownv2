"use client"

import * as React from "react"
import { Info } from "lucide-react"

import {
  AssetForecastChartMetricToggleGroup,
  AssetForecastChartMetricToolbar,
  AssetForecastCharts,
} from "@/components/asset-forecast-charts"
import {
  AssetForecastSummaryStrip,
  type ForecastSummaryKpi,
} from "@/components/asset-forecast-summary-strip"
import {
  SCOPED_FORECAST_LEASING_ASSUMPTION_FIELDS,
  type ScopedForecastLeasingAssumptionFieldKey,
  ScopedForecastLeasingAssumptionsBar,
} from "@/components/scoped-forecast-leasing-assumptions"
import { ScopedForecastSelectorPanel } from "@/components/scoped-forecast-selector-panel"
import {
  type ForecastStatementPeriodGranularity,
  ScopedForecastsPortfolioTotalsTable,
  ScopedForecastsTable,
  StatementPeriodGranularitySelect,
} from "@/components/scoped-forecasts-table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useScopedForecastState } from "@/hooks/use-scoped-forecast-state"
import { resolveAssetGroupLabel } from "@/lib/assets"
import type { ForecastChartTab } from "@/lib/forecast-chart-config"
import type { ForecastAssumptions, ForecastStatementRow } from "@/lib/forecast-data"
import {
  SCOPED_FORECAST_PORTFOLIO_SCENARIO_IDS,
  type ScopedForecastPortfolioModificationMode,
  type ScopedForecastPortfolioScenarioId,
} from "@/lib/scoped-forecast"
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

const PORTFOLIO_MODIFICATION_MODE_LABELS: Record<
  ScopedForecastPortfolioModificationMode,
  string
> = {
  baseline: "Baseline",
  recommended: "Recommended",
}

const PORTFOLIO_SCENARIO_LABELS: Record<ScopedForecastPortfolioScenarioId, string> =
  {
    baseline: "Baseline",
    optimistic: "Optimistic",
    pessimistic: "Pessimistic",
  }

function SectionTitleTooltip({
  title,
  description,
  level,
  className,
}: {
  title: string
  description: string
  level: "h2" | "h3"
  className: string
}) {
  const HeadingTag = level

  return (
    <HeadingTag className={className}>
      <span className="inline-flex items-center gap-1.5">
        <span>{title}</span>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label={`About ${title}`}
              />
            }
          >
            <Info className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[280px] text-pretty">
            {description}
          </TooltipContent>
        </Tooltip>
      </span>
    </HeadingTag>
  )
}

function clampControlCenterValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function ControlCenterValueTile({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  label: string
  value: number
  onChange: (next: number) => void
  min: number
  max: number
  step: number
  suffix: string
}) {
  const inputId = React.useId()

  return (
    <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2.5">
      <label
        htmlFor={inputId}
        className="block text-[11px] font-medium leading-none text-muted-foreground"
      >
        {label}
      </label>
      <div className="mt-2 flex items-end gap-2">
        <Input
          id={inputId}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-right text-base font-semibold tabular-nums shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 md:text-base"
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isNaN(next)) return
            onChange(clampControlCenterValue(next, min, max))
          }}
        />
        <span className="pb-0.5 text-[11px] font-medium text-muted-foreground">
          {suffix}
        </span>
      </div>
    </div>
  )
}

function PortfolioForecastControlCenter({
  modificationMode,
  onModificationModeChange,
  scenarioProbabilities,
  onScenarioProbabilityChange,
  assumptions,
  onAssumptionsChange,
}: {
  modificationMode: ScopedForecastPortfolioModificationMode
  onModificationModeChange: (next: ScopedForecastPortfolioModificationMode) => void
  scenarioProbabilities: Record<ScopedForecastPortfolioScenarioId, number>
  onScenarioProbabilityChange: (
    scenarioId: ScopedForecastPortfolioScenarioId,
    next: number
  ) => void
  assumptions: ForecastAssumptions
  onAssumptionsChange: (updates: Partial<ForecastAssumptions>) => void
}) {
  const probabilityTotal = SCOPED_FORECAST_PORTFOLIO_SCENARIO_IDS.reduce(
    (sum, scenarioId) => sum + scenarioProbabilities[scenarioId],
    0
  )
  const setAssumptionValue = React.useCallback(
    (key: ScopedForecastLeasingAssumptionFieldKey, next: number) => {
      onAssumptionsChange({
        [key]:
          key === "timeToLeaseMonths" ||
          key === "occupancyTargetPct" ||
          key === "defaultRenewalProbabilityPct"
            ? Math.round(next)
            : next,
      } as Pick<ForecastAssumptions, ScopedForecastLeasingAssumptionFieldKey>)
    },
    [onAssumptionsChange]
  )

  return (
    <section
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      aria-label="Portfolio forecast control center"
    >
      <div className="border-b border-border/60 px-4 py-3 lg:px-5">
        <SectionTitleTooltip
          title="Control center"
          description="Configure a portfolio-wide modifications mode, outlook weighting, and leasing assumptions before reviewing totals and projections."
          level="h2"
          className="text-base font-semibold tracking-tight text-foreground"
        />
      </div>

      <div className="lg:grid lg:grid-cols-[0.92fr_1fr_1.12fr]">
        <section className="px-4 py-4 lg:border-r lg:border-border/60 lg:px-5">
          <SectionTitleTooltip
            title="Modification mode"
            description="Toggle between an all-baseline portfolio and per-asset recommended highest-lift strategies."
            level="h3"
            className="text-sm font-semibold text-foreground"
          />
          <ToggleGroup
            value={[modificationMode]}
            onValueChange={(values) => {
              const next = values[0]
              if (next === "baseline" || next === "recommended") {
                onModificationModeChange(next)
              }
            }}
            aria-label="Portfolio forecast modification mode"
            className="mt-3 flex h-10 w-full gap-1 bg-muted/30 p-1"
          >
            <ToggleGroupItem value="baseline" className="h-full min-w-0 flex-1 px-4">
              {PORTFOLIO_MODIFICATION_MODE_LABELS.baseline}
            </ToggleGroupItem>
            <ToggleGroupItem value="recommended" className="h-full min-w-0 flex-1 px-4">
              {PORTFOLIO_MODIFICATION_MODE_LABELS.recommended}
            </ToggleGroupItem>
          </ToggleGroup>
        </section>

        <section className="border-t border-border/60 px-4 py-4 lg:border-t-0 lg:border-r lg:border-border/60 lg:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <SectionTitleTooltip
                title="Scenario probabilities"
                description="Weights normalize to 100% and drive the expected portfolio totals."
                level="h3"
                className="text-sm font-semibold text-foreground"
              />
            </div>
            <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium tabular-nums text-foreground">
              Total {probabilityTotal}%
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {SCOPED_FORECAST_PORTFOLIO_SCENARIO_IDS.map((scenarioId) => (
              <ControlCenterValueTile
                key={scenarioId}
                label={PORTFOLIO_SCENARIO_LABELS[scenarioId]}
                value={scenarioProbabilities[scenarioId]}
                onChange={(next) =>
                  onScenarioProbabilityChange(scenarioId, Math.round(next))
                }
                min={0}
                max={100}
                step={1}
                suffix="%"
              />
            ))}
          </div>
        </section>

        <section className="border-t border-border/60 px-4 py-4 lg:border-t-0 lg:px-5">
          <SectionTitleTooltip
            title="Leasing assumptions"
            description="Adjust leasing timing, occupancy target, and renewal probability used in the portfolio forecast."
            level="h3"
            className="text-sm font-semibold text-foreground"
          />
          <div className="mt-3 grid grid-cols-3 gap-2">
            {SCOPED_FORECAST_LEASING_ASSUMPTION_FIELDS.map((field) => (
              <ControlCenterValueTile
                key={field.key}
                label={field.label}
                value={assumptions[field.key]}
                onChange={(next) => setAssumptionValue(field.key, next)}
                min={field.min}
                max={field.max}
                step={field.step}
                suffix={field.suffix}
              />
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}

/** Stable SSR / first client paint: KPIs depend on localStorage (scenario scope, mod sets). */
const FORECAST_SUMMARY_KPI_PLACEHOLDERS: ForecastSummaryKpi[] = [
  { label: "Gross Revenue", value: "—", valueSuffix: "/ yr" },
  { label: "OpEx", value: "—", valueSuffix: "/ yr" },
  { label: "NOI", value: "—", valueSuffix: "/ yr" },
  { label: "Asset Value", value: "—" },
]

export function ScopedForecastsWorkspace({
  scope,
  layout = "classic",
}: {
  scope: ScopedForecastScope
  /** `alt`: summary and shared metric toggles first; inputs on the classic Forecasts tab. */
  layout?: "classic" | "alt"
}) {
  const {
    assetSelections,
    assumptions,
    setAssumptions,
    portfolioModificationMode,
    setPortfolioModificationMode,
    portfolioScenarioProbabilities,
    setPortfolioScenarioProbability,
    resetSelections,
    setSelectedBuildingVersionId,
    setSelectedOutlookSetId,
  } = useScopedForecastState(scope)
  const isPortfolioOverview =
    scope.kind === "portfolio" && scope.portfolioScopeId == null

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
        portfolioControls: isPortfolioOverview
          ? {
              modificationMode: portfolioModificationMode,
              scenarioProbabilities: portfolioScenarioProbabilities,
            }
          : undefined,
      }),
    [
      assetSelections,
      assumptions,
      isPortfolioOverview,
      portfolioModificationMode,
      portfolioScenarioProbabilities,
      scopeLabel,
    ]
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

  const [forecastSummaryHydrated, setForecastSummaryHydrated] =
    React.useState(false)
  React.useEffect(() => {
    setForecastSummaryHydrated(true)
  }, [])

  const forecastSummaryStripItems = forecastSummaryHydrated
    ? forecastSummaryItems
    : FORECAST_SUMMARY_KPI_PLACEHOLDERS

  const [classicChartMetricTab, setClassicChartMetricTab] =
    React.useState<ForecastChartTab>("grossRevenue")
  const [altMetricTab, setAltMetricTab] = React.useState<ForecastChartTab>("grossRevenue")
  const [altStatementGranularity, setAltStatementGranularity] =
    React.useState<ForecastStatementPeriodGranularity>("total")

  if (layout === "alt") {
    if (isPortfolioOverview && rollup.portfolioOverview != null) {
      return (
        <TooltipProvider delay={120}>
          <div className="flex min-h-0 w-full flex-col gap-6">
            <PortfolioForecastControlCenter
              modificationMode={portfolioModificationMode}
              onModificationModeChange={setPortfolioModificationMode}
              scenarioProbabilities={portfolioScenarioProbabilities}
              onScenarioProbabilityChange={setPortfolioScenarioProbability}
              assumptions={assumptions}
              onAssumptionsChange={updateAssumptions}
            />

            <section
              className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
              aria-label={`${scopeLabel} portfolio totals`}
            >
              <div className="border-b border-border/60 px-4 py-3">
                <div className="min-w-0">
                  <SectionTitleTooltip
                    title="Portfolio totals"
                    description="Weighted expected quarterly totals roll up into Baseline, Optimistic, and Pessimistic outlook breakdowns, then individual assets."
                    level="h2"
                    className="text-base font-semibold tracking-tight text-foreground"
                  />
                </div>
              </div>
              <ScopedForecastsPortfolioTotalsTable
                periods={rollup.portfolioOverview.expectedModel.periods}
                rows={rollup.portfolioOverview.expectedModel.statementRows}
                assetModels={[]}
                outlookModels={rollup.portfolioOverview.outlookModels}
                metricFocus={altMetricTab}
              />
            </section>

            <AssetForecastCharts
              models={rollup.portfolioOverview.chartModels}
              metricTab={altMetricTab}
              onMetricTabChange={setAltMetricTab}
              metricToolbarInCard
            />
          </div>
        </TooltipProvider>
      )
    }

    return (
      <div className="flex min-h-0 w-full flex-col gap-6">
        <AssetForecastSummaryStrip items={forecastSummaryStripItems} />

        <section
          className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          aria-label={`${scopeLabel} asset forecast statement`}
        >
          <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight text-foreground">Asset Forecast</h2>
              <StatementPeriodGranularitySelect
                value={altStatementGranularity}
                onValueChange={setAltStatementGranularity}
              />
            </div>
            {altStatementGranularity === "quarterly" ? (
              <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
                <AssetForecastChartMetricToggleGroup
                  models={rollup.comparisonModels}
                  metricTab={altMetricTab}
                  onMetricTabChange={setAltMetricTab}
                  aria-label="Forecast metric for chart and table"
                />
              </div>
            ) : null}
          </div>
          <ScopedForecastsTable
            key={`${activeComparisonId}-${altMetricTab}`}
            periods={activeModel.periods}
            rows={activeModel.statementRows}
            assetModels={activeAssetModels}
            assetContributionsDisplay="flat"
            metricFilter={altMetricTab}
            assetSelections={assetSelections}
            onSelectBuildingVersion={setSelectedBuildingVersionId}
            onSelectOutlookSet={setSelectedOutlookSetId}
            portfolioTotalsPlacement="none"
            statementToolbar="none"
            periodGranularity={altStatementGranularity}
            onPeriodGranularityChange={setAltStatementGranularity}
            topAccessory={
              <ScopedForecastLeasingAssumptionsBar
                assumptions={assumptions}
                onAssumptionsChange={updateAssumptions}
              />
            }
          />
        </section>

        <section
          className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          aria-label={`${scopeLabel} gross revenue projection chart`}
        >
          <div className="border-b border-border/60 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Gross Revenue Projection
              </h2>
              <AssetForecastChartMetricToggleGroup
                models={rollup.comparisonModels}
                metricTab={altMetricTab}
                onMetricTabChange={setAltMetricTab}
                aria-label="Forecast metric for chart and table"
                className="shrink-0"
              />
            </div>
          </div>
          <AssetForecastCharts
            models={rollup.comparisonModels}
            metricTab={altMetricTab}
            onMetricTabChange={setAltMetricTab}
            embedded
          />
        </section>

        <section
          className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          aria-label={`${scopeLabel} portfolio quarterly totals`}
        >
          <div className="border-b border-border/60 px-4 py-3">
            <h2 className="text-base font-semibold tracking-tight text-foreground">Portfolio totals</h2>
          </div>
          <ScopedForecastsPortfolioTotalsTable
            periods={activeModel.periods}
            rows={activeModel.statementRows}
            assetModels={activeAssetModels}
          />
        </section>
      </div>
    )
  }

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
        <section
          className="overflow-hidden rounded-xl border border-border bg-card px-4 pb-4 shadow-sm"
          aria-label={`${scopeLabel} forecast summary`}
        >
          <div className="flex flex-col gap-3 border-b border-border/60 py-4 sm:flex-row sm:items-center sm:justify-end">
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
          <div className="pt-3">
            <AssetForecastSummaryStrip items={forecastSummaryStripItems} />
          </div>
        </section>

        <section
          className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          aria-label={`${scopeLabel} forecast chart and statement`}
        >
          <div className="border-b border-border/60 px-4 py-4">
            <AssetForecastChartMetricToolbar
              models={rollup.comparisonModels}
              metricTab={classicChartMetricTab}
              onMetricTabChange={setClassicChartMetricTab}
            />
          </div>
          <AssetForecastCharts
            models={rollup.comparisonModels}
            metricTab={classicChartMetricTab}
            onMetricTabChange={setClassicChartMetricTab}
            embedded
          />
          <ScopedForecastsTable
            key={activeComparisonId}
            periods={activeModel.periods}
            rows={activeModel.statementRows}
            assetModels={activeAssetModels}
            assetContributionsDisplay="flat"
            assetSelections={assetSelections}
            onSelectBuildingVersion={setSelectedBuildingVersionId}
            onSelectOutlookSet={setSelectedOutlookSetId}
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
