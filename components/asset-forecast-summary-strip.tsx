"use client"

import {
  MetricStripCell,
  MetricStripLabel,
  MetricStripValueRow,
  MetricStripValueSuffix,
  metricStripSectionClassName,
} from "@/components/metric-strip"
import { cn } from "@/lib/utils"

export type ForecastSummaryKpi = {
  label: string
  value: string
  valueSuffix?: string
}

const SUMMARY_STRIP_FOOTNOTE_ID = "forecast-summary-strip-footnote"

export function AssetForecastSummaryStrip({
  items,
}: {
  items: ForecastSummaryKpi[]
}) {
  const footnoteInFourthCard = items.length > 3

  return (
    <section
      className={cn(metricStripSectionClassName, "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4")}
      aria-label="Forecast summary metrics"
      aria-describedby={footnoteInFourthCard ? SUMMARY_STRIP_FOOTNOTE_ID : undefined}
    >
      {items.map((item, index) => {
        const isFourthCard = footnoteInFourthCard && index === 3
        const valueRow = (valueRowClassName?: string) => (
          <MetricStripValueRow className={valueRowClassName}>
            <span className="text-foreground">{item.value}</span>
            {item.valueSuffix != null && item.valueSuffix !== "" ? (
              <MetricStripValueSuffix>{item.valueSuffix}</MetricStripValueSuffix>
            ) : null}
          </MetricStripValueRow>
        )

        if (!isFourthCard) {
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
            <div className="mt-auto min-w-0">
              <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2">
                {valueRow("mt-0")}
                <p
                  id={SUMMARY_STRIP_FOOTNOTE_ID}
                  className="text-xs leading-snug text-muted-foreground"
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
