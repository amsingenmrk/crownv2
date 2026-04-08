"use client"

import * as React from "react"
import { flexRender, type Table } from "@tanstack/react-table"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, Plus } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { assetHref } from "@/lib/assets"
import { isMarketListingRowId } from "@/lib/market-listing-portfolio-row"
import { AssetModificationSetSelect } from "@/components/portfolio/asset-modification-set-select"
import {
  ScenarioRemoveFromScenarioCell,
  type PortfolioAssetsTableVariant,
} from "@/components/portfolio/portfolio-assets-columns"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useScenarioModificationSelections } from "@/components/scenario-modification-selections-context"
import {
  BUILTIN_SCENARIO,
  readUserScenarios,
  USER_SCENARIOS_CHANGED_EVENT,
  type UserScenario,
} from "@/lib/user-scenarios"
function gridTemplateForVisibleColumns(
  table: Table<PortfolioAssetRow>
): string {
  return table
    .getVisibleLeafColumns()
    .map((c) => PORTFOLIO_ASSETS_COLUMN_GRID_TRACK[c.id] ?? "auto")
    .join(" ")
}

export function PortfolioAssetsDataTable({
  table,
  variant,
  liftExtent,
}: {
  table: Table<PortfolioAssetRow>
  variant: PortfolioAssetsTableVariant
  liftExtent: { min: number; max: number }
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
      if (e.key !== "glassbox:user-scenarios") return
      sync()
    }
    window.addEventListener(USER_SCENARIOS_CHANGED_EVENT, sync)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener(USER_SCENARIOS_CHANGED_EVENT, sync)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  const scenariosForMenu = React.useMemo(() => {
    const userSorted = [...userScenarios].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    )
    return [
      { name: BUILTIN_SCENARIO.name, slug: BUILTIN_SCENARIO.slug },
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

  const gridTemplateColumns = gridTemplateForVisibleColumns(table)

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
            <Button
              type="button"
              variant="outline"
              disabled={selectedCount === 0}
              onClick={onScenarioToolbarClick}
            >
              {scenarioToolbarLabel}
            </Button>
          )}
        </div>
      </div>
      <div className="min-w-0 w-full overflow-x-auto overscroll-x-contain">
        <div className="portfolio-assets-table-scroll-inner">
      <table
        className="hidden w-full min-w-max px-0 caption-bottom text-sm max-lg:hidden lg:grid"
        style={{ gridTemplateColumns }}
      >
        <TableHeader className="contents [&_tr]:border-0">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="grid items-center border-b border-border bg-muted/50 hover:bg-muted/50"
              style={gridRowStyle}
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  scope="col"
                  className={cn(
                    "h-auto min-w-0 py-2 text-left align-middle",
                    header.column.id === "select"
                      ? "flex items-center justify-start pl-3 pr-0"
                      : header.column.id === "scenarioRemove"
                        ? "flex items-center justify-end px-2 pr-3"
                        : "px-2 font-medium"
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="contents [&_tr:last-child]:border-b-0">
          {sortedRows.length ? (
            sortedRows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="grid items-center border-b border-border hover:bg-muted/50 data-[state=selected]:bg-muted"
                style={gridRowStyle}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "min-w-0 border-0 py-2 text-left align-middle",
                      cell.column.id === "select"
                        ? "pl-3 pr-0"
                        : cell.column.id === "scenarioRemove"
                          ? "px-2 pr-3"
                          : "px-2"
                    )}
                  >
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </TableCell>
                ))}
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

      <ul className="divide-y divide-border lg:hidden">
        {sortedRows.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">
            No assets in this view.
          </li>
        ) : (
          sortedRows.map((tableRow) => {
            const row = tableRow.original
            const href = assetHref(row.id)
            const selected = tableRow.getIsSelected()
            return (
              <li key={tableRow.id}>
                <div className="flex flex-col gap-3 px-4 py-4 text-sm">
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
                    <div className="min-w-0 flex-1 text-left">
                      <Link
                        href={href}
                        className="inline-flex max-w-full rounded-sm font-semibold leading-snug text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <span className="truncate">{row.building}</span>
                      </Link>
                      <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                        {row.location}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Ownership</span>
                    {isMarketListingRowId(row.id) ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground">
                        {row.ownership}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Type</span>
                    <span className="text-left text-foreground">{row.typeLabel}</span>
                    <span>RSF</span>
                    <span className="text-left tabular-nums text-foreground">
                      {row.rsf}
                    </span>
                  </div>
                  {variant === "scenarios" ? (
                    <>
                      <AssetModificationSetSelect
                        assetId={row.id}
                        building={row.building}
                      />
                      <div className="flex justify-end border-t border-border pt-3">
                        <ScenarioRemoveFromScenarioCell
                          assetId={row.id}
                          building={row.building}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Potential Lift</span>
                        <span className="flex justify-start">
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
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Recommendations</span>
                        <span className="text-left text-foreground">
                          {row.recommendation}
                        </span>
                      </div>
                    </>
                  )}
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
