import { describe, expect, it } from "vitest"

import { INITIAL_MOD_VALUES } from "@/lib/building-modifications"
import { parseStoredSets, storageKeyForAsset } from "@/lib/building-modification-sets-storage"

describe("storageKeyForAsset", () => {
  it("uses stable prefix", () => {
    expect(storageKeyForAsset("asset-1")).toBe("glassbox:modification-sets:asset-1")
  })
})

describe("parseStoredSets", () => {
  it("returns empty for null or blank", () => {
    expect(parseStoredSets(null)).toEqual([])
    expect(parseStoredSets("")).toEqual([])
  })

  it("returns empty for invalid JSON", () => {
    expect(parseStoredSets("{")).toEqual([])
  })

  it("parses valid preset array", () => {
    const raw = JSON.stringify([
      {
        id: "1",
        name: "Test",
        values: { ...INITIAL_MOD_VALUES, gym: "specialty-fitness" },
        savedAt: 1,
      },
    ])
    const sets = parseStoredSets(raw)
    expect(sets).toHaveLength(1)
    expect(sets[0]!.name).toBe("Test")
    expect(sets[0]!.values.gym).toBe("specialty-fitness")
  })

  it("normalizes legacy option values to the current option catalog", () => {
    const raw = JSON.stringify([
      {
        id: "1",
        name: "Legacy",
        values: {
          ...INITIAL_MOD_VALUES,
          gym: "training-gym",
          bar: "traditional-pubs",
          cafe: "grab-and-go",
          restaurant: "fast-casual",
        },
        savedAt: 1,
      },
    ])

    const sets = parseStoredSets(raw)

    expect(sets).toHaveLength(1)
    expect(sets[0]!.values.gym).toBe("specialty-fitness")
    expect(sets[0]!.values.bar).toBe("beer-bar-pub")
    expect(sets[0]!.values.cafe).toBe("coffee-cafe")
    expect(sets[0]!.values.restaurant).toBe("fast-casual-quick-service")
  })
})
