"use client"

import type { ReactNode } from "react"
import type { Column, ColumnDef, Table } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight } from "lucide-react"
import { AssetModificationSetSelect } from "@/components/portfolio/asset-modification-set-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import {
  liftPillClassFromStrength,
  normalizedLiftStrength,
} from "@/lib/portfolio-lift"
import { cn } from "@/lib/utils"

function SortableHeader({
  column,
  className,
  align = "start",
  children,
}: {
  column: Column<PortfolioAssetRow, unknown>
  className?: string
  align?: "start" | "end"
  children: ReactNode
}) {
  if (!column.getCanSort()) {
    return (
      <div
        className={cn(
          "font-medium",
          align === "end" && "flex w-full justify-end",
          className
        )}
      >
        {children}
      </div>
    )
  }
  return (
    <div
      className={cn(
        "flex w-full",
        align === "end" ? "justify-end" : "justify-start"
      )}
    >
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "-mx-2 h-8 gap-1.5 px-2 font-medium text-foreground",
          className
        )}
        onClick={column.getToggleSortingHandler()}
      >
        {children}
        {column.getIsSorted() === "desc" ? (
          <ArrowDown className="size-4 shrink-0 opacity-70" aria-hidden />
        ) : column.getIsSorted() === "asc" ? (
          <ArrowUp className="size-4 shrink-0 opacity-70" aria-hidden />
        ) : (
          <ArrowUpDown className="size-4 shrink-0 opacity-45" aria-hidden />
        )}
      </Button>
    </div>
  )
}

function SelectHeader({ table }: { table: Table<PortfolioAssetRow> }) {
  const rows = table.getRowModel().rows
  const allSelected =
    rows.length > 0 && rows.every((r) => r.getIsSelected())
  const someSelected = rows.some((r) => r.getIsSelected())

  return (
    <Checkbox
      checked={allSelected}
      indeterminate={someSelected && !allSelected}
      disabled={rows.length === 0}
      onCheckedChange={(checked) => table.toggleAllRowsSelected(!!checked)}
      aria-label="Select all assets in view"
    />
  )
}

export function createPortfolioAssetColumns(
  liftExtent: { min: number; max: number }
): ColumnDef<PortfolioAssetRow>[] {
  const strength = (liftPercent: number) =>
    normalizedLiftStrength(liftPercent, liftExtent.min, liftExtent.max)

  return [
    {
      id: "select",
      header: ({ table }) => <SelectHeader table={table} />,
      cell: ({ row }) => (
        <span
          className="flex items-center"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label={`Select ${row.original.building}`}
          />
        </span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "building",
      header: ({ column }) => (
        <SortableHeader column={column}>Asset</SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex flex-col gap-0.5">
            <span className="font-semibold leading-snug text-foreground">
              {row.original.building}
            </span>
            <span className="text-xs leading-snug text-muted-foreground">
              {row.original.location}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "typeLabel",
      header: ({ column }) => (
        <SortableHeader column={column}>Type</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.typeLabel}</span>
      ),
    },
    {
      accessorKey: "rsf",
      header: ({ column }) => (
        <SortableHeader column={column} align="end">
          RSF
        </SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        String(rowA.getValue(id)).localeCompare(String(rowB.getValue(id)), undefined, {
          numeric: true,
        }),
      cell: ({ row }) => (
        <div className="text-right text-sm tabular-nums">
          {row.original.rsf}
        </div>
      ),
    },
    {
      accessorKey: "occPct",
      header: ({ column }) => (
        <SortableHeader column={column} align="end">
          Occ%
        </SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        Number.parseFloat(String(rowA.getValue(id))) -
        Number.parseFloat(String(rowB.getValue(id))),
      cell: ({ row }) => (
        <div className="text-right text-sm tabular-nums">
          {row.original.occPct}
        </div>
      ),
    },
    {
      accessorKey: "pricePerSf",
      header: ({ column }) => (
        <SortableHeader column={column} align="end">
          $/SF
        </SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        Number.parseInt(String(rowA.getValue(id)).replace(/\D/g, ""), 10) -
        Number.parseInt(String(rowB.getValue(id)).replace(/\D/g, ""), 10),
      cell: ({ row }) => (
        <div className="text-right text-sm tabular-nums">
          {row.original.pricePerSf}
        </div>
      ),
    },
    {
      accessorKey: "noi",
      header: ({ column }) => (
        <SortableHeader column={column} align="end">
          NOI
        </SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        String(rowA.getValue(id)).localeCompare(String(rowB.getValue(id)), undefined, {
          numeric: true,
        }),
      cell: ({ row }) => (
        <div className="text-right text-sm tabular-nums">
          {row.original.noi}
        </div>
      ),
    },
    {
      accessorKey: "value",
      header: ({ column }) => (
        <SortableHeader column={column} align="end">
          Value
        </SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        String(rowA.getValue(id)).localeCompare(String(rowB.getValue(id)), undefined, {
          numeric: true,
        }),
      cell: ({ row }) => (
        <div className="text-right text-sm tabular-nums">
          {row.original.value}
        </div>
      ),
    },
    {
      accessorKey: "capRate",
      header: ({ column }) => (
        <SortableHeader column={column} align="end">
          Cap
        </SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        Number.parseFloat(String(rowA.getValue(id))) -
        Number.parseFloat(String(rowB.getValue(id))),
      cell: ({ row }) => (
        <div className="text-right text-sm tabular-nums">
          {row.original.capRate}
        </div>
      ),
    },
    {
      accessorKey: "wale",
      header: ({ column }) => (
        <SortableHeader column={column} align="end">
          WALE
        </SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        Number.parseFloat(String(rowA.getValue(id))) -
        Number.parseFloat(String(rowB.getValue(id))),
      cell: ({ row }) => (
        <div className="text-right text-sm tabular-nums">
          {row.original.wale}
        </div>
      ),
    },
    {
      accessorKey: "debtYield",
      header: ({ column }) => (
        <SortableHeader column={column} align="end">
          Debt Yield
        </SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        Number.parseFloat(String(rowA.getValue(id))) -
        Number.parseFloat(String(rowB.getValue(id))),
      cell: ({ row }) => (
        <div className="text-right text-sm tabular-nums">
          {row.original.debtYield}
        </div>
      ),
    },
    {
      id: "lift",
      accessorKey: "liftPercent",
      header: ({ column }) => (
        <SortableHeader
          column={column}
          align="end"
          className="text-violet-700 dark:text-violet-300 [&_svg:not([class*='size-'])]:size-3.5"
        >
          <span className="inline-flex items-center gap-1">
            Potential Lift
            <ArrowUpRight
              className="text-violet-600 opacity-90 dark:text-violet-400"
              aria-hidden
            />
          </span>
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="flex justify-end">
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
              liftPillClassFromStrength(strength(row.original.liftPercent))
            )}
          >
            {row.original.lift}
          </span>
        </div>
      ),
    },
    {
      id: "modifications",
      header: "Modifications",
      cell: ({ row }) => (
        <AssetModificationSetSelect
          assetId={row.original.id}
          building={row.original.building}
        />
      ),
      enableSorting: false,
    },
  ]
}
