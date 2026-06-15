import { Skeleton } from "@/components/ui/skeleton"

const KPI_METRIC_ROWS = 5
const TABLE_ROWS = 12

function KpiStripSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      aria-hidden
    >
      <div className="overflow-x-auto">
        <div className="min-w-[39rem]">
          <div className="grid grid-cols-[11.5rem_repeat(3,9.25rem)] border-b border-border/50 bg-muted/[0.22]">
            <div className="px-2.5 py-2" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="border-l border-border/50 px-2.5 py-2"
              >
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
          {Array.from({ length: KPI_METRIC_ROWS }).map((_, row) => (
            <div
              key={row}
              className="grid grid-cols-[11.5rem_repeat(3,9.25rem)] border-b border-border/50 last:border-b-0"
            >
              <div className="bg-muted/[0.08] px-2.5 py-2">
                <Skeleton className="h-4 w-28" />
              </div>
              {Array.from({ length: 3 }).map((_, col) => (
                <div
                  key={col}
                  className="border-l border-border/50 bg-card px-2.5 py-2"
                >
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="mt-1 h-3 w-14" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AssetsTableSkeleton() {
  return (
    <div
      className="min-w-0 w-full max-w-full overflow-hidden rounded-xl border border-border bg-card p-0 shadow-sm"
      aria-hidden
    >
      <div className="border-b border-border bg-muted/20 px-3 py-2.5">
        <div className="flex gap-3">
          <Skeleton className="h-4 w-24 shrink-0" />
          <Skeleton className="h-4 w-16 shrink-0" />
          <Skeleton className="h-4 w-14 shrink-0" />
          <Skeleton className="h-4 w-14 shrink-0" />
          <Skeleton className="h-4 w-16 shrink-0" />
          <Skeleton className="ml-auto h-4 w-20 shrink-0" />
        </div>
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: TABLE_ROWS }).map((_, row) => (
          <div
            key={row}
            className="flex items-center gap-3 px-3 py-3"
            style={{
              opacity: 1 - row * 0.04,
            }}
          >
            <Skeleton className="size-4 shrink-0 rounded-sm" />
            <Skeleton
              className="h-4 shrink-0 rounded-full"
              style={{ width: `${7 + (row % 4) * 2}rem` }}
            />
            <Skeleton className="h-4 w-12 shrink-0" />
            <Skeleton className="h-4 w-14 shrink-0" />
            <Skeleton className="h-4 w-16 shrink-0" />
            <Skeleton className="h-4 w-14 shrink-0" />
            <Skeleton className="ml-auto h-6 w-16 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function PortfolioPageSkeleton() {
  return (
    <div
      className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-[24px]"
      aria-busy="true"
      aria-label="Loading portfolio overview"
    >
      <KpiStripSkeleton />

      <section className="flex min-w-0 flex-col gap-3" aria-hidden>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="ml-auto h-8 w-[8.5rem] rounded-md sm:ml-2" />
          </div>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <Skeleton className="h-9 min-w-0 w-full flex-1 sm:max-w-xs sm:w-auto" />
            <Skeleton className="hidden h-9 w-24 rounded-md lg:block" />
            <Skeleton className="h-9 w-24 shrink-0 rounded-md" />
          </div>
        </div>

        <AssetsTableSkeleton />
      </section>
    </div>
  )
}
