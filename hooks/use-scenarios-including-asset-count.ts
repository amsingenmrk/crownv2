"use client"

import * as React from "react"

import { countScenariosIncludingAssetId } from "@/lib/scenario-asset-inclusion-count"
import { SCENARIO_EXCLUDED_CHANGED_EVENT } from "@/lib/scenario-excluded-assets-storage"
import { SCENARIO_INCLUDED_CHANGED_EVENT } from "@/lib/scenario-included-assets-storage"
import { USER_SCENARIOS_CHANGED_EVENT } from "@/lib/user-scenarios"

const MOD_SETS_CHANGED = "glassbox:modification-sets-changed" as const

export function useScenariosIncludingAssetCount(assetId: string): number {
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    if (typeof window === "undefined") return () => {}

    const onEvent = () => onStoreChange()
    window.addEventListener(USER_SCENARIOS_CHANGED_EVENT, onEvent)
    window.addEventListener(SCENARIO_INCLUDED_CHANGED_EVENT, onEvent)
    window.addEventListener(SCENARIO_EXCLUDED_CHANGED_EVENT, onEvent)
    window.addEventListener(MOD_SETS_CHANGED, onEvent)

    const onStorage = (e: StorageEvent) => {
      const k = e.key
      if (k == null) return
      if (
        k.startsWith("glassbox:scenario-") ||
        k.startsWith("glassbox:modification-sets:") ||
        k === "glassbox:user-scenarios"
      ) {
        onStoreChange()
      }
    }
    window.addEventListener("storage", onStorage)

    return () => {
      window.removeEventListener(USER_SCENARIOS_CHANGED_EVENT, onEvent)
      window.removeEventListener(SCENARIO_INCLUDED_CHANGED_EVENT, onEvent)
      window.removeEventListener(SCENARIO_EXCLUDED_CHANGED_EVENT, onEvent)
      window.removeEventListener(MOD_SETS_CHANGED, onEvent)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  return React.useSyncExternalStore(
    subscribe,
    () => countScenariosIncludingAssetId(assetId),
    () => 0
  )
}
