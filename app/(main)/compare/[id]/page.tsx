import { Suspense } from "react"
import { CompareEditorById } from "@/components/compare-editor"

export default async function CompareByIdPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <CompareEditorById id={id} />
    </Suspense>
  )
}
