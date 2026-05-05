"use client"

import * as React from "react"
import type Highcharts from "highcharts"
import HighchartsCore from "highcharts/es-modules/masters/highcharts.src.js"
import "highcharts/es-modules/Series/Waterfall/WaterfallSeries.js"
import HighchartsReact from "highcharts-react-official"
import { ChevronDown, ChevronRight } from "lucide-react"

import type {
  StackingFloorValueDrivers,
  StackingValueDriverFactor,
} from "@/lib/stacking-plan-data"
import { INPUT_LABEL_TEXT_CLASS } from "@/components/ui/field"
import { cn } from "@/lib/utils"

const HighchartsNamespace = HighchartsCore as unknown as typeof Highcharts

const CHART_CONTAINER_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
}

type WaterfallChartPalette = {
  text: string
  mutedText: string
  border: string
  grid: string
  surface: string
  tooltipBackground: string
  baseline: string
  positive: string
  negative: string
  result: string
  /** Bar outline on pastel fills (light mode) */
  barBorder: string
}

/** SSR / pre-paint fallbacks — same oklch as Tailwind default `@theme` (`tailwindcss/index.css`). */
const DEFAULT_PALETTE: WaterfallChartPalette = {
  text: "oklch(14.5% 0 0)",
  mutedText: "oklch(55.6% 0 0)",
  border: "oklch(92.2% 0 0)",
  grid: "oklch(70.8% 0 0 / 0.22)",
  surface: "oklch(98.5% 0 0)",
  tooltipBackground: "oklch(98.5% 0 0)",
  baseline: "oklch(92.9% 0.013 255.508)",
  positive: "oklch(95% 0.052 163.051)",
  negative: "oklch(93.6% 0.032 17.717)",
  result: "oklch(93.2% 0.032 255.585)",
  barBorder: "oklch(14.5% 0 0 / 0.12)",
}

function readCssVariable(
  styles: CSSStyleDeclaration,
  variableName: string,
  fallback: string
) {
  const value = styles.getPropertyValue(variableName).trim()
  return value === "" ? fallback : value
}

function useWaterfallChartPalette() {
  const [palette, setPalette] =
    React.useState<WaterfallChartPalette>(DEFAULT_PALETTE)

  React.useEffect(() => {
    const updatePalette = () => {
      const styles = getComputedStyle(document.documentElement)

      setPalette({
        text: readCssVariable(styles, "--foreground", DEFAULT_PALETTE.text),
        mutedText: readCssVariable(
          styles,
          "--muted-foreground",
          DEFAULT_PALETTE.mutedText
        ),
        border: readCssVariable(styles, "--border", DEFAULT_PALETTE.border),
        grid: readCssVariable(styles, "--border", DEFAULT_PALETTE.grid),
        surface: readCssVariable(styles, "--card", DEFAULT_PALETTE.surface),
        tooltipBackground: readCssVariable(
          styles,
          "--card",
          DEFAULT_PALETTE.tooltipBackground
        ),
        baseline: readCssVariable(
          styles,
          "--waterfall-baseline",
          DEFAULT_PALETTE.baseline
        ),
        positive: readCssVariable(
          styles,
          "--waterfall-positive",
          DEFAULT_PALETTE.positive
        ),
        negative: readCssVariable(
          styles,
          "--waterfall-negative",
          DEFAULT_PALETTE.negative
        ),
        result: readCssVariable(
          styles,
          "--waterfall-result",
          DEFAULT_PALETTE.result
        ),
        barBorder: readCssVariable(
          styles,
          "--waterfall-bar-border",
          DEFAULT_PALETTE.barBorder
        ),
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

function formatRate(value: number) {
  return `$${value.toFixed(2)}`
}

function formatSignedRate(value: number) {
  const prefix = value >= 0 ? "+" : "-"
  return `${prefix}$${Math.abs(value).toFixed(2)}`
}

function wrapWords(text: string, maxChars = 16): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) {
    return [""]
  }

  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const next = current === "" ? word : `${current} ${word}`
    if (next.length <= maxChars || current === "") {
      current = next
      continue
    }

    lines.push(current)
    current = word
  }

  if (current !== "") {
    lines.push(current)
  }

  return lines
}

function niceStep(range: number, targetTicks: number) {
  const rough = range / targetTicks
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)))
  const normalized = rough / magnitude

  if (normalized <= 1.5) return magnitude
  if (normalized <= 3) return 2 * magnitude
  if (normalized <= 7) return 5 * magnitude
  return 10 * magnitude
}

function sortFactorsForDisplay(factors: StackingValueDriverFactor[]) {
  return [...factors].sort((left, right) => {
    const leftPositive = left.impact >= 0
    const rightPositive = right.impact >= 0

    if (leftPositive !== rightPositive) {
      return leftPositive ? -1 : 1
    }

    return Math.abs(right.impact) - Math.abs(left.impact)
  })
}

function ValueDriversHighchart({ options }: { options: Highcharts.Options }) {
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
    <div ref={containerRef} className="relative h-[304px] w-full">
      <HighchartsReact
        ref={chartRef}
        highcharts={HighchartsNamespace}
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

function SummaryMetric({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={INPUT_LABEL_TEXT_CLASS}>{label}</span>
      <span
        className={cn(
          "text-[13px] font-semibold text-foreground tabular-nums",
          valueClassName
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function StackingValueDriversWaterfall({
  valueDrivers,
  className,
}: {
  valueDrivers: StackingFloorValueDrivers
  className?: string
}) {
  const [otherFactorsOpen, setOtherFactorsOpen] = React.useState(false)
  const palette = useWaterfallChartPalette()

  const otherFactors = React.useMemo(
    () => sortFactorsForDisplay(valueDrivers.otherFactors),
    [valueDrivers.otherFactors]
  )

  const chartPoints = React.useMemo(() => {
    const otherImpact = otherFactors.reduce(
      (sum, factor) => sum + factor.impact,
      0
    )

    const points: Array<
      StackingValueDriverFactor & {
        label: string
        isTotal?: boolean
        isOther?: boolean
      }
    > = [
      {
        factor: "Market Baseline",
        impact: valueDrivers.marketBaselineRentPsf,
        label: "Market Baseline",
        isTotal: true,
      },
      ...valueDrivers.waterfallFactors.map((factor) => ({
        ...factor,
        label: factor.factor,
      })),
    ]

    if (otherFactors.length > 0) {
      points.push({
        factor: "Other Factors",
        impact: Number(otherImpact.toFixed(2)),
        label: "Other Factors",
        isOther: true,
      })
    }

    points.push({
      factor: "Predicted Rent",
      impact: valueDrivers.predictedRentPsf,
      label: "Predicted Rent",
      isTotal: true,
    })

    return points
  }, [
    otherFactors,
    valueDrivers.marketBaselineRentPsf,
    valueDrivers.predictedRentPsf,
    valueDrivers.waterfallFactors,
  ])

  const chartOptions = React.useMemo<Highcharts.Options>(() => {
    const categories = chartPoints.map((point) => point.label)
    const driverPoints = chartPoints.filter((point) => !point.isTotal)
    let running = valueDrivers.marketBaselineRentPsf
    const runningValues = [valueDrivers.marketBaselineRentPsf]

    driverPoints.forEach((point) => {
      running += point.impact
      runningValues.push(running)
    })

    runningValues.push(valueDrivers.predictedRentPsf)

    const dataMin = Math.min(...runningValues)
    const dataMax = Math.max(...runningValues)
    const range = Math.max(1, dataMax - dataMin)
    const padding = range * 0.22
    const low = dataMin - padding
    const high = dataMax + padding
    const step = niceStep(high - low, 5)
    const tickStart = Math.floor(low / step) * step
    const ticks: number[] = []

    for (let value = tickStart; value <= high + step * 0.25; value += step) {
      ticks.push(Number(value.toFixed(2)))
    }

    const maxLabelLines = Math.max(
      2,
      ...categories.map((category) => wrapWords(category).length)
    )

    const data: Highcharts.PointOptionsObject[] = [
      {
        name: "Market Baseline",
        y: valueDrivers.marketBaselineRentPsf,
        color: palette.baseline,
        borderColor: palette.barBorder,
        custom: {
          labelText: formatRate(valueDrivers.marketBaselineRentPsf),
        },
      },
      ...valueDrivers.waterfallFactors.map((factor) => ({
        name: factor.factor,
        y: factor.impact,
        color: factor.impact >= 0 ? palette.positive : palette.negative,
        borderColor: palette.barBorder,
        custom: {
          labelText: formatSignedRate(factor.impact),
        },
      })),
      ...(otherFactors.length > 0
        ? [
            {
              name: "Other Factors",
              y: otherFactors.reduce((sum, factor) => sum + factor.impact, 0),
              color:
                otherFactors.reduce((sum, factor) => sum + factor.impact, 0) >=
                0
                  ? palette.positive
                  : palette.negative,
              borderColor: palette.barBorder,
              custom: {
                labelText: formatSignedRate(
                  otherFactors.reduce((sum, factor) => sum + factor.impact, 0)
                ),
              },
            } satisfies Highcharts.PointOptionsObject,
          ]
        : []),
      {
        name: "Predicted Rent",
        isSum: true,
        color: palette.result,
        borderColor: palette.barBorder,
        custom: {
          labelText: formatRate(valueDrivers.predictedRentPsf),
        },
      },
    ]

    return {
      chart: {
        type: "waterfall",
        backgroundColor: "transparent",
        height: 304,
        spacing: [12, 8, 4, 0],
        marginLeft: 54,
        marginRight: 10,
        marginTop: 18,
        marginBottom: 28 + maxLabelLines * 14,
        style: {
          fontFamily: "var(--font-sans)",
        },
        animation: false,
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        categories,
        lineWidth: 0,
        tickLength: 0,
        labels: {
          useHTML: true,
          reserveSpace: true,
          y: 10,
          style: {
            color: palette.text,
            fontSize: "10px",
            fontWeight: "600",
          },
          formatter() {
            const index = Number(
              (this as Highcharts.AxisLabelsFormatterContextObject).pos
            )
            const label = categories[index] ?? ""
            return `<span style="display:inline-block;min-width:72px;line-height:1.15;text-align:center;color:${palette.text};">${wrapWords(
              label
            ).join("<br/>")}</span>`
          },
        },
      },
      yAxis: {
        min: ticks[0],
        max: ticks[ticks.length - 1],
        tickPositions: ticks,
        title: { text: undefined },
        gridLineColor: palette.grid,
        gridLineDashStyle: "Dash",
        lineColor: palette.border,
        lineWidth: 1,
        tickLength: 0,
        labels: {
          formatter() {
            return `$${Number(this.value).toFixed(0)}`
          },
          style: {
            color: palette.mutedText,
            fontSize: "10px",
          },
        },
      },
      tooltip: {
        useHTML: true,
        borderColor: palette.border,
        backgroundColor: palette.tooltipBackground,
        shadow: false,
        padding: 10,
        formatter() {
          const point = this as Highcharts.Point & {
            options: Highcharts.PointOptionsObject & {
              custom?: { labelText?: string }
            }
          }
          const isSum = Boolean(
            (point.options as Highcharts.PointOptionsObject).isSum
          )
          const valueText =
            point.options.custom?.labelText ?? formatRate(Number(point.y))

          return `
            <div style="min-width:180px">
              <div style="font-size:11px;font-weight:600;color:${palette.text};margin-bottom:4px;">
                ${point.name}
              </div>
              <div style="font-size:11px;color:${palette.mutedText};">
                ${isSum ? "Value" : "Impact"} <span style="font-weight:600;color:${palette.text};">${valueText}</span>
              </div>
            </div>
          `
        },
      },
      plotOptions: {
        waterfall: {
          borderWidth: 1,
          lineWidth: 0,
          pointPadding: 0.08,
          dataLabels: {
            enabled: true,
            allowOverlap: true,
            crop: false,
            formatter() {
              const point = this as Highcharts.Point & {
                options: Highcharts.PointOptionsObject & {
                  custom?: { labelText?: string }
                }
              }
              return point.options.custom?.labelText ?? ""
            },
            style: {
              color: palette.text,
              fontSize: "10px",
              fontWeight: "600",
              textOutline: "none",
            },
          },
        },
        series: {
          animation: false,
          states: {
            inactive: {
              opacity: 1,
            },
          },
        },
      },
      series: [
        {
          type: "waterfall",
          data,
          upColor: palette.positive,
          color: palette.negative,
        },
      ],
    }
  }, [
    chartPoints,
    otherFactors,
    palette,
    valueDrivers.marketBaselineRentPsf,
    valueDrivers.predictedRentPsf,
    valueDrivers.waterfallFactors,
  ])

  const otherFactorsTotal = otherFactors.reduce(
    (sum, factor) => sum + factor.impact,
    0
  )

  return (
    <div className={cn("mt-4 space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border/50 bg-background/40 px-3 py-2.5">
        <SummaryMetric
          label="Market"
          value={formatRate(valueDrivers.marketBaselineRentPsf)}
          valueClassName="text-muted-foreground"
        />
        <SummaryMetric
          label="Predicted"
          value={formatRate(valueDrivers.predictedRentPsf)}
          valueClassName="text-primary"
        />
        <SummaryMetric
          label="Delta"
          value={formatSignedRate(valueDrivers.summary.deltaFromMarketPsf)}
          valueClassName={
            valueDrivers.summary.deltaFromMarketPsf >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-destructive"
          }
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border/50 bg-background/40 px-2 py-2">
        <ValueDriversHighchart options={chartOptions} />
      </div>

      {otherFactors.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border/50 bg-background/35">
          <button
            type="button"
            onClick={() => setOtherFactorsOpen((current) => !current)}
            className="inline-flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/15 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-expanded={otherFactorsOpen}
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className={INPUT_LABEL_TEXT_CLASS}>Other factors</span>
              <span className="text-sm font-medium text-foreground">
                {otherFactors.length} hidden drivers
              </span>
              <span
                className={cn(
                  "text-xs font-medium tabular-nums",
                  otherFactorsTotal >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                )}
              >
                {formatSignedRate(otherFactorsTotal)}
              </span>
            </div>
            {otherFactorsOpen ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </button>

          {otherFactorsOpen ? (
            <div className="border-t border-border/50 px-3 py-3">
              <div className="grid gap-x-5 gap-y-2 md:grid-cols-2">
                {otherFactors.map((factor) => (
                  <div
                    key={factor.factor}
                    className="flex items-center justify-between gap-3 border-b border-border/35 py-1.5 text-sm last:border-b-0"
                  >
                    <span className="min-w-0 truncate text-foreground/90">
                      {factor.factor}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-medium tabular-nums",
                        factor.impact >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive"
                      )}
                    >
                      {formatSignedRate(factor.impact)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
