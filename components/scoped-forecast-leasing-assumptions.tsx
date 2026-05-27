"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import type { ForecastAssumptions } from "@/lib/forecast-data"
import { cn } from "@/lib/utils"

export const SCOPED_FORECAST_LEASING_ASSUMPTION_FIELDS = [
  {
    key: "timeToLeaseMonths",
    label: "Time to lease",
    suffix: "mo",
    min: 3,
    max: 24,
    step: 1,
  },
  {
    key: "occupancyTargetPct",
    label: "Occupancy target",
    suffix: "%",
    min: 65,
    max: 99,
    step: 1,
  },
  {
    key: "defaultRenewalProbabilityPct",
    label: "Renewal probability",
    suffix: "%",
    min: 10,
    max: 95,
    step: 1,
  },
] as const

export type ScopedForecastLeasingAssumptionFieldKey =
  (typeof SCOPED_FORECAST_LEASING_ASSUMPTION_FIELDS)[number]["key"]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function ScopedForecastLeasingAssumptionField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  className,
  nowrapLabel = false,
}: {
  label: string
  value: number
  onChange: (next: number) => void
  min: number
  max: number
  step: number
  suffix: string
  className?: string
  nowrapLabel?: boolean
}) {
  return (
    <label
      className={cn(
        "flex h-8 min-h-8 w-full min-w-0 items-stretch overflow-hidden rounded-lg border border-border/60 bg-background/80 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40",
        className,
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center self-stretch border-r border-border/60 bg-muted/30 px-2.5 text-[12px] font-medium leading-none text-muted-foreground normal-case",
          nowrapLabel
            ? "max-w-none"
            : "max-w-[46%] sm:max-w-[55%]",
        )}
      >
        <span className={nowrapLabel ? "whitespace-nowrap" : "line-clamp-2"}>
          {label}
        </span>
      </span>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        className="h-8 min-h-8 min-w-0 flex-1 rounded-none border-0 bg-transparent px-2 py-0 text-right text-[12px] leading-none tabular-nums shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 md:text-[12px]"
        onChange={(event) => {
          const next = Number(event.target.value)
          if (Number.isNaN(next)) return
          onChange(clamp(next, min, max))
        }}
      />
      <span className="flex shrink-0 items-center self-stretch border-l border-border/60 bg-muted/15 px-2.5 text-[12px] font-medium leading-none tabular-nums text-muted-foreground">
        {suffix}
      </span>
    </label>
  )
}

/** Horizontal leasing inputs for scoped forecast alt layout (table accessory, rendered below the statement in the card). */
export function ScopedForecastLeasingAssumptionsBar({
  assumptions,
  onAssumptionsChange,
  showTitle = true,
}: {
  assumptions: ForecastAssumptions
  onAssumptionsChange: (updates: Partial<ForecastAssumptions>) => void
  showTitle?: boolean
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 max-sm:justify-center sm:flex-row sm:items-center sm:gap-6",
        showTitle ? "w-full items-end sm:justify-end" : "w-auto max-w-full items-start sm:justify-start",
      )}
    >
      {showTitle ? (
        <h3 className="m-0 w-full shrink-0 text-left text-[14px] font-medium text-foreground sm:mr-auto sm:w-auto sm:max-w-[11rem] sm:pb-0.5">
          Leasing assumptions
        </h3>
      ) : null}
      <div
        className={cn(
          "grid min-w-0 max-w-full grid-cols-1 gap-3 sm:w-max sm:flex-none sm:grid-cols-[repeat(3,max-content)]",
          showTitle ? "w-full justify-items-end sm:justify-items-start" : "w-full justify-items-start sm:w-max",
        )}
      >
        {SCOPED_FORECAST_LEASING_ASSUMPTION_FIELDS.map((field) => (
          <ScopedForecastLeasingAssumptionField
            key={field.key}
            className="w-fit max-w-full shrink-0"
            nowrapLabel
            label={field.label}
            value={assumptions[field.key]}
            onChange={(next) =>
              onAssumptionsChange({
                [field.key]:
                  field.key === "timeToLeaseMonths" ||
                  field.key === "occupancyTargetPct" ||
                  field.key === "defaultRenewalProbabilityPct"
                    ? Math.round(next)
                    : next,
              } as Pick<ForecastAssumptions, ScopedForecastLeasingAssumptionFieldKey>)
            }
            min={field.min}
            max={field.max}
            step={field.step}
            suffix={field.suffix}
          />
        ))}
      </div>
    </div>
  )
}
