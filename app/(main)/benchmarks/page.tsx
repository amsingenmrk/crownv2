import { AppTopbar } from "@/components/app-topbar"
import { BenchmarkWorkspaceLoader } from "@/components/benchmark-workspace-loader"

export default async function BenchmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; compare?: string }>
}) {
  const { area, compare } = await searchParams

  return (
    <>
      <AppTopbar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <BenchmarkWorkspaceLoader
          initialAreaId={area}
          initialCompareAssetId={compare}
        />
      </div>
    </>
  )
}
