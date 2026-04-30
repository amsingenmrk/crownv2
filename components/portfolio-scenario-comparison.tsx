"use client"

import * as React from "react"
import {
  AssetForecastCharts,
  AssetForecastChartMetricToolbar,
} from "@/components/asset-forecast-charts"
import { PortfolioCompareDataTable } from "@/components/portfolio/portfolio-compare-data-table"
import { buildCompareColumnForecastModels } from "@/lib/compare-forecast-models"
import {
  allComparePickerValues,
  buildComparePickerOptions,
  columnForEntityKey,
  MAX_COMPARE_COLUMNS,
  MIN_COMPARE_COLUMNS,
  scenarioKey,
} from "@/lib/portfolio-compare-model"
import { subscribeAssetGroupOverrides } from "@/lib/asset-group-overrides"
import {
  getUserScenariosStoreSnapshot,
  subscribeUserScenarios,
  USER_SCENARIOS_SERVER_SNAPSHOT,
  BUILTIN_SCENARIO,
} from "@/lib/user-scenarios"
import { subscribeScenarioIncludedProperties } from "@/lib/scenario-included-properties-storage"
import type { ForecastChartTab } from "@/lib/forecast-chart-config"

function useComparePickerRefresh(): number {
  const [v, setV] = React.useReducer((n: number) => n + 1, 0)
  React.useEffect(() => {
    const bump = () => setV()
    const u = subscribeUserScenarios(bump)
    const g = subscribeAssetGroupOverrides(bump)
    const p = subscribeScenarioIncludedProperties(bump)
    const onStorage = (e: StorageEvent) => {
      if (e.key == null) return
      if (
        e.key.startsWith("glassbox:") ||
        e.key.startsWith("glassbox:scenario-")
      ) {
        bump()
      }
    }
    window.addEventListener("storage", onStorage)
    return () => {
      u()
      g()
      p()
      window.removeEventListener("storage", onStorage)
    }
  }, [])
  return v
}

export function PortfolioScenarioComparison({
  slotKeys,
  onSlotKeysChange,
}: {
  slotKeys: string[]
  onSlotKeysChange: React.Dispatch<React.SetStateAction<string[]>>
}) {
  useComparePickerRefresh()

  const userScenarios = React.useSyncExternalStore(
    subscribeUserScenarios,
    getUserScenariosStoreSnapshot,
    () => USER_SCENARIOS_SERVER_SNAPSHOT
  )

  const validKeys = React.useMemo(
    () => allComparePickerValues(userScenarios),
    [userScenarios]
  )

  const pickerOptions = React.useMemo(
    () => buildComparePickerOptions(userScenarios),
    [userScenarios]
  )

  React.useEffect(() => {
    const built = scenarioKey(BUILTIN_SCENARIO.slug)
    let next = slotKeys.map((k) => (validKeys.has(k) ? k : built))
    if (next.length > MAX_COMPARE_COLUMNS) next = next.slice(0, MAX_COMPARE_COLUMNS)
    while (next.length < MIN_COMPARE_COLUMNS) next.push(built)
    const changed =
      next.length !== slotKeys.length || next.some((k, i) => k !== slotKeys[i])
    if (changed) onSlotKeysChange(next)
  }, [validKeys, slotKeys, onSlotKeysChange])

  const baseColumns = React.useMemo(
    () =>
      slotKeys.map((key, i) => columnForEntityKey(key, userScenarios, i)),
    [slotKeys, userScenarios]
  )

  const [scenarioChartMembership, setScenarioChartMembership] =
    React.useState(false)
  React.useEffect(() => {
    setScenarioChartMembership(true)
  }, [])

  const compareForecastModels = React.useMemo(
    () =>
      buildCompareColumnForecastModels(
        baseColumns,
        slotKeys,
        scenarioChartMembership
      ),
    [baseColumns, slotKeys, scenarioChartMembership]
  )

  const [compareChartMetricTab, setCompareChartMetricTab] =
    React.useState<ForecastChartTab>("grossRevenue")

  const setSlot = React.useCallback(
    (index: number, value: string) => {
      onSlotKeysChange((prev) => {
        const next = [...prev]
        next[index] = value
        return next
      })
    },
    [onSlotKeysChange]
  )

  const addCompareColumn = React.useCallback(() => {
    const built = scenarioKey(BUILTIN_SCENARIO.slug)
    onSlotKeysChange((prev) => {
      if (prev.length >= MAX_COMPARE_COLUMNS) return prev
      return [...prev, built]
    })
  }, [onSlotKeysChange])

  const removeCompareColumn = React.useCallback(
    (index: number) => {
      onSlotKeysChange((prev) => {
        if (prev.length <= MIN_COMPARE_COLUMNS) return prev
        return prev.filter((_, i) => i !== index)
      })
    },
    [onSlotKeysChange]
  )

  return (
    <div className="mb-6 flex flex-col gap-6">
      <PortfolioCompareDataTable
        slotKeys={slotKeys}
        setSlot={setSlot}
        pickerOptions={pickerOptions}
        baseColumns={baseColumns}
        onAddColumn={addCompareColumn}
        onRemoveColumn={removeCompareColumn}
      />
      <AssetForecastChartMetricToolbar
        models={compareForecastModels}
        variant="compare"
        metricTab={compareChartMetricTab}
        onMetricTabChange={setCompareChartMetricTab}
      />
      <AssetForecastCharts
        models={compareForecastModels}
        metricTab={compareChartMetricTab}
        onMetricTabChange={setCompareChartMetricTab}
      />
    </div>
  )
}

