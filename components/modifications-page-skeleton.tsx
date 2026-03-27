import { AssetStatCardsSkeleton } from "@/components/asset-stat-cards-skeleton"
import { BuildingModificationsSidebar } from "@/components/building-modifications-sidebar"
import { StackingPlanSkeleton } from "@/components/stacking-plan-skeleton"

export function ModificationsPageSkeleton() {
  return (
    <div className="flex min-h-0 w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <BuildingModificationsSidebar />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <AssetStatCardsSkeleton />
        <StackingPlanSkeleton />
      </div>
    </div>
  )
}
