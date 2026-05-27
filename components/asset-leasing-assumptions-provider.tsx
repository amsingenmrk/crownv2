"use client"

import * as React from "react"

import {
  defaultAssetLeasingAssumptions,
  assetLeasingAssumptionsStorageKey,
  parseStoredAssetLeasingAssumptions,
  persistAssetLeasingAssumptions,
  type AssetLeasingAssumptionsState,
} from "@/lib/asset-leasing-assumptions"
import type { ForecastAssumptions } from "@/lib/forecast-data"

type AssetLeasingAssumptionsContextValue = {
  assumptions: AssetLeasingAssumptionsState
  updateAssumptions: (updates: Partial<AssetLeasingAssumptionsState>) => void
  resetAssumptions: () => void
}

const AssetLeasingAssumptionsContext =
  React.createContext<AssetLeasingAssumptionsContextValue | null>(null)

export function AssetLeasingAssumptionsProvider({
  assetId,
  children,
}: {
  assetId: string
  children: React.ReactNode
}) {
  const [assumptions, setAssumptions] =
    React.useState<AssetLeasingAssumptionsState>(() =>
      defaultAssetLeasingAssumptions(assetId)
    )

  React.useLayoutEffect(() => {
    const stored =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(assetLeasingAssumptionsStorageKey(assetId))
        : null
    setAssumptions(parseStoredAssetLeasingAssumptions(stored, assetId))
  }, [assetId])

  const updateAssumptions = React.useCallback(
    (updates: Partial<AssetLeasingAssumptionsState>) => {
      setAssumptions((prev) => {
        const next: AssetLeasingAssumptionsState = {
          ...prev,
          ...updates,
          markToMarketEnabled: updates.markToMarketEnabled ?? prev.markToMarketEnabled ?? true,
        }
        persistAssetLeasingAssumptions(assetId, next)
        return next
      })
    },
    [assetId]
  )

  const resetAssumptions = React.useCallback(() => {
    const next = defaultAssetLeasingAssumptions(assetId)
    setAssumptions(next)
    persistAssetLeasingAssumptions(assetId, next)
  }, [assetId])

  const value = React.useMemo(
    () => ({ assumptions, updateAssumptions, resetAssumptions }),
    [assumptions, resetAssumptions, updateAssumptions]
  )

  return (
    <AssetLeasingAssumptionsContext.Provider value={value}>
      {children}
    </AssetLeasingAssumptionsContext.Provider>
  )
}

export function useAssetLeasingAssumptions() {
  const context = React.useContext(AssetLeasingAssumptionsContext)
  if (!context) {
    throw new Error(
      "useAssetLeasingAssumptions must be used within AssetLeasingAssumptionsProvider"
    )
  }
  return context
}

/** Forecast workspace only — returns null when provider is absent. */
export function useOptionalAssetLeasingAssumptions() {
  return React.useContext(AssetLeasingAssumptionsContext)
}

export function forecastAssumptionsFromLeasingState(
  state: AssetLeasingAssumptionsState
): ForecastAssumptions {
  return {
    markToMarketEnabled: state.markToMarketEnabled,
    timeToLeaseMonths: state.timeToLeaseMonths,
    occupancyTargetPct: state.occupancyTargetPct,
    defaultRenewalProbabilityPct: state.defaultRenewalProbabilityPct,
    exitCapRatePct: state.exitCapRatePct,
  }
}
