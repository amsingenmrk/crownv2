"use client"

import * as React from "react"

import {
  parseStoredSets,
  storageKeyForAsset,
} from "@/components/building-modifications-sidebar"
import {
  getAssetGroupOverridesSnapshot,
  parseAssetGroupOverrideSnapshot,
  subscribeAssetGroupOverrides,
} from "@/lib/asset-group-overrides"
import { ASSETS, getAssetById } from "@/lib/assets"
import {
  buildDefaultForecastScenarios,
  type ForecastAssumptions,
} from "@/lib/forecast-data"
import {
  scenarioComparePortfolioRows,
} from "@/lib/scenario-compare-rows"
import {
  SCOPED_FORECAST_BASELINE_BUILDING_VERSION_ID,
  SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID,
  baselineScopedForecastBuildingVersionOption,
  buildDefaultScopedForecastAssumptions,
  buildScopedPresetOutlookSetOptions,
  type ScopedForecastAssetSelection,
  type ScopedForecastBuildingVersionOption,
  type ScopedForecastOutlookSetOption,
  type ScopedForecastScope,
} from "@/lib/scoped-forecast"
import { portfolioAssetRowForAsset } from "@/lib/portfolio-row-for-asset"

type SelectionOptionsByAssetId = Record<
  string,
  {
    buildingVersionOptions: readonly ScopedForecastBuildingVersionOption[]
    outlookSetOptions: readonly ScopedForecastOutlookSetOption[]
  }
>

function syncSelectedIdsWithOptions({
  previous,
  assetIds,
  optionsByAssetId,
  baselineId,
}: {
  previous: Record<string, string>
  assetIds: readonly string[]
  optionsByAssetId: SelectionOptionsByAssetId
  baselineId: string
}) {
  const next: Record<string, string> = {}

  for (const assetId of assetIds) {
    const options =
      baselineId === SCOPED_FORECAST_BASELINE_BUILDING_VERSION_ID
        ? optionsByAssetId[assetId]?.buildingVersionOptions
        : optionsByAssetId[assetId]?.outlookSetOptions
    const selectedId = previous[assetId]
    const resolvedId =
      selectedId != null && options?.some((option) => option.id === selectedId)
        ? selectedId
        : baselineId
    next[assetId] = resolvedId
  }

  return next
}

export function useScopedForecastState(scope: ScopedForecastScope) {
  const defaultOutlooks = React.useMemo(() => buildDefaultForecastScenarios(), [])
  const assetGroupOverrideSnap = React.useSyncExternalStore(
    subscribeAssetGroupOverrides,
    getAssetGroupOverridesSnapshot,
    () => ""
  )
  const assetGroupData = React.useMemo(
    () => parseAssetGroupOverrideSnapshot(assetGroupOverrideSnap),
    [assetGroupOverrideSnap]
  )
  const [optionsReloadTick, setOptionsReloadTick] = React.useState(0)
  const [selectedBuildingVersionIds, setSelectedBuildingVersionIds] =
    React.useState<Record<string, string>>({})
  const [selectedOutlookSetIds, setSelectedOutlookSetIds] = React.useState<
    Record<string, string>
  >({})

  const portfolioAssetRows = React.useMemo(
    () =>
      ASSETS.map((asset, index) =>
        portfolioAssetRowForAsset(
          getAssetById(asset.id, assetGroupData) ?? asset,
          index
        )
      ).sort(
        (left, right) =>
          right.liftPercent - left.liftPercent ||
          left.building.localeCompare(right.building, undefined, {
            sensitivity: "base",
          })
      ),
    [assetGroupData]
  )

  const scopedRows = React.useMemo(() => {
    if (scope.kind === "scenario") {
      return scenarioComparePortfolioRows(scope.scenarioSlug, portfolioAssetRows)
    }
    if (scope.portfolioScopeId != null) {
      return portfolioAssetRows.filter(
        (row) => row.groupId === scope.portfolioScopeId
      )
    }
    return portfolioAssetRows
  }, [
    portfolioAssetRows,
    scope.kind,
    scope.kind === "scenario" ? scope.scenarioSlug : scope.portfolioScopeId,
  ])

  React.useEffect(() => {
    const reload = () => setOptionsReloadTick((current) => current + 1)
    const onStorage = (event: StorageEvent) => {
      if (
        event.key != null &&
        event.key.startsWith("glassbox:modification-sets:")
      ) {
        reload()
      }
    }

    window.addEventListener("storage", onStorage)
    window.addEventListener("glassbox:modification-sets-changed", reload)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("glassbox:modification-sets-changed", reload)
    }
  }, [])

  const optionsByAssetId = React.useMemo<SelectionOptionsByAssetId>(() => {
    const next: SelectionOptionsByAssetId = {}
    for (const row of scopedRows) {
      const buildingVersionOptions: ScopedForecastBuildingVersionOption[] = [
        baselineScopedForecastBuildingVersionOption(),
        ...parseStoredSets(
          typeof localStorage === "undefined"
            ? null
            : localStorage.getItem(storageKeyForAsset(row.id))
        )
          .sort((left, right) => left.name.localeCompare(right.name))
          .map((set) => ({
            id: set.id,
            name: set.name,
            values: set.values,
          })),
      ]

      /** Match asset-level forecast: only built-in scenarios from {@link buildDefaultForecastScenarios}. */
      const outlookSetOptions: ScopedForecastOutlookSetOption[] =
        buildScopedPresetOutlookSetOptions(defaultOutlooks)

      next[row.id] = {
        buildingVersionOptions,
        outlookSetOptions,
      }
    }

    return next
  }, [defaultOutlooks, optionsReloadTick, scopedRows])

  React.useEffect(() => {
    const assetIds = scopedRows.map((row) => row.id)
    setSelectedBuildingVersionIds((previous) =>
      syncSelectedIdsWithOptions({
        previous,
        assetIds,
        optionsByAssetId,
        baselineId: SCOPED_FORECAST_BASELINE_BUILDING_VERSION_ID,
      })
    )
    setSelectedOutlookSetIds((previous) =>
      syncSelectedIdsWithOptions({
        previous,
        assetIds,
        optionsByAssetId,
        baselineId: SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID,
      })
    )
  }, [optionsByAssetId, scopedRows])

  const defaultAssumptions = React.useMemo(
    () => buildDefaultScopedForecastAssumptions(scopedRows.map((row) => row.id)),
    [scopedRows]
  )
  const [assumptions, setAssumptions] = React.useState<ForecastAssumptions>(
    defaultAssumptions
  )

  React.useLayoutEffect(() => {
    setAssumptions(defaultAssumptions)
  }, [defaultAssumptions])

  const assetSelections = React.useMemo<ScopedForecastAssetSelection[]>(() => {
    return scopedRows.map((row) => {
      const rowOptions = optionsByAssetId[row.id] ?? {
        buildingVersionOptions: [baselineScopedForecastBuildingVersionOption()],
        outlookSetOptions: buildScopedPresetOutlookSetOptions(defaultOutlooks),
      }
      const selectedBuildingVersion =
        rowOptions.buildingVersionOptions.find(
          (option) => option.id === selectedBuildingVersionIds[row.id]
        ) ?? rowOptions.buildingVersionOptions[0]!
      const selectedOutlookSet =
        rowOptions.outlookSetOptions.find(
          (option) => option.id === selectedOutlookSetIds[row.id]
        ) ?? rowOptions.outlookSetOptions[0]!

      return {
        row,
        buildingVersionOptions: rowOptions.buildingVersionOptions,
        outlookSetOptions: rowOptions.outlookSetOptions,
        selectedBuildingVersionId: selectedBuildingVersion.id,
        selectedOutlookSetId: selectedOutlookSet.id,
        selectedBuildingVersion,
        selectedOutlookSet,
      }
    })
  }, [
    defaultOutlooks,
    optionsByAssetId,
    scopedRows,
    selectedBuildingVersionIds,
    selectedOutlookSetIds,
  ])

  const setSelectedBuildingVersionId = React.useCallback(
    (assetId: string, nextId: string) => {
      setSelectedBuildingVersionIds((current) => ({
        ...current,
        [assetId]: nextId,
      }))
    },
    []
  )

  const setSelectedOutlookSetId = React.useCallback(
    (assetId: string, nextId: string) => {
      setSelectedOutlookSetIds((current) => ({
        ...current,
        [assetId]: nextId,
      }))
    },
    []
  )

  const resetSelections = React.useCallback(() => {
    const nextBuildingSelections: Record<string, string> = {}
    const nextOutlookSelections: Record<string, string> = {}

    for (const row of scopedRows) {
      nextBuildingSelections[row.id] =
        SCOPED_FORECAST_BASELINE_BUILDING_VERSION_ID
      nextOutlookSelections[row.id] = SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID
    }

    setSelectedBuildingVersionIds(nextBuildingSelections)
    setSelectedOutlookSetIds(nextOutlookSelections)
    setAssumptions(defaultAssumptions)
  }, [defaultAssumptions, scopedRows])

  return {
    assetSelections,
    assumptions,
    setAssumptions,
    resetSelections,
    setSelectedBuildingVersionId,
    setSelectedOutlookSetId,
  }
}
