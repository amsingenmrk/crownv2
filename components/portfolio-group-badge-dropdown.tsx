"use client"

import * as React from "react"
import { Briefcase, Check, ChevronDown, CircleX, Plus } from "lucide-react"

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
  addCustomAssetGroup,
  getAssetGroupOverridesSnapshot,
  markPropertyStandaloneNav,
  parseAssetGroupOverrideSnapshot,
  removeAssetGroupOverride,
  setAssetGroupOverride,
  subscribeAssetGroupOverrides,
} from "@/lib/asset-group-overrides"
import {
  ASSET_GROUP_SIDEBAR_LABELS,
  SEEDED_PORTFOLIO_GROUP_IDS,
} from "@/lib/assets"
import { isMarketListingRowId } from "@/lib/market-listing-portfolio-row"
import { cn } from "@/lib/utils"

export type PortfolioGroupBadgeDropdownProps = {
  assetId: string
  /** Current portfolio group id, or `null` if not assigned (market listings). */
  resolvedGroupId: string | null
  /** Optional building/property name for the create-group dialog. */
  propertyDisplayName?: string
}

export function PortfolioGroupBadgeDropdown({
  assetId,
  resolvedGroupId,
  propertyDisplayName,
}: PortfolioGroupBadgeDropdownProps) {
  const showToast = useAppToast()
  const newAssetGroupInputId = React.useId()
  const [createAssetGroupOpen, setCreateAssetGroupOpen] = React.useState(false)
  const [newAssetGroupName, setNewAssetGroupName] = React.useState("")
  const [removeConfirmOpen, setRemoveConfirmOpen] = React.useState(false)

  const assetGroupOverrideSnap = React.useSyncExternalStore(
    subscribeAssetGroupOverrides,
    getAssetGroupOverridesSnapshot,
    () => ""
  )
  const assetGroupData = React.useMemo(
    () => parseAssetGroupOverrideSnapshot(assetGroupOverrideSnap),
    [assetGroupOverrideSnap]
  )

  const portfolioScopeLabels = React.useMemo(() => {
    const custom = assetGroupData.customGroups
    const fundOv = assetGroupData.fundLabelOverrides
    const labels: Record<string, string> = {}
    for (const id of SEEDED_PORTFOLIO_GROUP_IDS) {
      const override = fundOv[id]?.trim()
      labels[id] =
        override != null && override.length > 0
          ? override
          : ASSET_GROUP_SIDEBAR_LABELS[id]
    }
    for (const [id, label] of Object.entries(custom)) {
      labels[id] = label
    }
    return labels
  }, [assetGroupData])

  const displayLabel =
    resolvedGroupId != null
      ? (portfolioScopeLabels[resolvedGroupId] ?? resolvedGroupId)
      : null

  const showRemoveFromPortfolio =
    !assetGroupData.standalonePropertyNavIds.has(assetId) &&
    (Object.hasOwn(assetGroupData.overrides, assetId) ||
      !isMarketListingRowId(assetId))

  const createDialogDescription =
    propertyDisplayName != null && propertyDisplayName.trim() !== ""
      ? `Name this portfolio group. ${propertyDisplayName.trim()} will be moved into it.`
      : "Name this portfolio group. The current property will be moved into it."

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className={cn(
                resolvedGroupId != null
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
                resolvedGroupId != null
                  ? `Portfolio group: ${displayLabel ?? ""}`
                  : undefined
              }
              aria-label={
                resolvedGroupId != null
                  ? `Current portfolio group: ${displayLabel ?? ""}. Choose portfolio group`
                  : "Add property to portfolio group"
              }
            />
          }
        >
          {resolvedGroupId != null ? (
            <>
              <Briefcase
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0 truncate">{displayLabel}</span>
              <ChevronDown
                className="size-3 shrink-0 opacity-60"
                aria-hidden
              />
            </>
          ) : (
            <>
              Add to portfolio
              <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="min-w-60 w-max max-w-[min(calc(100vw-1.5rem),22rem)]"
        >
          {SEEDED_PORTFOLIO_GROUP_IDS.filter(
            (gid) => !assetGroupData.removedPortfolioGroupIds.has(gid)
          ).map((gid) => {
            const label = portfolioScopeLabels[gid] ?? ASSET_GROUP_SIDEBAR_LABELS[gid]
            const selected = resolvedGroupId === gid
            return (
              <DropdownMenuItem
                key={gid}
                className="gap-2"
                disabled={selected}
                onClick={() => {
                  if (selected) return
                  setAssetGroupOverride(assetId, gid)
                }}
              >
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {selected ? <Check className="size-4" aria-hidden /> : null}
                </span>
                <span className="min-w-0 flex-1 break-words">{label}</span>
              </DropdownMenuItem>
            )
          })}
          {Object.entries(assetGroupData.customGroups)
            .sort((a, b) =>
              a[1].localeCompare(b[1], undefined, { sensitivity: "base" })
            )
            .map(([gid, label]) => {
              const selected = resolvedGroupId === gid
              return (
                <DropdownMenuItem
                  key={gid}
                  className="gap-2"
                  disabled={selected}
                  onClick={() => {
                    if (selected) return
                    setAssetGroupOverride(assetId, gid)
                  }}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {selected ? (
                      <Check className="size-4" aria-hidden />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1 break-words">{label}</span>
                </DropdownMenuItem>
              )
            })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2"
            onClick={() => {
              setNewAssetGroupName("")
              setCreateAssetGroupOpen(true)
            }}
          >
            <Plus className="size-4 shrink-0 opacity-80" aria-hidden />
            <span className="min-w-0 flex-1">Create new portfolio group</span>
          </DropdownMenuItem>
          {showRemoveFromPortfolio ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="gap-2"
                aria-haspopup="dialog"
                onClick={() => setRemoveConfirmOpen(true)}
              >
                <CircleX className="size-4 shrink-0 opacity-80" aria-hidden />
                <span className="min-w-0 flex-1">Remove from portfolio</span>
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={createAssetGroupOpen}
        onOpenChange={(open) => {
          setCreateAssetGroupOpen(open)
          if (!open) setNewAssetGroupName("")
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New portfolio group</DialogTitle>
            <DialogDescription>{createDialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-1">
            <label
              htmlFor={newAssetGroupInputId}
              className="text-sm font-medium text-foreground"
            >
              Portfolio group name
            </label>
            <Input
              id={newAssetGroupInputId}
              value={newAssetGroupName}
              onChange={(e) => setNewAssetGroupName(e.target.value)}
              placeholder="e.g. West Coast logistics"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  const created = addCustomAssetGroup(newAssetGroupName)
                  if (created != null) {
                    setAssetGroupOverride(assetId, created.id)
                    showToast(`Portfolio group “${created.label}” created.`)
                    setCreateAssetGroupOpen(false)
                    setNewAssetGroupName("")
                  } else if (newAssetGroupName.trim() === "") {
                    showToast("Enter a portfolio group name.")
                  }
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateAssetGroupOpen(false)
                setNewAssetGroupName("")
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const created = addCustomAssetGroup(newAssetGroupName)
                if (created == null) {
                  showToast("Enter a portfolio group name.")
                  return
                }
                setAssetGroupOverride(assetId, created.id)
                showToast(`Portfolio group “${created.label}” created.`)
                setCreateAssetGroupOpen(false)
                setNewAssetGroupName("")
              }}
            >
              Create portfolio group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove from portfolio?</DialogTitle>
            <DialogDescription>
              {propertyDisplayName != null && propertyDisplayName.trim() !== ""
                ? `${propertyDisplayName.trim()} will no longer be assigned to this portfolio group. You can add it again anytime.`
                : "This property will no longer be assigned to this portfolio group. You can add it again anytime."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemoveConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                removeAssetGroupOverride(assetId)
                markPropertyStandaloneNav(assetId)
                showToast("Removed from portfolio.")
                setRemoveConfirmOpen(false)
              }}
            >
              Remove from portfolio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
