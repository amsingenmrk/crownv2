"use client"

import * as React from "react"
import Link from "next/link"
import { Trash2 } from "lucide-react"

import { useScenarioModificationSelections } from "@/components/scenario-modification-selections-context"
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
import { assetHref } from "@/lib/assets"
import {
  getAssetGroupOverridesSnapshot,
  markPropertyStandaloneNav,
  parseAssetGroupOverrideSnapshot,
  removeAssetGroupOverride,
  subscribeAssetGroupOverrides,
} from "@/lib/asset-group-overrides"
import {
  getCompetitiveGroupSnapshot,
  parseCompetitiveGroupSnapshot,
  removeCompetitiveAssetFromOtherAssets,
  subscribeCompetitiveGroups,
} from "@/lib/competitive-group-overrides"
import { isMarketListingRowId } from "@/lib/market-listing-portfolio-row"
import { cn } from "@/lib/utils"

export type PortfolioAssetMetadataItem = {
  text: string
  className?: string
}

export function buildPortfolioAssetMetadataItems({
  sector,
  assetClass,
  rsf,
}: {
  sector?: string | null
  assetClass?: string | null
  rsf?: string | null
}): PortfolioAssetMetadataItem[] {
  return [
    sector ? { text: sector } : null,
    assetClass ? { text: assetClass } : null,
    rsf ? { text: `${rsf} RSF`, className: "tabular-nums" } : null,
  ].filter((item): item is PortfolioAssetMetadataItem => item != null)
}

export function PortfolioAssetIdentity({
  assetId,
  building,
  location,
  metadataItems,
  trailingAction,
  className,
  locationClassName,
}: {
  assetId: string
  building: string
  location: string
  metadataItems?: readonly PortfolioAssetMetadataItem[]
  trailingAction?: React.ReactNode
  className?: string
  locationClassName?: string
}) {
  return (
    <div className={cn("min-w-0 flex-1 text-left", className)}>
      <div className="max-w-full min-w-0">
        <div className="inline-flex max-w-full items-center gap-0.5">
          <Link
            href={assetHref(assetId)}
            className="min-w-0 max-w-full rounded-sm font-semibold leading-snug text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="block truncate">{building}</span>
          </Link>
          {trailingAction != null ? <div className="shrink-0">{trailingAction}</div> : null}
        </div>
      </div>
      <span
        className={cn(
          "block text-[11px] leading-snug text-muted-foreground",
          locationClassName
        )}
      >
        {location}
      </span>
      {metadataItems != null && metadataItems.length > 0 ? (
        <div className="mt-0.5 min-w-0 text-[11px] leading-snug text-muted-foreground">
          {metadataItems.map((item, index) => (
            <span key={`${item.text}-${index}`} className={cn("min-w-0", item.className)}>
              {item.text}
              {index < metadataItems.length - 1 ? (
                <span aria-hidden className="text-muted-foreground/35">
                  {"\u00a0• "}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function ScenarioRemoveAssetButton({
  assetId,
  building,
}: {
  assetId: string
  building: string
}) {
  const { excludeAssetsFromScenario } = useScenarioModificationSelections()
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6 shrink-0 rounded-sm text-muted-foreground/80 hover:text-destructive"
        aria-label={`Remove ${building} from scenario`}
        aria-haspopup="dialog"
        aria-expanded={confirmOpen}
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="size-3.5" aria-hidden />
      </Button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove asset from scenario</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{building}</span> will be removed
              from this scenario. Saved modification sets in the sidebar are not deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                excludeAssetsFromScenario([assetId])
                setConfirmOpen(false)
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function canRemoveAssetFromPortfolio(
  assetId: string,
  assetGroupData: ReturnType<typeof parseAssetGroupOverrideSnapshot>
): boolean {
  return (
    !assetGroupData.standalonePropertyNavIds.has(assetId) &&
    (Object.hasOwn(assetGroupData.overrides, assetId) ||
      !isMarketListingRowId(assetId))
  )
}

function useCanRemoveAssetFromPortfolio(assetId: string): boolean {
  const assetGroupOverrideSnap = React.useSyncExternalStore(
    subscribeAssetGroupOverrides,
    getAssetGroupOverridesSnapshot,
    () => ""
  )
  const assetGroupData = React.useMemo(
    () => parseAssetGroupOverrideSnapshot(assetGroupOverrideSnap),
    [assetGroupOverrideSnap]
  )
  return canRemoveAssetFromPortfolio(assetId, assetGroupData)
}

/** Remove from portfolio (same rules as the remove action in `AssetScopeSelect`). */
export function PortfolioRemoveAssetButton({
  assetId,
  building,
}: {
  assetId: string
  building: string
}) {
  const showToast = useAppToast()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const canRemove = useCanRemoveAssetFromPortfolio(assetId)

  if (!canRemove) {
    return null
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6 shrink-0 rounded-sm text-muted-foreground/80 hover:text-destructive"
        aria-label={`Remove ${building} from portfolio`}
        aria-haspopup="dialog"
        aria-expanded={confirmOpen}
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="size-3.5" aria-hidden />
      </Button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove from portfolio?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{building}</span> will no longer be
              assigned to this portfolio group. You can add it again anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                removeAssetGroupOverride(assetId)
                markPropertyStandaloneNav(assetId)
                showToast("Removed from portfolio.")
                setConfirmOpen(false)
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

/** Mobile card footer — omits the bordered row when remove is not available. */
export function PortfolioRemoveAssetFooter({
  assetId,
  building,
}: {
  assetId: string
  building: string
}) {
  const canRemove = useCanRemoveAssetFromPortfolio(assetId)
  if (!canRemove) {
    return null
  }
  return (
    <div className="flex justify-end border-t border-border pt-3">
      <PortfolioRemoveAssetButton assetId={assetId} building={building} />
    </div>
  )
}

export function canRemoveAssetFromOtherAssets(
  assetId: string,
  competitiveGroupData: ReturnType<typeof parseCompetitiveGroupSnapshot>
): boolean {
  return !competitiveGroupData.removedAssetIds.has(assetId)
}

function useCanRemoveAssetFromOtherAssets(assetId: string): boolean {
  const competitiveSnap = React.useSyncExternalStore(
    subscribeCompetitiveGroups,
    getCompetitiveGroupSnapshot,
    () => ""
  )
  const competitiveData = React.useMemo(
    () => parseCompetitiveGroupSnapshot(competitiveSnap),
    [competitiveSnap]
  )
  return canRemoveAssetFromOtherAssets(assetId, competitiveData)
}

export function CompetitiveRemoveAssetButton({
  assetId,
  building,
}: {
  assetId: string
  building: string
}) {
  const showToast = useAppToast()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const canRemove = useCanRemoveAssetFromOtherAssets(assetId)

  if (!canRemove) {
    return null
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6 shrink-0 rounded-sm text-muted-foreground/80 hover:text-destructive"
        aria-label={`Remove ${building} from other assets`}
        aria-haspopup="dialog"
        aria-expanded={confirmOpen}
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="size-3.5" aria-hidden />
      </Button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove from Other Assets?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{building}</span> will be removed from
              this section. You can add it back to any competitive group anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                removeCompetitiveAssetFromOtherAssets(assetId)
                showToast("Removed from Other Assets.")
                setConfirmOpen(false)
              }}
            >
              Remove from Other Assets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function CompetitiveRemoveAssetFooter({
  assetId,
  building,
}: {
  assetId: string
  building: string
}) {
  const canRemove = useCanRemoveAssetFromOtherAssets(assetId)
  if (!canRemove) {
    return null
  }
  return (
    <div className="flex justify-end border-t border-border pt-3">
      <CompetitiveRemoveAssetButton assetId={assetId} building={building} />
    </div>
  )
}
