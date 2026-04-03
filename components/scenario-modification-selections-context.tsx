"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  excludedStorageKeyForScenarioPathname,
  parseScenarioExcludedAssetIds,
  persistScenarioExcludedAssetIds,
  SCENARIO_EXCLUDED_CHANGED_EVENT,
  type ScenarioExcludedChangedDetail,
} from "@/lib/scenario-excluded-assets-storage"

export type ScenarioTableSelections = Record<string, string>

type Ctx = {
  selections: ScenarioTableSelections
  setTableSelection: (assetId: string, setId: string) => void
  /** Assets hidden from this scenario route (localStorage, per pathname). */
  scenarioExcludedAssetIds: ReadonlySet<string>
  excludeAssetsFromScenario: (assetIds: readonly string[]) => void
  restoreAssetsToScenario: (assetIds: readonly string[]) => void
}

const ScenarioModificationSelectionsContext = React.createContext<Ctx | null>(
  null
)

const SELECTIONS_PREFIX = "glassbox:scenario-table-selections:" as const

function storageKeySelections(pathname: string | null): string | null {
  if (pathname == null || !pathname.startsWith("/scenarios/")) return null
  return `${SELECTIONS_PREFIX}${pathname}`
}

function parseStoredSelections(raw: string | null): ScenarioTableSelections {
  if (raw == null || raw === "") return {}
  try {
    const data = JSON.parse(raw) as unknown
    if (data == null || typeof data !== "object" || Array.isArray(data)) {
      return {}
    }
    const out: ScenarioTableSelections = {}
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      if (typeof v === "string" && v.length > 0) out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

function persistJson(key: string | null, value: unknown) {
  if (key == null || typeof localStorage === "undefined") return
  try {
    if (
      value === null ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.keys(value as object).length === 0)
    ) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(value))
    }
  } catch {
    /* quota / private mode */
  }
}

export function ScenarioModificationSelectionsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const [selections, setSelections] = React.useState<ScenarioTableSelections>(
    {}
  )
  const [excluded, setExcluded] = React.useState<Set<string>>(
    () => new Set()
  )

  React.useLayoutEffect(() => {
    const selKey = storageKeySelections(pathname)
    const exKey = excludedStorageKeyForScenarioPathname(pathname)
    if (selKey == null || exKey == null) {
      setSelections({})
      setExcluded(new Set())
      return
    }
    setSelections(parseStoredSelections(localStorage.getItem(selKey)))
    setExcluded(parseScenarioExcludedAssetIds(localStorage.getItem(exKey)))
  }, [pathname])

  const setTableSelection = React.useCallback(
    (assetId: string, setId: string) => {
      setSelections((prev) => {
        let next: ScenarioTableSelections
        if (setId === "") {
          if (!(assetId in prev)) return prev
          next = { ...prev }
          delete next[assetId]
        } else {
          if (prev[assetId] === setId) return prev
          next = { ...prev, [assetId]: setId }
        }

        const key = storageKeySelections(pathname)
        persistJson(
          key,
          Object.keys(next).length === 0 ? null : next
        )

        return next
      })
    },
    [pathname]
  )

  const excludeAssetsFromScenario = React.useCallback(
    (assetIds: readonly string[]) => {
      if (assetIds.length === 0) return
      const exKey = excludedStorageKeyForScenarioPathname(pathname)
      const selKey = storageKeySelections(pathname)
      if (exKey == null) return

      setSelections((prev) => {
        const next = { ...prev }
        for (const id of assetIds) delete next[id]
        if (selKey != null) {
          persistJson(
            selKey,
            Object.keys(next).length === 0 ? null : next
          )
        }
        return next
      })

      setExcluded((prev) => {
        const next = new Set(prev)
        for (const id of assetIds) next.add(id)
        persistScenarioExcludedAssetIds(exKey, next)
        return next
      })
    },
    [pathname]
  )

  const restoreAssetsToScenario = React.useCallback(
    (assetIds: readonly string[]) => {
      if (assetIds.length === 0) return
      const exKey = excludedStorageKeyForScenarioPathname(pathname)
      if (exKey == null) return

      setExcluded((prev) => {
        const next = new Set(prev)
        for (const id of assetIds) next.delete(id)
        persistScenarioExcludedAssetIds(exKey, next)
        return next
      })
    },
    [pathname]
  )

  React.useEffect(() => {
    const selKey = storageKeySelections(pathname)
    const exKey = excludedStorageKeyForScenarioPathname(pathname)
    if (selKey == null || exKey == null) return

    const onStorage = (e: StorageEvent) => {
      if (e.key === selKey) {
        setSelections(parseStoredSelections(e.newValue))
      }
      if (e.key === exKey) {
        setExcluded(parseScenarioExcludedAssetIds(e.newValue))
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [pathname])

  React.useEffect(() => {
    const path = pathname
    const exKey = excludedStorageKeyForScenarioPathname(path)
    if (exKey == null) return

    const onExcludedChanged = (e: Event) => {
      const d = (e as CustomEvent<ScenarioExcludedChangedDetail>).detail
      if (d?.pathname === path) {
        setExcluded(parseScenarioExcludedAssetIds(localStorage.getItem(exKey)))
      }
    }
    window.addEventListener(SCENARIO_EXCLUDED_CHANGED_EVENT, onExcludedChanged)
    return () =>
      window.removeEventListener(
        SCENARIO_EXCLUDED_CHANGED_EVENT,
        onExcludedChanged
      )
  }, [pathname])

  const value = React.useMemo(
    () => ({
      selections,
      setTableSelection,
      scenarioExcludedAssetIds: excluded,
      excludeAssetsFromScenario,
      restoreAssetsToScenario,
    }),
    [
      selections,
      setTableSelection,
      excluded,
      excludeAssetsFromScenario,
      restoreAssetsToScenario,
    ]
  )

  return (
    <ScenarioModificationSelectionsContext.Provider value={value}>
      {children}
    </ScenarioModificationSelectionsContext.Provider>
  )
}

export function useScenarioModificationSelections(): Ctx {
  const ctx = React.useContext(ScenarioModificationSelectionsContext)
  if (ctx == null) {
    throw new Error(
      "useScenarioModificationSelections must be used within ScenarioModificationSelectionsProvider"
    )
  }
  return ctx
}
