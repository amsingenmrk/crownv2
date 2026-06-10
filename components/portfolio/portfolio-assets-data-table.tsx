"use client"

import * as React from "react"
import { flexRender, type Table } from "@tanstack/react-table"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, Plus } from "lucide-react"
import {
  buildPortfolioAssetMetadataItems,
  PortfolioAssetIdentity,
  PortfolioRemoveAssetButton,
  ScenarioRemoveAssetButton,
} from "@/components/portfolio/portfolio-asset-identity"
import { Button, buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PortfolioProvenanceIndicator } from "@/components/portfolio/portfolio-provenance-indicator"
import { AssetScopeSelect } from "@/components/portfolio/asset-scope-select"
import { isMarketListingRowId } from "@/lib/market-listing-portfolio-row"
import { AssetModificationSetSelect } from "@/components/portfolio/asset-modification-set-select"
import { AssetOutlookSetSelect } from "@/components/portfolio/asset-outlook-set-select"
import { PortfolioRowStatusBadge } from "@/components/portfolio/portfolio-row-status-badge"
import { type PortfolioAssetsTableVariant } from "@/components/portfolio/portfolio-assets-columns"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import {
  liftPillClassFromStrength,
  normalizedLiftStrength,
} from "@/lib/portfolio-lift"
import { cn } from "@/lib/utils"
import { useAppToast } from "@/components/app-toast"
import { addAssetsToScenarioIncludedBySlug } from "@/lib/scenario-included-assets-storage"
import { PORTFOLIO_ASSETS_COLUMN_GRID_TRACK } from "@/lib/portfolio-assets-table-layout"
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

function mobileModeledFieldsProvenanceLabel(
  variant: PortfolioAssetsTableVariant
) {
  const parts = [
    `Class: ${CLASS_SOURCE_LABEL}`,
    `$/SF: ${PRICING_SOURCE_LABEL}`,
    `Value: ${VALUE_SOURCE_LABEL}`,
  ]
  if (variant === "portfolio") {
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
  return columnId === "scenarioRemove" || columnId === "portfolioRemove"
}

export function PortfolioAssetsDataTable({
  table,
  variant,
  liftExtent,
  showScopeColumn = false,
}: {
  table: Table<PortfolioAssetRow>
  variant: PortfolioAssetsTableVariant
  liftExtent: { min: number; max: number }
  showScopeColumn?: boolean
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
  const [newScenarioOpen, setNewScenarioOpen] = React.useState(false)
  const createScenarioAssetIdsRef = React.useRef<readonly string[]>([])

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

  const scenariosForMenu = React.useMemo(() => {
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

  const liftStrength = React.useCallback(
    (liftPercent: number) =>
      normalizedLiftStrength(liftPercent, liftExtent.min, liftExtent.max),
    [liftExtent.min, liftExtent.max]
  )

  const selectedCount = Object.values(
    table.getState().rowSelection
  ).filter(Boolean).length

  const selectedRowIds = table
    .getFilteredSelectedRowModel()
    .rows.map((r) => r.original.id)

  const allSelectedExcluded =
    variant === "scenarios" &&
    scenarioMembershipMode === "builtin" &&
    selectedRowIds.length > 0 &&
    selectedRowIds.every((id) => scenarioExcludedAssetIds.has(id))

  const scenarioToolbarLabel =
    variant === "scenarios"
      ? allSelectedExcluded
        ? "Add to Scenario"
        : "Remove from Scenario"
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
      <div className="flex w-full min-w-0 flex-col gap-2 border-b border-border bg-background px-4 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
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
        <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 sm:ml-auto">
          {variant === "portfolio" ? (
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
                      aria-label="Add selected assets to a scenario"
                    >
                      Add to Scenario
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
                    Select assets with checkboxes to add them to a scenario.
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent
                  align="end"
                  className="z-[100] min-w-[12rem]"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal text-muted-foreground">
                      Add to scenario
                    </DropdownMenuLabel>
                    {scenariosForMenu.map((s) => (
                      <DropdownMenuItem
                        key={s.slug}
                        onClick={() => {
                          addAssetsToScenarioIncludedBySlug(
                            s.slug,
                            selectedRowIds
                          )
                          const n = selectedRowIds.length
                          queueMicrotask(() => {
                            showToast(
                              n === 1
                                ? `Added 1 asset to “${s.name}”.`
                                : `Added ${n} assets to “${s.name}”.`
                            )
                          })
                          table.resetRowSelection()
                        }}
                      >
                        <span className="truncate">{s.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
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
                </DropdownMenuContent>
              </DropdownMenu>
              <NewScenarioDialog
                open={newScenarioOpen}
                onOpenChange={setNewScenarioOpen}
                afterCreate={(scenario) => {
                  const ids = createScenarioAssetIdsRef.current
                  addAssetsToScenarioIncludedBySlug(scenario.slug, ids)
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
            </>
          ) : (
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
                  onClick={onScenarioToolbarClick}
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
          )}
        </div>
      </div>
      <div className="min-w-0 w-full overflow-x-auto overscroll-x-contain">
        <div className="portfolio-assets-table-scroll-inner">
      <table
        className="hidden w-full min-w-max px-0 caption-bottom text-sm max-lg:hidden lg:grid"
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
                const isStickyTrash = isStickyTrashPortfolioColumn(header.column.id)
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
                  const isStickyTrash = isStickyTrashPortfolioColumn(cell.column.id)
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

      {sortedRows.length > 0 ? (
        <div className="flex items-start gap-2 border-b border-border bg-muted/15 px-4 py-2 lg:hidden">
          <PortfolioProvenanceIndicator
            label={mobileModeledFieldsProvenanceLabel(variant)}
            className="mt-0.5 shrink-0"
          />
          <p className="min-w-0 text-[11px] leading-snug text-muted-foreground">
            {variant === "portfolio"
              ? "Class, $/SF, value, and potential lift are modeled for this demo. Definitions match the provenance indicators on larger screens."
              : "Class, $/SF, and value are modeled for this demo. Definitions match the provenance indicators on larger screens."}
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
                <div className="flex flex-col gap-2.5 px-4 py-4 text-sm">
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
                  {variant === "scenarios" ? (
                    <div className="flex flex-col gap-1.5 text-xs">
                      <span className="text-muted-foreground">Modifications</span>
                      <AssetModificationSetSelect
                        assetId={row.id}
                        building={row.building}
                        matchOutlookRowSelect
                      />
                    </div>
                  ) : null}
                  {variant === "scenarios" ? (
                    <div className="flex flex-col gap-1.5 text-xs">
                      <span className="text-muted-foreground">Outlook</span>
                      <AssetOutlookSetSelect
                        assetId={row.id}
                        building={row.building}
                      />
                    </div>
                  ) : null}
                  {variant === "scenarios" ? (
                    <div className="flex flex-col gap-1.5 text-xs">
                      <span className="text-muted-foreground">Status</span>
                      <PortfolioRowStatusBadge rowId={row.id} />
                    </div>
                  ) : null}
                  {variant === "scenarios" ? (
                    <div className="flex justify-end border-t border-border pt-3">
                      <ScenarioRemoveAssetButton
                        assetId={row.id}
                        building={row.building}
                      />
                    </div>
                  ) : null}
                  {variant === "portfolio" && showScopeColumn ? (
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
                  {variant !== "scenarios" ? (
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
                  {variant === "portfolio" ? (
                    <div className="flex justify-end border-t border-border pt-3">
                      <PortfolioRemoveAssetButton assetId={row.id} building={row.building} />
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })
        )}
      </ul>
        </div>
      </div>
    </>
  )
}
