"use client"

import * as React from "react"
import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { INPUT_LABEL_TEXT_CLASS } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  SCOPED_FORECAST_LEASING_ASSUMPTION_FIELDS,
  ScopedForecastLeasingAssumptionField,
  type ScopedForecastLeasingAssumptionFieldKey,
} from "@/components/scoped-forecast-leasing-assumptions"
import type { ForecastAssumptions } from "@/lib/forecast-data"
import type { ScopedForecastAssetSelection } from "@/lib/scoped-forecast"
import {
  modificationItemsRecord,
  modificationSelectLabelFromOption,
  modificationSelectPlaceholder,
  outlookSetItemsRecord,
  outlookSetSelectLabel,
  outlookSetSelectPlaceholder,
} from "@/lib/scoped-forecast-select-labels"

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
      className="flex w-full shrink-0 flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm lg:w-80"
      aria-label="Forecast inputs"
    >
      <h2 className="text-sm font-semibold text-foreground">Forecast Inputs</h2>

      <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className={INPUT_LABEL_TEXT_CLASS}>Building selections</p>
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
                    <span className={INPUT_LABEL_TEXT_CLASS}>
                      Saved modification set
                    </span>
                    <Select
                      items={modificationItemsRecord(selection.buildingVersionOptions)}
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
                        <SelectValue placeholder={modificationSelectPlaceholder()} />
                      </SelectTrigger>
                      <SelectContent>
                        {selection.buildingVersionOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {modificationSelectLabelFromOption(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>

                  <label className="space-y-1">
                    <span className={INPUT_LABEL_TEXT_CLASS}>Outlook</span>
                    <Select
                      items={outlookSetItemsRecord(selection.outlookSetOptions)}
                      value={selection.selectedOutlookSetId}
                      onValueChange={(value) => {
                        if (value == null) return
                        onSelectOutlookSet(selection.row.id, value)
                      }}
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-full text-[0.8rem]"
                        aria-label={`${selection.row.building} outlook`}
                      >
                        <SelectValue placeholder={outlookSetSelectPlaceholder()} />
                      </SelectTrigger>
                      <SelectContent>
                        {selection.outlookSetOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {outlookSetSelectLabel(option)}
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
        <p className={INPUT_LABEL_TEXT_CLASS}>Leasing assumptions</p>
        <div className="grid gap-3">
          {SCOPED_FORECAST_LEASING_ASSUMPTION_FIELDS.map((field) => (
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
                } as Pick<ForecastAssumptions, ScopedForecastLeasingAssumptionFieldKey>)
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
