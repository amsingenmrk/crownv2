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

export function AssetForecastCharts({
  models,
  variant = "default",
}: {
  models: AssetForecastModel[]
  /** `compare`: badge text refers to compare columns (lines), not economic outlooks. */
  variant?: "default" | "compare"
}) {
  const palette = useForecastChartPalette()
  const chartRows = React.useMemo(
    () =>
      (models[0]?.statementRows ?? []).filter((row): row is typeof row & { id: ForecastChartTab } =>
        ["grossRevenue", "opex", "noi", "salePrice", "capRate"].includes(row.id)
      ),
    [models]
  )

  const [activeTab, setActiveTab] = React.useState<ForecastChartTab>("grossRevenue")

  React.useEffect(() => {
    if (chartRows.some((row) => row.id === activeTab)) return
    const fallbackTab = chartRows[0]?.id
    if (fallbackTab != null) {
      setActiveTab(fallbackTab)
    }
  }, [activeTab, chartRows])

  const activeChartMeta = getForecastStatementChartMeta(activeTab)
  const chartOptions = React.useMemo(
    () => buildForecastStatementHighchartsConfig(models, activeTab, palette),
    [activeTab, models, palette]
  )

  return (
    <section
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      aria-label="Forecast charts"
    >
      <div className="flex flex-col gap-4 border-b border-border/60 px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">{activeChartMeta.title}</h2>
            </div>
            {variant === "compare" ? (
              <p className="max-w-2xl text-xs text-muted-foreground">
                One line per compare column — Baseline outlook, quarterly values summed across
                that column&apos;s assets.
              </p>
            ) : null}
          </div>

          <ToggleGroup
            value={[activeTab]}
            onValueChange={(values) => {
              const next = values[0]
              if (typeof next === "string" && chartRows.some((row) => row.id === next)) {
                setActiveTab(next as ForecastChartTab)
              }
            }}
            aria-label="Forecast chart metric"
            className="w-fit max-w-full flex-wrap"
          >
            {chartRows.map((row) => (
              <ToggleGroupItem key={row.id} value={row.id}>
                {row.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <div className="px-4 py-4">
        <ForecastHighchart options={chartOptions} />
      </div>
    </section>
  )
}
