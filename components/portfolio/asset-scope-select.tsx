"use client"

import * as React from "react"
import { Briefcase, Check, ChevronDown, CircleX, Plus } from "lucide-react"

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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useAppToast } from "@/components/app-toast"
import {
  addCustomAssetGroup,
  addAssetToGroup,
  getAssetGroupOverridesSnapshot,
  markPropertyStandaloneNav,
  parseAssetGroupOverrideSnapshot,
  removeAssetGroupOverride,
  subscribeAssetGroupOverrides,
  toggleAssetGroupMembership,
} from "@/lib/asset-group-overrides"
import {
  ASSETS,
  ASSET_GROUP_SIDEBAR_LABELS,
  formatPortfolioGroupMembershipLabel,
  resolveAssetGroupIdsForAsset,
  SEEDED_PORTFOLIO_GROUP_IDS,
} from "@/lib/assets"
import { isMarketListingRowId } from "@/lib/market-listing-portfolio-row"
import { cn } from "@/lib/utils"

type AssetScopeSelectProps = {
  assetId: string
  building: string
  className?: string
}

export function AssetScopeSelect({
  assetId,
  building,
  className,
}: AssetScopeSelectProps) {
  const showToast = useAppToast()
  const newAssetGroupInputId = React.useId()
  const [createAssetGroupOpen, setCreateAssetGroupOpen] = React.useState(false)
  const [newAssetGroupName, setNewAssetGroupName] = React.useState("")
  const [removeConfirmOpen, setRemoveConfirmOpen] = React.useState(false)

  const baseGroupId =
    ASSETS.find((asset) => asset.id === assetId)?.groupId ?? "office"

  const assetGroupOverrideSnap = React.useSyncExternalStore(
    subscribeAssetGroupOverrides,
    getAssetGroupOverridesSnapshot,
    () => ""
  )
  const assetGroupData = React.useMemo(
    () => parseAssetGroupOverrideSnapshot(assetGroupOverrideSnap),
    [assetGroupOverrideSnap]
  )

  const membershipGroupIds = React.useMemo(
    () => resolveAssetGroupIdsForAsset(assetId, assetGroupData),
    [assetId, assetGroupData]
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

  const displayLabel = formatPortfolioGroupMembershipLabel(
    membershipGroupIds,
    portfolioScopeLabels
  )

  const showRemoveFromPortfolio =
    !assetGroupData.standalonePropertyNavIds.has(assetId) &&
    (Object.hasOwn(assetGroupData.overrides, assetId) ||
      !isMarketListingRowId(assetId))

  return (
    <span
      className={cn("block min-w-0 w-full max-w-full", className)}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className={cn(
                "inline-flex w-full min-w-0 max-w-full items-center gap-1.5 rounded-full border border-border bg-muted/45 px-2.5 py-1 text-left text-xs font-medium text-foreground outline-none transition-colors",
                "hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              )}
              title={`Portfolio groups: ${displayLabel}`}
              aria-label={`Portfolio groups: ${displayLabel}. Choose groups`}
            />
          }
        >
          <Briefcase
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate">{displayLabel}</span>
          <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="min-w-60 w-max max-w-[min(calc(100vw-1.5rem),22rem)]"
        >
          {SEEDED_PORTFOLIO_GROUP_IDS.filter(
            (gid) => !assetGroupData.removedPortfolioGroupIds.has(gid)
          ).map((gid) => {
            const label = portfolioScopeLabels[gid] ?? ASSET_GROUP_SIDEBAR_LABELS[gid]
            const selected = membershipGroupIds.includes(gid)
            return (
              <DropdownMenuItem
                key={gid}
                className="gap-2"
                onClick={() => {
                  toggleAssetGroupMembership(assetId, gid, baseGroupId)
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
              const selected = membershipGroupIds.includes(gid)
              return (
                <DropdownMenuItem
                  key={gid}
                  className="gap-2"
                  onClick={() => {
                    toggleAssetGroupMembership(assetId, gid, baseGroupId)
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
            <DialogDescription>
              Name this portfolio group. This property ({building}) will be added
              to it.
            </DialogDescription>
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
                    addAssetToGroup(assetId, created.id, baseGroupId)
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
                addAssetToGroup(assetId, created.id, baseGroupId)
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
              <span className="font-medium text-foreground">{building}</span>{" "}
              will no longer be assigned to portfolio groups. You can add it
              again anytime.
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
    </span>
  )
}
