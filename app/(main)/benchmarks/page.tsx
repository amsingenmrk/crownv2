import { AppTopbar } from "@/components/app-topbar"
import { BenchmarkWorkspaceLoader } from "@/components/benchmark-workspace-loader"

export default async function BenchmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>
}) {
  const { area } = await searchParams

  return (
    <>
      <AppTopbar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <BenchmarkWorkspaceLoader initialAreaId={area} />
      </div>
    </>
  )
}
