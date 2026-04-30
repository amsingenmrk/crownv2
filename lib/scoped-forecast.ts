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

export type ScopedForecastPortfolioModificationMode =
  | "baseline"
  | "recommended"

export const SCOPED_FORECAST_PORTFOLIO_SCENARIO_IDS = [
  "baseline",
  "optimistic",
  "pessimistic",
] as const

export type ScopedForecastPortfolioScenarioId =
  (typeof SCOPED_FORECAST_PORTFOLIO_SCENARIO_IDS)[number]

export type ScopedForecastPortfolioScenarioProbabilities = Record<
  ScopedForecastPortfolioScenarioId,
  number
>

export type ScopedForecastPortfolioControlState = {
  modificationMode: ScopedForecastPortfolioModificationMode
  scenarioProbabilities: ScopedForecastPortfolioScenarioProbabilities
}

/** Balanced weights — matches center position on the portfolio outlook weight slider. */
export const DEFAULT_SCOPED_FORECAST_PORTFOLIO_SCENARIO_PROBABILITIES: ScopedForecastPortfolioScenarioProbabilities =
  {
    baseline: 34,
    optimistic: 33,
    pessimistic: 33,
  }

const OUTLOOK_WEIGHT_SLIDER_LEFT: ScopedForecastPortfolioScenarioProbabilities = {
  pessimistic: 55,
  baseline: 30,
  optimistic: 15,
}

const OUTLOOK_WEIGHT_SLIDER_MID: ScopedForecastPortfolioScenarioProbabilities = {
  pessimistic: 33,
  baseline: 34,
  optimistic: 33,
}

const OUTLOOK_WEIGHT_SLIDER_RIGHT: ScopedForecastPortfolioScenarioProbabilities = {
  pessimistic: 15,
  baseline: 30,
  optimistic: 55,
}

function lerpProbability(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** Maps slider 0 (pessimistic) … 50 (baseline) … 100 (optimistic) to three weights summing to 100%. */
export function outlookWeightSliderToProbabilities(
  sliderValue: number
): ScopedForecastPortfolioScenarioProbabilities {
  const s = Math.min(100, Math.max(0, Math.round(sliderValue)))
  const t = (s - 50) / 50
  const L = OUTLOOK_WEIGHT_SLIDER_LEFT
  const M = OUTLOOK_WEIGHT_SLIDER_MID
  const R = OUTLOOK_WEIGHT_SLIDER_RIGHT

  let pessimistic: number
  let baseline: number
  let optimistic: number

  if (t <= 0) {
    const u = t + 1
    pessimistic = lerpProbability(L.pessimistic, M.pessimistic, u)
    baseline = lerpProbability(L.baseline, M.baseline, u)
    optimistic = lerpProbability(L.optimistic, M.optimistic, u)
  } else {
    const u = t
    pessimistic = lerpProbability(M.pessimistic, R.pessimistic, u)
    baseline = lerpProbability(M.baseline, R.baseline, u)
    optimistic = lerpProbability(M.optimistic, R.optimistic, u)
  }

  return normalizeScopedForecastPortfolioScenarioProbabilities({
    pessimistic: Math.round(pessimistic),
    baseline: Math.round(baseline),
    optimistic: Math.round(optimistic),
  })
}

/** Approximate inverse for controlled slider value from current weights. */
export function outlookWeightProbabilitiesToSlider(
  probabilities: ScopedForecastPortfolioScenarioProbabilities
): number {
  const p = probabilities.pessimistic
  const o = probabilities.optimistic
  const delta = (o - p) / 100
  return Math.round(Math.min(100, Math.max(0, 50 + 50 * delta)))
}

function clampProbability(value: number) {
  return Math.min(100, Math.max(0, value))
}

export function normalizeScopedForecastPortfolioScenarioProbabilities(
  probabilities: ScopedForecastPortfolioScenarioProbabilities
): ScopedForecastPortfolioScenarioProbabilities {
  const clamped = SCOPED_FORECAST_PORTFOLIO_SCENARIO_IDS.reduce(
    (next, scenarioId) => {
      next[scenarioId] = clampProbability(probabilities[scenarioId] ?? 0)
      return next
    },
    {} as ScopedForecastPortfolioScenarioProbabilities
  )
  const total = SCOPED_FORECAST_PORTFOLIO_SCENARIO_IDS.reduce(
    (sum, scenarioId) => sum + clamped[scenarioId],
    0
  )

  if (total <= 0) {
    return { ...DEFAULT_SCOPED_FORECAST_PORTFOLIO_SCENARIO_PROBABILITIES }
  }

  let remaining = 100
  return SCOPED_FORECAST_PORTFOLIO_SCENARIO_IDS.reduce(
    (next, scenarioId, index) => {
      const isLast = index === SCOPED_FORECAST_PORTFOLIO_SCENARIO_IDS.length - 1
      const normalized = isLast
        ? remaining
        : Math.round((clamped[scenarioId] / total) * 100)
      next[scenarioId] = normalized
      remaining -= normalized
      return next
    },
    {} as ScopedForecastPortfolioScenarioProbabilities
  )
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

/**
 * One selectable option per built-in economic outlook (e.g. Baseline, Optimistic, Pessimistic).
 * First scenario keeps {@link SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID} for existing selection state.
 */
export function buildScopedPresetOutlookSetOptions(
  scenarios: readonly ForecastEconomicOutlookScenario[]
): ScopedForecastOutlookSetOption[] {
  return scenarios.map((scenario, index) => ({
    id:
      index === 0
        ? SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID
        : `__scoped_preset_outlook__:${scenario.id}`,
    name: scenario.name,
    set: null,
    activeScenario: scenario,
  }))
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
