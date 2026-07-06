import { describe, expect, it } from "vitest"

import {
  hierarchyAreaById,
  hierarchyAreaPath,
} from "@/lib/benchmark-data/benchmark-hierarchy"

describe("benchmark hierarchy multi-parent paths", () => {
  it("prefers the New Jersey regional hub over New York City for state NJ", () => {
    const stateNj = hierarchyAreaById("geo:state:NJ")
    expect(stateNj).not.toBeNull()
    expect(stateNj!.parentId).toBe("geo:regional_hub:new jersey")

    const path = hierarchyAreaPath(stateNj!)
    expect(path.map((area) => area.label)).toEqual([
      "United States",
      "New Jersey",
      "New Jersey",
    ])
  })

  it("honors navigation context when a node has multiple parents", () => {
    const metro = hierarchyAreaById("geo:cbsa:35620")
    expect(metro).not.toBeNull()

    const nycPath = hierarchyAreaPath(metro!, {
      preferAncestorIds: new Set([
        "geo:national:national",
        "geo:regional_hub:new york city",
        "geo:state:NY",
      ]),
    })
    expect(nycPath.map((area) => area.id)).toEqual([
      "geo:national:national",
      "geo:regional_hub:new york city",
      "geo:state:NY",
      "geo:cbsa:35620",
    ])

    const njPath = hierarchyAreaPath(metro!, {
      preferAncestorIds: new Set([
        "geo:national:national",
        "geo:regional_hub:new jersey",
        "geo:state:NJ",
      ]),
    })
    expect(njPath.map((area) => area.id)).toEqual([
      "geo:national:national",
      "geo:regional_hub:new jersey",
      "geo:state:NJ",
      "geo:cbsa:35620",
    ])
  })
})
