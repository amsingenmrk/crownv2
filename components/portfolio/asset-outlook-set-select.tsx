"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useScenarioModificationSelections } from "@/components/scenario-modification-selections-context"
import { buildDefaultForecastScenarios } from "@/lib/forecast-data"
import {
  SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID,
  buildScopedPresetOutlookSetOptions,
} from "@/lib/scoped-forecast"
import { outlookSetSelectLabel } from "@/lib/scoped-forecast-select-labels"
import { cn } from "@/lib/utils"

export function AssetOutlookSetSelect({
  assetId,
  building,
}: {
  assetId: string
  building: string
}) {
  const defaultOutlooks = React.useMemo(() => buildDefaultForecastScenarios(), [])
  const presetOptions = React.useMemo(
    () => buildScopedPresetOutlookSetOptions(defaultOutlooks),
    [defaultOutlooks]
  )
  const { outlookSelections, setOutlookTableSelection } =
    useScenarioModificationSelections()
  const storedId = outlookSelections[assetId] ?? ""
  const value =
    storedId === "" ? SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID : storedId

  const itemLabels = React.useMemo(
    () =>
      Object.fromEntries(
        presetOptions.map((option) => [option.id, outlookSetSelectLabel(option)])
      ) as Record<string, string>,
    [presetOptions]
  )

  return (
    <span
      className="block min-w-0 w-full max-w-full"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Select
        items={itemLabels}
        value={value}
        onValueChange={(v) =>
          setOutlookTableSelection(
            assetId,
            v == null || v === SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID ? "" : v
          )
        }
      >
        <SelectTrigger
          size="sm"
          className={cn(
            "h-7 w-full max-w-[7.25rem] min-w-0 text-[0.75rem]",
            storedId !== "" &&
              "border-sky-500/45 bg-sky-500/[0.09] font-medium text-sky-900 shadow-sm hover:bg-sky-500/[0.12] hover:border-sky-500/55 focus-visible:border-sky-500 focus-visible:ring-sky-500/25 dark:border-sky-400/40 dark:bg-sky-500/[0.14] dark:text-sky-100 dark:hover:bg-sky-500/20 dark:hover:border-sky-400/55 dark:focus-visible:border-sky-400 dark:focus-visible:ring-sky-400/30 [&_svg]:text-sky-700 dark:[&_svg]:text-sky-300"
          )}
          aria-label={`Economic outlook for ${building}`}
        >
          <SelectValue
            placeholder={outlookSetSelectLabel(presetOptions[0]!)}
          />
        </SelectTrigger>
        <SelectContent>
          {presetOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {outlookSetSelectLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  )
}
