import {
  INITIAL_MOD_VALUES,
  MOD_CONFIGS,
  type ModId,
  type ModValues,
} from "@/lib/building-modifications"
import {
  buildModificationImpactDataset,
  deriveImpactMetrics,
} from "@/lib/modifications-impact"
import { getSampleStackingPlanData } from "@/lib/stacking-plan-data"

export const RECOMMENDED_MOD_ID_PARAM = "recommendedMod"
export const RECOMMENDED_MOD_OPTION_PARAM = "recommendedOption"

export type ModificationRecommendation = {
  id: ModId
  checkboxLabel: string
  optionValue: string
  optionTitle: string
  averageLiftPsf: number
  averageLiftPct: number
}

type SearchParamReader = {
  get(name: string): string | null
}

const recommendationCache = new Map<string, ModificationRecommendation | null>()

function buildSingleSelectionValues(id: ModId, optionValue: string): ModValues {
  return {
    ...INITIAL_MOD_VALUES,
    [id]: optionValue,
  }
}

function compareRecommendations(
  left: ModificationRecommendation,
  right: ModificationRecommendation
) {
  if (left.averageLiftPsf !== right.averageLiftPsf) {
    return left.averageLiftPsf - right.averageLiftPsf
  }
  if (left.averageLiftPct !== right.averageLiftPct) {
    return left.averageLiftPct - right.averageLiftPct
  }
  return left.optionTitle.localeCompare(right.optionTitle)
}

export function getTopSingleModificationRecommendationForAsset(
  assetId: string
): ModificationRecommendation | null {
  if (recommendationCache.has(assetId)) {
    return recommendationCache.get(assetId) ?? null
  }

  const dataset = getSampleStackingPlanData(assetId)
  let best: ModificationRecommendation | null = null

  for (const config of MOD_CONFIGS) {
    for (const option of config.options) {
      const values = buildSingleSelectionValues(config.id, option.value)
      const impactDataset = buildModificationImpactDataset(dataset.floors, values)
      const metrics = deriveImpactMetrics(
        impactDataset.floors.flatMap((floor) => floor.tenants)
      )

      const averageLiftPsf = metrics.averageLiftPsf ?? 0
      const averageLiftPct = metrics.averageLiftPct ?? 0

      if (averageLiftPsf <= 0 && averageLiftPct <= 0) {
        continue
      }

      const candidate: ModificationRecommendation = {
        id: config.id,
        checkboxLabel: config.checkboxLabel,
        optionValue: option.value,
        optionTitle: option.title,
        averageLiftPsf,
        averageLiftPct,
      }

      if (best == null || compareRecommendations(candidate, best) > 0) {
        best = candidate
      }
    }
  }

  recommendationCache.set(assetId, best)
  return best
}

export function buildRecommendedModificationHref(
  assetId: string,
  recommendation: Pick<ModificationRecommendation, "id" | "optionValue"> | null
) {
  const baseHref = `/assets/${encodeURIComponent(assetId)}/modifications`
  if (recommendation == null) {
    return baseHref
  }

  const params = new URLSearchParams({
    [RECOMMENDED_MOD_ID_PARAM]: recommendation.id,
    [RECOMMENDED_MOD_OPTION_PARAM]: recommendation.optionValue,
  })

  return `${baseHref}?${params.toString()}`
}

export function parseRecommendedModificationSelection(
  searchParams: SearchParamReader
): Pick<ModificationRecommendation, "id" | "optionValue"> | null {
  const idValue = searchParams.get(RECOMMENDED_MOD_ID_PARAM)
  const optionValue = searchParams.get(RECOMMENDED_MOD_OPTION_PARAM)

  if (idValue == null || optionValue == null) {
    return null
  }

  const config = MOD_CONFIGS.find((candidate) => candidate.id === idValue)
  if (config == null) {
    return null
  }

  const option = config.options.find((candidate) => candidate.value === optionValue)
  if (option == null) {
    return null
  }

  return {
    id: config.id,
    optionValue: option.value,
  }
}

export function buildRecommendedModificationValues(
  recommendation: Pick<ModificationRecommendation, "id" | "optionValue"> | null
): ModValues {
  if (recommendation == null) {
    return { ...INITIAL_MOD_VALUES }
  }

  return buildSingleSelectionValues(
    recommendation.id,
    recommendation.optionValue
  )
}
