"use client"

import {
  MetricStripCell,
  MetricStripLabel,
  MetricStripValueRow,
  MetricStripValueSuffix,
  metricStripSectionClassName,
} from "@/components/metric-strip"
import { ScenarioMetricInlinePair } from "@/components/portfolio/scenario-comparative-kpis"
import { cn } from "@/lib/utils"

export type ForecastSummaryKpi = {
  label: string
  value: string
  valueSuffix?: string
  /** Optional: render base → scenario + delta line (scenario overview treatment). */
  baseFormatted?: string
  scenarioFormatted?: string
  showScenario?: boolean
  deltaLine?: string
  pctLine?: string
  deltaDirection?: "up" | "down" | "neutral"
}

const SUMMARY_STRIP_FOOTNOTE_ID = "forecast-summary-strip-footnote"

export function AssetForecastSummaryStrip({
  items,
}: {
  items: ForecastSummaryKpi[]
}) {
  const footnoteInLastCard = items.length > 3
  const gridClassName =
    items.length >= 5
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"

  return (
    <section
      className={cn(metricStripSectionClassName, gridClassName)}
      aria-label="Forecast summary metrics"
      aria-describedby={footnoteInLastCard ? SUMMARY_STRIP_FOOTNOTE_ID : undefined}
    >
      {items.map((item, index) => {
        const isFootnoteCard = footnoteInLastCard && index === items.length - 1
        const hasScenarioPair =
          item.baseFormatted != null &&
          item.scenarioFormatted != null &&
          item.showScenario != null
        const valueRow = (valueRowClassName?: string) =>
          hasScenarioPair ? (
            <div className={valueRowClassName}>
              <ScenarioMetricInlinePair
                baseFormatted={item.baseFormatted!}
                scenarioFormatted={item.scenarioFormatted!}
                showScenario={item.showScenario!}
                deltaLine={item.deltaLine}
                pctLine={item.pctLine}
                deltaDirection={item.deltaDirection}
              />
            </div>
          ) : (
            <MetricStripValueRow className={valueRowClassName}>
              <span className="text-foreground">{item.value}</span>
              {item.valueSuffix != null && item.valueSuffix !== "" ? (
                <MetricStripValueSuffix>{item.valueSuffix}</MetricStripValueSuffix>
              ) : null}
            </MetricStripValueRow>
          )

        if (!isFootnoteCard) {
          return (
            <MetricStripCell key={item.label}>
              <MetricStripLabel>{item.label}</MetricStripLabel>
              {valueRow()}
            </MetricStripCell>
          )
        }

        return (
          <MetricStripCell
            key={item.label}
            className="flex h-full min-h-0 flex-col"
          >
            <MetricStripLabel>{item.label}</MetricStripLabel>
            <div className="mt-auto w-full min-w-0">
              <div className="mt-1 flex w-full min-w-0 items-baseline gap-x-2">
                <div className="min-w-0 shrink">{valueRow("mt-0")}</div>
                <p
                  id={SUMMARY_STRIP_FOOTNOTE_ID}
                  className="min-w-0 flex-1 text-right text-xs leading-snug text-muted-foreground"
                >
                  2-year average
                </p>
              </div>
            </div>
          </MetricStripCell>
        )
      })}
    </section>
  )
}
