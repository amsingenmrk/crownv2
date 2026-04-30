"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  buildDefaultForecastScenarios,
  type ForecastEconomicOutlookScenario,
} from "@/lib/forecast-data"
import {
  forecastScenarioStorageKey,
  readForecastScenariosFromStorage,
} from "@/lib/forecast-scenario-storage"
import { cn } from "@/lib/utils"

export const FORECAST_SELECT_DEFAULT = "baseline" as const

function useForecastScenariosForAsset(assetId: string) {
  const defaults = React.useMemo(() => buildDefaultForecastScenarios(), [])
  const storageKey = React.useMemo(
    () => forecastScenarioStorageKey(assetId),
    [assetId]
  )

  const [scenarios, setScenarios] = React.useState<
    ForecastEconomicOutlookScenario[]
  >(() => readForecastScenariosFromStorage(assetId, defaults))

  const reload = React.useCallback(() => {
    setScenarios(readForecastScenariosFromStorage(assetId, defaults))
  }, [assetId, defaults])

  React.useEffect(() => {
    reload()
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey) reload()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [storageKey, reload])

  return { scenarios, reload }
}

export function AssetForecastSelect({
  assetId,
  building,
  className,
}: {
  assetId: string
  building: string
  className?: string
}) {
  const { scenarios, reload } = useForecastScenariosForAsset(assetId)

  const [value, setValue] = React.useState<string>(FORECAST_SELECT_DEFAULT)

  React.useEffect(() => {
    setValue((v) =>
      scenarios.some((s) => s.id === v)
        ? v
        : (scenarios[0]?.id ?? FORECAST_SELECT_DEFAULT)
    )
  }, [scenarios])

  const items = React.useMemo(() => {
    const r: Record<string, React.ReactNode> = {}
    for (const s of scenarios) {
      r[s.id] = s.name
    }
    return r
  }, [scenarios])

  return (
    <span
      className="block min-w-0 w-full max-w-full"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Select
        items={items}
        value={value}
        onValueChange={(v) => {
          if (v != null) setValue(v)
        }}
        onOpenChange={(open) => {
          if (open) reload()
        }}
      >
        <SelectTrigger
          className={cn(
            "h-8 w-full max-w-full min-w-0 text-left text-sm",
            className
          )}
          aria-label={`Forecast for ${building}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {scenarios.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  )
}
