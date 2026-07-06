import { describe, expect, it } from "vitest"

import {
  hierarchyAreaById,
  hierarchyChildren,
} from "@/lib/benchmark-data/benchmark-hierarchy"
import {
  constrainGeoChildAreaForMap,
  enrichGeoBenchmarkAreaForMap,
} from "@/lib/benchmark-data/geo-area-map"

describe("constrainGeoChildAreaForMap", () => {
  it("removes multi-state metro outlines that extend outside a state parent", () => {
    const stateNj = enrichGeoBenchmarkAreaForMap(
      hierarchyAreaById("geo:state:NJ")!
    )
    const nycMetro = enrichGeoBenchmarkAreaForMap(
      hierarchyChildren(stateNj).find((area) => area.id === "geo:cbsa:35620")!
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
      hierarchyChildren(stateCa)[0]!
    )

    const preview = constrainGeoChildAreaForMap(stateCa, child)

    if (child.boundaryGeometry != null) {
      expect(preview.boundaryGeometry).toEqual(child.boundaryGeometry)
    }
  })
})
