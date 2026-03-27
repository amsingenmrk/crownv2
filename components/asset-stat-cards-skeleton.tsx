import { Skeleton } from "@/components/ui/skeleton"

const STAT_CARDS = 4

export function AssetStatCardsSkeleton() {
  return (
    <section
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Asset statistics"
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
  )
}
