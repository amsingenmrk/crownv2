import { BuildingModificationsSidebar } from "@/components/building-modifications-sidebar"
import { StackingPlanSkeleton } from "@/components/stacking-plan-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

const STAT_CARDS = 4

export function ModificationsPageSkeleton() {
  return (
    <div className="flex min-h-0 w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <BuildingModificationsSidebar />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <section
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Modification statistics"
        >
          {Array.from({ length: STAT_CARDS }, (_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm"
            >
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="mt-3 h-8 w-20" />
              <Skeleton className="mt-2 h-3 w-32 max-w-full" />
            </div>
          ))}
        </section>

        <StackingPlanSkeleton />
      </div>
    </div>
  )
}
