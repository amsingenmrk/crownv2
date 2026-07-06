"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { NewCompetitiveGroupDialog } from "@/components/new-competitive-group-dialog"
import { SidebarTreeSection, type TreeGroupItem } from "@/components/sidebar-tree-section"
import { assetHref } from "@/lib/assets"
import {
  getCompetitiveGroupSnapshot,
  parseCompetitiveGroupSnapshot,
  subscribeCompetitiveGroups,
} from "@/lib/competitive-group-overrides"
import { otherRealAssetList, isOtherRealAssetId } from "@/lib/other-assets"

export function NavCompetitiveSetTree() {
  const pathname = usePathname()
  const [newGroupOpen, setNewGroupOpen] = React.useState(false)

  const snapshot = React.useSyncExternalStore(
    subscribeCompetitiveGroups,
    getCompetitiveGroupSnapshot,
    () => ""
  )

  const competitiveData = React.useMemo(
    () => parseCompetitiveGroupSnapshot(snapshot),
    [snapshot]
  )

  const assets = React.useMemo(
    () =>
      otherRealAssetList()
        .filter((asset) => !competitiveData.removedAssetIds.has(asset.id))
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        ),
    [competitiveData.removedAssetIds]
  )

  const customGroups = React.useMemo(
    () =>
      Object.entries(competitiveData.customGroups)
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
        ),
    [competitiveData.customGroups]
  )

  const activeOtherAssetId = React.useMemo(() => {
    const match = pathname.match(/^\/properties\/([^/]+)/)
    if (!match?.[1]) return null
    const assetId = decodeURIComponent(match[1])
    return isOtherRealAssetId(assetId) ? assetId : null
  }, [pathname])

  const activeCustomGroupId = React.useMemo(() => {
    const match = pathname.match(/^\/other-assets\/groups\/([^/]+)/)
    if (!match?.[1]) return null
    const groupId = decodeURIComponent(match[1])
    return Object.hasOwn(competitiveData.customGroups, groupId) ? groupId : null
  }, [competitiveData.customGroups, pathname])

  const sectionIsActive = React.useMemo(
    () =>
      pathname === "/other-assets" ||
      pathname.startsWith("/other-assets/") ||
      activeOtherAssetId != null,
    [activeOtherAssetId, pathname]
  )

  const treeGroups = React.useMemo<TreeGroupItem[]>(
    () => [
      ...assets.map((asset) => ({
        id: asset.id,
        label: asset.name,
        href: assetHref(asset.id),
        isActive: asset.id === activeOtherAssetId,
      })),
      ...customGroups.map((group) => ({
        id: group.id,
        label: group.label,
        href: `/other-assets/groups/${encodeURIComponent(group.id)}`,
        isActive: group.id === activeCustomGroupId,
      })),
    ],
    [activeCustomGroupId, activeOtherAssetId, assets, customGroups]
  )

  return (
    <>
      <SidebarTreeSection
        sectionLabel="Prospective"
        sectionHref="/other-assets"
        sectionTooltip="Prospective"
        sectionIsActive={sectionIsActive}
        groups={treeGroups}
        onCreateGroup={() => setNewGroupOpen(true)}
      />
      <NewCompetitiveGroupDialog
        open={newGroupOpen}
        onOpenChange={setNewGroupOpen}
      />
    </>
  )
}
