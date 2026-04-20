import { FileSpreadsheet, FileText, UploadCloud } from "lucide-react"

import { AppTopbar } from "@/components/app-topbar"
import { Button } from "@/components/ui/button"

const UPLOAD_SURFACES = [
  {
    title: "Rent Roll",
    description:
      "Upload a rent roll to start normalizing lease data into an analysis-ready stack.",
    icon: FileSpreadsheet,
  },
  {
    title: "Offering Memorandum",
    description:
      "Upload an OM to capture asset context, assumptions, and supporting deal materials.",
    icon: FileText,
  },
] as const

export default function DocumentsPage() {
  return (
    <>
      <AppTopbar />
      <div
        role="main"
        className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-4 py-6 md:px-6"
      >
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight">Doc Upload</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload rent rolls and offering memoranda to kick off structured
            analysis in NBX.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {UPLOAD_SURFACES.map((surface) => {
            const Icon = surface.icon

            return (
              <section
                key={surface.title}
                className="rounded-xl border border-dashed border-border/80 bg-card p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-base font-semibold text-foreground">
                      {surface.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {surface.description}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center">
                  <UploadCloud
                    className="mb-3 size-8 text-muted-foreground"
                    aria-hidden
                  />
                  <p className="text-sm font-medium text-foreground">
                    Upload workflow coming soon
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    This sidebar entry now anchors the document-ingestion
                    surface. The file picker and parsing flow can be wired here
                    next.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    Select file
                  </Button>
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </>
  )
}
