"use client"

import * as React from "react"
import { useParams } from "next/navigation"

import {
  BuildingModificationsSidebar,
  INITIAL_MOD_VALUES,
  type ModValues,
} from "@/components/building-modifications-sidebar"
import { AssetStackingPlanWorkspace } from "@/components/asset-stacking-plan-workspace"
import { AssetStatCards } from "@/components/asset-stat-cards"

function modificationDraftStorageKey(assetId: string) {
  return `glassbox:modification-draft:${assetId}`
}

function parseModificationDraft(raw: string | null): ModValues | null {
  if (raw == null || raw === "") return null
  try {
    const data = JSON.parse(raw) as unknown
    if (data == null || typeof data !== "object" || Array.isArray(data)) {
      return null
    }
    const o = data as Record<string, unknown>
    const next: ModValues = { ...INITIAL_MOD_VALUES }
    for (const k of Object.keys(INITIAL_MOD_VALUES) as (keyof ModValues)[]) {
      const v = o[k as string]
      if (typeof v === "string") next[k] = v
    }
    return next
  } catch {
    return null
  }
}

export function ModificationsWorkspace() {
  const params = useParams()
  const assetId =
    typeof params?.id === "string" && params.id.length > 0
      ? params.id
      : "default"

  const draftKey = modificationDraftStorageKey(assetId)

  const [values, setValues] = React.useState<ModValues>(() => ({
    ...INITIAL_MOD_VALUES,
  }))

  React.useLayoutEffect(() => {
    const parsed = parseModificationDraft(
      typeof localStorage !== "undefined"
        ? localStorage.getItem(draftKey)
        : null
    )
    setValues(parsed ?? { ...INITIAL_MOD_VALUES })
  }, [draftKey])

  React.useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(values))
    } catch {
      /* quota / private mode */
    }
  }, [values, draftKey])

  return (
    <div className="flex min-h-0 w-full flex-col gap-4">
      <div className="flex min-h-0 w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <BuildingModificationsSidebar
          assetId={assetId}
          value={values}
          onValuesChange={setValues}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <AssetStatCards variant="modifications" />
          <AssetStackingPlanWorkspace
            assetId={assetId}
            lockedViewMode="simplified"
            showViewToggle={false}
            showSortControl={false}
          />
        </div>
      </div>
    </div>
  )
}
