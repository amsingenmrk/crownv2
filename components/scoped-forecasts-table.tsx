"use client"

import * as React from "react"
import Link from "next/link"
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type Row,
} from "@tanstack/react-table"
import { ChevronDown, ChevronRight, Telescope, Wrench } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { assetForecastHref } from "@/lib/assets"
import type { ForecastChartTab } from "@/lib/forecast-chart-config"
import type {
  ForecastPeriod,
  ForecastStatementRow,
} from "@/lib/forecast-data"
import { isMarketListingRowId } from "@/lib/market-listing-portfolio-row"
import type {
  ScopedForecastResolvedAssetModel,
} from "@/lib/scoped-forecast-rollup"
import type { ScopedForecastAssetSelection } from "@/lib/scoped-forecast"
import {
  modificationItemsRecord,
  modificationSelectLabelFromOption,
  modificationSelectPlaceholder,
  outlookSetItemsRecord,
  outlookSetSelectLabel,
  outlookSetSelectPlaceholder,
} from "@/lib/scoped-forecast-select-labels"
import { cn } from "@/lib/utils"

/** Compact USD without `Intl` compact notation — Node and browsers disagree on e.g. `$1.0M` vs `$1M`. */
function formatUsdAbsPositive(abs: number): string {
  if (abs >= 1_000_000_000) {
    const x = abs / 1_000_000_000
    return `$${compactUnitPart(x)}B`
  }
  if (abs >= 1_000_000) {
    const x = abs / 1_000_000
    return `$${compactUnitPart(x)}M`
  }
  if (abs >= 1_000) {
    const x = abs / 1_000
    return `$${compactUnitPart(x)}K`
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(abs)
}

function compactUnitPart(x: number): string {
  const rounded = Math.round(x * 10) / 10
  const whole = Math.round(rounded)
  if (Math.abs(rounded - whole) < 1e-9) {
    return String(whole)
  }
  return rounded.toFixed(1)
}

function formatUsdSigned(value: number): string {
  const core = formatUsdAbsPositive(Math.abs(value))
  if (value < 0) return `-${core}`
  return core
}

function formatStatementValue(kind: ForecastStatementRow["kind"], value: number) {
  if (kind === "percent") {
    return `${value.toFixed(2)}%`
  }

  if (kind === "expense") {
    return `(${formatUsdAbsPositive(Math.abs(value))})`
  }

  return formatUsdSigned(value)
}

const FIRST_COLUMN_WIDTH_PX = 180
const SELECTOR_COLUMN_WIDTH_PX = 128
const PERIOD_COLUMN_WIDTH_PX = 108

const firstColumnStyle: React.CSSProperties = {
  width: FIRST_COLUMN_WIDTH_PX,
  minWidth: FIRST_COLUMN_WIDTH_PX,
}

const modificationsColumnStyle: React.CSSProperties = {
  width: SELECTOR_COLUMN_WIDTH_PX,
  minWidth: SELECTOR_COLUMN_WIDTH_PX,
  left: FIRST_COLUMN_WIDTH_PX,
}

const outlookColumnStyle: React.CSSProperties = {
  width: SELECTOR_COLUMN_WIDTH_PX,
  minWidth: SELECTOR_COLUMN_WIDTH_PX,
  left: FIRST_COLUMN_WIDTH_PX + SELECTOR_COLUMN_WIDTH_PX,
}

const periodColumnStyle: React.CSSProperties = {
  width: PERIOD_COLUMN_WIDTH_PX,
  minWidth: PERIOD_COLUMN_WIDTH_PX,
}

type ScopedForecastTableRow = {
  id: string
  rowType: "statement" | "asset"
  /** Set for asset rows — drives Modifications / Outlook column dropdowns. */
  assetId?: string
  label: string
  kind: ForecastStatementRow["kind"]
  values: number[]
  href?: string
  highlightLabel?: boolean
  highlightValue?: boolean
  startsSection?: boolean
  subRows?: ScopedForecastTableRow[]
}

function filterStatementRowsForMetric(
  rows: ForecastStatementRow[],
  metric: ForecastChartTab | undefined
): ForecastStatementRow[] {
  if (metric == null) return rows
  return rows.filter((row) => row.id === metric)
}

function buildScopedForecastTableRows({
  rows,
  assetModels,
  variant,
}: {
  rows: ForecastStatementRow[]
  assetModels: readonly ScopedForecastResolvedAssetModel[]
  variant: "baseline" | "selected"
}): ScopedForecastTableRow[] {
  return rows.map((row) => ({
    id: row.id,
    rowType: "statement",
    label: row.label,
    kind: row.kind,
    values: row.values,
    highlightLabel: row.id === "salePrice",
    highlightValue: row.id === "salePrice",
    startsSection: row.id === "salePrice",
    subRows: assetModels.map((entry) => {
      const assetRow =
        entry.model.statementRows.find((statementRow) => statementRow.id === row.id) ?? row

      return {
        id: `${row.id}-${entry.model.assetId}`,
        rowType: "asset",
        assetId: entry.model.assetId,
        label: entry.model.assetName,
        kind: assetRow.kind,
        values: assetRow.values,
        href: isMarketListingRowId(entry.selection.row.id)
          ? undefined
          : assetForecastHref(entry.selection.row.id),
      }
    }),
  }))
}

/** Statement row + per-asset rows at the same depth (no expand/collapse). */
function buildFlatScopedForecastTableRows({
  rows,
  assetModels,
  variant,
}: {
  rows: ForecastStatementRow[]
  assetModels: readonly ScopedForecastResolvedAssetModel[]
  variant: "baseline" | "selected"
}): ScopedForecastTableRow[] {
  const out: ScopedForecastTableRow[] = []
  for (const row of rows) {
    out.push({
      id: row.id,
      rowType: "statement",
      label: row.label,
      kind: row.kind,
      values: row.values,
      highlightLabel: row.id === "salePrice",
      highlightValue: row.id === "salePrice",
      startsSection: row.id === "salePrice",
    })
    for (const entry of assetModels) {
      const assetRow =
        entry.model.statementRows.find((statementRow) => statementRow.id === row.id) ?? row
      out.push({
        id: `${row.id}-${entry.model.assetId}`,
        rowType: "asset",
        assetId: entry.model.assetId,
        label: entry.model.assetName,
        kind: assetRow.kind,
        values: assetRow.values,
        href: isMarketListingRowId(entry.selection.row.id)
          ? undefined
          : assetForecastHref(entry.selection.row.id),
      })
    }
  }
  return out
}

function lineItemCellContent(row: Row<ScopedForecastTableRow>) {
  const item = row.original
  const firstRowWeight = row.index === 0 ? "font-semibold" : "font-medium"

  if (item.rowType === "asset") {
    return (
      <div className="flex min-w-0">
        {item.href != null ? (
          <Link
            href={item.href}
            className={cn(
              "group/asset-link inline-flex min-w-0 max-w-full truncate rounded-sm text-left text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              firstRowWeight
            )}
          >
            {item.label}
          </Link>
        ) : (
          <span className={cn("truncate text-foreground", firstRowWeight)}>{item.label}</span>
        )}
      </div>
    )
  }

  if (row.getCanExpand()) {
    return (
      <button
        type="button"
        onClick={row.getToggleExpandedHandler()}
        className="flex w-full min-w-0 items-center gap-2 text-left"
        aria-label={`${row.getIsExpanded() ? "Collapse" : "Expand"} ${item.label}`}
      >
        {row.getIsExpanded() ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span
          className={cn(
            "truncate text-foreground",
            row.index === 0 || item.highlightLabel ? "font-semibold" : "font-medium"
          )}
        >
          {item.label}
        </span>
      </button>
    )
  }

  return (
    <div className="flex min-w-0 items-center">
      <span
        className={cn(
          "truncate text-foreground",
          row.index === 0 || item.highlightLabel ? "font-semibold" : "font-medium"
        )}
      >
        {item.label}
      </span>
    </div>
  )
}

function rowClassName(item: ScopedForecastTableRow) {
  if (item.rowType === "asset") {
    return "group bg-muted/20 hover:bg-muted/25"
  }

  return cn(
    "group",
    "hover:bg-transparent",
    item.startsSection && "border-t border-border/80"
  )
}

function firstColumnSurfaceClassName(item?: ScopedForecastTableRow) {
  if (item == null) {
    return "bg-card"
  }

  if (item.rowType === "asset") {
    return "bg-muted/20 group-hover:bg-muted/25"
  }

  return "bg-background"
}

/** Sticky Modifications / Outlook columns — match line-item column surfaces. */
function selectorColumnsSurfaceClassName(item?: ScopedForecastTableRow) {
  if (item == null) {
    return "bg-card"
  }

  if (item.rowType === "asset") {
    return "bg-muted/20 group-hover:bg-muted/25"
  }

  return "bg-background"
}

export function ScopedForecastsTable({
  periods,
  rows,
  assetModels,
  variant,
  topAccessory,
  metricFilter,
  assetContributionsDisplay = "nested",
  assetSelections,
  onSelectBuildingVersion,
  onSelectOutlookSet,
}: {
  periods: ForecastPeriod[]
  rows: ForecastStatementRow[]
  assetModels: readonly ScopedForecastResolvedAssetModel[]
  variant: "baseline" | "selected"
  topAccessory?: React.ReactNode
  metricFilter?: ForecastChartTab
  /**
   * `nested`: statement rows expand to show per-asset rows (default).
   * `flat`: statement row plus asset rows as a single flat list (no expand/collapse).
   */
  assetContributionsDisplay?: "nested" | "flat"
  /** When set with handlers, adds Modifications and Outlook columns (per-building dropdowns). */
  assetSelections?: readonly ScopedForecastAssetSelection[]
  onSelectBuildingVersion?: (assetId: string, nextId: string) => void
  onSelectOutlookSet?: (assetId: string, nextId: string) => void
}) {
  const flatAssetContributions = assetContributionsDisplay === "flat"

  const showSelectorColumns =
    assetSelections != null &&
    assetSelections.length > 0 &&
    onSelectBuildingVersion != null &&
    onSelectOutlookSet != null

  const selectionByAssetId = React.useMemo(() => {
    if (assetSelections == null || assetSelections.length === 0) {
      return new Map<string, ScopedForecastAssetSelection>()
    }
    return new Map(assetSelections.map((s) => [s.row.id, s]))
  }, [assetSelections])

  const filteredRows = React.useMemo(
    () => filterStatementRowsForMetric(rows, metricFilter),
    [metricFilter, rows]
  )

  const [expanded, setExpanded] = React.useState<ExpandedState>({
    grossRevenue: true,
  })

  React.useEffect(() => {
    if (flatAssetContributions) return
    if (metricFilter != null) {
      setExpanded({ [metricFilter]: true })
    }
  }, [flatAssetContributions, metricFilter])

  const getSubRows = React.useCallback(
    (row: ScopedForecastTableRow) => {
      if (flatAssetContributions) return undefined
      return row.subRows ?? undefined
    },
    [flatAssetContributions]
  )

  const data = React.useMemo(
    () =>
      flatAssetContributions
        ? buildFlatScopedForecastTableRows({
            rows: filteredRows,
            assetModels,
            variant,
          })
        : buildScopedForecastTableRows({
            rows: filteredRows,
            assetModels,
            variant,
          }),
    [assetModels, filteredRows, flatAssetContributions, variant]
  )

  const columns = React.useMemo<ColumnDef<ScopedForecastTableRow>[]>(() => {
    const selectorColumns: ColumnDef<ScopedForecastTableRow>[] = showSelectorColumns
      ? [
          {
            id: "modifications",
            header: () => (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Wrench
                  className="size-3.5 shrink-0 opacity-80"
                  aria-hidden
                />
                Modifications
              </span>
            ),
            cell: ({ row }) => {
              const item = row.original
              if (item.rowType !== "asset" || item.assetId == null) {
                return <span className="text-muted-foreground">—</span>
              }
              const selection = selectionByAssetId.get(item.assetId)
              if (selection == null) return null
              return (
                <Select
                  items={modificationItemsRecord(selection.buildingVersionOptions)}
                  value={selection.selectedBuildingVersionId}
                  onValueChange={(value) => {
                    if (value == null) return
                    onSelectBuildingVersion(item.assetId!, value)
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="h-7 w-full max-w-[7.25rem] text-[0.75rem]"
                    aria-label={`${selection.row.building} modification set`}
                  >
                    <SelectValue placeholder={modificationSelectPlaceholder()} />
                  </SelectTrigger>
                  <SelectContent>
                    {selection.buildingVersionOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {modificationSelectLabelFromOption(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            },
            enableSorting: false,
          },
          {
            id: "outlook",
            header: () => (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Telescope
                  className="size-3.5 shrink-0 opacity-80"
                  aria-hidden
                />
                Outlook
              </span>
            ),
            cell: ({ row }) => {
              const item = row.original
              if (item.rowType !== "asset" || item.assetId == null) {
                return <span className="text-muted-foreground">—</span>
              }
              const selection = selectionByAssetId.get(item.assetId)
              if (selection == null) return null
              return (
                <Select
                  items={outlookSetItemsRecord(selection.outlookSetOptions)}
                  value={selection.selectedOutlookSetId}
                  onValueChange={(value) => {
                    if (value == null) return
                    onSelectOutlookSet(item.assetId!, value)
                  }}
                >
                  <SelectTrigger
                    size="sm"
                    className="h-7 w-full max-w-[7.25rem] text-[0.75rem]"
                    aria-label={`${selection.row.building} outlook set`}
                  >
                    <SelectValue placeholder={outlookSetSelectPlaceholder()} />
                  </SelectTrigger>
                  <SelectContent>
                    {selection.outlookSetOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {outlookSetSelectLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            },
            enableSorting: false,
          },
        ]
      : []

    return [
      {
        id: "lineItem",
        header: () => "Asset",
        cell: ({ row }) => lineItemCellContent(row),
        enableSorting: false,
      },
      ...selectorColumns,
      ...periods.map<ColumnDef<ScopedForecastTableRow>>((period, index) => ({
        id: `period-${period.label}`,
        header: () => period.label,
        cell: (info) => {
          const item = info.row.original
          const isFirstRow = info.row.index === 0

          return (
            <div
              className={cn(
                "text-right tabular-nums",
                isFirstRow ? "font-semibold" : "font-normal",
                item.kind === "expense" ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {formatStatementValue(item.kind, item.values[index] ?? 0)}
            </div>
          )
        },
        enableSorting: false,
      })),
    ]
  }, [
    onSelectBuildingVersion,
    onSelectOutlookSet,
    periods,
    selectionByAssetId,
    showSelectorColumns,
  ])

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table useReactTable
  const table = useReactTable({
    data,
    columns,
    state: flatAssetContributions ? {} : { expanded },
    onExpandedChange: flatAssetContributions ? undefined : setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows,
    getRowId: (row) => row.id,
    autoResetExpanded: false,
  })

  const totalTableMinWidth =
    FIRST_COLUMN_WIDTH_PX +
    (showSelectorColumns ? 2 * SELECTOR_COLUMN_WIDTH_PX : 0) +
    periods.length * PERIOD_COLUMN_WIDTH_PX

  return (
    <div className="overflow-hidden">
      {topAccessory != null ? (
        <div className="border-b border-border/60 px-4 py-3">{topAccessory}</div>
      ) : null}

      <Table className="table-fixed" style={{ minWidth: `${totalTableMinWidth}px` }}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-b-2 border-border bg-muted hover:bg-muted/90"
            >
              {headerGroup.headers.map((header) => {
                const colId = header.column.id
                const isLineItemColumn = colId === "lineItem"
                const isModificationsColumn = colId === "modifications"
                const isOutlookColumn = colId === "outlook"

                return (
                  <TableHead
                    key={header.id}
                    scope="col"
                    className={cn(
                      "h-auto min-w-0 bg-muted py-2 align-middle text-sm font-medium text-foreground",
                      isLineItemColumn &&
                        "sticky left-0 z-20 border-r border-border/60 px-4 text-left",
                      isModificationsColumn &&
                        "sticky z-[19] border-r border-border/60 px-2 text-left",
                      isOutlookColumn &&
                        "sticky z-[18] border-r border-border/60 px-2 text-left",
                      !isLineItemColumn &&
                        !isModificationsColumn &&
                        !isOutlookColumn &&
                        "px-3 text-right"
                    )}
                    style={
                      isLineItemColumn
                        ? firstColumnStyle
                        : isModificationsColumn
                          ? modificationsColumnStyle
                          : isOutlookColumn
                            ? outlookColumnStyle
                            : periodColumnStyle
                    }
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

        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className={rowClassName(row.original)}>
              {row.getVisibleCells().map((cell) => {
                const colId = cell.column.id
                const isLineItemColumn = colId === "lineItem"
                const isModificationsColumn = colId === "modifications"
                const isOutlookColumn = colId === "outlook"

                return (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      isLineItemColumn && "sticky left-0 z-10 border-r border-border/60 px-4",
                      isModificationsColumn &&
                        "sticky z-[9] border-r border-border/60 px-2 py-1.5",
                      isOutlookColumn && "sticky z-[8] border-r border-border/60 px-2 py-1.5",
                      !isLineItemColumn &&
                        !isModificationsColumn &&
                        !isOutlookColumn &&
                        "px-3",
                      row.original.rowType === "asset" &&
                        !isModificationsColumn &&
                        !isOutlookColumn
                        ? "py-3"
                        : !isModificationsColumn && !isOutlookColumn
                          ? "py-2.5"
                          : undefined,
                      isLineItemColumn && firstColumnSurfaceClassName(row.original),
                      (isModificationsColumn || isOutlookColumn) &&
                        selectorColumnsSurfaceClassName(row.original)
                    )}
                    style={
                      isLineItemColumn
                        ? firstColumnStyle
                        : isModificationsColumn
                          ? modificationsColumnStyle
                          : isOutlookColumn
                            ? outlookColumnStyle
                            : periodColumnStyle
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {metricFilter == null && !flatAssetContributions ? (
        <div className="border-t border-border bg-muted/10 px-4 py-2 text-xs text-muted-foreground">
          Expand any statement row to inspect building-level contributions for the current selection.
        </div>
      ) : null}
      {flatAssetContributions ? (
        <div className="border-t border-border bg-muted/10 px-4 py-2 text-xs text-muted-foreground">
          Totals on the line above; following rows are building-level values for the selected metric.
        </div>
      ) : null}
    </div>
  )
}
