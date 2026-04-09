"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  Briefcase,
  Building,
  Building2,
  Diff,
  Home,
  MoreVertical,
  Plus,
} from "lucide-react"
import { AppTopbar } from "@/components/app-topbar"
import { useAppToast } from "@/components/app-toast"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  getSavedComparisonsStoreSnapshot,
  removeSavedComparison,
  subscribeSavedComparisons,
  updateSavedComparison,
  SAVED_COMPARISONS_SERVER_SNAPSHOT,
  type SavedComparison,
} from "@/lib/saved-comparisons"
import {
  ASSET_KEY_PREFIX,
  GROUP_KEY_PREFIX,
  PORTFOLIO_KEY,
  labelForCompareSlotKey,
  parsePropertySlotKey,
} from "@/lib/portfolio-compare-model"
import {
  getUserScenariosStoreSnapshot,
  subscribeUserScenarios,
  USER_SCENARIOS_SERVER_SNAPSHOT,
} from "@/lib/user-scenarios"
import { cn } from "@/lib/utils"

function formatUpdatedRelative(iso: string): string {
  const d = new Date(iso)
  const sec = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000))
  if (sec < 45) return "just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 48) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

function slotPreviewChips(
  slotKeys: string[],
  userScenarios: readonly { name: string; slug: string }[]
): string[] {
  return slotKeys.map((k) => labelForCompareSlotKey(k, userScenarios))
}

function iconForCompareSlotKey(slotKey: string): LucideIcon {
  if (slotKey === PORTFOLIO_KEY) return Building
  if (slotKey.startsWith(GROUP_KEY_PREFIX)) return Briefcase
  if (slotKey.startsWith(ASSET_KEY_PREFIX)) return Building2
  if (parsePropertySlotKey(slotKey) != null) return Home
  if (slotKey.startsWith("scenario:")) return Diff
  return Briefcase
}

function NewComparisonCard({
  className,
  prominent,
}: {
  className?: string
  /** Larger when it’s the only card on the page */
  prominent?: boolean
}) {
  return (
    <Link
      href="/compare/new"
      aria-label="Create new comparison"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-background px-6 text-center",
        prominent ? "min-h-[min(320px,42vh)] py-16" : "min-h-[188px] py-10",
        "transition-colors hover:border-muted-foreground/40 hover:bg-muted/15",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      <Plus
        className="size-12 shrink-0 text-muted-foreground"
        strokeWidth={1.25}
        aria-hidden
      />
      <span className="text-sm font-normal text-muted-foreground">
        Create new comparison
      </span>
    </Link>
  )
}

export function CompareLanding() {
  const router = useRouter()
  const showToast = useAppToast()
  const saved = React.useSyncExternalStore(
    subscribeSavedComparisons,
    getSavedComparisonsStoreSnapshot,
    () => SAVED_COMPARISONS_SERVER_SNAPSHOT
  )
  const userScenarios = React.useSyncExternalStore(
    subscribeUserScenarios,
    getUserScenariosStoreSnapshot,
    () => USER_SCENARIOS_SERVER_SNAPSHOT
  )

  const sorted = React.useMemo(
    () =>
      [...saved].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [saved]
  )

  const [renameOpen, setRenameOpen] = React.useState(false)
  const [renameId, setRenameId] = React.useState<string | null>(null)
  const [renameDraft, setRenameDraft] = React.useState("")

  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<{
    id: string
    name: string
  } | null>(null)

  const openRename = React.useCallback((c: SavedComparison) => {
    setRenameId(c.id)
    setRenameDraft(c.name)
    setRenameOpen(true)
  }, [])

  const commitRename = React.useCallback(() => {
    const name = renameDraft.trim()
    if (!name || renameId == null) return
    updateSavedComparison(renameId, { name })
    setRenameOpen(false)
    setRenameId(null)
    setRenameDraft("")
    showToast(`Renamed to “${name}”.`)
  }, [renameDraft, renameId, showToast])

  const openDelete = React.useCallback((c: SavedComparison) => {
    setDeleteTarget({ id: c.id, name: c.name })
    setDeleteOpen(true)
  }, [])

  const commitDelete = React.useCallback(() => {
    if (deleteTarget == null) return
    removeSavedComparison(deleteTarget.id)
    setDeleteOpen(false)
    setDeleteTarget(null)
    showToast("Comparison deleted.")
  }, [deleteTarget, showToast])

  const isEmpty = sorted.length === 0

  return (
    <>
      <AppTopbar />
      <div
        role="main"
        className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-4 py-6 md:px-6"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compare</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare anything from Portfolios, Assets, and Scenarios in a
            side-by-side view.
          </p>
        </div>

        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          <li
            className={cn("min-w-0", isEmpty && "sm:col-span-2 lg:col-span-3")}
          >
            <NewComparisonCard prominent={isEmpty} className="h-full w-full" />
          </li>
          {!isEmpty
            ? sorted.map((c: SavedComparison) => {
                const chips = slotPreviewChips(c.slotKeys, userScenarios)
                return (
                  <li key={c.id} className="min-w-0">
                    <div
                      className={cn(
                        "relative flex h-full min-h-[188px] flex-col rounded-lg border border-border",
                        "transition-colors hover:bg-muted/30"
                      )}
                    >
                      <Link
                        href={`/compare/${c.id}`}
                        className={cn(
                          "flex min-h-0 flex-1 flex-col gap-3 p-4 pr-12",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        )}
                      >
                        <p className="min-w-0 font-semibold leading-snug text-foreground">
                          {c.name}
                        </p>
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
                          <div className="flex min-w-0 flex-wrap gap-2">
                            {c.slotKeys.map((slotKey, i) => {
                              const label = chips[i] ?? ""
                              const Icon = iconForCompareSlotKey(slotKey)
                              return (
                                <span
                                  key={`${c.id}-${i}`}
                                  className="inline-flex max-w-full items-center gap-2 rounded-lg bg-muted/70 px-3 py-1.5 text-sm text-foreground"
                                >
                                  <Icon
                                    className="size-4 shrink-0 text-muted-foreground"
                                    aria-hidden
                                  />
                                  <span className="min-w-0 truncate">
                                    {label}
                                  </span>
                                </span>
                              )
                            })}
                          </div>
                          <p className="mt-auto text-xs text-muted-foreground">
                            Updated {formatUpdatedRelative(c.updatedAt)}
                          </p>
                        </div>
                      </Link>
                      <div
                        className="absolute top-2 right-2 z-10"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground"
                                aria-label={`More actions for ${c.name}`}
                              />
                            }
                          >
                            <MoreVertical className="size-4" aria-hidden />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={6}>
                            <DropdownMenuItem
                              onClick={() => openRename(c)}
                            >
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/compare/new?from=${c.id}`)
                              }
                            >
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => openDelete(c)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </li>
                )
              })
            : null}
        </ul>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename comparison</DialogTitle>
          </DialogHeader>
          <Input
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            placeholder="Name"
            autoComplete="off"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                commitRename()
              }
            }}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!renameDraft.trim()}
              onClick={commitRename}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete comparison</DialogTitle>
            <DialogDescription>
              This removes “{deleteTarget?.name ?? ""}” and its saved column
              layout. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={commitDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
