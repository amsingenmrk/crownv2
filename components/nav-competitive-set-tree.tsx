"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { NewCompetitiveGroupDialog } from "@/components/new-competitive-group-dialog"
import { SidebarTreeSection, type TreeGroupItem } from "@/components/sidebar-tree-section"
import {
  COMPETITIVE_SEEDED_GROUPS,
  ensureCompetitiveMembershipSeeded,
  getCompetitiveGroupSnapshot,
  parseCompetitiveGroupSnapshot,
  resolveCompetitiveGroupIdsForAsset,
  subscribeCompetitiveGroups,
} from "@/lib/competitive-group-overrides"

type CompetitiveGroupDefinition = {
  id: string
  label: string
}

export function NavCompetitiveSetTree() {
  const pathname = usePathname()
  const [newGroupOpen, setNewGroupOpen] = React.useState(false)

  React.useEffect(() => {
    ensureCompetitiveMembershipSeeded()
  }, [])

  const snapshot = React.useSyncExternalStore(
    subscribeCompetitiveGroups,
    getCompetitiveGroupSnapshot,
    () => ""
  )

  const competitiveData = React.useMemo(
    () => parseCompetitiveGroupSnapshot(snapshot),
    [snapshot]
  )

  const groups = React.useMemo<CompetitiveGroupDefinition[]>(
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

  const activeCompetitiveGroupId = React.useMemo(() => {
    const groupMatch = pathname.match(/^\/other-assets\/groups\/([^/]+)/)
    if (groupMatch?.[1]) {
      const groupId = decodeURIComponent(groupMatch[1])
      return groups.some((group) => group.id === groupId) ? groupId : null
    }

    const match = pathname.match(/^\/properties\/([^/]+)/)
    if (!match?.[1]) return null
    const assetId = decodeURIComponent(match[1])
    const groupIds = resolveCompetitiveGroupIdsForAsset(
      assetId,
      competitiveData.membershipOverrides,
      {
        customGroups: competitiveData.customGroups,
        removedSeededGroupIds: competitiveData.removedSeededGroupIds,
        removedAssetIds: competitiveData.removedAssetIds,
      }
    )
    return groups.find((group) => groupIds.includes(group.id))?.id ?? null
  }, [
    competitiveData.customGroups,
    competitiveData.membershipOverrides,
    competitiveData.removedAssetIds,
    competitiveData.removedSeededGroupIds,
    groups,
    pathname,
  ])

  const sectionIsActive = React.useMemo(
    () =>
      pathname === "/other-assets" ||
      pathname.startsWith("/other-assets/") ||
      activeCompetitiveGroupId != null,
    [activeCompetitiveGroupId, pathname]
  )

  const treeGroups = React.useMemo<TreeGroupItem[]>(
    () =>
      groups.map((group) => ({
        id: group.id,
        label: group.label,
        href: `/other-assets/groups/${encodeURIComponent(group.id)}`,
        isActive: group.id === activeCompetitiveGroupId,
      })),
    [activeCompetitiveGroupId, groups]
  )

  return (
    <>
      <SidebarTreeSection
        sectionLabel="Competitive set"
        sectionHref="/other-assets"
        sectionTooltip="Competitive set"
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
