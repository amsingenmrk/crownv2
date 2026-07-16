import { describe, expect, it } from "vitest"

import {
  hierarchyAreaById,
} from "@/lib/benchmark-data/benchmark-hierarchy"
import {
  constrainGeoChildAreaForMap,
  enrichGeoBenchmarkAreaForMap,
  formatGeoAreaOptionLabel,
} from "@/lib/benchmark-data/geo-area-map"

describe("formatGeoAreaOptionLabel", () => {
  it("prefixes the area name with its export geo level", () => {
    expect(
      formatGeoAreaOptionLabel({
        id: "geo:national:national",
        label: "United States",
      })
    ).toBe("National - United States")
    expect(
      formatGeoAreaOptionLabel({
        id: "geo:state:NJ",
        label: "New Jersey",
      })
    ).toBe("State - New Jersey")
    expect(
      formatGeoAreaOptionLabel({
        id: "geo:regional_hub:new jersey",
        label: "New Jersey",
      })
    ).toBe("Regional Hub - New Jersey")
  })
})

describe("constrainGeoChildAreaForMap", () => {
  it("removes multi-state metro outlines that extend outside a state parent", () => {
    const stateNj = enrichGeoBenchmarkAreaForMap(
      hierarchyAreaById("geo:state:NJ")!
    )
    const nycMetro = enrichGeoBenchmarkAreaForMap(
      hierarchyAreaById("geo:cbsa:35620")!
    )

    expect(nycMetro.boundaryGeometry).not.toBeNull()

    const preview = constrainGeoChildAreaForMap(stateNj, nycMetro)

    expect(preview.boundaryGeometry).toBeUndefined()
    expect(preview.bounds[0][0]).toBeGreaterThanOrEqual(stateNj.bounds[0][0])
    expect(preview.bounds[1][0]).toBeLessThanOrEqual(stateNj.bounds[1][0])
  })

  it("keeps child outlines that fit within the parent", () => {
    const stateCa = enrichGeoBenchmarkAreaForMap(
      hierarchyAreaById("geo:state:CA")!
    )
    const child = enrichGeoBenchmarkAreaForMap(
      hierarchyAreaById("geo:cbsa:31080")!
    )

    const preview = constrainGeoChildAreaForMap(stateCa, child)

    if (child.boundaryGeometry != null) {
      expect(preview.boundaryGeometry).toEqual(child.boundaryGeometry)
    }
  })

  it("scopes county geocoding to the state encoded in the stats key", () => {
    const essex = enrichGeoBenchmarkAreaForMap(
      hierarchyAreaById("geo:county:essex|NJ")!
    )

    expect(essex.geocodeQuery).toBe("Essex County, New Jersey")
    expect(essex.geocodeHint?.regionShortCode).toBe("US-NJ")
    expect(essex.geocodeHint?.center?.[0]).toBeGreaterThan(-76)
    expect(essex.geocodeHint?.center?.[0]).toBeLessThan(-73)
    expect(essex.geocodeHint?.center?.[1]).toBeGreaterThan(38)
    expect(essex.geocodeHint?.center?.[1]).toBeLessThan(42)
  })
})
