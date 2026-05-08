import Link from "next/link"

import { AppTopbar } from "@/components/app-topbar"
import { Button } from "@/components/ui/button"

export default function ExamplesIndexPage() {
  return (
    <>
      <AppTopbar />
      <div
        role="main"
        className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-4 py-6 md:px-6"
      >
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Examples</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Scratch pages for design and UI experiments.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-medium text-foreground">KPI strips</div>
                <div className="text-sm text-muted-foreground">
                  Mockups and layout experiments for KPI strip patterns.
                </div>
              </div>
              <Button
                className="shrink-0"
                variant="secondary"
                render={<Link href="/examples/kpi-strips" />}
              >
                Open
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

