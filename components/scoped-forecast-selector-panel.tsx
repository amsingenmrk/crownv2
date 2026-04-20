"use client"

import * as React from "react"
import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ForecastAssumptions } from "@/lib/forecast-data"
import type { ScopedForecastAssetSelection } from "@/lib/scoped-forecast"

const ASSUMPTION_FIELDS = [
  {
    key: "timeToLeaseMonths",
    label: "Time to Lease",
    suffix: "mo",
    min: 3,
    max: 24,
    step: 1,
  },
  {
    key: "occupancyTargetPct",
    label: "Occupancy Target",
    suffix: "%",
    min: 65,
    max: 99,
    step: 1,
  },
  {
    key: "defaultRenewalProbabilityPct",
    label: "Renewal Probability",
    suffix: "%",
    min: 10,
    max: 95,
    step: 1,
  },
] as const

type AssumptionFieldKey = (typeof ASSUMPTION_FIELDS)[number]["key"]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function AssumptionField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  label: string
  value: number
  onChange: (next: number) => void
  min: number
  max: number
  step: number
  suffix: string
}) {
  return (
    <label className="min-w-0 space-y-0.5">
      <div className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </div>
      <div className="relative">
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          className="h-8 border-border/60 bg-background/80 pr-11 text-[0.82rem] tabular-nums shadow-none"
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isNaN(next)) return
            onChange(clamp(next, min, max))
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] text-muted-foreground">
          {suffix}
        </span>
      </div>
    </label>
  )
}

function selectItemsFromOptions(options: readonly { id: string; name: string }[]) {
  return Object.fromEntries(options.map((option) => [option.id, option.name])) as Record<
    string,
    string
  >
}

export function ScopedForecastSelectorPanel({
  assetSelections,
  assumptions,
  onAssumptionsChange,
  onSelectBuildingVersion,
  onSelectOutlookSet,
  onReset,
}: {
  assetSelections: readonly ScopedForecastAssetSelection[]
  assumptions: ForecastAssumptions
  onAssumptionsChange: (updates: Partial<ForecastAssumptions>) => void
  onSelectBuildingVersion: (assetId: string, nextId: string) => void
  onSelectOutlookSet: (assetId: string, nextId: string) => void
  onReset: () => void
}) {
  return (
    <aside
      className="flex w-full shrink-0 flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm lg:w-80 xl:w-96"
      aria-label="Forecast inputs"
    >
      <h2 className="text-sm font-semibold text-foreground">Forecast Inputs</h2>

      <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Building Selections
            </p>
            <p className="text-xs text-muted-foreground">
              {assetSelections.length} building{assetSelections.length === 1 ? "" : "s"} in scope
            </p>
          </div>
        </div>

        {assetSelections.length > 0 ? (
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {assetSelections.map((selection) => (
              <div
                key={selection.row.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="space-y-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {selection.row.building}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {selection.row.location}
                  </div>
                </div>

                <div className="grid gap-3">
                  <label className="space-y-1">
                    <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      Saved Modification Set
                    </span>
                    <Select
                      items={selectItemsFromOptions(selection.buildingVersionOptions)}
                      value={selection.selectedBuildingVersionId}
                      onValueChange={(value) => {
                        if (value == null) return
                        onSelectBuildingVersion(selection.row.id, value)
                      }}
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-full text-[0.8rem]"
                        aria-label={`${selection.row.building} saved modification set`}
                      >
                        <SelectValue placeholder="Baseline building" />
                      </SelectTrigger>
                      <SelectContent>
                        {selection.buildingVersionOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      Saved Economic Outlook Set
                    </span>
                    <Select
                      items={selectItemsFromOptions(selection.outlookSetOptions)}
                      value={selection.selectedOutlookSetId}
                      onValueChange={(value) => {
                        if (value == null) return
                        onSelectOutlookSet(selection.row.id, value)
                      }}
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-full text-[0.8rem]"
                        aria-label={`${selection.row.building} saved outlook set`}
                      >
                        <SelectValue placeholder="Baseline outlook" />
                      </SelectTrigger>
                      <SelectContent>
                        {selection.outlookSetOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/80 bg-background/60 px-3 py-4 text-sm text-muted-foreground">
            No buildings are currently in scope for this forecast page.
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Leasing Assumptions
        </p>
        <div className="grid gap-3">
          {ASSUMPTION_FIELDS.map((field) => (
            <AssumptionField
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
                } as Pick<ForecastAssumptions, AssumptionFieldKey>)
              }
              min={field.min}
              max={field.max}
              step={field.step}
              suffix={field.suffix}
            />
          ))}
        </div>
      </section>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-center"
        onClick={onReset}
      >
        <RefreshCw className="size-3.5" />
        Reset
      </Button>
    </aside>
  )
}
