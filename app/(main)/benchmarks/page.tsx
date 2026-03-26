import { AppTopbar } from "@/components/app-topbar"
import { Skeleton } from "@/components/ui/skeleton"

export default function BenchmarksPage() {
  return (
    <>
      <AppTopbar />
      <div
        role="main"
        className="flex flex-1 flex-col gap-8 px-4 py-6 md:px-6"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Benchmark</h1>
          <p className="mt-1 text-sm text-muted-foreground">Coming soon</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-lg border border-border p-4"
            >
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
