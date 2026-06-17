import { AssetBenchmarksWorkspace } from "@/components/asset-benchmarks-workspace"

export default async function AssetBenchmarksPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <AssetBenchmarksWorkspace assetId={id} />
}
