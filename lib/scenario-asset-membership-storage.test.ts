import { afterEach, describe, expect, it, vi } from "vitest"

import {
  EXCLUDED_PREFIX,
  excludedStorageKeyForScenarioPathname,
  parseScenarioExcludedAssetIds,
} from "@/lib/scenario-excluded-assets-storage"
import {
  INCLUDED_MIGRATED_PREFIX,
  INCLUDED_PREFIX,
  includedStorageKeyForScenarioPathname,
  isScenarioInclusionMigratedForPathname,
  parseScenarioIncludedAssetIds,
} from "@/lib/scenario-included-assets-storage"

function installLocalStorage(initial: Record<string, string>) {
  const store = new Map(Object.entries(initial))
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, String(value))
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key)
    }),
  } as unknown as Storage)
  return store
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("scenario asset membership storage paths", () => {
  it("uses the scenario slug key for excluded assets on subroutes", () => {
    const store = installLocalStorage({
      [`${EXCLUDED_PREFIX}/scenarios/plan`]: JSON.stringify(["asset-a"]),
      [`${EXCLUDED_PREFIX}/scenarios/plan/forecasts`]: JSON.stringify([
        "asset-b",
      ]),
    })

    const key = excludedStorageKeyForScenarioPathname(
      "/scenarios/plan/forecasts"
    )

    expect(key).toBe(`${EXCLUDED_PREFIX}/scenarios/plan`)
    expect(
      [
        ...parseScenarioExcludedAssetIds(
          store.get(`${EXCLUDED_PREFIX}/scenarios/plan`) ?? null
        ),
      ].sort()
    ).toEqual(["asset-a", "asset-b"])
    expect(store.has(`${EXCLUDED_PREFIX}/scenarios/plan/forecasts`)).toBe(false)
  })

  it("uses the scenario slug key for included assets and migrated markers", () => {
    const store = installLocalStorage({
      [`${INCLUDED_PREFIX}/scenarios/plan`]: JSON.stringify(["asset-a"]),
      [`${INCLUDED_PREFIX}/scenarios/plan/forecasts`]: JSON.stringify([
        "asset-b",
      ]),
      [`${INCLUDED_MIGRATED_PREFIX}/scenarios/plan/forecasts`]: "1",
    })

    const key = includedStorageKeyForScenarioPathname(
      "/scenarios/plan/forecasts"
    )

    expect(key).toBe(`${INCLUDED_PREFIX}/scenarios/plan`)
    expect(
      [
        ...parseScenarioIncludedAssetIds(
          store.get(`${INCLUDED_PREFIX}/scenarios/plan`) ?? null
        ),
      ].sort()
    ).toEqual(["asset-a", "asset-b"])
    expect(isScenarioInclusionMigratedForPathname("/scenarios/plan")).toBe(true)
    expect(store.has(`${INCLUDED_PREFIX}/scenarios/plan/forecasts`)).toBe(false)
    expect(
      store.has(`${INCLUDED_MIGRATED_PREFIX}/scenarios/plan/forecasts`)
    ).toBe(false)
  })
})
