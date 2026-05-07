import { AssetOverviewKpiStrip } from "@/components/asset-overview-kpi-strip"
import { AssetStackingPlanWorkspace } from "@/components/asset-stacking-plan-workspace"

export default async function AssetStackingPlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="flex flex-col gap-6">
      <AssetOverviewKpiStrip assetId={id} />
      <AssetStackingPlanWorkspace
        assetId={id}
        lockedViewMode="matrix"
        showViewToggle={false}
        showSortControl={false}
      />
    </div>
  )
}
