"use client"

import * as React from "react"
import { useParams } from "next/navigation"

import {
  BuildingModificationsSidebar,
  INITIAL_MOD_VALUES,
  type ModValues,
} from "@/components/building-modifications-sidebar"
import { AssetStatCardsSkeleton } from "@/components/asset-stat-cards-skeleton"
import { StackingPlanSkeleton } from "@/components/stacking-plan-skeleton"

export function ModificationsWorkspace() {
  const params = useParams()
  const assetId =
    typeof params?.id === "string" && params.id.length > 0
      ? params.id
      : "default"

  const [values, setValues] = React.useState<ModValues>(() => ({
    ...INITIAL_MOD_VALUES,
  }))

  return (
    <div className="flex min-h-0 w-full flex-col gap-4">
      <div className="flex min-h-0 w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <BuildingModificationsSidebar
          assetId={assetId}
          value={values}
          onValuesChange={setValues}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <AssetStatCardsSkeleton />
          <StackingPlanSkeleton />
        </div>
      </div>
    </div>
  )
}
