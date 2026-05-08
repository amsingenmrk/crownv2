"use client"

import * as React from "react"
import { Info } from "lucide-react"

import {
  MetricStripCell,
  MetricStripLabel,
  MetricStripSubStack,
  MetricStripValueRow,
  metricStripSectionClassName,
} from "@/components/metric-strip"
import { ScenarioMetricInlinePair } from "@/components/portfolio/scenario-comparative-kpis"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  VALUATION_CONDITION_OPTIONS,
  type ValuationConditionId,
} from "@/lib/valuation-condition-config"
import type { ValuationKpiStripRowModel } from "@/lib/valuation-kpi-strip-model"
import { cn } from "@/lib/utils"

function ConditionSubValueRow({
  label,
  value,
  tooltip,
}: {
  label: string
  value: string
  tooltip: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs leading-snug text-muted-foreground">
            {label}
          </span>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label={`Info: ${label}`}
                />
              }
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Info className="size-3 stroke-[1.5]" aria-hidden />
            </TooltipTrigger>
            <TooltipContent className="max-w-[320px] text-pretty">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="shrink-0 text-right text-xs font-semibold leading-snug tabular-nums text-foreground">
        {value}
      </div>
    </div>
  )
}

export function ValuationKpiMetricStrip({
  ariaLabel,
  rows,
  gridClassName = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
  className,
}: {
  ariaLabel: string
  rows: readonly ValuationKpiStripRowModel[]
  gridClassName?: string
  className?: string
}) {
  return (
    <section
      className={cn(metricStripSectionClassName, gridClassName, className)}
      aria-label={ariaLabel}
    >
      {rows.map((kpi) => (
        <MetricStripCell key={kpi.label}>
          <MetricStripLabel>{kpi.label}</MetricStripLabel>
          {kpi.marketCompare != null ? (
            <>
              <ScenarioMetricInlinePair
                baseFormatted={kpi.marketCompare.baseFormatted}
                scenarioFormatted={kpi.marketCompare.modifiedFormatted}
                showScenario={kpi.marketCompare.showScenario}
                deltaLine={kpi.marketCompare.deltaLine}
                pctLine={kpi.marketCompare.pctLine}
                deltaDirection={kpi.marketCompare.deltaDirection}
              />
              {kpi.primarySuffix != null && kpi.primarySuffix !== "" ? (
                <span className="mt-1 block text-xs font-medium text-muted-foreground">
                  {kpi.primarySuffix}
                </span>
              ) : null}
            </>
          ) : (
            <MetricStripValueRow>
              <span className="text-foreground">{kpi.primaryText}</span>
              {kpi.primarySuffix != null && kpi.primarySuffix !== "" ? (
                <span className="text-sm font-semibold text-muted-foreground">
                  {kpi.primarySuffix}
                </span>
              ) : null}
            </MetricStripValueRow>
          )}
          <MetricStripSubStack>
            {VALUATION_CONDITION_OPTIONS.map((opt) => (
              <ConditionSubValueRow
                key={opt.id}
                label={opt.label}
                value={kpi.conditionValues[opt.id]}
                tooltip={opt.description}
              />
            ))}
          </MetricStripSubStack>
        </MetricStripCell>
      ))}
    </section>
  )
}
