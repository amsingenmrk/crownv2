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

export function AssetForecastSummaryStrip({
  items,
}: {
  items: ForecastSummaryKpi[]
}) {
  const gridClassName =
    items.length >= 5
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"

  return (
    <section
      className={cn(metricStripSectionClassName, gridClassName)}
      aria-label="Forecast summary metrics"
    >
      {items.map((item) => {
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
              {item.valueSuffix != null && item.valueSuffix !== "" ? (
                <MetricStripValueSuffix className="mt-1 block text-xs font-medium">
                  {item.valueSuffix}
                </MetricStripValueSuffix>
              ) : null}
            </div>
          ) : (
            <MetricStripValueRow className={valueRowClassName}>
              <span className="text-foreground">{item.value}</span>
              {item.valueSuffix != null && item.valueSuffix !== "" ? (
                <MetricStripValueSuffix>{item.valueSuffix}</MetricStripValueSuffix>
              ) : null}
            </MetricStripValueRow>
          )

        return (
          <MetricStripCell key={item.label}>
            <MetricStripLabel>{item.label}</MetricStripLabel>
            {valueRow()}
          </MetricStripCell>
        )
      })}
    </section>
  )
}
