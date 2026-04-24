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
  type ScopedForecastPortfolioModificationMode,
  type ScopedForecastPortfolioScenarioProbabilities,
  type ScopedForecastScope,
  outlookWeightProbabilitiesToSlider,
  outlookWeightSliderToProbabilities,
} from "@/lib/scoped-forecast"
import { humanizeScenarioSlug } from "@/lib/scenario-slug"
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
  baseline: "None",
  recommended: "Recommended",
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

/** Matches `AssumptionField` in `asset-forecasts-workspace` (single-asset forecast sidebar). */
function AssetForecastSidebarNumberField({
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
  return (
    <label className="min-w-0 space-y-0.5">
      <div className="truncate text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </div>
      <div className="relative">
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          className="h-8 border-border/60 bg-background/80 pr-11 text-[0.82rem] tabular-nums shadow-none"
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isNaN(next)) return
            onChange(clampControlCenterValue(next, min, max))
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] text-muted-foreground">
          {suffix}
        </span>
      </div>
    </label>
  )
}

function PortfolioForecastControlCenter({
  modificationMode,
  onModificationModeChange,
  scenarioProbabilities,
  onScenarioProbabilitiesChange,
  assumptions,
  onAssumptionsChange,
}: {
  modificationMode: ScopedForecastPortfolioModificationMode
  onModificationModeChange: (next: ScopedForecastPortfolioModificationMode) => void
  scenarioProbabilities: ScopedForecastPortfolioScenarioProbabilities
  onScenarioProbabilitiesChange: (next: ScopedForecastPortfolioScenarioProbabilities) => void
  assumptions: ForecastAssumptions
  onAssumptionsChange: (updates: Partial<ForecastAssumptions>) => void
}) {
  const committedSlider = outlookWeightProbabilitiesToSlider(scenarioProbabilities)
  const [dragSlider, setDragSlider] = React.useState<number | null>(null)
  const pointerDragActiveRef = React.useRef(false)
  const dragSliderRef = React.useRef<number | null>(null)
  const capturePointerIdRef = React.useRef<number | null>(null)
  const rangeInputRef = React.useRef<HTMLInputElement>(null)

  const finishPointerDrag = React.useCallback(() => {
    const el = rangeInputRef.current
    const captureId = capturePointerIdRef.current
    if (captureId != null && el?.releasePointerCapture) {
      try {
        el.releasePointerCapture(captureId)
      } catch {
        /* not capturing */
      }
    }
    capturePointerIdRef.current = null

    if (!pointerDragActiveRef.current) return
    pointerDragActiveRef.current = false
    const last = dragSliderRef.current
    dragSliderRef.current = null
    setDragSlider(null)
    if (last !== null) {
      onScenarioProbabilitiesChange(outlookWeightSliderToProbabilities(last))
    }
  }, [onScenarioProbabilitiesChange])

  React.useEffect(() => {
    window.addEventListener("pointerup", finishPointerDrag)
    window.addEventListener("pointercancel", finishPointerDrag)
    return () => {
      window.removeEventListener("pointerup", finishPointerDrag)
      window.removeEventListener("pointercancel", finishPointerDrag)
    }
  }, [finishPointerDrag])

  const applyRangeValue = React.useCallback(
    (raw: string) => {
      const next = Number(raw)
      if (Number.isNaN(next)) return
      if (pointerDragActiveRef.current) {
        dragSliderRef.current = next
        setDragSlider(next)
        return
      }
      onScenarioProbabilitiesChange(outlookWeightSliderToProbabilities(next))
    },
    [onScenarioProbabilitiesChange]
  )

  const sliderDisplay = dragSlider ?? committedSlider
  const probsDisplay =
    dragSlider !== null
      ? outlookWeightSliderToProbabilities(dragSlider)
      : scenarioProbabilities

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
    <aside
      className="flex w-full shrink-0 flex-col rounded-xl border border-border bg-card p-4 shadow-sm lg:w-72 xl:w-80"
      aria-label="Forecast inputs"
    >
      <div className="min-w-0 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Modification Mode</h3>
        <ToggleGroup
          value={[modificationMode]}
          onValueChange={(values) => {
            const next = values[0]
            if (next === "baseline" || next === "recommended") {
              onModificationModeChange(next)
            }
          }}
          aria-label="Portfolio forecast modification mode"
          className="flex h-10 w-full gap-1 bg-muted/30 p-1"
        >
          <ToggleGroupItem value="baseline" className="h-full min-w-0 flex-1 px-2 text-xs sm:text-sm">
            {PORTFOLIO_MODIFICATION_MODE_LABELS.baseline}
          </ToggleGroupItem>
          <ToggleGroupItem value="recommended" className="h-full min-w-0 flex-1 px-2 text-xs sm:text-sm">
            {PORTFOLIO_MODIFICATION_MODE_LABELS.recommended}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="mt-4 min-w-0 space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground">Scenario Probabilities</h3>
        <div className="px-0.5 pt-1">
          <div className="mb-2 grid grid-cols-3 gap-1 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            <span className="text-left">Pessimistic</span>
            <span className="text-center">Baseline</span>
            <span className="text-right">Optimistic</span>
          </div>
          <input
            ref={rangeInputRef}
            type="range"
            min={0}
            max={100}
            step={1}
            value={sliderDisplay}
            onPointerDownCapture={(event) => {
              pointerDragActiveRef.current = true
              const el = event.currentTarget
              try {
                el.setPointerCapture(event.pointerId)
                capturePointerIdRef.current = event.pointerId
              } catch {
                capturePointerIdRef.current = null
              }
              const fromDom = Number(el.value)
              const initial = Number.isNaN(fromDom) ? committedSlider : fromDom
              dragSliderRef.current = initial
              setDragSlider(initial)
            }}
            onInput={(event) => applyRangeValue(event.currentTarget.value)}
            onChange={(event) => applyRangeValue(event.currentTarget.value)}
            aria-label="Weight portfolio outlook from pessimistic through baseline to optimistic"
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-primary"
          />
          <div className="mt-1.5 grid grid-cols-3 gap-1 text-xs tabular-nums text-muted-foreground">
            <span className="text-left">{probsDisplay.pessimistic}%</span>
            <span className="text-center">{probsDisplay.baseline}%</span>
            <span className="text-right">{probsDisplay.optimistic}%</span>
          </div>
        </div>
      </div>

      <div className="mt-4 min-w-0 space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground">Leasing Assumptions</h3>
        <div className="grid gap-3">
          {SCOPED_FORECAST_LEASING_ASSUMPTION_FIELDS.map((field) => (
            <AssetForecastSidebarNumberField
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
      </div>
    </aside>
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
    replacePortfolioScenarioProbabilities,
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
          <div className="flex min-h-0 w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
            <PortfolioForecastControlCenter
              modificationMode={portfolioModificationMode}
              onModificationModeChange={setPortfolioModificationMode}
              scenarioProbabilities={portfolioScenarioProbabilities}
              onScenarioProbabilitiesChange={replacePortfolioScenarioProbabilities}
              assumptions={assumptions}
              onAssumptionsChange={updateAssumptions}
            />

            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6">
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
