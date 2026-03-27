import { Skeleton } from "@/components/ui/skeleton"

const ROWS = 28

function rowWidthSeed(row: number, i: number) {
  return 8 + ((row * 7 + i * 11) % 24)
}

export function StackingPlanSkeleton() {
  return (
    <div
      role="region"
      aria-label="Stacking plan preview"
      className="flex w-full min-h-[min(70vh,640px)] flex-col gap-5 rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="ml-auto h-8 w-32 max-sm:ml-0" />
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex w-7 shrink-0 flex-col justify-between py-0.5">
          {Array.from({ length: ROWS }, (_, i) => {
            const floor = ROWS - i
            const tick = floor % 6 === 0
            return (
              <div key={floor} className="flex h-5 items-center justify-end">
                {tick ? <Skeleton className="h-4 w-4 rounded-sm" /> : null}
              </div>
            )
          })}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
          {Array.from({ length: ROWS }, (_, i) => {
            const row = ROWS - i
            const segments = 2 + (row % 3)
            const widths = Array.from({ length: segments }, (_, j) =>
              rowWidthSeed(row, j)
            )
            return (
              <div key={row} className="flex h-5 items-center gap-3">
                {widths.map((w, j) => (
                  <Skeleton
                    key={j}
                    className="h-4 rounded-full"
                    style={{ flex: `${w} 1 0%` }}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  )
}
