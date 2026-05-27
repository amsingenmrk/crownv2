"use client"

import * as React from "react"

import {
  ScopedForecastLeasingAssumptionField,
  SCOPED_FORECAST_LEASING_ASSUMPTION_FIELDS,
  type ScopedForecastLeasingAssumptionFieldKey,
} from "@/components/scoped-forecast-leasing-assumptions"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  LEASE_TYPE_OPTIONS,
  type AssetLeasingAssumptionsState,
} from "@/lib/asset-leasing-assumptions"
import { cn } from "@/lib/utils"

export function AssetLeasingAssumptionsFields({
  assumptions,
  onAssumptionsChange,
  className,
  idPrefix = "",
  showRenewalProbability = true,
  layout = "single",
}: {
  assumptions: AssetLeasingAssumptionsState
  onAssumptionsChange: (updates: Partial<AssetLeasingAssumptionsState>) => void
  className?: string
  idPrefix?: string
  showRenewalProbability?: boolean
  /** `two-column` puts lease type and term in a second column (space editor). */
  layout?: "single" | "two-column"
}) {
  const leaseTypeItems = React.useMemo(() => {
    const items: Record<string, React.ReactNode> = {}
    for (const option of LEASE_TYPE_OPTIONS) {
      items[option.value] = option.label
    }
    return items
  }, [])

  const leasingFields = showRenewalProbability
    ? SCOPED_FORECAST_LEASING_ASSUMPTION_FIELDS
    : SCOPED_FORECAST_LEASING_ASSUMPTION_FIELDS.filter(
        (field) => field.key !== "defaultRenewalProbabilityPct"
      )

  const numericFields = (
    <div className="grid min-w-0 gap-3">
      {leasingFields.map((field) => (
        <ScopedForecastLeasingAssumptionField
          key={field.key}
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
            } as Pick<AssetLeasingAssumptionsState, ScopedForecastLeasingAssumptionFieldKey>)
          }
          min={field.min}
          max={field.max}
          step={field.step}
          suffix={field.suffix}
        />
      ))}
    </div>
  )

  const leaseFields = (
    <div className="grid min-w-0 gap-3">
      <label className="flex h-8 min-h-8 w-full min-w-0 items-stretch overflow-hidden rounded-lg border border-border/60 bg-background/80 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40">
        <span className="flex max-w-[46%] shrink-0 items-center self-stretch border-r border-border/60 bg-muted/30 px-2.5 text-[12px] font-medium leading-none text-muted-foreground sm:max-w-[55%]">
          <span className="line-clamp-2">Lease type</span>
        </span>
        <Select
          items={leaseTypeItems}
          value={assumptions.leaseType}
          onValueChange={(value) => {
            if (value == null) return
            onAssumptionsChange({
              leaseType: value as AssetLeasingAssumptionsState["leaseType"],
            })
          }}
        >
          <SelectTrigger
            id={`${idPrefix}leasing-lease-type`}
            className="h-8 min-h-8 w-full min-w-0 flex-1 justify-end rounded-none border-0 bg-transparent py-0 pr-1.5 pl-2 text-right text-[12px] leading-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 [&_svg]:size-3 *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:flex-1 *:data-[slot=select-value]:justify-end *:data-[slot=select-value]:text-right"
          >
            <SelectValue
              placeholder="Select lease type"
              className="justify-end text-right"
            />
          </SelectTrigger>
          <SelectContent className="text-[12px]">
            {LEASE_TYPE_OPTIONS.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="py-1 text-[12px]"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="flex h-8 min-h-8 w-full min-w-0 items-stretch overflow-hidden rounded-lg border border-border/60 bg-background/80 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40">
        <span className="flex max-w-[46%] shrink-0 items-center self-stretch border-r border-border/60 bg-muted/30 px-2.5 text-[12px] font-medium leading-none text-muted-foreground sm:max-w-[55%]">
          <span className="line-clamp-2">Lease term</span>
        </span>
        <Input
          id={`${idPrefix}leasing-lease-term`}
          type="number"
          value={assumptions.leaseTermYears}
          min={1}
          max={30}
          step={1}
          className="h-8 min-h-8 min-w-0 flex-1 rounded-none border-0 bg-transparent px-2 py-0 text-right text-[12px] leading-none tabular-nums shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 md:text-[12px]"
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isNaN(next)) return
            onAssumptionsChange({
              leaseTermYears: Math.min(30, Math.max(1, Math.round(next))),
            })
          }}
        />
        <span className="flex shrink-0 items-center self-stretch border-l border-border/60 bg-muted/15 px-2.5 text-[12px] font-medium leading-none tabular-nums text-muted-foreground">
          yrs
        </span>
      </label>
    </div>
  )

  if (layout === "two-column") {
    return (
      <div
        className={cn(
          "grid min-w-0 gap-3 sm:grid-cols-2 sm:items-start sm:gap-4",
          className
        )}
      >
        {numericFields}
        {leaseFields}
      </div>
    )
  }

  return (
    <div className={cn("grid gap-3", className)}>
      {numericFields}
      {leaseFields}
    </div>
  )
}
