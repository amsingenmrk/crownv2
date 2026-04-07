import { AssetStatCards } from "@/components/asset-stat-cards"
import { AssetForecastsWorkspace } from "@/components/asset-forecasts-workspace"

export default async function AssetForecastsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="flex flex-col gap-6">
      <AssetStatCards variant="forecasts" />
      <AssetForecastsWorkspace assetId={id} />
    </div>
  )
}
