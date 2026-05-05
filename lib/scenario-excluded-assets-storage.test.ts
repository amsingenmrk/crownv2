import { describe, expect, it } from "vitest"

import { parseScenarioExcludedAssetIds } from "@/lib/scenario-excluded-assets-storage"

describe("parseScenarioExcludedAssetIds", () => {
  it("returns empty set for null or empty", () => {
    expect(parseScenarioExcludedAssetIds(null).size).toBe(0)
    expect(parseScenarioExcludedAssetIds("").size).toBe(0)
  })

  it("parses string id array", () => {
    const set = parseScenarioExcludedAssetIds(JSON.stringify(["a", "b", 3, ""]))
    expect([...set].sort()).toEqual(["a", "b"])
  })
})
