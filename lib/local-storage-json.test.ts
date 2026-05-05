import { describe, expect, it, vi } from "vitest"

import { readJsonArrayFromLocalStorage, persistJsonToLocalStorage } from "@/lib/local-storage-json"

describe("readJsonArrayFromLocalStorage", () => {
  it("returns empty when localStorage is missing (node)", () => {
    if (typeof globalThis.localStorage !== "undefined") return
    expect(
      readJsonArrayFromLocalStorage("k", (x): x is string => typeof x === "string")
    ).toEqual([])
  })

  it("filters with predicate", () => {
    const getItem = vi.fn().mockReturnValue(JSON.stringify(["a", 1, "b"]))
    vi.stubGlobal(
      "localStorage",
      { getItem } as unknown as Storage
    )
    const out = readJsonArrayFromLocalStorage("k", (x): x is string => typeof x === "string")
    expect(out).toEqual(["a", "b"])
    vi.unstubAllGlobals()
  })
})

describe("persistJsonToLocalStorage", () => {
  it("removes key when value is null", () => {
    const removeItem = vi.fn()
    const setItem = vi.fn()
    vi.stubGlobal("localStorage", { removeItem, setItem } as unknown as Storage)
    persistJsonToLocalStorage("k", null)
    expect(removeItem).toHaveBeenCalledWith("k")
    expect(setItem).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it("invokes callback after write", () => {
    const setItem = vi.fn()
    const after = vi.fn()
    vi.stubGlobal("localStorage", { setItem, removeItem: vi.fn() } as unknown as Storage)
    persistJsonToLocalStorage("k", [1], after)
    expect(setItem).toHaveBeenCalled()
    expect(after).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
