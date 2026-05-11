"use client"

import { AppTopbar } from "@/components/app-topbar"
import {
  MetricStripCell,
  MetricStripLabel,
  MetricStripSubStack,
  MetricStripValueRow,
  metricStripSectionClassName,
} from "@/components/metric-strip"
import { Info } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  VALUATION_CONDITION_OPTIONS,
  type ValuationConditionId,
} from "@/lib/valuation-condition-config"
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
              <Info className="size-3 stroke-[1.5]" />
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

type KpiKey = "grossRevenue" | "opex" | "noi" | "assetValue" | "capRate"

type KpiDefinition = {
  key: KpiKey
  label: string
  /** Large number shown “as-is today” (we use Market as the primary line). */
  primaryValue: string
  /** Per-valuation-condition values listed under the primary value. */
  valuesByCondition: Record<ValuationConditionId, string>
}

const KPI_DEFS: readonly KpiDefinition[] = [
  {
    key: "grossRevenue",
    label: "Gross Revenue",
    primaryValue: "$16.8M / yr",
    valuesByCondition: {
      grossPotential: "$19.4M / yr",
      stabilized: "$17.6M / yr",
      market: "$16.8M / yr",
      markToMarket: "$18.2M / yr",
    },
  },
  {
    key: "opex",
    label: "OpEx",
    primaryValue: "$5.7M / yr",
    valuesByCondition: {
      grossPotential: "$6.1M / yr",
      stabilized: "$5.9M / yr",
      market: "$5.7M / yr",
      markToMarket: "$5.8M / yr",
    },
  },
  {
    key: "noi",
    label: "NOI",
    primaryValue: "$11.1M / yr",
    valuesByCondition: {
      grossPotential: "$13.3M / yr",
      stabilized: "$11.7M / yr",
      market: "$11.1M / yr",
      markToMarket: "$12.4M / yr",
    },
  },
  {
    key: "assetValue",
    label: "Asset Value",
    primaryValue: "$218.3M",
    valuesByCondition: {
      grossPotential: "$262.0M",
      stabilized: "$231.5M",
      market: "$218.3M",
      markToMarket: "$244.8M",
    },
  },
  {
    key: "capRate",
    label: "Cap Rate",
    primaryValue: "5.08%",
    valuesByCondition: {
      grossPotential: "5.10%",
      stabilized: "5.20%",
      market: "5.08%",
      markToMarket: "5.05%",
    },
  },
] as const

export default function ExampleKpiStripsPage() {
  return (
    <>
      <AppTopbar />
      <div
        role="main"
        className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 md:px-6"
      >
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              KPI strip experiments
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Scratch space to iterate on KPI strip layouts and supporting UI.
            </p>
          </div>

          <section className="flex min-w-0 flex-col gap-3">
            <section
              className={cn(
                metricStripSectionClassName,
                "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
                "h-fit shrink-0"
              )}
              aria-label="KPI strip example (all valuation conditions per KPI)"
            >
              {KPI_DEFS.map((kpi) => (
                <MetricStripCell key={kpi.key}>
                  <MetricStripLabel>{kpi.label}</MetricStripLabel>
                  <MetricStripValueRow>
                    <span className="text-foreground">{kpi.primaryValue}</span>
                  </MetricStripValueRow>
                  <MetricStripSubStack>
                    {VALUATION_CONDITION_OPTIONS.map((opt) => (
                      <ConditionSubValueRow
                        key={opt.id}
                        label={opt.label}
                        value={kpi.valuesByCondition[opt.id]}
                        tooltip={opt.description}
                      />
                    ))}
                  </MetricStripSubStack>
                </MetricStripCell>
              ))}
            </section>
          </section>

          <div className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground">
            Empty canvas. Add experimental KPI strip variants here.
          </div>
        </div>
      </div>
    </>
  )
}

