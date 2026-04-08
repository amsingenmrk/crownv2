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

export function AssetForecastSummaryStrip({
  items,
}: {
  items: ForecastSummaryKpi[]
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          2 Year Avg Summary
        </p>
      </div>

      <section
        className={cn(metricStripSectionClassName, "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4")}
        aria-label="Forecast summary metrics"
      >
        {items.map((item) => (
          <MetricStripCell key={item.label}>
            <MetricStripLabel>{item.label}</MetricStripLabel>
            <MetricStripValueRow>
              <span className="text-foreground">{item.value}</span>
              {item.valueSuffix != null && item.valueSuffix !== "" ? (
                <MetricStripValueSuffix>{item.valueSuffix}</MetricStripValueSuffix>
              ) : null}
            </MetricStripValueRow>
          </MetricStripCell>
        ))}
      </section>
    </div>
  )
}
