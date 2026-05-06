"use client"

import * as React from "react"

import {
  parseStoredSets,
  storageKeyForAsset,
} from "@/lib/building-modification-sets-storage"
import { useScenarioModificationSelectionsOptional } from "@/components/scenario-modification-selections-context"
import {
  getAssetGroupOverridesSnapshot,
  parseAssetGroupOverrideSnapshot,
  subscribeAssetGroupOverrides,
} from "@/lib/asset-group-overrides"
import { ASSETS, getAssetById, portfolioScopeHref } from "@/lib/assets"
import {
  buildDefaultForecastScenarios,
  type ForecastAssumptions,
} from "@/lib/forecast-data"
import {
  defaultPortfolioAssetsTableSorting,
  readPortfolioAssetsTableSorting,
  readPortfolioAssetsTableVisibleOrder,
  sortPortfolioAssetRows,
  sortPortfolioAssetRowsByVisibleOrder,
} from "@/lib/portfolio-assets-table-sorting"
import {
  scenarioComparePortfolioRows,
} from "@/lib/scenario-compare-rows"
import { scenarioPathFromSlug } from "@/lib/scenario-membership"
import {
  DEFAULT_SCOPED_FORECAST_PORTFOLIO_SCENARIO_PROBABILITIES,
  SCOPED_FORECAST_BASELINE_BUILDING_VERSION_ID,
  SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID,
  baselineScopedForecastBuildingVersionOption,
  buildDefaultScopedForecastAssumptions,
  buildScopedPresetOutlookSetOptions,
  normalizeScopedForecastPortfolioScenarioProbabilities,
  outlookWeightProbabilitiesToSlider,
  outlookWeightSliderToProbabilities,
  type ScopedForecastAssetSelection,
  type ScopedForecastBuildingVersionOption,
  type ScopedForecastPortfolioModificationMode,
  type ScopedForecastPortfolioScenarioId,
  type ScopedForecastPortfolioScenarioProbabilities,
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
  const scenarioModificationsCtx = useScenarioModificationSelectionsOptional()
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
  const isScenarioScope = scope.kind === "scenario"
  const useScenarioTableModificationSelections =
    isScenarioScope && scenarioModificationsCtx != null
  const scenarioSlug = isScenarioScope ? scope.scenarioSlug : undefined
  const portfolioScopeId =
    scope.kind === "portfolio" ? scope.portfolioScopeId : undefined
  const scopeIdentity = `${scope.kind}:${scenarioSlug ?? portfolioScopeId ?? "overview"}`
  const snapshotSortVariant = isScenarioScope ? "scenarios" : "portfolio"
  const snapshotPathname = React.useMemo(() => {
    if (isScenarioScope && scenarioSlug != null) {
      return scenarioPathFromSlug(scenarioSlug)
    }
    if (portfolioScopeId != null) {
      return portfolioScopeHref(portfolioScopeId)
    }
    return "/portfolio"
  }, [isScenarioScope, portfolioScopeId, scenarioSlug])
  const [snapshotSorting, setSnapshotSorting] = React.useState(() =>
    defaultPortfolioAssetsTableSorting(snapshotSortVariant)
  )
  const [snapshotVisibleOrder, setSnapshotVisibleOrder] = React.useState<string[]>([])

  /**
   * Scenario row membership reads `localStorage` (eligibility, exclusions). SSR has no
   * storage; the old early-return used the full row list while the client filtered →
   * hydration mismatch. Until mount, mirror SSR by ignoring storage on the client too.
   */
  const [scenarioCompareStorageReady, setScenarioCompareStorageReady] = React.useState(
    () => typeof window === "undefined"
  )

  React.useLayoutEffect(() => {
    setSnapshotSorting(readPortfolioAssetsTableSorting(snapshotPathname, snapshotSortVariant))
    setSnapshotVisibleOrder(readPortfolioAssetsTableVisibleOrder(snapshotPathname))
  }, [snapshotPathname, snapshotSortVariant])

  React.useLayoutEffect(() => {
    setScenarioCompareStorageReady(true)
  }, [])

  const scopedRows = React.useMemo(() => {
    const baseRows = (() => {
      if (isScenarioScope && scenarioSlug != null) {
        return scenarioComparePortfolioRows(scenarioSlug, portfolioAssetRows, {
          ignoreLocalStorage: !scenarioCompareStorageReady,
        })
      }
      if (portfolioScopeId != null) {
        return portfolioAssetRows.filter((row) => row.groupId === portfolioScopeId)
      }
      return portfolioAssetRows
    })()

    if (snapshotVisibleOrder.length > 0) {
      return sortPortfolioAssetRowsByVisibleOrder(baseRows, snapshotVisibleOrder)
    }

    return sortPortfolioAssetRows(baseRows, snapshotSorting)
  }, [
    isScenarioScope,
    portfolioAssetRows,
    portfolioScopeId,
    scenarioCompareStorageReady,
    scenarioSlug,
    snapshotVisibleOrder,
    snapshotSorting,
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
    void optionsReloadTick
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
    if (!useScenarioTableModificationSelections) {
      setSelectedBuildingVersionIds((previous) =>
        syncSelectedIdsWithOptions({
          previous,
          assetIds,
          optionsByAssetId,
          baselineId: SCOPED_FORECAST_BASELINE_BUILDING_VERSION_ID,
        })
      )
    }
    if (!useScenarioTableModificationSelections) {
      setSelectedOutlookSetIds((previous) =>
        syncSelectedIdsWithOptions({
          previous,
          assetIds,
          optionsByAssetId,
          baselineId: SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID,
        })
      )
    }
  }, [optionsByAssetId, scopedRows, useScenarioTableModificationSelections])

  const defaultAssumptions = React.useMemo(
    () => buildDefaultScopedForecastAssumptions(scopedRows.map((row) => row.id)),
    [scopedRows]
  )
  const [assumptions, setAssumptions] = React.useState<ForecastAssumptions>(
    defaultAssumptions
  )
  const [portfolioModificationMode, setPortfolioModificationMode] =
    React.useState<ScopedForecastPortfolioModificationMode>("baseline")
  const [portfolioScenarioProbabilities, setPortfolioScenarioProbabilities] =
    React.useState<ScopedForecastPortfolioScenarioProbabilities>(() =>
      normalizeScopedForecastPortfolioScenarioProbabilities(
        DEFAULT_SCOPED_FORECAST_PORTFOLIO_SCENARIO_PROBABILITIES
      )
    )
  /** Exact 0–100 handle position; probabilities alone round-trip through an approximate inverse and would snap the thumb. */
  const [portfolioOutlookSliderValue, setPortfolioOutlookSliderValue] = React.useState(() =>
    outlookWeightProbabilitiesToSlider(
      normalizeScopedForecastPortfolioScenarioProbabilities(
        DEFAULT_SCOPED_FORECAST_PORTFOLIO_SCENARIO_PROBABILITIES
      )
    )
  )

  React.useLayoutEffect(() => {
    setAssumptions(defaultAssumptions)
  }, [defaultAssumptions])

  React.useEffect(() => {
    setPortfolioModificationMode("baseline")
    const normalized = normalizeScopedForecastPortfolioScenarioProbabilities(
      DEFAULT_SCOPED_FORECAST_PORTFOLIO_SCENARIO_PROBABILITIES
    )
    setPortfolioScenarioProbabilities(normalized)
    setPortfolioOutlookSliderValue(outlookWeightProbabilitiesToSlider(normalized))
  }, [scopeIdentity])

  const assetSelections = React.useMemo<ScopedForecastAssetSelection[]>(() => {
    const tableSelections =
      useScenarioTableModificationSelections && scenarioModificationsCtx != null
        ? scenarioModificationsCtx.selections
        : null
    const outlookTableSelections =
      useScenarioTableModificationSelections && scenarioModificationsCtx != null
        ? scenarioModificationsCtx.outlookSelections
        : null

    return scopedRows.map((row) => {
      const rowOptions = optionsByAssetId[row.id] ?? {
        buildingVersionOptions: [baselineScopedForecastBuildingVersionOption()],
        outlookSetOptions: buildScopedPresetOutlookSetOptions(defaultOutlooks),
      }
      const resolvedBuildingVersionId =
        tableSelections != null
          ? (() => {
              const fromTable = tableSelections[row.id]
              if (fromTable != null && fromTable !== "") return fromTable
              return SCOPED_FORECAST_BASELINE_BUILDING_VERSION_ID
            })()
          : selectedBuildingVersionIds[row.id]
      const resolvedOutlookSetId =
        outlookTableSelections != null
          ? (() => {
              const fromTable = outlookTableSelections[row.id]
              if (fromTable != null && fromTable !== "") return fromTable
              return SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID
            })()
          : (selectedOutlookSetIds[row.id] ??
            SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID)
      const selectedBuildingVersion =
        rowOptions.buildingVersionOptions.find(
          (option) => option.id === resolvedBuildingVersionId
        ) ?? rowOptions.buildingVersionOptions[0]!
      const selectedOutlookSet =
        rowOptions.outlookSetOptions.find(
          (option) => option.id === resolvedOutlookSetId
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
    scenarioModificationsCtx,
    selectedBuildingVersionIds,
    selectedOutlookSetIds,
    useScenarioTableModificationSelections,
  ])

  const setSelectedBuildingVersionId = React.useCallback(
    (assetId: string, nextId: string) => {
      if (isScenarioScope && scenarioModificationsCtx != null) {
        scenarioModificationsCtx.setTableSelection(
          assetId,
          nextId === SCOPED_FORECAST_BASELINE_BUILDING_VERSION_ID ? "" : nextId
        )
        return
      }
      setSelectedBuildingVersionIds((current) => ({
        ...current,
        [assetId]: nextId,
      }))
    },
    [isScenarioScope, scenarioModificationsCtx]
  )

  const setSelectedOutlookSetId = React.useCallback(
    (assetId: string, nextId: string) => {
      if (isScenarioScope && scenarioModificationsCtx != null) {
        scenarioModificationsCtx.setOutlookTableSelection(
          assetId,
          nextId === SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID ? "" : nextId
        )
        return
      }
      setSelectedOutlookSetIds((current) => ({
        ...current,
        [assetId]: nextId,
      }))
    },
    [isScenarioScope, scenarioModificationsCtx]
  )

  const setPortfolioScenarioProbability = React.useCallback(
    (scenarioId: ScopedForecastPortfolioScenarioId, nextValue: number) => {
      setPortfolioScenarioProbabilities((current) => {
        const merged = normalizeScopedForecastPortfolioScenarioProbabilities({
          ...current,
          [scenarioId]: nextValue,
        })
        setPortfolioOutlookSliderValue(outlookWeightProbabilitiesToSlider(merged))
        return merged
      })
    },
    []
  )

  const replacePortfolioScenarioProbabilities = React.useCallback(
    (next: ScopedForecastPortfolioScenarioProbabilities) => {
      const normalized = normalizeScopedForecastPortfolioScenarioProbabilities(next)
      setPortfolioScenarioProbabilities(normalized)
      setPortfolioOutlookSliderValue(outlookWeightProbabilitiesToSlider(normalized))
    },
    []
  )

  const applyPortfolioOutlookSlider = React.useCallback((sliderValue: number) => {
    const next = Math.min(100, Math.max(0, Math.round(sliderValue)))
    setPortfolioOutlookSliderValue(next)
    setPortfolioScenarioProbabilities(
      normalizeScopedForecastPortfolioScenarioProbabilities(
        outlookWeightSliderToProbabilities(next)
      )
    )
  }, [])

  const resetSelections = React.useCallback(() => {
    if (useScenarioTableModificationSelections && scenarioModificationsCtx != null) {
      for (const row of scopedRows) {
        scenarioModificationsCtx.setTableSelection(row.id, "")
        scenarioModificationsCtx.setOutlookTableSelection(row.id, "")
      }
    } else {
      const nextBuildingSelections: Record<string, string> = {}
      for (const row of scopedRows) {
        nextBuildingSelections[row.id] = SCOPED_FORECAST_BASELINE_BUILDING_VERSION_ID
      }
      setSelectedBuildingVersionIds(nextBuildingSelections)
    }

    const nextOutlookSelections: Record<string, string> = {}
    for (const row of scopedRows) {
      nextOutlookSelections[row.id] = SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID
    }
    setSelectedOutlookSetIds(nextOutlookSelections)
    setAssumptions(defaultAssumptions)
  }, [
    defaultAssumptions,
    scopedRows,
    scenarioModificationsCtx,
    useScenarioTableModificationSelections,
  ])

  return {
    assetSelections,
    assumptions,
    setAssumptions,
    portfolioModificationMode,
    setPortfolioModificationMode,
    portfolioScenarioProbabilities,
    portfolioOutlookSliderValue,
    applyPortfolioOutlookSlider,
    setPortfolioScenarioProbability,
    replacePortfolioScenarioProbabilities,
    resetSelections,
    setSelectedBuildingVersionId,
    setSelectedOutlookSetId,
  }
}
