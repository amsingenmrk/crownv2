"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { scenarioMembershipModeFromPathname } from "@/lib/scenario-membership"
import {
  parseScenarioTableSelectionsRaw,
  readScenarioTableSelections,
  scenarioModificationsTableStoragePathname,
  scenarioTableSelectionsKey,
} from "@/lib/scenario-table-selections-storage"
import {
  excludedStorageKeyForScenarioPathname,
  parseScenarioExcludedAssetIds,
  persistScenarioExcludedAssetIds,
  SCENARIO_EXCLUDED_CHANGED_EVENT,
  type ScenarioExcludedChangedDetail,
} from "@/lib/scenario-excluded-assets-storage"
import { readIncludedAssetIdsWithV1Migration } from "@/lib/scenario-included-assets-migration"
import {
  includedStorageKeyForScenarioPathname,
  parseScenarioIncludedAssetIds,
  persistScenarioIncludedAssetIds,
  SCENARIO_INCLUDED_CHANGED_EVENT,
  type ScenarioIncludedChangedDetail,
} from "@/lib/scenario-included-assets-storage"
import {
  parseScenarioTableOutlookSelectionsRaw,
  readScenarioTableOutlookSelections,
  scenarioTableOutlookSelectionsKey,
  type ScenarioTableOutlookSelections,
} from "@/lib/scenario-table-outlook-selections-storage"

export type ScenarioTableSelections = Record<string, string>

export type ScenarioMembershipMode = "off" | "builtin" | "explicit-inclusion"

type Ctx = {
  scenarioMembershipMode: ScenarioMembershipMode
  selections: ScenarioTableSelections
  setTableSelection: (assetId: string, setId: string) => void
  outlookSelections: ScenarioTableOutlookSelections
  setOutlookTableSelection: (assetId: string, outlookSetId: string) => void
  /** Built-in scenario: assets hidden via exclusion list. */
  scenarioExcludedAssetIds: ReadonlySet<string>
  /** User scenario: full membership. Built-in: portfolio “add” overlay (eligible ∪ overlay). */
  scenarioIncludedAssetIds: ReadonlySet<string>
  excludeAssetsFromScenario: (assetIds: readonly string[]) => void
  restoreAssetsToScenario: (assetIds: readonly string[]) => void
}

const ScenarioModificationSelectionsContext = React.createContext<Ctx | null>(
  null
)

function storageKeySelections(pathname: string | null): string | null {
  if (pathname == null || !pathname.startsWith("/scenarios/")) return null
  const base = scenarioModificationsTableStoragePathname(pathname)
  if (base == null) return null
  return scenarioTableSelectionsKey(base)
}

function storageKeyOutlookSelections(pathname: string | null): string | null {
  if (pathname == null || !pathname.startsWith("/scenarios/")) return null
  const base = scenarioModificationsTableStoragePathname(pathname)
  if (base == null) return null
  return scenarioTableOutlookSelectionsKey(base)
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
  const membershipMode = scenarioMembershipModeFromPathname(pathname)

  const [selections, setSelections] = React.useState<ScenarioTableSelections>(
    {}
  )
  const [excluded, setExcluded] = React.useState<Set<string>>(
    () => new Set()
  )
  const [included, setIncluded] = React.useState<Set<string>>(
    () => new Set()
  )
  const [outlookSelections, setOutlookSelections] =
    React.useState<ScenarioTableOutlookSelections>({})

  React.useLayoutEffect(() => {
    const selKey = storageKeySelections(pathname)
    const exKey = excludedStorageKeyForScenarioPathname(pathname)
    const inKey = includedStorageKeyForScenarioPathname(pathname)
    if (selKey == null || exKey == null) {
      setSelections({})
      setOutlookSelections({})
      setExcluded(new Set())
      setIncluded(new Set())
      return
    }
    setSelections(readScenarioTableSelections(pathname))
    setOutlookSelections(readScenarioTableOutlookSelections(pathname))
    setExcluded(parseScenarioExcludedAssetIds(localStorage.getItem(exKey)))
    if (inKey != null && membershipMode === "explicit-inclusion") {
      setIncluded(readIncludedAssetIdsWithV1Migration(pathname))
    } else if (inKey != null && membershipMode === "builtin") {
      setIncluded(parseScenarioIncludedAssetIds(localStorage.getItem(inKey)))
    } else {
      setIncluded(new Set())
    }
  }, [pathname, membershipMode])

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

  const setOutlookTableSelection = React.useCallback(
    (assetId: string, outlookSetId: string) => {
      setOutlookSelections((prev) => {
        let next: ScenarioTableOutlookSelections
        if (outlookSetId === "") {
          if (!(assetId in prev)) return prev
          next = { ...prev }
          delete next[assetId]
        } else {
          if (prev[assetId] === outlookSetId) return prev
          next = { ...prev, [assetId]: outlookSetId }
        }

        const key = storageKeyOutlookSelections(pathname)
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
      const inKey = includedStorageKeyForScenarioPathname(pathname)
      const selKey = storageKeySelections(pathname)
      const outlookKey = storageKeyOutlookSelections(pathname)
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

      setOutlookSelections((prev) => {
        const next = { ...prev }
        for (const id of assetIds) delete next[id]
        if (outlookKey != null) {
          persistJson(
            outlookKey,
            Object.keys(next).length === 0 ? null : next
          )
        }
        return next
      })

      if (
        membershipMode === "explicit-inclusion" &&
        inKey != null &&
        pathname != null
      ) {
        setIncluded((prev) => {
          const next = new Set(prev)
          for (const id of assetIds) next.delete(id)
          persistScenarioIncludedAssetIds(inKey, next)
          return next
        })
        window.dispatchEvent(
          new CustomEvent<ScenarioIncludedChangedDetail>(
            SCENARIO_INCLUDED_CHANGED_EVENT,
            { detail: { pathname } }
          )
        )
        return
      }

      if (
        membershipMode === "builtin" &&
        inKey != null &&
        pathname != null
      ) {
        setIncluded((prev) => {
          const next = new Set(prev)
          for (const id of assetIds) next.delete(id)
          persistScenarioIncludedAssetIds(inKey, next)
          return next
        })
        window.dispatchEvent(
          new CustomEvent<ScenarioIncludedChangedDetail>(
            SCENARIO_INCLUDED_CHANGED_EVENT,
            { detail: { pathname } }
          )
        )
      }

      setExcluded((prev) => {
        const next = new Set(prev)
        for (const id of assetIds) next.add(id)
        persistScenarioExcludedAssetIds(exKey, next)
        return next
      })
    },
    [membershipMode, pathname]
  )

  const restoreAssetsToScenario = React.useCallback(
    (assetIds: readonly string[]) => {
      if (assetIds.length === 0) return
      const exKey = excludedStorageKeyForScenarioPathname(pathname)
      const inKey = includedStorageKeyForScenarioPathname(pathname)
      if (exKey == null) return

      if (
        membershipMode === "explicit-inclusion" &&
        inKey != null &&
        pathname != null
      ) {
        setIncluded((prev) => {
          const next = new Set(prev)
          for (const id of assetIds) next.add(id)
          persistScenarioIncludedAssetIds(inKey, next)
          return next
        })
        window.dispatchEvent(
          new CustomEvent<ScenarioIncludedChangedDetail>(
            SCENARIO_INCLUDED_CHANGED_EVENT,
            { detail: { pathname } }
          )
        )
        return
      }

      setExcluded((prev) => {
        const next = new Set(prev)
        for (const id of assetIds) next.delete(id)
        persistScenarioExcludedAssetIds(exKey, next)
        return next
      })
    },
    [membershipMode, pathname]
  )

  React.useEffect(() => {
    const selKey = storageKeySelections(pathname)
    const outlookKey = storageKeyOutlookSelections(pathname)
    const exKey = excludedStorageKeyForScenarioPathname(pathname)
    const inKey = includedStorageKeyForScenarioPathname(pathname)
    if (selKey == null || exKey == null) return

    const onStorage = (e: StorageEvent) => {
      if (e.key === selKey) {
        setSelections(parseScenarioTableSelectionsRaw(e.newValue))
      }
      if (outlookKey != null && e.key === outlookKey) {
        setOutlookSelections(parseScenarioTableOutlookSelectionsRaw(e.newValue))
      }
      if (e.key === exKey) {
        setExcluded(parseScenarioExcludedAssetIds(e.newValue))
      }
      if (inKey != null && e.key === inKey) {
        setIncluded(parseScenarioIncludedAssetIds(e.newValue))
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

  React.useEffect(() => {
    const path = pathname
    const inKey = includedStorageKeyForScenarioPathname(path)
    if (
      inKey == null ||
      (membershipMode !== "explicit-inclusion" && membershipMode !== "builtin")
    ) {
      return
    }

    const onIncludedChanged = (e: Event) => {
      const d = (e as CustomEvent<ScenarioIncludedChangedDetail>).detail
      if (d?.pathname === path) {
        setIncluded(parseScenarioIncludedAssetIds(localStorage.getItem(inKey)))
      }
    }
    window.addEventListener(SCENARIO_INCLUDED_CHANGED_EVENT, onIncludedChanged)
    return () =>
      window.removeEventListener(
        SCENARIO_INCLUDED_CHANGED_EVENT,
        onIncludedChanged
      )
  }, [membershipMode, pathname])

  const value = React.useMemo(
    () => ({
      scenarioMembershipMode: membershipMode,
      selections,
      setTableSelection,
      outlookSelections,
      setOutlookTableSelection,
      scenarioExcludedAssetIds: excluded,
      scenarioIncludedAssetIds: included,
      excludeAssetsFromScenario,
      restoreAssetsToScenario,
    }),
    [
      membershipMode,
      selections,
      setTableSelection,
      outlookSelections,
      setOutlookTableSelection,
      excluded,
      included,
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

export function useScenarioModificationSelectionsOptional(): Ctx | null {
  return React.useContext(ScenarioModificationSelectionsContext)
}
