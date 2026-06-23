import { afterEach, describe, expect, it, vi } from "vitest"

import { scenarioTableOutlookSelectionsKey } from "@/lib/scenario-table-outlook-selections-storage"
import {
  duplicateScenarioFromSourceSlug,
  removeUserScenarioBySlug,
  type UserScenario,
} from "@/lib/user-scenarios"

const USER_SCENARIOS_KEY = "glassbox:user-scenarios"

function installBrowserStorage(initial: Record<string, string>) {
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
  vi.stubGlobal("window", {
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
  vi.stubGlobal(
    "CustomEvent",
    class TestCustomEvent<T = unknown> extends Event {
      detail: T

      constructor(type: string, init?: CustomEventInit<T>) {
        super(type)
        this.detail = init?.detail as T
      }
    }
  )
  return store
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("user scenario route storage", () => {
  it("copies outlook selections when duplicating a scenario", () => {
    const scenarios: UserScenario[] = [{ name: "Source", slug: "source" }]
    const sourcePath = "/scenarios/source"
    const store = installBrowserStorage({
      [USER_SCENARIOS_KEY]: JSON.stringify(scenarios),
      [scenarioTableOutlookSelectionsKey(sourcePath)]: JSON.stringify({
        "asset-1": "optimistic",
      }),
    })

    const duplicate = duplicateScenarioFromSourceSlug("source")

    expect(duplicate).not.toBeNull()
    const destPath = `/scenarios/${duplicate?.slug}`
    expect(store.get(scenarioTableOutlookSelectionsKey(destPath))).toBe(
      JSON.stringify({ "asset-1": "optimistic" })
    )
  })

  it("clears outlook selections when removing a scenario", () => {
    const scenarios: UserScenario[] = [{ name: "Plan", slug: "plan" }]
    const path = "/scenarios/plan"
    const store = installBrowserStorage({
      [USER_SCENARIOS_KEY]: JSON.stringify(scenarios),
      [scenarioTableOutlookSelectionsKey(path)]: JSON.stringify({
        "asset-1": "pessimistic",
      }),
    })

    expect(removeUserScenarioBySlug("plan")).toEqual([])

    expect(store.has(scenarioTableOutlookSelectionsKey(path))).toBe(false)
  })
})
