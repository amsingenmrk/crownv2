"use client"

import * as React from "react"
import dynamic from "next/dynamic"

import {
  resolveBenchmarkAreaById,
  US_NATIONAL_BENCHMARK_AREA,
} from "@/lib/benchmark-area-search"

const BenchmarkWorkspace = dynamic(
  () =>
    import("@/components/benchmark-workspace").then((m) => m.BenchmarkWorkspace),
  {
    ssr: false,
  }
)

export function BenchmarkWorkspaceLoader({
  initialAreaId,
  initialCompareAssetId,
}: {
  initialAreaId?: string
  initialCompareAssetId?: string
} = {}) {
  const initialArea = React.useMemo(
    () => resolveBenchmarkAreaById(initialAreaId) ?? undefined,
    [initialAreaId]
  )

  return (
    <BenchmarkWorkspace
      key={initialArea?.id ?? US_NATIONAL_BENCHMARK_AREA.id}
      initialArea={initialArea}
      initialCompareAssetId={initialCompareAssetId}
    />
  )
}
