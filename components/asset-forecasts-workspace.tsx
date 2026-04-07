"use client"

import * as React from "react"
import { RefreshCw } from "lucide-react"

import { AssetForecastsTable } from "@/components/asset-forecasts-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  buildAssetForecastModel,
  defaultForecastAssumptionsForAsset,
  FORECAST_SCENARIOS,
  type ForecastAssumptions,
  type ForecastScenarioId,
} from "@/lib/forecast-data"

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
})

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
    <label className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="relative">
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          className="pr-14 tabular-nums"
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isNaN(next)) return
            onChange(clamp(next, min, max))
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
          {suffix}
        </span>
      </div>
    </label>
  )
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-border bg-muted/20 px-3 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-2 font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  )
}

export function AssetForecastsWorkspace({ assetId }: { assetId: string }) {
  const defaultAssumptions = React.useMemo(
    () => defaultForecastAssumptionsForAsset(assetId),
    [assetId]
  )
  const [scenarioId, setScenarioId] = React.useState<ForecastScenarioId>("base")
  const [assumptions, setAssumptions] = React.useState<ForecastAssumptions>(
    defaultAssumptions
  )

  React.useEffect(() => {
    setScenarioId("base")
    setAssumptions(defaultAssumptions)
  }, [defaultAssumptions])

  const model = React.useMemo(
    () =>
      buildAssetForecastModel({
        assetId,
        scenarioId,
        assumptions,
      }),
    [assetId, scenarioId, assumptions]
  )

  const updateAssumption = React.useCallback((updates: Partial<ForecastAssumptions>) => {
    setAssumptions((prev) => ({
      ...prev,
      ...updates,
    }))
  }, [])

  return (
    <section
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      aria-label="Forecast statement"
    >
      <div className="border-b border-border px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Forecast Statement</h2>
            <p className="text-sm text-muted-foreground">
              {model.assetName} · {model.scenario.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              value={[scenarioId]}
              onValueChange={(values) => {
                const next = values[0]
                if (next === "base" || next === "growth" || next === "defensive") {
                  setScenarioId(next)
                }
              }}
              aria-label="Switch forecast scenario"
            >
              {FORECAST_SCENARIOS.map((scenario) => (
                <ToggleGroupItem key={scenario.id} value={scenario.id}>
                  {scenario.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <Button
              type="button"
              variant={assumptions.markToMarketEnabled ? "secondary" : "outline"}
              size="sm"
              onClick={() =>
                updateAssumption({
                  markToMarketEnabled: !assumptions.markToMarketEnabled,
                })
              }
            >
              Mark to Market {assumptions.markToMarketEnabled ? "On" : "Off"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setScenarioId("base")
                setAssumptions(defaultAssumptions)
              }}
            >
              <RefreshCw className="size-3.5" />
              Reset
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <AssumptionField
            label="Time to Lease"
            value={assumptions.timeToLeaseMonths}
            onChange={(next) => updateAssumption({ timeToLeaseMonths: Math.round(next) })}
            min={3}
            max={24}
            step={1}
            suffix="mo"
          />
          <AssumptionField
            label="Occupancy Target"
            value={assumptions.occupancyTargetPct}
            onChange={(next) => updateAssumption({ occupancyTargetPct: Math.round(next) })}
            min={65}
            max={99}
            step={1}
            suffix="%"
          />
          <AssumptionField
            label="Renewal Probability"
            value={assumptions.defaultRenewalProbabilityPct}
            onChange={(next) =>
              updateAssumption({ defaultRenewalProbabilityPct: Math.round(next) })
            }
            min={10}
            max={95}
            step={1}
            suffix="%"
          />
          <AssumptionField
            label="Exit Cap"
            value={assumptions.exitCapRatePct}
            onChange={(next) =>
              updateAssumption({
                exitCapRatePct: Number(clamp(next, 4, 8).toFixed(2)),
              })
            }
            min={4}
            max={8}
            step={0.05}
            suffix="%"
          />
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <SummaryChip
            label="Current Occ"
            value={`${model.summary.currentOccupancyPct.toFixed(2)}%`}
          />
          <SummaryChip
            label="Target Occ"
            value={`${model.summary.targetOccupancyPct.toFixed(0)}%`}
          />
          <SummaryChip
            label="Annual NOI"
            value={compactCurrencyFormatter.format(model.summary.currentAnnualNoi)}
          />
          <SummaryChip
            label="Exit Cap"
            value={`${model.summary.exitCapRatePct.toFixed(2)}%`}
          />
        </div>

        <AssetForecastsTable
          periods={model.periods}
          rows={model.statementRows}
          revenueBreakdown={model.revenueBreakdown}
        />
      </div>
    </section>
  )
}
