"use client"

import * as React from "react"

export type ScenarioTableSelections = Record<string, string>

type Ctx = {
  selections: ScenarioTableSelections
  setTableSelection: (assetId: string, setId: string) => void
}

const ScenarioModificationSelectionsContext = React.createContext<Ctx | null>(
  null
)

export function ScenarioModificationSelectionsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [selections, setSelections] = React.useState<ScenarioTableSelections>(
    {}
  )

  const setTableSelection = React.useCallback(
    (assetId: string, setId: string) => {
      setSelections((prev) => {
        if (setId === "") {
          if (!(assetId in prev)) return prev
          const next = { ...prev }
          delete next[assetId]
          return next
        }
        if (prev[assetId] === setId) return prev
        return { ...prev, [assetId]: setId }
      })
    },
    []
  )

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
