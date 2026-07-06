import { describe, expect, it } from "vitest"

import { INITIAL_MOD_VALUES } from "@/lib/building-modifications"
import {
  buildModificationImpactDatasetForAsset,
  deriveImpactMetrics,
} from "@/lib/modifications-impact"
import {
  getRealExportScenario,
  realValuationConditionMetricsForModValues,
} from "@/lib/real-properties"
import { resolveRealExportScenarioKey } from "@/lib/real-properties/modification-scenarios"
import { buildRealStackingPlanDataset } from "@/lib/real-properties"
import { stackingPlanSpaceIdFromTenantId } from "@/lib/real-properties/modification-scenarios"

const DEFOREST_ID = "1-deforest-avenue"

const MIND_BODY_VALUES = {
  ...INITIAL_MOD_VALUES,
  gym: "mind-body-studio",
}

const REAL_ASSET_IDS = [
  "1-deforest-avenue",
  "25-deforest-avenue",
  "200-greenwich-avenue",
  "340-mt-kemble",
  "1700-east-putnam",
  "mack-centre-iv",
] as const

describe("real property modification scenarios", () => {
  it.each(REAL_ASSET_IDS)(
    "loads mind-body scenario from scenarios export for %s",
    (assetId) => {
      const scenario = getRealExportScenario(assetId, MIND_BODY_VALUES)
      expect(scenario?.scenario).toBe("amenity_gym_studio_mind_body")
      expect(scenario?.asset?.mark_to_market_value).toBeGreaterThan(0)

      const dataset = buildRealStackingPlanDataset(assetId)
      expect(dataset).not.toBeNull()

      const impact = buildModificationImpactDatasetForAsset(
        assetId,
        dataset!.floors,
        MIND_BODY_VALUES
      )
      const changedSpaces = impact.floors
        .flatMap((floor) => floor.tenants)
        .filter((tenant) => Math.abs(tenant.deltaPsf) > 0.001)
      expect(changedSpaces.length).toBeGreaterThan(0)
    }
  )

  it("resolves mind-body gym to the exported scenario key", () => {
    expect(resolveRealExportScenarioKey(MIND_BODY_VALUES)).toBe(
      "amenity_gym_studio_mind_body"
    )
  })

  it("uses per-space predicted_rent from the scenarios export for rent lift", () => {
    const dataset = buildRealStackingPlanDataset(DEFOREST_ID)
    expect(dataset).not.toBeNull()

    const scenario = getRealExportScenario(DEFOREST_ID, MIND_BODY_VALUES)
    expect(scenario?.scenario).toBe("amenity_gym_studio_mind_body")

    const webBank = dataset!.floors
      .flatMap((floor) => floor.tenants)
      .find((tenant) => tenant.name === "WebBank")
    expect(webBank).toBeDefined()

    const spaceId = stackingPlanSpaceIdFromTenantId(webBank!.id)
    const scenarioRent = scenario?.floors
      ? Object.values(scenario.floors)
          .flatMap((floor) => Object.entries(floor.spaces ?? {}))
          .find(([id]) => id === spaceId)?.[1]?.predicted_rent
      : undefined

    expect(webBank!.predictedRentPsfValue).toBeCloseTo(64.25, 1)
    expect(scenarioRent).toBeCloseTo(65.95, 1)

    const impact = buildModificationImpactDatasetForAsset(
      DEFOREST_ID,
      dataset!.floors,
      MIND_BODY_VALUES
    )
    const impactSpace = impact.floors
      .flatMap((floor) => floor.tenants)
      .find((tenant) => tenant.id === webBank!.id)

    expect(impactSpace?.baselineRentPsf).toBeCloseTo(64.25, 1)
    expect(impactSpace?.modifiedRentPsf).toBeCloseTo(65.95, 1)
    expect(impactSpace?.deltaPsf).toBeCloseTo(1.7, 1)

    const metrics = deriveImpactMetrics(impact.floors.flatMap((f) => f.tenants))
    expect(metrics.averageLiftPsf).toBeGreaterThan(0)
    expect(metrics.averageLiftPct).toBeGreaterThan(0)
  })

  it("uses scenario asset block for valuation KPIs when a modification is active", () => {
    const baseline = realValuationConditionMetricsForModValues(
      DEFOREST_ID,
      INITIAL_MOD_VALUES
    )
    const modified = realValuationConditionMetricsForModValues(
      DEFOREST_ID,
      MIND_BODY_VALUES
    )

    expect(baseline?.markToMarket.assetValue).toBeCloseTo(17_419_942, -2)
    expect(modified?.markToMarket.assetValue).toBeCloseTo(17_843_767, -2)
    expect(modified!.markToMarket.assetValue).toBeGreaterThan(
      baseline!.markToMarket.assetValue
    )
  })
})
