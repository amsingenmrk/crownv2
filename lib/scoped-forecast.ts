import { INITIAL_MOD_VALUES, type ModValues } from "@/components/building-modifications-sidebar"
import { ASSETS } from "@/lib/assets"
import {
  defaultForecastAssumptionsForAsset,
  type ForecastAssumptions,
  type ForecastEconomicOutlookScenario,
} from "@/lib/forecast-data"
import type { ForecastOutlookSet } from "@/lib/forecast-scenario-storage"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"

export const SCOPED_FORECAST_BASELINE_BUILDING_VERSION_ID =
  "__scoped_forecast_baseline_building_version__" as const

export const SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID =
  "__scoped_forecast_baseline_outlook_set__" as const

export type ScopedForecastScope =
  | {
      kind: "portfolio"
      portfolioScopeId?: string | null
    }
  | {
      kind: "scenario"
      scenarioSlug: string
    }

export type ScopedForecastBuildingVersionOption = {
  id: string
  name: string
  values: ModValues
}

export type ScopedForecastOutlookSetOption = {
  id: string
  name: string
  set: ForecastOutlookSet | null
  activeScenario: ForecastEconomicOutlookScenario
}

export type ScopedForecastAssetSelection = {
  row: PortfolioAssetRow
  buildingVersionOptions: readonly ScopedForecastBuildingVersionOption[]
  outlookSetOptions: readonly ScopedForecastOutlookSetOption[]
  selectedBuildingVersionId: string
  selectedOutlookSetId: string
  selectedBuildingVersion: ScopedForecastBuildingVersionOption
  selectedOutlookSet: ScopedForecastOutlookSetOption
}

function roundToWhole(value: number) {
  return Math.round(value)
}

function roundToHundredths(value: number) {
  return Math.round(value * 100) / 100
}

export function baselineScopedForecastBuildingVersionOption(): ScopedForecastBuildingVersionOption {
  return {
    id: SCOPED_FORECAST_BASELINE_BUILDING_VERSION_ID,
    name: "Baseline building",
    values: INITIAL_MOD_VALUES,
  }
}

export function baselineScopedForecastOutlookSetOption(
  baselineScenario: ForecastEconomicOutlookScenario
): ScopedForecastOutlookSetOption {
  return {
    id: SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID,
    name: "Baseline outlook",
    set: null,
    activeScenario: baselineScenario,
  }
}

export function buildDefaultScopedForecastAssumptions(
  assetIds: readonly string[]
): ForecastAssumptions {
  const resolvedAssetIds =
    assetIds.length > 0 ? assetIds : ASSETS[0] != null ? [ASSETS[0].id] : []

  if (resolvedAssetIds.length === 0) {
    return {
      markToMarketEnabled: true,
      timeToLeaseMonths: 9,
      occupancyTargetPct: 90,
      defaultRenewalProbabilityPct: 58,
      exitCapRatePct: 5.5,
    }
  }

  const assumptions = resolvedAssetIds.map((assetId) =>
    defaultForecastAssumptionsForAsset(assetId)
  )

  const average = <K extends keyof ForecastAssumptions>(key: K) =>
    assumptions.reduce((sum, assumption) => {
      const value = assumption[key]
      return typeof value === "number" ? sum + value : sum
    }, 0) / assumptions.length

  return {
    markToMarketEnabled: true,
    timeToLeaseMonths: roundToWhole(average("timeToLeaseMonths")),
    occupancyTargetPct: roundToWhole(average("occupancyTargetPct")),
    defaultRenewalProbabilityPct: roundToWhole(
      average("defaultRenewalProbabilityPct")
    ),
    exitCapRatePct: roundToHundredths(average("exitCapRatePct")),
  }
}
