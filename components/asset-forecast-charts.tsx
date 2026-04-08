"use client"

import * as React from "react"
import Highcharts from "highcharts"
import HighchartsReact from "highcharts-react-official"

import {
  buildForecastLeaseHighchartsConfig,
  buildForecastNoiHighchartsConfig,
  buildForecastWaltHighchartsConfig,
  getForecastLeaseWaltYears,
  type ForecastChartPalette,
  type ForecastChartTab,
} from "@/lib/forecast-chart-config"
import type { AssetForecastModel } from "@/lib/forecast-data"
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

const CHART_META: Record<
  ForecastChartTab,
  {
    label: string
    title: string
    description: string
  }
> = {
  noi: {
    label: "NOI",
    title: "NOI Projection",
    description: "Quarterly forecast NOI annualized to a run-rate basis.",
  },
  lease: {
    label: "Lease Expiration",
    title: "Lease Expiration Schedule",
    description: "Current occupied square footage stacked by expiration year.",
  },
  walt: {
    label: "WALT",
    title: "WALT Projection",
    description: "Weighted average lease term as current leases roll off over time.",
  },
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

export function AssetForecastCharts({ model }: { model: AssetForecastModel }) {
  const palette = useForecastChartPalette()
  const [activeTab, setActiveTab] = React.useState<ForecastChartTab>("noi")

  const chartOptions = React.useMemo<Record<ForecastChartTab, Highcharts.Options>>(
    () => ({
      noi: buildForecastNoiHighchartsConfig(model, palette),
      lease: buildForecastLeaseHighchartsConfig(model.assetId, palette),
      walt: buildForecastWaltHighchartsConfig(model.assetId, palette),
    }),
    [model, palette]
  )

  const currentWalt = React.useMemo(() => getForecastLeaseWaltYears(model.assetId), [model.assetId])
  const activeChartMeta = CHART_META[activeTab]

  return (
    <section
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      aria-label="Forecast charts"
    >
      <div className="flex flex-col gap-4 border-b border-border/60 px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Charts
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">{activeChartMeta.title}</h2>
              {activeTab === "lease" ? (
                <span className="rounded-full border border-border/70 bg-muted/10 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  WALT {currentWalt.toFixed(1)} yrs
                </span>
              ) : null}
              {activeTab === "noi" ? (
                <span className="rounded-full border border-primary/20 bg-primary/[0.06] px-2 py-0.5 text-[11px] font-medium text-primary">
                  {model.scenario.name}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{activeChartMeta.description}</p>
          </div>

          <div className="flex w-fit items-center rounded-lg border border-border bg-muted/20 p-1">
            {(Object.keys(CHART_META) as ForecastChartTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  activeTab === tab
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={activeTab === tab}
              >
                {CHART_META[tab].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <ForecastHighchart options={chartOptions[activeTab]} />
      </div>
    </section>
  )
}
