"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { useRouter } from "next/navigation"
import { AssetModificationSetSelect } from "@/components/portfolio/asset-modification-set-select"
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
import { createPortfolioAssetColumns } from "./portfolio-assets-columns"

/**
 * Matches header + body rows; first column = checkbox.
 * Wide layout — parent uses horizontal scroll on small viewports.
 */
export const ASSETS_TABLE_LG_GRID =
  "lg:grid-cols-[minmax(2rem,2rem)_minmax(0,1fr)_minmax(0,4.5rem)_minmax(0,3.25rem)_minmax(0,3.25rem)_minmax(0,3.25rem)_minmax(0,3.5rem)_minmax(0,4.25rem)_minmax(0,3rem)_minmax(0,3.25rem)_minmax(0,4.5rem)_minmax(8.5rem,12rem)_minmax(8rem,10.5rem)]"

function isInteractiveTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false
  return Boolean(
    el.closest(
      '[data-slot="checkbox"],button,a,[role="combobox"],[data-slot="select-trigger"]'
    )
  )
}

export function PortfolioAssetsDataTable({
  data,
  liftExtent,
  rowSelection,
  onRowSelectionChange,
}: {
  data: PortfolioAssetRow[]
  liftExtent: { min: number; max: number }
  rowSelection: RowSelectionState
  onRowSelectionChange: React.Dispatch<React.SetStateAction<RowSelectionState>>
}) {
  const router = useRouter()
  const columns = React.useMemo(
    () => createPortfolioAssetColumns(liftExtent),
    [liftExtent]
  )

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "lift", desc: true },
  ])

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table useReactTable
  const table = useReactTable({
    data,
    columns,
    state: { rowSelection, sorting },
    onRowSelectionChange,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: true,
  })

  const sortedRows = table.getRowModel().rows

  const strength = React.useCallback(
    (liftPercent: number) =>
      normalizedLiftStrength(liftPercent, liftExtent.min, liftExtent.max),
    [liftExtent.min, liftExtent.max]
  )

  return (
    <>
      <table className="hidden w-full caption-bottom text-sm max-lg:hidden lg:table">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className={cn(
                "grid items-center gap-3 border-border bg-muted/50 px-4 hover:bg-muted/50",
                ASSETS_TABLE_LG_GRID
              )}
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  scope="col"
                  className={cn(
                    "h-auto px-0 py-2 align-middle",
                    header.column.id === "select" &&
                      "flex w-8 items-center justify-start",
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
        <TableBody>
          {sortedRows.length ? (
            sortedRows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={cn(
                  "grid cursor-pointer items-center gap-3 border-border px-4 hover:bg-muted/50",
                  ASSETS_TABLE_LG_GRID
                )}
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
                    className="border-0 p-0 py-3 align-middle [&:has([role=checkbox])]:pr-0"
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
            <TableRow className="grid border-0 hover:bg-transparent">
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
            const selected = Boolean(rowSelection[row.id])
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
                          onRowSelectionChange((s) => {
                            const next = { ...s }
                            if (checked) next[row.id] = true
                            else delete next[row.id]
                            return next
                          })
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
