import { describe, expect, it } from "vitest"

import { ASSETS } from "@/lib/assets"
import {
  columnForEntityKey,
  propertySlotKey,
} from "@/lib/portfolio-compare-model"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import { getSampleStackingPlanData } from "@/lib/stacking-plan-data"

describe("columnForEntityKey", () => {
  it("uses the canonical asset cap rate and suite lease term for property compare columns", () => {
    const asset = ASSETS[0]
    expect(asset).toBeDefined()
    if (asset == null) {
      return
    }

    const dataset = getSampleStackingPlanData(asset.id, asset)
    const tenant = dataset.floors
      .flatMap((floor) => floor.tenants)
      .find(
        (candidate) =>
          !candidate.isVacant &&
          candidate.contractRatePsfValue != null &&
          candidate.leaseExpirationDate != null
      )
    const financials = financialMetricsForAssetId(asset.id)

    expect(tenant).toBeDefined()
    expect(financials).not.toBeNull()
    if (tenant == null || financials == null) {
      return
    }

    const column = columnForEntityKey(
      propertySlotKey("test-scenario", asset.id, tenant.id),
      [],
      0
    )
    const contractRatePsf = tenant.contractRatePsfValue
    expect(contractRatePsf).toBeDefined()
    if (contractRatePsf == null) {
      return
    }
    const expectedNoiPerSf =
      contractRatePsf * Math.max(0, 1 - financials.currentExpenseRatio)

    expect(column.numeric.capRatePct).toBeCloseTo(financials.capRatePct, 2)
    expect(column.numeric.noiPerSfUsd).toBeCloseTo(expectedNoiPerSf, 2)
    expect(column.numeric.waleYears).toBeGreaterThan(0)
  })
})
