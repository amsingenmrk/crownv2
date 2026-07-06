import { describe, expect, it } from "vitest"

import {
  hierarchyAreaById,
  hierarchyAreaPath,
  hierarchyChildren,
} from "@/lib/benchmark-data/benchmark-hierarchy"

describe("benchmark hierarchy navigation tiers", () => {
  it("maps the breadcrumb path to U.S. → region → submarket → county → zip", () => {
    const stateNj = hierarchyAreaById("geo:state:NJ")
    expect(stateNj).not.toBeNull()
    expect(stateNj!.level).toBe("submarket")

    const path = hierarchyAreaPath(stateNj!)
    expect(path.map((area) => area.label)).toEqual([
      "United States",
      "New Jersey",
      "New Jersey",
    ])
  })

  it("flattens state and cbsa into one submarket tier on the breadcrumb path", () => {
    const metro = hierarchyAreaById("geo:cbsa:35620")
    expect(metro).not.toBeNull()

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
      "geo:cbsa:35620",
    ])

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
      "geo:cbsa:35620",
    ])
  })

  it("lists states, cbsas, and submarkets together under a regional hub", () => {
    const laHub = hierarchyAreaById("geo:regional_hub:los angeles")
    expect(laHub).not.toBeNull()

    const children = hierarchyChildren(laHub!)
    const childIds = new Set(children.map((area) => area.id))

    expect(childIds.has("geo:state:CA")).toBe(true)
    expect([...childIds].some((id) => id.startsWith("geo:cbsa:"))).toBe(true)
    expect([...childIds].some((id) => id.startsWith("geo:submarket:"))).toBe(
      true
    )
    expect(children.every((area) => area.level === "submarket")).toBe(true)
  })

  it("steps from submarket tier to counties", () => {
    const stateNj = hierarchyAreaById("geo:state:NJ")!
    expect(stateNj.childLevel).toBe("county")

    const counties = hierarchyChildren(stateNj)
    expect(counties.length).toBeGreaterThan(0)
    expect(counties.every((area) => area.level === "county")).toBe(true)
  })
})
