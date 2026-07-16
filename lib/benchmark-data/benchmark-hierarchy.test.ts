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
    expect(path.map((area) => area.id)).toEqual([
      "geo:national:national",
      "geo:regional_hub:new jersey",
      "geo:state:NJ",
    ])
  })

  it("keeps state / CBSA / office submarket as one peer tier on the path", () => {
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

  it("lists states, cbsas, and office submarkets together under a regional hub", () => {
    const njHub = hierarchyAreaById("geo:regional_hub:new jersey")
    expect(njHub).not.toBeNull()

    const children = hierarchyChildren(njHub!)
    const childIds = new Set(children.map((area) => area.id))

    expect(childIds.has("geo:state:NJ")).toBe(true)
    expect(childIds.has("geo:cbsa:35620")).toBe(true)
    expect(childIds.has("geo:submarket:nj - northern & central")).toBe(true)
    expect(children.every((area) => area.level === "submarket")).toBe(true)
  })

  it("steps from any submarket-tier peer to counties, then to ZIPs", () => {
    const stateNj = hierarchyAreaById("geo:state:NJ")!
    expect(stateNj.childLevel).toBe("county")

    const counties = hierarchyChildren(stateNj)
    expect(counties.length).toBeGreaterThan(0)
    expect(counties.every((area) => area.level === "county")).toBe(true)
    expect(counties.some((area) => area.id === "geo:county:union|NJ")).toBe(
      true
    )

    const officeSubmarket = hierarchyAreaById(
      "geo:submarket:nj - northern & central"
    )!
    const submarketCounties = hierarchyChildren(officeSubmarket)
    expect(
      submarketCounties.some((area) => area.id === "geo:county:union|NJ")
    ).toBe(true)

    const union = hierarchyAreaById("geo:county:union|NJ")!
    expect(union.childLevel).toBe("zip")
    const zips = hierarchyChildren(union)
    expect(zips.some((area) => area.id === "geo:zip:07901")).toBe(true)
  })
})
