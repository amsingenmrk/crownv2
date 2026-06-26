"use client"

import * as React from "react"
import { Binoculars, Check, ChevronDown, Plus, Trash2 } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useAppToast } from "@/components/app-toast"
import {
  addCompetitiveAssetToGroup,
  addCustomCompetitiveGroup,
  COMPETITIVE_SEEDED_GROUPS,
  getCompetitiveGroupSnapshot,
  parseCompetitiveGroupSnapshot,
  removeCompetitiveAssetFromOtherAssets,
  resolveCompetitiveGroupIdsForAsset,
  subscribeCompetitiveGroups,
  toggleCompetitiveAssetGroupMembership,
} from "@/lib/competitive-group-overrides"
import { cn } from "@/lib/utils"

type CompetitiveGroupBadgeDropdownProps = {
  assetId: string
  propertyDisplayName?: string
}

function membershipSummaryLabel(
  groupIds: readonly string[],
  groupLabels: Record<string, string>
) {
  if (groupIds.length === 0) return ""
  const names = groupIds.map((id) => groupLabels[id] ?? id)
  if (names.length === 1) return names[0]
  return `${names[0]} +${names.length - 1}`
}

export function CompetitiveGroupBadgeDropdown({
  assetId,
  propertyDisplayName,
}: CompetitiveGroupBadgeDropdownProps) {
  const showToast = useAppToast()
  const inputId = React.useId()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [newGroupName, setNewGroupName] = React.useState("")

  const competitiveSnap = React.useSyncExternalStore(
    subscribeCompetitiveGroups,
    getCompetitiveGroupSnapshot,
    () => ""
  )
  const competitiveData = React.useMemo(
    () => parseCompetitiveGroupSnapshot(competitiveSnap),
    [competitiveSnap]
  )
  const membershipGroupIds = React.useMemo(
    () =>
      resolveCompetitiveGroupIdsForAsset(assetId, competitiveData.membershipOverrides, {
        customGroups: competitiveData.customGroups,
        removedAssetIds: competitiveData.removedAssetIds,
        removedSeededGroupIds: competitiveData.removedSeededGroupIds,
      }),
    [
      assetId,
      competitiveData.customGroups,
      competitiveData.membershipOverrides,
      competitiveData.removedAssetIds,
      competitiveData.removedSeededGroupIds,
    ]
  )
  const displayLabel = membershipSummaryLabel(
    membershipGroupIds,
    competitiveData.groupLabels
  )
  const groupOptions = React.useMemo(
    () => [
      ...COMPETITIVE_SEEDED_GROUPS.filter(
        (group) => !competitiveData.removedSeededGroupIds.has(group.id)
      ).map((group) => ({
        id: group.id,
        label: competitiveData.groupLabels[group.id] ?? group.label,
      })),
      ...Object.entries(competitiveData.customGroups)
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
        ),
    ],
    [
      competitiveData.customGroups,
      competitiveData.groupLabels,
      competitiveData.removedSeededGroupIds,
    ]
  )
  const hasMembership = membershipGroupIds.length > 0
  const canRemoveFromOtherAssets = !competitiveData.removedAssetIds.has(assetId)
  const createDialogDescription =
    propertyDisplayName != null && propertyDisplayName.trim() !== ""
      ? `Name this competitive group. ${propertyDisplayName.trim()} will be added to it.`
      : "Name this competitive group. The current listing will be added to it."

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className={cn(
                hasMembership
                  ? cn(
                      "inline-flex max-w-[min(100%,14rem)] shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/45 px-2.5 py-1 text-xs font-medium text-foreground outline-none transition-colors",
                      "hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    )
                  : cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "shrink-0 justify-between gap-1.5 font-normal"
                    )
              )}
              title={
                hasMembership ? `Competitive groups: ${displayLabel}` : undefined
              }
              aria-label={
                hasMembership
                  ? `Competitive groups: ${displayLabel}. Choose groups`
                  : "Add listing to competitive group"
              }
            />
          }
        >
          {hasMembership ? (
            <>
              <Binoculars
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0 truncate">{displayLabel}</span>
              <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
            </>
          ) : (
            <>
              Add to competitive set
              <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="min-w-60 w-max max-w-[min(calc(100vw-1.5rem),22rem)]"
        >
          {groupOptions.map((group) => {
            const selected = membershipGroupIds.includes(group.id)
            return (
              <DropdownMenuItem
                key={group.id}
                className="gap-2"
                onClick={() => {
                  const changed = toggleCompetitiveAssetGroupMembership(assetId, group.id)
                  if (!changed) return
                  showToast(
                    selected
                      ? `Listing removed from “${group.label}”.`
                      : `Listing added to “${group.label}”.`
                  )
                }}
              >
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {selected ? <Check className="size-4" aria-hidden /> : null}
                </span>
                <span className="min-w-0 flex-1 break-words">{group.label}</span>
              </DropdownMenuItem>
            )
          })}
          <DropdownMenuSeparator />
          {canRemoveFromOtherAssets ? (
            <>
              <DropdownMenuItem
                className="gap-2 text-destructive focus:text-destructive"
                onClick={() => {
                  const changed = removeCompetitiveAssetFromOtherAssets(assetId)
                  if (!changed) return
                  showToast("Removed from Other Assets.")
                }}
              >
                <Trash2 className="size-4 shrink-0 opacity-80" aria-hidden />
                <span className="min-w-0 flex-1">Remove from Other Assets</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem
            className="gap-2"
            onClick={() => {
              setNewGroupName("")
              setCreateOpen(true)
            }}
          >
            <Plus className="size-4 shrink-0 opacity-80" aria-hidden />
            <span className="min-w-0 flex-1">Create new competitive group</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setNewGroupName("")
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New competitive group</DialogTitle>
            <DialogDescription>{createDialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-1">
            <label htmlFor={inputId} className="text-sm font-medium text-foreground">
              Competitive group name
            </label>
            <Input
              id={inputId}
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="e.g. Core gateway peers"
              autoComplete="off"
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                event.preventDefault()
                const created = addCustomCompetitiveGroup(newGroupName)
                if (created == null) {
                  showToast("Enter a competitive group name.")
                  return
                }
                addCompetitiveAssetToGroup(assetId, created.id)
                setCreateOpen(false)
                setNewGroupName("")
                showToast(`Competitive group “${created.label}” created.`)
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateOpen(false)
                setNewGroupName("")
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const created = addCustomCompetitiveGroup(newGroupName)
                if (created == null) {
                  showToast("Enter a competitive group name.")
                  return
                }
                addCompetitiveAssetToGroup(assetId, created.id)
                setCreateOpen(false)
                setNewGroupName("")
                showToast(`Competitive group “${created.label}” created.`)
              }}
            >
              Create competitive group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
