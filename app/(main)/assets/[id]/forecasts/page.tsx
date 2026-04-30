import { AssetForecastsWorkspace } from "@/components/asset-forecasts-workspace"

export default async function AssetForecastsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <AssetForecastsWorkspace assetId={id} />
  )
}
