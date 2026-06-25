import { afterEach, describe, expect, it, vi } from "vitest"

import {
  readScenarioTableOutlookSelections,
  scenarioTableOutlookSelectionsKey,
} from "@/lib/scenario-table-outlook-selections-storage"
import {
  readScenarioTableSelections,
  scenarioTableSelectionsKey,
} from "@/lib/scenario-table-selections-storage"

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

describe("scenario table selection storage paths", () => {
  it("migrates modification selections from scenario subroutes", () => {
    const canonicalKey = scenarioTableSelectionsKey("/scenarios/plan")
    const legacyKey = scenarioTableSelectionsKey("/scenarios/plan/forecasts")
    const store = installLocalStorage({
      [canonicalKey]: JSON.stringify({
        "asset-a": "base-set",
        "asset-b": "canonical-set",
      }),
      [legacyKey]: JSON.stringify({
        "asset-b": "legacy-set",
        "asset-c": "forecast-set",
      }),
    })

    expect(readScenarioTableSelections("/scenarios/plan/forecasts")).toEqual({
      "asset-a": "base-set",
      "asset-b": "canonical-set",
      "asset-c": "forecast-set",
    })
    expect(JSON.parse(store.get(canonicalKey) ?? "{}")).toEqual({
      "asset-a": "base-set",
      "asset-b": "canonical-set",
      "asset-c": "forecast-set",
    })
    expect(store.has(legacyKey)).toBe(false)
  })

  it("migrates outlook selections from scenario subroutes", () => {
    const canonicalKey = scenarioTableOutlookSelectionsKey("/scenarios/plan")
    const legacyKey = scenarioTableOutlookSelectionsKey(
      "/scenarios/plan/forecasts"
    )
    const store = installLocalStorage({
      [canonicalKey]: JSON.stringify({
        "asset-a": "baseline",
        "asset-b": "downside",
      }),
      [legacyKey]: JSON.stringify({
        "asset-b": "upside",
        "asset-c": "base",
      }),
    })

    expect(
      readScenarioTableOutlookSelections("/scenarios/plan/forecasts")
    ).toEqual({
      "asset-a": "baseline",
      "asset-b": "downside",
      "asset-c": "base",
    })
    expect(JSON.parse(store.get(canonicalKey) ?? "{}")).toEqual({
      "asset-a": "baseline",
      "asset-b": "downside",
      "asset-c": "base",
    })
    expect(store.has(legacyKey)).toBe(false)
  })
})
