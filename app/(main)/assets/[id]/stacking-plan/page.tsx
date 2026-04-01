import { AssetStatCards } from "@/components/asset-stat-cards"
import { StackingPlanSkeleton } from "@/components/stacking-plan-skeleton"

export default function AssetStackingPlanPage() {
  return (
    <div className="flex flex-col gap-6">
      <AssetStatCards />
      <StackingPlanSkeleton />
    </div>
  )
}
