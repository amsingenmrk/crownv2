import { describe, expect, it } from "vitest"

import { ASSETS } from "@/lib/assets"
import {
  curatedZipAssignmentsForZipCode,
} from "@/lib/benchmark-submarket-assignments"
import { getTrackedMarketStats } from "@/lib/benchmark-market-stats"

function zipCodeFromAddress(address: string): string | null {
  const match = address.match(/\b(\d{5})(?:-\d{4})?\s*$/)
  return match?.[1] ?? null
}

describe("benchmark hierarchy data coverage", () => {
  it("covers all seeded asset ZIPs with curated benchmark assignments", () => {
    const missing = ASSETS.map((asset) => ({
      assetId: asset.id,
      address: asset.address,
      zip: zipCodeFromAddress(asset.address),
    })).filter((entry) => {
      if (!entry.zip) return true
      return curatedZipAssignmentsForZipCode(entry.zip).length === 0
    })

    expect(missing).toEqual([])
  })

  it("has tracked benchmark stats for every curated ZIP assignment", () => {
    const zipCodes = new Set<string>()
    for (const asset of ASSETS) {
      const zip = zipCodeFromAddress(asset.address)
      if (zip) zipCodes.add(zip)
    }

    const missingTrackedStats: string[] = []
    for (const zip of zipCodes) {
      const assignments = curatedZipAssignmentsForZipCode(zip)
      for (const assignment of assignments) {
        if (getTrackedMarketStats(assignment.id) == null) {
          missingTrackedStats.push(`${assignment.id}:${zip}`)
        }
      }
    }

    expect(missingTrackedStats).toEqual([])
  })
})
