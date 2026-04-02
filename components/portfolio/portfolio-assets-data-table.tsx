"use client"

import * as React from "react"
import { flexRender, type Table } from "@tanstack/react-table"
import { useRouter } from "next/navigation"
import { AssetModificationSetSelect } from "@/components/portfolio/asset-modification-set-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { assetHref } from "@/lib/assets"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import {
  liftPillClassFromStrength,
  normalizedLiftStrength,
} from "@/lib/portfolio-lift"
import { cn } from "@/lib/utils"
import { PORTFOLIO_ASSETS_COLUMN_GRID_TRACK } from "@/lib/portfolio-assets-table-layout"
function gridTemplateForVisibleColumns(
  table: Table<PortfolioAssetRow>
): string {
  return table
    .getVisibleLeafColumns()
    .map((c) => PORTFOLIO_ASSETS_COLUMN_GRID_TRACK[c.id] ?? "auto")
    .join(" ")
}

function isInteractiveTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false
  return Boolean(
    el.closest(
      '[data-slot="checkbox"],button,a,[role="combobox"],[data-slot="select-trigger"]'
    )
  )
}

export function PortfolioAssetsDataTable({
  table,
  liftExtent,
}: {
  table: Table<PortfolioAssetRow>
  liftExtent: { min: number; max: number }
}) {
  const router = useRouter()
  const data = table.options.data

  const selectedCount = Object.values(
    table.getState().rowSelection
  ).filter(Boolean).length

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

  const strength = React.useCallback(
    (liftPercent: number) =>
      normalizedLiftStrength(liftPercent, liftExtent.min, liftExtent.max),
    [liftExtent.min, liftExtent.max]
  )

  return (
    <>
      <div className="flex flex-col gap-2 border-b border-border bg-background px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-sm text-muted-foreground">
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
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-border text-muted-foreground hover:text-foreground"
            disabled={selectedCount === 0}
          >
            Add to Scenario
          </Button>
        </div>
      </div>
      <table
        className="hidden w-full min-w-max caption-bottom text-sm max-lg:hidden lg:grid lg:px-4"
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
                    "h-auto min-w-0 px-0 py-2 text-left align-middle",
                    header.column.id === "select" &&
                      "flex w-8 max-w-8 items-center justify-start",
                    header.column.id !== "select" && "font-medium"
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
                className="grid cursor-pointer items-center border-b border-border hover:bg-muted/50 data-[state=selected]:bg-muted"
                style={gridRowStyle}
                role="link"
                tabIndex={0}
                aria-label={`Open ${row.original.building}, ${row.original.location}`}
                onClick={(e) => {
                  if (isInteractiveTarget(e.target)) return
                  router.push(assetHref(row.original.id))
                }}
                onKeyDown={(e) => {
                  if (isInteractiveTarget(e.target)) return
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    router.push(assetHref(row.original.id))
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="min-w-0 border-0 p-0 py-3 text-left align-middle [&:has([role=checkbox])]:pr-0"
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
                className="h-24 border-0 py-10 text-center text-sm text-muted-foreground"
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
                    <span
                      className="flex shrink-0 items-center pt-0.5"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) => {
                          tableRow.toggleSelected(!!checked)
                        }}
                        aria-label={`Select ${row.building}`}
                      />
                    </span>
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onClick={() => router.push(href)}
                    >
                      <span className="font-semibold leading-snug text-foreground">
                        {row.building}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                        {row.location}
                      </span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Type</span>
                    <span className="text-left text-foreground">{row.typeLabel}</span>
                    <span>RSF</span>
                    <span className="text-left tabular-nums text-foreground">
                      {row.rsf}
                    </span>
                    <span>Lift</span>
                    <span className="flex justify-start">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
                          liftPillClassFromStrength(strength(row.liftPercent))
                        )}
                      >
                        {row.lift}
                      </span>
                    </span>
                  </div>
                  <AssetModificationSetSelect
                    assetId={row.id}
                    building={row.building}
                  />
                </div>
              </li>
            )
          })
        )}
      </ul>
    </>
  )
}
