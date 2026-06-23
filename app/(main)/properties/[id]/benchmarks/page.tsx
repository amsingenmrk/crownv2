import { AssetBenchmarksWorkspace } from "@/components/asset-benchmarks-workspace"

export default async function AssetBenchmarksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ area?: string }>
}) {
  const { id } = await params
  const { area } = await searchParams

  return <AssetBenchmarksWorkspace assetId={id} benchmarkAreaId={area} />
}
