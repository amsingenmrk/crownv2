"use client"

import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"

const BenchmarkWorkspace = dynamic(
  () =>
    import("@/components/benchmark-workspace").then((m) => m.BenchmarkWorkspace),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="relative min-h-[min(50vh,420px)] flex-1 border-b border-border bg-muted/20 lg:min-h-0 lg:border-b-0 lg:border-r">
          <Skeleton className="absolute inset-0 rounded-none" />
        </div>
        <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-hidden border-t border-border bg-muted/15 p-4 lg:w-[min(100%,416px)] lg:flex-none lg:border-l lg:border-t-0 xl:w-[448px]">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="space-y-2 rounded-lg border border-border p-3"
              >
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  }
)

export function BenchmarkWorkspaceLoader() {
  return <BenchmarkWorkspace />
}
