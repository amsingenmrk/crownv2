import { AppTopbar } from "@/components/app-topbar"
import { BenchmarkWorkspaceLoader } from "@/components/benchmark-workspace-loader"

export default function BenchmarksPage() {
  return (
    <>
      <AppTopbar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <BenchmarkWorkspaceLoader />
      </div>
    </>
  )
}
