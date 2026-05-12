import { Suspense } from "react"
import { ModificationsPageSkeleton } from "@/components/modifications-page-skeleton"

export default function AssetModificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <ModificationsPageSkeleton />
    </Suspense>
  )
}
