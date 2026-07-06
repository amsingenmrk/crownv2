import { describe, expect, it } from "vitest"

import { ASSETS } from "@/lib/assets"
import { defaultAssetLeasingAssumptions } from "@/lib/asset-leasing-assumptions"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import { getSampleStackingPlanData, filterStackingPlanBuildingFloors } from "@/lib/stacking-plan-data"
import { buildStackingPlanSuiteEditorTooltipText } from "@/lib/stacking-plan-tooltip"

const SAMPLE_ASSET_IDS = [ASSETS[0]?.id, ASSETS[6]?.id, ASSETS[12]?.id, "mkt-0"].filter(
  (value): value is string => value != null
)

const MARKET_RENT_BANDS = {
  office: { min: 35, max: 110 },
  industrial: { min: 8, max: 30 },
  retail: { min: 25, max: 130 },
} as const

describe("getSampleStackingPlanData", () => {
  it("stays aligned with the canonical financial snapshot and plausible rent bands", () => {
    for (const assetId of SAMPLE_ASSET_IDS) {
      const dataset = getSampleStackingPlanData(assetId)
      const metrics = financialMetricsForAssetId(assetId)

      expect(metrics).not.toBeNull()
      if (metrics == null) {
        continue
      }

      const marketBand = MARKET_RENT_BANDS[metrics.groupId as keyof typeof MARKET_RENT_BANDS]
      expect(dataset.summary.totalSqft).toBeGreaterThan(0)
      expect(dataset.summary.occupiedSqft + dataset.summary.vacantSqft).toBe(
        dataset.summary.totalSqft
      )
      expect(metrics.occupancyPct).toBeCloseTo(
        dataset.summary.overallOccupancyPercent,
        2
      )
      expect(metrics.waleYears).toBeCloseTo(dataset.summary.waleYears, 2)
      expect(metrics.marketRentPsf).toBeGreaterThanOrEqual(marketBand.min)
      expect(metrics.marketRentPsf).toBeLessThanOrEqual(marketBand.max)

      for (const tenant of dataset.floors.flatMap((floor) => floor.tenants)) {
        if (
          tenant.marketRentPsfValue == null ||
          tenant.predictedRentPsfValue == null ||
          tenant.marketRentPsfValue <= 0
        ) {
          continue
        }

        const ratio = tenant.predictedRentPsfValue / tenant.marketRentPsfValue
        expect(ratio).toBeGreaterThanOrEqual(0.939)
        expect(ratio).toBeLessThanOrEqual(1.08)
      }
    }
  })

  it("builds multiline space tooltip summaries from suite editor fields", () => {
    const assetId = SAMPLE_ASSET_IDS[0]!
    const dataset = getSampleStackingPlanData(assetId)
    const allTenants = dataset.floors.flatMap((floor) => floor.tenants)
    const occupiedTenant = allTenants.find((tenant) => !tenant.isVacant)
    const vacantTenant = allTenants.find((tenant) => tenant.isVacant)
    const buildingLeasingAssumptions = defaultAssetLeasingAssumptions(assetId)

    expect(occupiedTenant).toBeDefined()
    expect(vacantTenant).toBeDefined()

    if (occupiedTenant == null || vacantTenant == null) {
      return
    }

    const occupiedTooltip = buildStackingPlanSuiteEditorTooltipText({
      tenant: occupiedTenant,
      buildingLeasingAssumptions,
    })
    expect(occupiedTooltip).toContain(`${occupiedTenant.name} • ${occupiedTenant.space.replace(/^Ste\s+/i, "")}`)
    expect(occupiedTooltip).toContain(`Tenant: ${occupiedTenant.name}`)
    expect(occupiedTooltip).toContain(
      `Suite: ${occupiedTenant.space.replace(/^Ste\s+/i, "")}`
    )
    expect(occupiedTooltip).toContain(`SF: ${occupiedTenant.sqft.toLocaleString()}`)
    expect(occupiedTooltip).toContain("Buildout:")
    expect(occupiedTooltip).toContain("Lease Type:")
    expect(occupiedTooltip).toContain("Commencement:")
    expect(occupiedTooltip).toContain("Expiration:")
    expect(occupiedTooltip).toContain("Contract Rate:")
    expect(occupiedTooltip).toContain("Predicted Rate:")
    expect(occupiedTooltip).toContain("Space assumptions")
    expect(occupiedTooltip).toContain("Time to lease:")
    expect(occupiedTooltip).toContain("Occupancy target:")
    expect(occupiedTooltip).toContain("Renewal probability:")
    expect(occupiedTooltip).toContain("Lease term:")
    expect(occupiedTooltip).not.toContain("Owner:")
    expect(occupiedTooltip).not.toContain("Verification:")
    expect(occupiedTooltip).not.toContain("Market rent:")

    const vacantTooltip = buildStackingPlanSuiteEditorTooltipText({
      tenant: vacantTenant,
      buildingLeasingAssumptions,
    })
    expect(vacantTooltip).toContain(
      `Vacant • ${vacantTenant.space.replace(/^Ste\s+/i, "")}`
    )
    expect(vacantTooltip).toContain(
      `Suite: ${vacantTenant.space.replace(/^Ste\s+/i, "")}`
    )
    expect(vacantTooltip).toContain(`Availability: ${vacantTenant.availabilityStatus}`)
    expect(vacantTooltip).toContain("Predicted Rate:")
    expect(vacantTooltip).toContain("Time to lease:")
    expect(vacantTooltip).toContain("Occupancy target:")
    expect(vacantTooltip).toContain("Lease type:")
    expect(vacantTooltip).toContain("Lease term:")
    expect(vacantTooltip).not.toContain("Annual rent:")
    expect(vacantTooltip).not.toContain("Contract Rate:")
    expect(vacantTooltip).not.toContain("Renewal probability:")
  })

  it("assigns unique floor keys for non-numeric real-property floor labels", () => {
    const dataset = getSampleStackingPlanData("mack-centre-iv")
    const floorKeys = dataset.floors.map((floor) => floor.floorKey)
    const floorNumbers = dataset.floors.map((floor) => floor.floor)

    expect(new Set(floorKeys).size).toBe(floorKeys.length)
    expect(floorNumbers.every((floor) => Number.isFinite(floor))).toBe(true)

    const roofFloor = dataset.floors.find((floor) => floor.floorLabel === "Roof")
    const parkingFloor = dataset.floors.find(
      (floor) => floor.floorLabel === "Parking"
    )

    expect(roofFloor).toBeDefined()
    expect(parkingFloor).toBeDefined()
    expect(roofFloor?.floor).not.toBe(parkingFloor?.floor)
  })

  it("excludes roof and parking floors from stacking plan building rows", () => {
    const dataset = getSampleStackingPlanData("mack-centre-iv")
    const visibleFloors = filterStackingPlanBuildingFloors(dataset.floors)

    expect(visibleFloors.some((floor) => floor.floorLabel === "Roof")).toBe(
      false
    )
    expect(visibleFloors.some((floor) => floor.floorLabel === "Parking")).toBe(
      false
    )
    expect(visibleFloors.length).toBeLessThan(dataset.floors.length)
  })
})
