import {
  getSelectedModificationDetails,
  MOD_CONFIGS,
  type ModValues,
} from "@/lib/building-modifications"
import type { ModId } from "@/lib/building-modifications"

import type { RawAssetBlock, RawScenario } from "./property-def"

export const SCENARIO_TO_MOD: Record<string, { id: ModId; optionValue: string }> =
  {
    leed_certified: { id: "leed", optionValue: "leed-certified" },
    leed_silver: { id: "leed", optionValue: "leed-silver" },
    leed_gold: { id: "leed", optionValue: "leed-gold" },
    leed_platinum: { id: "leed", optionValue: "leed-platinum" },
    amenity_gym_general: { id: "gym", optionValue: "general-fitness" },
    amenity_gym_specialized: { id: "gym", optionValue: "specialty-fitness" },
    amenity_gym_studio_mind_body: {
      id: "gym",
      optionValue: "mind-body-studio",
    },
    amenity_bar_beer_pub: { id: "bar", optionValue: "beer-bar-pub" },
    amenity_bar_lounge: { id: "bar", optionValue: "lounge-bar" },
    amenity_bar_wine_spirits: { id: "bar", optionValue: "wine-spirits-bar" },
    amenity_cafe_bakery: { id: "cafe", optionValue: "bakery-cafe" },
    amenity_cafe_coffee: { id: "cafe", optionValue: "coffee-cafe" },
    amenity_cafe_tea: { id: "cafe", optionValue: "tea-cafe" },
    amenity_restaurant_white_tablecloth: {
      id: "restaurant",
      optionValue: "white-cloth",
    },
    amenity_restaurant_full_service: {
      id: "restaurant",
      optionValue: "full-service-restaurant",
    },
    amenity_restaurant_fast_casual: {
      id: "restaurant",
      optionValue: "fast-casual-quick-service",
    },
    amenity_restaurant_specialty_dining: {
      id: "restaurant",
      optionValue: "specialty-dietary-dining",
    },
  }

export type RealConditionMetricMap = {
  inPlace: RealConditionMetrics
  markToMarket: RealConditionMetrics
  grossPotential: RealConditionMetrics
}

export type RealConditionMetrics = {
  grossRevenue: number
  opex: number
  noi: number
  assetValue: number
  capRate: number
}

function roundToHundredths(value: number) {
  return Number(value.toFixed(2))
}

/** Map active sidebar selections to a single exported scenario key, if possible. */
export function resolveRealExportScenarioKey(
  modValues: ModValues
): string | null {
  const active = getSelectedModificationDetails(modValues)
  if (active.length === 0) return null

  const matchesSelection = (scenarioKey: string) => {
    const mapping = SCENARIO_TO_MOD[scenarioKey]
    if (mapping == null) return false
    return active.some(
      (selection) =>
        selection.id === mapping.id &&
        selection.optionValue === mapping.optionValue
    )
  }

  if (active.length === 1) {
    for (const [scenarioKey, mapping] of Object.entries(SCENARIO_TO_MOD)) {
      const selection = active[0]!
      if (
        selection.id === mapping.id &&
        selection.optionValue === mapping.optionValue
      ) {
        return scenarioKey
      }
    }
    return null
  }

  for (const config of MOD_CONFIGS) {
    const selection = active.find((entry) => entry.id === config.id)
    if (selection == null) continue
    for (const [scenarioKey, mapping] of Object.entries(SCENARIO_TO_MOD)) {
      if (
        mapping.id === selection.id &&
        mapping.optionValue === selection.optionValue &&
        matchesSelection(scenarioKey)
      ) {
        return scenarioKey
      }
    }
  }

  return null
}

export function scenarioPredictedRentBySpaceId(
  scenario: RawScenario
): Map<string, number> {
  const map = new Map<string, number>()
  for (const floor of Object.values(scenario.floors ?? {})) {
    for (const [spaceId, space] of Object.entries(floor.spaces ?? {})) {
      const predicted = space.predicted_rent
      if (predicted != null && Number.isFinite(predicted)) {
        map.set(spaceId, predicted)
      }
    }
  }
  return map
}

export function stackingPlanSpaceIdFromTenantId(tenantId: string): string {
  const separator = tenantId.lastIndexOf("-")
  if (separator <= 0) return tenantId
  return tenantId.slice(0, separator)
}

export function realConditionMetricMapFromAssetBlock(
  block: RawAssetBlock
): RealConditionMetricMap {
  return {
    inPlace: {
      grossRevenue: block.as_is_revenue ?? 0,
      opex: block.as_is_expense ?? 0,
      noi: block.as_is_noi ?? 0,
      assetValue: block.as_is_value ?? 0,
      capRate: roundToHundredths((block.as_is_cap_rate ?? 0) * 100),
    },
    markToMarket: {
      grossRevenue: block.mark_to_market_revenue ?? 0,
      opex: block.mark_to_market_expense ?? 0,
      noi: block.mark_to_market_noi ?? 0,
      assetValue: block.mark_to_market_value ?? 0,
      capRate: roundToHundredths((block.mark_to_market_cap_rate ?? 0) * 100),
    },
    grossPotential: {
      grossRevenue: block.gross_potential_revenue ?? 0,
      opex: block.gross_potential_expense ?? 0,
      noi: block.gross_potential_noi ?? 0,
      assetValue: block.gross_potential_value ?? 0,
      capRate: roundToHundredths((block.gross_potential_cap_rate ?? 0) * 100),
    },
  }
}
