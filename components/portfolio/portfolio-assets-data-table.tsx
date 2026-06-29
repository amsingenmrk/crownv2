"use client"

import * as React from "react"
import { flexRender, type Table } from "@tanstack/react-table"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, Plus } from "lucide-react"
import {
  buildPortfolioAssetMetadataItems,
  CompetitiveRemoveAssetFooter,
  PortfolioAssetIdentity,
  PortfolioRemoveAssetFooter,
  ScenarioRemoveAssetButton,
} from "@/components/portfolio/portfolio-asset-identity"
import { Button, buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PortfolioProvenanceIndicator } from "@/components/portfolio/portfolio-provenance-indicator"
import { AssetScopeSelect } from "@/components/portfolio/asset-scope-select"
import { CompetitiveScopeSelect } from "@/components/portfolio/competitive-scope-select"
import { isMarketListingRowId } from "@/lib/market-listing-portfolio-row"
import { AssetModificationSetSelect } from "@/components/portfolio/asset-modification-set-select"
import { AssetOutlookSetSelect } from "@/components/portfolio/asset-outlook-set-select"
import { PortfolioRowStatusBadge } from "@/components/portfolio/portfolio-row-status-badge"
import { type PortfolioAssetsTableVariant } from "@/components/portfolio/portfolio-assets-columns"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import {
  addAssetsToGroup,
  clearAssetGroupOverrides,
  clearPropertiesStandaloneNav,
  getAssetGroupOverridesSnapshot,
  markPropertiesStandaloneNav,
  parseAssetGroupOverrideSnapshot,
  promoteProspectiveAssetsToPortfolio,
  removePromotedProspectiveAssetsFromPortfolio,
  removeAssetFromGroup,
  setAssetGroupOverride,
  subscribeAssetGroupOverrides,
} from "@/lib/asset-group-overrides"
import {
  resolveAssetGroupLabel,
  SEEDED_PORTFOLIO_GROUP_IDS,
} from "@/lib/assets"
import {
  addCompetitiveAssetsToGroup,
  COMPETITIVE_SEEDED_GROUPS,
  getCompetitiveGroupSnapshot,
  parseCompetitiveGroupSnapshot,
  removeCompetitiveAssetsFromOtherAssets,
  removeCompetitiveAssetFromGroup,
  resolveCompetitiveGroupIdsForAsset,
  setCompetitiveAssetGroupMembership,
  subscribeCompetitiveGroups,
} from "@/lib/competitive-group-overrides"
import {
  liftPillClassFromStrength,
  normalizedLiftStrength,
} from "@/lib/portfolio-lift"
import { cn } from "@/lib/utils"
import { useAppToast } from "@/components/app-toast"
import { addPortfolioAssetsToScenarioBySlug } from "@/lib/add-portfolio-asset-to-scenario"
import { PORTFOLIO_ASSETS_COLUMN_GRID_TRACK } from "@/lib/portfolio-assets-table-layout"
import { NewPortfolioScopeDialog } from "@/components/new-portfolio-scope-dialog"
import { NewCompetitiveGroupDialog } from "@/components/new-competitive-group-dialog"
import { NewScenarioDialog } from "@/components/new-scenario-dialog"
import { buildRecommendedModificationHref } from "@/lib/modification-recommendations"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useScenarioModificationSelections } from "@/components/scenario-modification-selections-context"
import {
  BUILTIN_SCENARIO,
  BUILTIN_SCENARIO_DISPLAY_CHANGED_EVENT,
  BUILTIN_SCENARIO_DISPLAY_STORAGE_KEY,
  readUserScenarios,
  scenarioDisplayTitleForSlug,
  USER_SCENARIOS_CHANGED_EVENT,
  type UserScenario,
} from "@/lib/user-scenarios"

const CLASS_SOURCE_LABEL =
  "Modeled building class estimate for the demo portfolio table."

const PRICING_SOURCE_LABEL =
  "Modeled pricing estimate. This is not presented as raw client-reported pricing."

const VALUE_SOURCE_LABEL =
  "Modeled asset value estimate derived from the portfolio financial model."

const POTENTIAL_LIFT_SOURCE_LABEL =
  "Derived from the highest-lift single recommended modification for this asset."

type ScenarioMenuOption = { name: string; slug: string }
type PortfolioMenuOption = { name: string; groupId: string }
type CompetitiveMenuOption = { name: string; groupId: string }

function mobileModeledFieldsProvenanceLabel(
  variant: PortfolioAssetsTableVariant
) {
  const parts = [
    `Class: ${CLASS_SOURCE_LABEL}`,
    `$/SF: ${PRICING_SOURCE_LABEL}`,
    `Value: ${VALUE_SOURCE_LABEL}`,
  ]
  if (variant !== "scenarios") {
    parts.push(`Potential lift: ${POTENTIAL_LIFT_SOURCE_LABEL}`)
  }
  return parts.join(" ")
}
function gridTemplateForVisibleColumns(
  table: Table<PortfolioAssetRow>,
  variant: PortfolioAssetsTableVariant
): string {
  return table
    .getVisibleLeafColumns()
    .map((c) => {
      if (variant === "scenarios" && c.id === "classLabel") {
        return "minmax(5.25rem, 6rem)"
      }
      return PORTFOLIO_ASSETS_COLUMN_GRID_TRACK[c.id] ?? "auto"
    })
    .join(" ")
}

function isStickyTrashPortfolioColumn(columnId: string): boolean {
  return (
    columnId === "scenarioRemove" ||
    columnId === "portfolioRemove" ||
    columnId === "competitiveRemove"
  )
}

export function PortfolioAssetsDataTable({
  table,
  variant,
  liftExtent,
  showScopeColumn = false,
  portfolioScopeId = null,
  competitiveGroupId = null,
}: {
  table: Table<PortfolioAssetRow>
  variant: PortfolioAssetsTableVariant
  liftExtent: { min: number; max: number }
  showScopeColumn?: boolean
  portfolioScopeId?: string | null
  competitiveGroupId?: string | null
}) {
  const data = table.options.data
  const router = useRouter()
  const showToast = useAppToast()
  const {
    scenarioExcludedAssetIds,
    scenarioMembershipMode,
    excludeAssetsFromScenario,
    restoreAssetsToScenario,
  } = useScenarioModificationSelections()

  const [userScenarios, setUserScenarios] = React.useState<UserScenario[]>([])
  const [newPortfolioGroupOpen, setNewPortfolioGroupOpen] = React.useState(false)
  const [newCompetitiveGroupOpen, setNewCompetitiveGroupOpen] = React.useState(false)
  const [newScenarioOpen, setNewScenarioOpen] = React.useState(false)
  const [bulkConfirmOpen, setBulkConfirmOpen] = React.useState(false)
  const createPortfolioGroupTargetsRef = React.useRef<
    readonly { assetId: string; baseGroupId: string }[]
  >([])
  const createCompetitiveGroupAssetIdsRef = React.useRef<readonly string[]>([])
  const createScenarioAssetIdsRef = React.useRef<readonly string[]>([])
  const assetGroupOverrideSnap = React.useSyncExternalStore(
    subscribeAssetGroupOverrides,
    getAssetGroupOverridesSnapshot,
    () => ""
  )
  const assetGroupData = React.useMemo(
    () => parseAssetGroupOverrideSnapshot(assetGroupOverrideSnap),
    [assetGroupOverrideSnap]
  )
  const competitiveGroupSnap = React.useSyncExternalStore(
    subscribeCompetitiveGroups,
    getCompetitiveGroupSnapshot,
    () => ""
  )
  const competitiveGroupData = React.useMemo(
    () => parseCompetitiveGroupSnapshot(competitiveGroupSnap),
    [competitiveGroupSnap]
  )

  React.useEffect(() => {
    const sync = () => setUserScenarios(readUserScenarios())
    sync()
    const onStorage = (e: StorageEvent) => {
      if (
        e.key !== "glassbox:user-scenarios" &&
        e.key !== BUILTIN_SCENARIO_DISPLAY_STORAGE_KEY
      ) {
        return
      }
      sync()
    }
    window.addEventListener(USER_SCENARIOS_CHANGED_EVENT, sync)
    window.addEventListener(BUILTIN_SCENARIO_DISPLAY_CHANGED_EVENT, sync)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener(USER_SCENARIOS_CHANGED_EVENT, sync)
      window.removeEventListener(BUILTIN_SCENARIO_DISPLAY_CHANGED_EVENT, sync)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  const scenariosForMenu = React.useMemo((): ScenarioMenuOption[] => {
    const userSorted = [...userScenarios].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    )
    return [
      {
        name: scenarioDisplayTitleForSlug(BUILTIN_SCENARIO.slug, userScenarios),
        slug: BUILTIN_SCENARIO.slug,
      },
      ...userSorted,
    ]
  }, [userScenarios])
  const portfoliosForMenu = React.useMemo((): PortfolioMenuOption[] => {
    const custom = Object.entries(assetGroupData.customGroups)
      .map(([groupId, name]) => ({ name, groupId }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      )
    const seededGroups = SEEDED_PORTFOLIO_GROUP_IDS.filter(
      (groupId) => !assetGroupData.removedPortfolioGroupIds.has(groupId)
    ).map((groupId) => ({
      name: resolveAssetGroupLabel(groupId, assetGroupData.customGroups),
      groupId,
    }))
    return [...seededGroups, ...custom]
  }, [assetGroupData.customGroups, assetGroupData.removedPortfolioGroupIds])
  const competitiveGroupsForMenu = React.useMemo((): CompetitiveMenuOption[] => {
    const seeded = COMPETITIVE_SEEDED_GROUPS.filter(
      (group) => !competitiveGroupData.removedSeededGroupIds.has(group.id)
    ).map((group) => ({
      name: competitiveGroupData.groupLabels[group.id] ?? group.label,
      groupId: group.id,
    }))
    const custom = Object.entries(competitiveGroupData.customGroups)
      .map(([groupId, name]) => ({ name, groupId }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      )
    return [...seeded, ...custom]
  }, [
    competitiveGroupData.customGroups,
    competitiveGroupData.groupLabels,
    competitiveGroupData.removedSeededGroupIds,
  ])

  const liftStrength = React.useCallback(
    (liftPercent: number) =>
      normalizedLiftStrength(liftPercent, liftExtent.min, liftExtent.max),
    [liftExtent.min, liftExtent.max]
  )

  const selectedCount = Object.values(
    table.getState().rowSelection
  ).filter(Boolean).length

  const selectedRows = table.getFilteredSelectedRowModel().rows.map(
    (row) => row.original
  )
  const selectedRowIds = selectedRows.map((row) => row.id)
  const selectedPortfolioRows = selectedRows.filter(
    (row) => !isMarketListingRowId(row.id)
  )
  const selectedPortfolioTargets = selectedPortfolioRows.map((row) => ({
    assetId: row.id,
    baseGroupId: row.groupId,
  }))
  const isPortfolioVariant = variant === "portfolio"
  const isOtherAssetsVariant = variant === "other-assets"
  const isScenarioVariant = variant === "scenarios"

  const allSelectedExcluded =
    variant === "scenarios" &&
    scenarioMembershipMode === "builtin" &&
    selectedRowIds.length > 0 &&
    selectedRowIds.every((id) => scenarioExcludedAssetIds.has(id))
  const selectedScopeActionLabel =
    isScenarioVariant ||
    (isPortfolioVariant && portfolioScopeId != null) ||
    (isOtherAssetsVariant && competitiveGroupId != null)
      ? "Remove"
      : "Delete"
  const selectedScopeActionTitle =
    selectedScopeActionLabel === "Delete" ? "Delete selected assets?" : "Remove selected assets?"
  const selectedScopeActionDescription =
    selectedScopeActionLabel === "Delete"
      ? selectedCount === 1
        ? "This permanently removes the asset from this collection."
        : `This permanently removes ${selectedCount} assets from this collection.`
      : selectedCount === 1
        ? "This removes the asset from the current group, but it will still remain in assets."
        : `This removes ${selectedCount} assets from the current group, but they will still remain in assets.`

  const scenarioToolbarLabel =
    variant === "scenarios"
      ? allSelectedExcluded
        ? "Add to Scenario"
        : "Remove"
      : "Add to Scenario"

  const onScenarioToolbarClick = () => {
    if (variant !== "scenarios" || selectedRowIds.length === 0) return
    if (allSelectedExcluded) {
      restoreAssetsToScenario(selectedRowIds)
    } else {
      excludeAssetsFromScenario(selectedRowIds)
    }
    table.resetRowSelection()
  }
  const addSelectedAssetsToScenario = (scenario: ScenarioMenuOption) => {
    if (selectedRowIds.length === 0) return
    addPortfolioAssetsToScenarioBySlug(scenario.slug, selectedRowIds)
    const n = selectedRowIds.length
    queueMicrotask(() => {
      showToast(
        n === 1
          ? `Added 1 asset to “${scenario.name}”.`
          : `Added ${n} assets to “${scenario.name}”.`
      )
    })
    table.resetRowSelection()
  }
  const addSelectedAssetsToPortfolioGroup = (portfolio: PortfolioMenuOption) => {
    if (selectedPortfolioTargets.length === 0) return
    const addedCount = addAssetsToGroup(selectedPortfolioTargets, portfolio.groupId)
    queueMicrotask(() => {
      if (addedCount === 0) {
        showToast(
          selectedPortfolioTargets.length === 1
            ? `Asset is already in “${portfolio.name}”.`
            : `Selected assets are already in “${portfolio.name}”.`
        )
        return
      }
      if (addedCount === selectedPortfolioTargets.length) {
        showToast(
          addedCount === 1
            ? `Added 1 asset to “${portfolio.name}”.`
            : `Added ${addedCount} assets to “${portfolio.name}”.`
        )
        return
      }
      showToast(
        `Added ${addedCount} of ${selectedPortfolioTargets.length} assets to “${portfolio.name}”.`
      )
    })
    table.resetRowSelection()
  }
  const moveSelectedAssetsToPortfolioGroup = (portfolio: PortfolioMenuOption) => {
    if (selectedRowIds.length === 0) return
    const marketAssetIds = selectedRowIds.filter((id) => isMarketListingRowId(id))
    const ownedAssetIds = selectedRowIds.filter((id) => !isMarketListingRowId(id))
    promoteProspectiveAssetsToPortfolio(marketAssetIds)
    clearPropertiesStandaloneNav(ownedAssetIds)
    removeCompetitiveAssetsFromOtherAssets(selectedRowIds)
    for (const target of selectedPortfolioTargets) {
      setAssetGroupOverride(target.assetId, portfolio.groupId)
    }
    for (const assetId of marketAssetIds) {
      setAssetGroupOverride(assetId, portfolio.groupId)
    }
    queueMicrotask(() => {
      showToast(
        selectedRowIds.length === 1
          ? `Moved 1 asset to “${portfolio.name}”.`
          : `Moved ${selectedRowIds.length} assets to “${portfolio.name}”.`
      )
    })
    table.resetRowSelection()
  }
  const addSelectedAssetsToCompetitiveGroup = (group: CompetitiveMenuOption) => {
    if (selectedRowIds.length === 0) return
    const addedCount = addCompetitiveAssetsToGroup(selectedRowIds, group.groupId)
    queueMicrotask(() => {
      if (addedCount === 0) {
        showToast(
          selectedRowIds.length === 1
            ? `Asset is already in “${group.name}”.`
            : `Selected assets are already in “${group.name}”.`
        )
        return
      }
      if (addedCount === selectedRowIds.length) {
        showToast(
          addedCount === 1
            ? `Added 1 asset to “${group.name}”.`
            : `Added ${addedCount} assets to “${group.name}”.`
        )
        return
      }
      showToast(
        `Added ${addedCount} of ${selectedRowIds.length} assets to “${group.name}”.`
      )
    })
    table.resetRowSelection()
  }
  const moveSelectedAssetsToCompetitiveGroup = (group: CompetitiveMenuOption) => {
    if (selectedRowIds.length === 0) return
    const ownedAssetIds = selectedRowIds.filter((id) => !isMarketListingRowId(id))
    const marketAssetIds = selectedRowIds.filter((id) => isMarketListingRowId(id))
    markPropertiesStandaloneNav(ownedAssetIds)
    removePromotedProspectiveAssetsFromPortfolio(marketAssetIds)
    for (const assetId of selectedRowIds) {
      setCompetitiveAssetGroupMembership(assetId, [group.groupId])
    }
    queueMicrotask(() => {
      showToast(
        selectedRowIds.length === 1
          ? `Moved 1 asset to “${group.name}”.`
          : `Moved ${selectedRowIds.length} assets to “${group.name}”.`
      )
    })
    table.resetRowSelection()
  }
  const removeOrDeleteSelectedAssets = () => {
    if (selectedRowIds.length === 0) return
    setBulkConfirmOpen(false)

    if (isScenarioVariant) {
      excludeAssetsFromScenario(selectedRowIds)
      queueMicrotask(() => {
        showToast(
          selectedRowIds.length === 1
            ? "Removed 1 asset from scenario."
            : `Removed ${selectedRowIds.length} assets from scenario.`
        )
      })
      table.resetRowSelection()
      return
    }

    if (isPortfolioVariant) {
      if (portfolioScopeId != null) {
        for (const row of selectedRows) {
          removeAssetFromGroup(row.id, portfolioScopeId, row.groupId)
        }
        queueMicrotask(() => {
          showToast(
            selectedRowIds.length === 1
              ? "Removed 1 asset from group."
              : `Removed ${selectedRowIds.length} assets from group.`
          )
        })
      } else {
        const marketAssetIds = selectedRowIds.filter((id) => isMarketListingRowId(id))
        const ownedAssetIds = selectedRowIds.filter(
          (id) => !isMarketListingRowId(id)
        )
        markPropertiesStandaloneNav(ownedAssetIds)
        removePromotedProspectiveAssetsFromPortfolio(marketAssetIds)
        clearAssetGroupOverrides(selectedRowIds)
        queueMicrotask(() => {
          showToast(
            selectedRowIds.length === 1
              ? "Deleted 1 asset from portfolio."
              : `Deleted ${selectedRowIds.length} assets from portfolio.`
          )
        })
      }
      table.resetRowSelection()
      return
    }

    if (isOtherAssetsVariant) {
      if (competitiveGroupId != null) {
        for (const assetId of selectedRowIds) {
          removeCompetitiveAssetFromGroup(assetId, competitiveGroupId)
        }
        queueMicrotask(() => {
          showToast(
            selectedRowIds.length === 1
              ? "Removed 1 asset from group."
              : `Removed ${selectedRowIds.length} assets from group.`
          )
        })
      } else {
        removeCompetitiveAssetsFromOtherAssets(selectedRowIds)
        queueMicrotask(() => {
          showToast(
            selectedRowIds.length === 1
              ? "Deleted 1 prospective asset."
              : `Deleted ${selectedRowIds.length} prospective assets.`
          )
        })
      }
      table.resetRowSelection()
    }
  }

  const sortedRows = table.getRowModel().rows

  const gridTemplateColumns = gridTemplateForVisibleColumns(table, variant)

  const gridRowStyle = React.useMemo(
    () =>
      ({
        gridColumn: "1 / -1",
        gridTemplateColumns: "subgrid",
        columnGap: "0.75rem",
      }) as const,
    []
  )

  return (
    <>
      <div className="flex w-full min-w-0 flex-col gap-2 border-b border-border bg-background px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-4">
        <p className="min-w-0 text-sm text-muted-foreground">
          {selectedCount === 0 ? (
            <>
              <span className="tabular-nums">{data.length}</span>{" "}
              {data.length === 1 ? "Asset" : "Assets"}
            </>
          ) : (
            <>
              <span className="tabular-nums">{selectedCount}</span>
              {" of "}
              <span className="tabular-nums">{data.length}</span>{" "}
              {data.length === 1 ? "Asset" : "Assets"} Selected
            </>
          )}
        </p>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:shrink-0 sm:justify-end">
          {isPortfolioVariant ? (
            <>
              <DropdownMenu>
                <Tooltip disabled={selectedCount > 0}>
                  <TooltipTrigger
                    render={
                      <span
                        className={cn(
                          "inline-flex",
                          selectedCount === 0 && "cursor-not-allowed"
                        )}
                      />
                    }
                  >
                    <DropdownMenuTrigger
                      disabled={selectedCount === 0}
                      className={cn(buttonVariants({ variant: "outline" }))}
                      aria-label="Move selected assets to a portfolio group"
                    >
                      Move to...
                      <ChevronDown
                        className="size-4 opacity-60"
                        aria-hidden
                        data-icon="inline-end"
                      />
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-[240px] text-pretty"
                  >
                    Select assets with checkboxes to move them to a portfolio
                    group.
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent
                  align="end"
                  className="z-[100] min-w-[12rem]"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal text-muted-foreground">
                      Your Assets
                    </DropdownMenuLabel>
                    {portfoliosForMenu.map((portfolio) => (
                      <DropdownMenuItem
                        key={portfolio.groupId}
                        onClick={() => {
                          moveSelectedAssetsToPortfolioGroup(portfolio)
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {portfolio.name}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal text-muted-foreground">
                      Prospective Assets
                    </DropdownMenuLabel>
                    {competitiveGroupsForMenu.map((group) => (
                      <DropdownMenuItem
                        key={group.groupId}
                        onClick={() => {
                          moveSelectedAssetsToCompetitiveGroup(group)
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {group.name}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <Tooltip disabled={selectedCount > 0}>
                  <TooltipTrigger
                    render={
                      <span
                        className={cn(
                          "inline-flex",
                          selectedCount === 0 && "cursor-not-allowed"
                        )}
                      />
                    }
                  >
                    <DropdownMenuTrigger
                      disabled={selectedCount === 0}
                      className={cn(buttonVariants({ variant: "outline" }))}
                      aria-label="Add selected assets to a portfolio group or scenario"
                    >
                      Copy to...
                      <ChevronDown
                        className="size-4 opacity-60"
                        aria-hidden
                        data-icon="inline-end"
                      />
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-[240px] text-pretty"
                  >
                    Select assets with checkboxes to add them to a portfolio
                    group or scenario.
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent
                  align="end"
                  className="z-[100] min-w-[12rem]"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal text-muted-foreground">
                      Portfolio groups
                    </DropdownMenuLabel>
                    {portfoliosForMenu.map((portfolio) => {
                      const alreadyAdded =
                        selectedPortfolioRows.length > 0 &&
                        selectedPortfolioRows.every((row) =>
                          row.groupIds.includes(portfolio.groupId)
                        )
                      return (
                        <DropdownMenuItem
                          key={portfolio.groupId}
                          onClick={() => {
                            addSelectedAssetsToPortfolioGroup(portfolio)
                          }}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {portfolio.name}
                          </span>
                          {alreadyAdded ? (
                            <Check
                              className="ml-2 size-4 shrink-0 text-blue-500"
                              aria-hidden
                            />
                          ) : null}
                        </DropdownMenuItem>
                      )
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={selectedPortfolioTargets.length === 0}
                      onClick={() => {
                        createPortfolioGroupTargetsRef.current =
                          selectedPortfolioTargets
                        setNewPortfolioGroupOpen(true)
                      }}
                    >
                      <Plus className="size-4 shrink-0 opacity-80" aria-hidden />
                      Create new group
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal text-muted-foreground">
                      Scenarios
                    </DropdownMenuLabel>
                    {scenariosForMenu.map((s) => (
                      <DropdownMenuItem
                        key={s.slug}
                        onClick={() => {
                          addSelectedAssetsToScenario(s)
                        }}
                      >
                        <span className="truncate">{s.name}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        createScenarioAssetIdsRef.current = selectedRowIds
                        setNewScenarioOpen(true)
                      }}
                    >
                      <Plus className="size-4 shrink-0 opacity-80" aria-hidden />
                      Create new scenario
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <NewScenarioDialog
                open={newScenarioOpen}
                onOpenChange={setNewScenarioOpen}
                afterCreate={(scenario) => {
                  const ids = createScenarioAssetIdsRef.current
                  addPortfolioAssetsToScenarioBySlug(scenario.slug, ids)
                  table.resetRowSelection()
                  router.push(`/scenarios/${scenario.slug}`)
                  const n = ids.length
                  showToast(
                    n === 0
                      ? `Created “${scenario.name}”.`
                      : n === 1
                        ? `Created “${scenario.name}” and added 1 asset.`
                        : `Created “${scenario.name}” and added ${n} assets.`
                  )
                }}
              />
              <NewPortfolioScopeDialog
                open={newPortfolioGroupOpen}
                onOpenChange={setNewPortfolioGroupOpen}
                afterCreate={(created) => {
                  const targets = createPortfolioGroupTargetsRef.current
                  const addedCount = addAssetsToGroup(targets, created.id)
                  table.resetRowSelection()
                  showToast(
                    addedCount === 0
                      ? `Created “${created.label}”.`
                      : addedCount === 1
                        ? `Created “${created.label}” and added 1 asset.`
                        : `Created “${created.label}” and added ${addedCount} assets.`
                  )
                }}
              />
            </>
          ) : isOtherAssetsVariant ? (
            <>
              <DropdownMenu>
                <Tooltip disabled={selectedCount > 0}>
                  <TooltipTrigger
                    render={
                      <span
                        className={cn(
                          "inline-flex",
                          selectedCount === 0 && "cursor-not-allowed"
                        )}
                      />
                    }
                  >
                    <DropdownMenuTrigger
                      disabled={selectedCount === 0}
                      className={cn(buttonVariants({ variant: "outline" }))}
                      aria-label="Move selected assets to an Other Assets group"
                    >
                      Move to...
                      <ChevronDown
                        className="size-4 opacity-60"
                        aria-hidden
                        data-icon="inline-end"
                      />
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-[240px] text-pretty"
                  >
                    Select assets with checkboxes to move them to an Other Assets
                    group.
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent
                  align="end"
                  className="z-[100] min-w-[12rem]"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal text-muted-foreground">
                      Prospective Assets
                    </DropdownMenuLabel>
                    {competitiveGroupsForMenu.map((group) => (
                      <DropdownMenuItem
                        key={group.groupId}
                        onClick={() => {
                          moveSelectedAssetsToCompetitiveGroup(group)
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {group.name}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal text-muted-foreground">
                      Your Assets
                    </DropdownMenuLabel>
                    {portfoliosForMenu.map((portfolio) => (
                      <DropdownMenuItem
                        key={portfolio.groupId}
                        onClick={() => {
                          moveSelectedAssetsToPortfolioGroup(portfolio)
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {portfolio.name}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <Tooltip disabled={selectedCount > 0}>
                  <TooltipTrigger
                    render={
                      <span
                        className={cn(
                          "inline-flex",
                          selectedCount === 0 && "cursor-not-allowed"
                        )}
                      />
                    }
                  >
                    <DropdownMenuTrigger
                      disabled={selectedCount === 0}
                      className={cn(buttonVariants({ variant: "outline" }))}
                      aria-label="Add selected assets to an Other Assets group or scenario"
                    >
                      Copy to...
                      <ChevronDown
                        className="size-4 opacity-60"
                        aria-hidden
                        data-icon="inline-end"
                      />
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-[240px] text-pretty"
                  >
                    Select assets with checkboxes to add them to an Other Assets
                    group or scenario.
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent
                  align="end"
                  className="z-[100] min-w-[12rem]"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal text-muted-foreground">
                      Prospective groups
                    </DropdownMenuLabel>
                    {competitiveGroupsForMenu.map((group) => {
                      const alreadyAdded =
                        selectedRows.length > 0 &&
                        selectedRows.every((row) =>
                          resolveCompetitiveGroupIdsForAsset(
                            row.id,
                            competitiveGroupData.membershipOverrides,
                            {
                              customGroups: competitiveGroupData.customGroups,
                              removedAssetIds: competitiveGroupData.removedAssetIds,
                              removedSeededGroupIds:
                                competitiveGroupData.removedSeededGroupIds,
                            }
                          ).includes(group.groupId)
                        )
                      return (
                        <DropdownMenuItem
                          key={group.groupId}
                          onClick={() => {
                            addSelectedAssetsToCompetitiveGroup(group)
                          }}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {group.name}
                          </span>
                          {alreadyAdded ? (
                            <Check
                              className="ml-2 size-4 shrink-0 text-blue-500"
                              aria-hidden
                            />
                          ) : null}
                        </DropdownMenuItem>
                      )
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={selectedRowIds.length === 0}
                      onClick={() => {
                        createCompetitiveGroupAssetIdsRef.current = selectedRowIds
                        setNewCompetitiveGroupOpen(true)
                      }}
                    >
                      <Plus className="size-4 shrink-0 opacity-80" aria-hidden />
                      Create new group
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal text-muted-foreground">
                      Scenarios
                    </DropdownMenuLabel>
                    {scenariosForMenu.map((s) => (
                      <DropdownMenuItem
                        key={s.slug}
                        onClick={() => {
                          addSelectedAssetsToScenario(s)
                        }}
                      >
                        <span className="truncate">{s.name}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        createScenarioAssetIdsRef.current = selectedRowIds
                        setNewScenarioOpen(true)
                      }}
                    >
                      <Plus className="size-4 shrink-0 opacity-80" aria-hidden />
                      Create new scenario
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <NewScenarioDialog
                open={newScenarioOpen}
                onOpenChange={setNewScenarioOpen}
                afterCreate={(scenario) => {
                  const ids = createScenarioAssetIdsRef.current
                  addPortfolioAssetsToScenarioBySlug(scenario.slug, ids)
                  table.resetRowSelection()
                  router.push(`/scenarios/${scenario.slug}`)
                  const n = ids.length
                  showToast(
                    n === 0
                      ? `Created “${scenario.name}”.`
                      : n === 1
                        ? `Created “${scenario.name}” and added 1 asset.`
                        : `Created “${scenario.name}” and added ${n} assets.`
                  )
                }}
              />
              <NewCompetitiveGroupDialog
                open={newCompetitiveGroupOpen}
                onOpenChange={setNewCompetitiveGroupOpen}
                afterCreate={(created) => {
                  const ids = createCompetitiveGroupAssetIdsRef.current
                  const addedCount = addCompetitiveAssetsToGroup(ids, created.id)
                  table.resetRowSelection()
                  showToast(
                    addedCount === 0
                      ? `Created “${created.label}”.`
                      : addedCount === 1
                        ? `Created “${created.label}” and added 1 asset.`
                        : `Created “${created.label}” and added ${addedCount} assets.`
                  )
                }}
              />
            </>
          ) : selectedCount > 0 ? (
            <Tooltip disabled={selectedCount > 0}>
              <TooltipTrigger
                render={
                  <span
                    className={cn(
                      "inline-flex",
                      selectedCount === 0 && "cursor-not-allowed"
                    )}
                  />
                }
              >
                <Button
                  type="button"
                  variant="outline"
                  disabled={selectedCount === 0}
                  onClick={() => {
                    if (allSelectedExcluded) {
                      onScenarioToolbarClick()
                    } else {
                      setBulkConfirmOpen(true)
                    }
                  }}
                >
                  {scenarioToolbarLabel}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px] text-pretty">
                {allSelectedExcluded
                  ? "Select assets with checkboxes to add them to a scenario."
                  : "Select assets with checkboxes to remove them from a scenario."}
              </TooltipContent>
            </Tooltip>
          ) : null}
          {!isScenarioVariant && selectedCount > 0 ? (
            <Tooltip disabled={selectedCount > 0}>
              <TooltipTrigger
                render={
                  <span
                    className={cn(
                      "inline-flex",
                      selectedCount === 0 && "cursor-not-allowed"
                    )}
                  />
                }
              >
                <Button
                  type="button"
                  variant="destructive"
                  disabled={selectedCount === 0}
                  onClick={() => setBulkConfirmOpen(true)}
                >
                  {selectedScopeActionLabel}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px] text-pretty">
                {selectedScopeActionLabel === "Remove"
                  ? "Select assets with checkboxes to remove them from this group."
                  : "Select assets with checkboxes to delete them from this collection."}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </div>
      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedScopeActionTitle}</DialogTitle>
            <DialogDescription>
              {selectedScopeActionDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={removeOrDeleteSelectedAssets}
            >
              {selectedScopeActionLabel === "Delete"
                ? "Delete permanently"
                : selectedScopeActionLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="hidden min-w-0 w-full overflow-x-auto overscroll-x-contain lg:block">
        <div className="portfolio-assets-table-scroll-inner">
          <table
            className="w-full min-w-max px-0 caption-bottom text-sm grid"
            style={{ gridTemplateColumns }}
          >
            <TableHeader className="contents">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="grid items-center border-b-2 border-border bg-muted hover:bg-muted/90"
                  style={gridRowStyle}
                >
                  {headerGroup.headers.map((header) => {
                    const isStickyTrash = isStickyTrashPortfolioColumn(
                      header.column.id
                    )
                    return (
                      <TableHead
                        key={header.id}
                        scope="col"
                        className={cn(
                          "h-auto min-w-0 text-left align-middle",
                          header.column.id === "select"
                            ? "flex items-center justify-start py-2 pl-3 pr-0"
                            : isStickyTrash
                              ? "portfolio-assets-scenario-remove-col-head flex min-h-10 items-center justify-center border-l border-border/70 px-2 py-2"
                              : "px-2 py-2 font-medium"
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="contents [&_tr:last-child]:border-b-0">
              {sortedRows.length ? (
                sortedRows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="portfolio-assets-row grid items-center border-b border-border hover:bg-muted/50 data-[state=selected]:bg-muted"
                    style={gridRowStyle}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isStickyTrash = isStickyTrashPortfolioColumn(
                        cell.column.id
                      )
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "min-w-0 border-0 text-left align-middle",
                            cell.column.id === "select"
                              ? "py-2 pl-3 pr-0"
                              : isStickyTrash
                                ? "portfolio-assets-scenario-remove-col-body flex min-h-10 items-center justify-center border-l border-border/70 px-2 py-2"
                                : "px-2 py-2"
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow
                  className="grid border-0 hover:bg-transparent"
                  style={gridRowStyle}
                >
                  <TableCell
                    className="h-24 border-0 px-3 py-10 text-center text-sm text-muted-foreground"
                    style={{ gridColumn: "1 / -1" }}
                  >
                    No assets in this view.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>

      {sortedRows.length > 0 ? (
        <div className="flex items-start gap-2 border-b border-border bg-muted/15 px-3 py-2 sm:px-4 lg:hidden">
          <PortfolioProvenanceIndicator
            label={mobileModeledFieldsProvenanceLabel(variant)}
            className="mt-0.5 shrink-0"
          />
          <p className="min-w-0 text-[11px] leading-snug text-muted-foreground">
            {isScenarioVariant
              ? "Class, $/SF, and value are modeled for this demo. Definitions match the provenance indicators on larger screens."
              : "Class, $/SF, value, and potential lift are modeled for this demo. Definitions match the provenance indicators on larger screens."}
          </p>
        </div>
      ) : null}

      <ul className="divide-y divide-border lg:hidden">
        {sortedRows.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">
            No assets in this view.
          </li>
        ) : (
          sortedRows.map((tableRow) => {
            const row = tableRow.original
            const selected = tableRow.getIsSelected()
            return (
              <li key={tableRow.id}>
                <div className="flex flex-col gap-2.5 px-3 py-4 text-sm sm:px-4">
                  <div className="flex items-start gap-3">
                    <span className="flex shrink-0 items-center pt-0.5">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) => {
                          tableRow.toggleSelected(!!checked)
                        }}
                        aria-label={`Select ${row.building}`}
                      />
                    </span>
                    <PortfolioAssetIdentity
                      assetId={row.id}
                      building={row.building}
                      location={row.location}
                      locationClassName="mt-0.5"
                      metadataItems={buildPortfolioAssetMetadataItems({
                        sector: row.typeLabel,
                        assetClass: row.classLabel,
                        rsf: row.rsf,
                      })}
                    />
                  </div>
                  {isScenarioVariant ? (
                    <div className="flex flex-col gap-1.5 text-xs">
                      <span className="text-muted-foreground">Modifications</span>
                      <AssetModificationSetSelect
                        assetId={row.id}
                        building={row.building}
                        matchOutlookRowSelect
                      />
                    </div>
                  ) : null}
                  {isScenarioVariant ? (
                    <div className="flex flex-col gap-1.5 text-xs">
                      <span className="text-muted-foreground">Outlook</span>
                      <AssetOutlookSetSelect
                        assetId={row.id}
                        building={row.building}
                      />
                    </div>
                  ) : null}
                  {isScenarioVariant ? (
                    <div className="flex flex-col gap-1.5 text-xs">
                      <span className="text-muted-foreground">Status</span>
                      <PortfolioRowStatusBadge rowId={row.id} />
                    </div>
                  ) : null}
                  {isScenarioVariant ? (
                    <div className="flex justify-end border-t border-border pt-3">
                      <ScenarioRemoveAssetButton
                        assetId={row.id}
                        building={row.building}
                      />
                    </div>
                  ) : null}
                  {isPortfolioVariant && showScopeColumn ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Portfolio group</span>
                      <span className="min-w-0">
                        <AssetScopeSelect
                          assetId={row.id}
                          building={row.building}
                        />
                      </span>
                    </div>
                  ) : null}
                  {isOtherAssetsVariant && showScopeColumn ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Prospective group</span>
                      <span className="min-w-0">
                        <CompetitiveScopeSelect
                          assetId={row.id}
                          building={row.building}
                        />
                      </span>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Occ%</span>
                    <span className="text-left tabular-nums text-foreground">
                      {row.occPct}
                    </span>
                    <span>$/SF</span>
                    <span className="text-left tabular-nums text-foreground">
                      {row.pricePerSf}
                    </span>
                    <span>Value</span>
                    <span className="text-left tabular-nums text-foreground">
                      {row.value}
                    </span>
                  </div>
                  {!isScenarioVariant ? (
                    <>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Potential Lift</span>
                        <span className="flex justify-start">
                          {row.recommendedModification == null ||
                          isMarketListingRowId(row.id) ? (
                            <span
                              className={cn(
                                "inline-flex items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                                liftPillClassFromStrength(
                                  liftStrength(row.liftPercent)
                                )
                              )}
                            >
                              {row.lift}
                            </span>
                          ) : (
                            <Link
                              href={buildRecommendedModificationHref(
                                row.id,
                                row.recommendedModification
                              )}
                              className="inline-flex rounded-full focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                              aria-label={`Potential lift ${row.lift}. Open ${row.recommendedModification.optionTitle} in modifications.`}
                            >
                              <span
                                className={cn(
                                  "inline-flex items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums transition-opacity hover:opacity-90",
                                  liftPillClassFromStrength(
                                    liftStrength(row.liftPercent)
                                  )
                                )}
                              >
                                {row.lift}
                              </span>
                            </Link>
                          )}
                        </span>
                      </div>
                    </>
                  ) : null}
                  {isPortfolioVariant ? (
                    <PortfolioRemoveAssetFooter
                      assetId={row.id}
                      building={row.building}
                    />
                  ) : isOtherAssetsVariant ? (
                    <CompetitiveRemoveAssetFooter
                      assetId={row.id}
                      building={row.building}
                    />
                  ) : null}
                </div>
              </li>
            )
          })
        )}
      </ul>
    </>
  )
}
