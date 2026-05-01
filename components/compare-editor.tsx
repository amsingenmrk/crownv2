"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AppTopbar } from "@/components/app-topbar"
import {
  CompareNewHeaderBridgeProvider,
  useCompareNewHeaderBridge,
} from "@/components/compare-new-header-bridge"
import { PortfolioScenarioComparison } from "@/components/portfolio-scenario-comparison"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { defaultCompareSlotKeys } from "@/lib/portfolio-compare-model"
import {
  createSavedComparison,
  getSavedComparisonById,
  getSavedComparisonsStoreSnapshot,
  subscribeSavedComparisons,
  updateSavedComparison,
  SAVED_COMPARISONS_SERVER_SNAPSHOT,
} from "@/lib/saved-comparisons"

function initialSlotsNewPage(duplicateFrom: string | null): string[] {
  if (typeof window === "undefined") {
    return defaultCompareSlotKeys()
  }
  if (duplicateFrom) {
    const src = getSavedComparisonById(duplicateFrom)
    if (src?.slotKeys.length) return [...src.slotKeys]
  }
  return defaultCompareSlotKeys()
}

export function CompareEditorNew() {
  return (
    <CompareNewHeaderBridgeProvider>
      <CompareEditorNewInner />
    </CompareNewHeaderBridgeProvider>
  )
}

function CompareEditorNewInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const duplicateFrom = searchParams.get("from")
  const compareNewHeaderBridge = useCompareNewHeaderBridge()

  const [slotKeys, setSlotKeys] = React.useState(() =>
    initialSlotsNewPage(duplicateFrom)
  )

  const [saveOpen, setSaveOpen] = React.useState(false)
  const [saveName, setSaveName] = React.useState("")

  const handleSave = React.useCallback(() => {
    const name = saveName.trim()
    if (!name) return
    const row = createSavedComparison(name, slotKeys)
    setSaveOpen(false)
    setSaveName("")
    if (row) router.replace(`/compare/${row.id}`)
  }, [saveName, slotKeys, router])

  React.useLayoutEffect(() => {
    if (!compareNewHeaderBridge) return
    compareNewHeaderBridge.setSaveOpener(() => setSaveOpen(true))
    return () => compareNewHeaderBridge.setSaveOpener(() => {})
  }, [compareNewHeaderBridge])

  return (
    <>
      <AppTopbar />
      <div
        role="main"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 md:px-6"
      >
        <div className="mx-auto w-full max-w-[1400px]">
          <PortfolioScenarioComparison
            slotKeys={slotKeys}
            onSlotKeysChange={setSlotKeys}
          />
        </div>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Save comparison</DialogTitle>
          </DialogHeader>
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave()
            }}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={!saveName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function CompareEditorById({ id }: { id: string }) {
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => {
    setReady(true)
  }, [])

  const savedSnap = React.useSyncExternalStore(
    subscribeSavedComparisons,
    getSavedComparisonsStoreSnapshot,
    () => SAVED_COMPARISONS_SERVER_SNAPSHOT
  )

  const saved = React.useMemo(
    () => savedSnap.find((c) => c.id === id) ?? null,
    [savedSnap, id]
  )

  const [slotKeys, setSlotKeys] = React.useState<string[]>(() => {
    if (typeof window === "undefined") {
      return defaultCompareSlotKeys()
    }
    const row = getSavedComparisonById(id)
    return row?.slotKeys?.length
      ? [...row.slotKeys]
      : defaultCompareSlotKeys()
  })

  React.useEffect(() => {
    if (!saved) return
    const handle = window.setTimeout(() => {
      updateSavedComparison(id, { slotKeys })
    }, 450)
    return () => window.clearTimeout(handle)
  }, [id, slotKeys, saved])

  if (!ready) {
    return (
      <>
        <AppTopbar />
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
          Loading…
        </div>
      </>
    )
  }

  if (!saved) {
    return (
      <>
        <AppTopbar />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center text-sm text-muted-foreground">
          <p>Comparison not found.</p>
          <Button render={<Link href="/compare" />}>Back to list</Button>
        </div>
      </>
    )
  }

  return (
    <>
      <AppTopbar />
      <div
        role="main"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 md:px-6"
      >
        <div className="mx-auto w-full max-w-[1400px]">
          <PortfolioScenarioComparison
            slotKeys={slotKeys}
            onSlotKeysChange={setSlotKeys}
          />
        </div>
      </div>
    </>
  )
}
