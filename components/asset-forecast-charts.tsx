"use client"

import * as React from "react"
import Highcharts from "highcharts"
import HighchartsReact from "highcharts-react-official"

import {
  buildForecastStatementHighchartsConfig,
  getForecastStatementChartMeta,
  type ForecastChartPalette,
  type ForecastChartTab,
} from "@/lib/forecast-chart-config"
import type { AssetForecastModel } from "@/lib/forecast-data"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

const CHART_CONTAINER_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
}

const DEFAULT_PALETTE: ForecastChartPalette = {
  text: "#0f172a",
  mutedText: "#64748b",
  grid: "rgba(148, 163, 184, 0.18)",
  border: "rgba(15, 23, 42, 0.12)",
  primary: "#4f6edb",
  secondary: "#6e86e6",
  tertiary: "#8fa3ef",
  quaternary: "#afbef5",
  accent: "#1f2937",
  neutral: "rgba(148, 163, 184, 0.7)",
  tooltipBackground: "#ffffff",
}

function readCssVariable(styles: CSSStyleDeclaration, variableName: string, fallback: string) {
  const value = styles.getPropertyValue(variableName).trim()
  return value === "" ? fallback : value
}

function useForecastChartPalette() {
  const [palette, setPalette] = React.useState<ForecastChartPalette>(DEFAULT_PALETTE)

  React.useEffect(() => {
    const updatePalette = () => {
      const styles = getComputedStyle(document.documentElement)

      setPalette({
        text: readCssVariable(styles, "--foreground", DEFAULT_PALETTE.text),
        mutedText: readCssVariable(styles, "--muted-foreground", DEFAULT_PALETTE.mutedText),
        grid: readCssVariable(styles, "--border", DEFAULT_PALETTE.grid),
        border: readCssVariable(styles, "--border", DEFAULT_PALETTE.border),
        primary: readCssVariable(styles, "--primary", DEFAULT_PALETTE.primary),
        secondary: readCssVariable(styles, "--chart-1", DEFAULT_PALETTE.secondary),
        tertiary: readCssVariable(styles, "--chart-2", DEFAULT_PALETTE.tertiary),
        quaternary: readCssVariable(styles, "--chart-3", DEFAULT_PALETTE.quaternary),
        accent: readCssVariable(styles, "--foreground", DEFAULT_PALETTE.accent),
        neutral: readCssVariable(styles, "--muted-foreground", DEFAULT_PALETTE.neutral),
        tooltipBackground: readCssVariable(styles, "--card", DEFAULT_PALETTE.tooltipBackground),
      })
    }

    updatePalette()

    const observer = new MutationObserver(() => {
      updatePalette()
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    })

    return () => observer.disconnect()
  }, [])

  return palette
}

function ForecastHighchart({ options }: { options: Highcharts.Options }) {
  const chartRef = React.useRef<HighchartsReact.RefObject>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const element = containerRef.current
    if (element == null) return

    const resizeObserver = new ResizeObserver(() => {
      chartRef.current?.chart?.reflow()
    })

    resizeObserver.observe(element)
    return () => resizeObserver.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="relative h-[340px] w-full">
      <HighchartsReact
        ref={chartRef}
        highcharts={Highcharts}
        options={{
          ...options,
          accessibility: {
            enabled: false,
            ...(options.accessibility ?? {}),
          },
        }}
        containerProps={{ style: CHART_CONTAINER_STYLE }}
      />
    </div>
  )
}

const FORECAST_CHART_TAB_ROW_IDS: ForecastChartTab[] = [
  "grossRevenue",
  "opex",
  "noi",
  "salePrice",
  "capRate",
]

function useForecastChartStatementTabs(models: AssetForecastModel[]) {
  return React.useMemo(
    () =>
      (models[0]?.statementRows ?? []).filter(
        (row): row is (typeof row & { id: ForecastChartTab }) =>
          FORECAST_CHART_TAB_ROW_IDS.includes(row.id as ForecastChartTab)
      ),
    [models]
  )
}

/** Gross Revenue / OpEx / … toggles — same control as in {@link AssetForecastChartMetricToolbar}. */
export function AssetForecastChartMetricToggleGroup({
  models,
  metricTab,
  onMetricTabChange,
  ariaLabel = "Forecast chart metric",
  className,
}: {
  models: AssetForecastModel[]
  metricTab: ForecastChartTab
  onMetricTabChange: (tab: ForecastChartTab) => void
  ariaLabel?: string
  className?: string
}) {
  const chartRows = useForecastChartStatementTabs(models)

  return (
    <ToggleGroup
      value={[metricTab]}
      onValueChange={(values) => {
        const next = values[0]
        if (typeof next === "string" && chartRows.some((row) => row.id === next)) {
          onMetricTabChange(next as ForecastChartTab)
        }
      }}
      aria-label={ariaLabel}
      className={cn("w-fit max-w-full flex-wrap", className)}
    >
      {chartRows.map((row) => (
        <ToggleGroupItem key={row.id} value={row.id}>
          {row.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** Renders chart title, optional compare copy, and metric toggles — place above `AssetForecastCharts`. */
export function AssetForecastChartMetricToolbar({
  models,
  variant = "default",
  metricTab,
  onMetricTabChange,
  ariaLabel = "Forecast chart metric",
  showMetricTitle = true,
}: {
  models: AssetForecastModel[]
  variant?: "default" | "compare"
  metricTab: ForecastChartTab
  onMetricTabChange: (tab: ForecastChartTab) => void
  ariaLabel?: string
  /** When false, omit the metric `h2` (parent supplies a section title, e.g. “Gross revenue projection”). */
  showMetricTitle?: boolean
}) {
  const activeChartMeta = getForecastStatementChartMeta(metricTab)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1 space-y-1">
        {showMetricTitle ? (
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {activeChartMeta.title}
          </h2>
        ) : null}
        <p className="max-w-2xl text-xs leading-snug text-muted-foreground">
          {activeChartMeta.description}
        </p>
        {variant === "compare" ? (
          <p className="max-w-2xl text-xs leading-snug text-muted-foreground">
            One line per compare column — Baseline outlook, quarterly values summed across that
            column&apos;s assets.
          </p>
        ) : null}
      </div>

      <AssetForecastChartMetricToggleGroup
        models={models}
        metricTab={metricTab}
        onMetricTabChange={onMetricTabChange}
        ariaLabel={ariaLabel}
        className="shrink-0"
      />
    </div>
  )
}

export function AssetForecastCharts({
  models,
  metricTab: metricTabProp,
  onMetricTabChange,
  metricToolbarInCard = false,
  toolbarVariant = "default",
  metricToolbarAriaLabel = "Forecast chart metric",
  metricToolbarShowMetricTitle = true,
  embedded = false,
}: {
  models: AssetForecastModel[]
  /** Controlled metric selection (use with `onMetricTabChange`). */
  metricTab?: ForecastChartTab
  onMetricTabChange?: (tab: ForecastChartTab) => void
  /** When true, metric toggles render in the chart card above the plot. */
  metricToolbarInCard?: boolean
  toolbarVariant?: "default" | "compare"
  metricToolbarAriaLabel?: string
  /** When false, toolbar omits the metric heading (use with a parent section title). */
  metricToolbarShowMetricTitle?: boolean
  /** When true, omit outer card wrapper — parent combines chart with adjacent content (e.g. table). */
  embedded?: boolean
}) {
  const palette = useForecastChartPalette()
  const chartRows = useForecastChartStatementTabs(models)

  const [uncontrolledTab, setUncontrolledTab] = React.useState<ForecastChartTab>("grossRevenue")
  const controlled = metricTabProp !== undefined
  const activeTab = controlled ? metricTabProp! : uncontrolledTab

  const setActiveTab = React.useCallback(
    (next: ForecastChartTab) => {
      if (controlled) {
        onMetricTabChange?.(next)
      } else {
        setUncontrolledTab(next)
      }
    },
    [controlled, onMetricTabChange]
  )

  React.useEffect(() => {
    if (chartRows.some((row) => row.id === activeTab)) return
    const fallbackTab = chartRows[0]?.id as ForecastChartTab | undefined
    if (fallbackTab == null) return
    if (controlled) {
      onMetricTabChange?.(fallbackTab)
    } else {
      setUncontrolledTab(fallbackTab)
    }
  }, [activeTab, chartRows, controlled, onMetricTabChange])

  const chartOptions = React.useMemo(
    () => buildForecastStatementHighchartsConfig(models, activeTab, palette),
    [activeTab, models, palette]
  )

  const chartInner = (
    <>
      {metricToolbarInCard ? (
        <div className="border-b border-border/60 px-4 py-4">
          <AssetForecastChartMetricToolbar
            models={models}
            variant={toolbarVariant}
            metricTab={activeTab}
            onMetricTabChange={setActiveTab}
            ariaLabel={metricToolbarAriaLabel}
            showMetricTitle={metricToolbarShowMetricTitle}
          />
        </div>
      ) : null}
      <div
        className={
          embedded ? "border-b border-border/60 px-4 py-4" : "px-4 py-4"
        }
      >
        <ForecastHighchart options={chartOptions} />
      </div>
    </>
  )

  if (embedded) {
    return chartInner
  }

  return (
    <section
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      aria-label="Forecast charts"
    >
      {chartInner}
    </section>
  )
}
