import { AssetStatCardsSkeleton } from "@/components/asset-stat-cards-skeleton"
import { StackingPlanSkeleton } from "@/components/stacking-plan-skeleton"

export default function AssetStackingPlanPage() {
  return (
    <div className="flex flex-col gap-6">
      <AssetStatCardsSkeleton />
      <StackingPlanSkeleton />
    </div>
  )
}
