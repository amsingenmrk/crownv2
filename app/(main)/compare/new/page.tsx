import { Suspense } from "react"
import { CompareEditorNew } from "@/components/compare-editor"

export default function CompareNewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <CompareEditorNew />
    </Suspense>
  )
}
