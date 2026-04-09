"use client"

import * as React from "react"

type CompareNewHeaderBridgeValue = {
  requestSave: () => void
  setSaveOpener: (fn: () => void) => void
}

const CompareNewHeaderBridgeContext =
  React.createContext<CompareNewHeaderBridgeValue | null>(null)

export function CompareNewHeaderBridgeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const openerRef = React.useRef<() => void>(() => {})

  const requestSave = React.useCallback(() => {
    openerRef.current()
  }, [])

  const setSaveOpener = React.useCallback((fn: () => void) => {
    openerRef.current = fn
  }, [])

  const value = React.useMemo(
    () => ({ requestSave, setSaveOpener }),
    [requestSave, setSaveOpener]
  )

  return (
    <CompareNewHeaderBridgeContext.Provider value={value}>
      {children}
    </CompareNewHeaderBridgeContext.Provider>
  )
}

export function useCompareNewHeaderBridge(): CompareNewHeaderBridgeValue | null {
  return React.useContext(CompareNewHeaderBridgeContext)
}
