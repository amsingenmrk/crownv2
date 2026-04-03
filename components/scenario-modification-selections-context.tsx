"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

export type ScenarioTableSelections = Record<string, string>

type Ctx = {
  selections: ScenarioTableSelections
  setTableSelection: (assetId: string, setId: string) => void
}

const ScenarioModificationSelectionsContext = React.createContext<Ctx | null>(
  null
)

const STORAGE_PREFIX = "glassbox:scenario-table-selections:" as const

function storageKeyForScenarioPath(pathname: string | null): string | null {
  if (pathname == null || !pathname.startsWith("/scenarios/")) return null
  return `${STORAGE_PREFIX}${pathname}`
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

export function ScenarioModificationSelectionsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const [selections, setSelections] = React.useState<ScenarioTableSelections>({})

  React.useLayoutEffect(() => {
    const key = storageKeyForScenarioPath(pathname)
    if (key == null) {
      setSelections({})
      return
    }
    setSelections(parseStoredSelections(localStorage.getItem(key)))
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

        const key = storageKeyForScenarioPath(pathname)
        if (key != null && typeof localStorage !== "undefined") {
          try {
            if (Object.keys(next).length === 0) {
              localStorage.removeItem(key)
            } else {
              localStorage.setItem(key, JSON.stringify(next))
            }
          } catch {
            /* quota / private mode */
          }
        }

        return next
      })
    },
    [pathname]
  )

  React.useEffect(() => {
    const key = storageKeyForScenarioPath(pathname)
    if (key == null) return

    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return
      setSelections(parseStoredSelections(e.newValue))
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [pathname])

  const value = React.useMemo(
    () => ({ selections, setTableSelection }),
    [selections, setTableSelection]
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
