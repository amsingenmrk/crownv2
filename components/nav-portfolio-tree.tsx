"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { useInitialAssetGroupOverrideSnapshot } from "@/components/app-shell-environment"
import { NewPortfolioScopeDialog } from "@/components/new-portfolio-scope-dialog"
import { SidebarTreeSection, type TreeGroupItem } from "@/components/sidebar-tree-section"
import {
  getAssetGroupOverridesSnapshot,
  parseAssetGroupOverrideSnapshot,
  subscribeAssetGroupOverrides,
  syncAssetGroupSnapshotCookieFromLocalStorage,
} from "@/lib/asset-group-overrides"
import {
  ASSET_GROUP_SIDEBAR_LABELS,
  SEEDED_PORTFOLIO_GROUP_IDS,
  getAssetById,
  PORTFOLIO_OVERVIEW_LABEL,
  portfolioScopeHref,
  portfolioScopeIdFromRouteParam,
} from "@/lib/assets"

export function NavPortfolioTree() {
  const pathname = usePathname()
  const initialSnapshot = useInitialAssetGroupOverrideSnapshot()
  const [newScopeOpen, setNewScopeOpen] = React.useState(false)

  const snapshot = React.useSyncExternalStore(
    subscribeAssetGroupOverrides,
    getAssetGroupOverridesSnapshot,
    () => initialSnapshot
  )
  const assetGroupData = React.useMemo(
    () => parseAssetGroupOverrideSnapshot(snapshot),
    [snapshot]
  )

  React.useEffect(() => {
    syncAssetGroupSnapshotCookieFromLocalStorage()
  }, [])

  const groups = React.useMemo(() => {
    const seeded = SEEDED_PORTFOLIO_GROUP_IDS.filter(
      (groupId) => !assetGroupData.removedPortfolioGroupIds.has(groupId)
    ).map((groupId) => ({
      id: groupId,
      label:
        assetGroupData.fundLabelOverrides[groupId]?.trim() ||
        ASSET_GROUP_SIDEBAR_LABELS[groupId],
    }))
    const custom = Object.entries(assetGroupData.customGroups)
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
      )
    return [...seeded, ...custom]
  }, [
    assetGroupData.customGroups,
    assetGroupData.fundLabelOverrides,
    assetGroupData.removedPortfolioGroupIds,
  ])

  const activeScopeId = React.useMemo(() => {
    const match = pathname.match(/^\/portfolio\/scopes\/([^/]+)/)
    return match?.[1] ? portfolioScopeIdFromRouteParam(match[1]) : null
  }, [pathname])

  const activeAssetGroupId = React.useMemo(() => {
    const match = pathname.match(/^\/properties\/([^/]+)/)
    if (!match?.[1]) return null
    const assetId = decodeURIComponent(match[1])
    if (assetGroupData.standalonePropertyNavIds.has(assetId)) return null
    return (
      getAssetById(assetId, assetGroupData)?.groupIds?.find((groupId) =>
        groups.some((group) => group.id === groupId)
      ) ?? null
    )
  }, [assetGroupData, groups, pathname])

  const activePortfolioAssetId = React.useMemo(() => {
    const match = pathname.match(/^\/properties\/([^/]+)/)
    if (!match?.[1]) return null
    const assetId = decodeURIComponent(match[1])
    if (assetGroupData.standalonePropertyNavIds.has(assetId)) return null
    return getAssetById(assetId, assetGroupData)?.id ?? null
  }, [assetGroupData, pathname])

  const sectionIsActive = React.useMemo(
    () =>
      pathname === "/portfolio" ||
      pathname.startsWith("/portfolio/") ||
      activePortfolioAssetId != null,
    [activePortfolioAssetId, pathname]
  )

  const treeGroups = React.useMemo<TreeGroupItem[]>(
    () =>
      groups.map((group) => ({
        id: group.id,
        label: group.label,
        href: portfolioScopeHref(group.id),
        isActive: activeScopeId === group.id || activeAssetGroupId === group.id,
      })),
    [activeAssetGroupId, activeScopeId, groups]
  )

  return (
    <>
      <SidebarTreeSection
        sectionLabel={PORTFOLIO_OVERVIEW_LABEL}
        sectionHref="/portfolio"
        sectionTooltip={PORTFOLIO_OVERVIEW_LABEL}
        sectionIsActive={sectionIsActive}
        groups={treeGroups}
        onCreateGroup={() => setNewScopeOpen(true)}
      />
      <NewPortfolioScopeDialog
        open={newScopeOpen}
        onOpenChange={setNewScopeOpen}
      />
    </>
  )
}
