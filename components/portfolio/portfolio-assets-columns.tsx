"use client"

import type { ReactNode } from "react"
import type { Column, ColumnDef, Table } from "@tanstack/react-table"
import Link from "next/link"
import { ArrowDown, ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { AssetModificationSetSelect } from "@/components/portfolio/asset-modification-set-select"
import { assetHref } from "@/lib/assets"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import {
  liftPillClassFromStrength,
  normalizedLiftStrength,
} from "@/lib/portfolio-lift"
import { cn } from "@/lib/utils"

export type PortfolioAssetsTableVariant = "portfolio" | "scenarios"

function SortableHeader({
  column,
  className,
  children,
}: {
  column: Column<PortfolioAssetRow, unknown>
  className?: string
  children: ReactNode
}) {
  if (!column.getCanSort()) {
    return (
      <div className={cn("font-medium", className)}>{children}</div>
    )
  }
  return (
    <div className="flex w-full justify-start">
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "-mx-2 h-auto min-h-0 gap-1.5 px-2 py-0 font-medium text-foreground",
          className
        )}
        onClick={column.getToggleSortingHandler()}
      >
        {children}
        {column.getIsSorted() === "desc" ? (
          <ArrowDown className="size-4 shrink-0 opacity-70" aria-hidden />
        ) : column.getIsSorted() === "asc" ? (
          <ArrowUp className="size-4 shrink-0 opacity-70" aria-hidden />
        ) : null}
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
  variant: PortfolioAssetsTableVariant,
  liftExtent: { min: number; max: number }
): ColumnDef<PortfolioAssetRow>[] {
  const liftStrength = (liftPercent: number) =>
    normalizedLiftStrength(liftPercent, liftExtent.min, liftExtent.max)

  const columns: ColumnDef<PortfolioAssetRow>[] = [
    {
      id: "select",
      header: ({ table }) => <SelectHeader table={table} />,
      cell: ({ row }) => (
        <span className="flex items-center">
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
      enableHiding: false,
      header: ({ column }) => (
        <SortableHeader column={column}>Asset</SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="flex min-w-0 items-start gap-2 text-left">
          <div className="min-w-0 flex flex-col gap-0.5 text-left">
            <Link
              href={assetHref(row.original.id)}
              className="inline-flex w-fit max-w-full rounded-sm font-semibold leading-snug text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="truncate">{row.original.building}</span>
            </Link>
            <span className="text-xs leading-snug text-muted-foreground">
              {row.original.location}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "typeLabel",
      enableHiding: true,
      meta: { columnLabel: "Type" },
      header: ({ column }) => (
        <SortableHeader column={column}>Type</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-left text-sm">{row.original.typeLabel}</span>
      ),
    },
    {
      accessorKey: "rsf",
      enableHiding: true,
      meta: { columnLabel: "RSF" },
      header: ({ column }) => (
        <SortableHeader column={column}>RSF</SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        String(rowA.getValue(id)).localeCompare(String(rowB.getValue(id)), undefined, {
          numeric: true,
        }),
      cell: ({ row }) => (
        <div className="text-left text-sm tabular-nums">
          {row.original.rsf}
        </div>
      ),
    },
    {
      accessorKey: "occPct",
      enableHiding: true,
      meta: { columnLabel: "Occ%" },
      header: ({ column }) => (
        <SortableHeader column={column}>Occ%</SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        Number.parseFloat(String(rowA.getValue(id))) -
        Number.parseFloat(String(rowB.getValue(id))),
      cell: ({ row }) => (
        <div className="text-left text-sm tabular-nums">
          {row.original.occPct}
        </div>
      ),
    },
    {
      accessorKey: "pricePerSf",
      enableHiding: true,
      meta: { columnLabel: "$/SF" },
      header: ({ column }) => (
        <SortableHeader column={column}>$/SF</SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        Number.parseInt(String(rowA.getValue(id)).replace(/\D/g, ""), 10) -
        Number.parseInt(String(rowB.getValue(id)).replace(/\D/g, ""), 10),
      cell: ({ row }) => (
        <div className="text-left text-sm tabular-nums">
          {row.original.pricePerSf}
        </div>
      ),
    },
    {
      accessorKey: "noi",
      enableHiding: true,
      meta: { columnLabel: "NOI" },
      header: ({ column }) => (
        <SortableHeader column={column}>NOI</SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        String(rowA.getValue(id)).localeCompare(String(rowB.getValue(id)), undefined, {
          numeric: true,
        }),
      cell: ({ row }) => (
        <div className="text-left text-sm tabular-nums">
          {row.original.noi}
        </div>
      ),
    },
    {
      accessorKey: "value",
      enableHiding: true,
      meta: { columnLabel: "Value" },
      header: ({ column }) => (
        <SortableHeader column={column}>Value</SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        String(rowA.getValue(id)).localeCompare(String(rowB.getValue(id)), undefined, {
          numeric: true,
        }),
      cell: ({ row }) => (
        <div className="text-left text-sm tabular-nums">
          {row.original.value}
        </div>
      ),
    },
    {
      accessorKey: "capRate",
      enableHiding: true,
      meta: { columnLabel: "Cap" },
      header: ({ column }) => (
        <SortableHeader column={column}>Cap</SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        Number.parseFloat(String(rowA.getValue(id))) -
        Number.parseFloat(String(rowB.getValue(id))),
      cell: ({ row }) => (
        <div className="text-left text-sm tabular-nums">
          {row.original.capRate}
        </div>
      ),
    },
    {
      accessorKey: "wale",
      enableHiding: true,
      meta: { columnLabel: "WALE" },
      header: ({ column }) => (
        <SortableHeader column={column}>WALE</SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        Number.parseFloat(String(rowA.getValue(id))) -
        Number.parseFloat(String(rowB.getValue(id))),
      cell: ({ row }) => (
        <div className="text-left text-sm tabular-nums">
          {row.original.wale}
        </div>
      ),
    },
    {
      accessorKey: "debtYield",
      enableHiding: true,
      meta: { columnLabel: "Debt Yield" },
      header: ({ column }) => (
        <SortableHeader column={column}>Debt Yield</SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        Number.parseFloat(String(rowA.getValue(id))) -
        Number.parseFloat(String(rowB.getValue(id))),
      cell: ({ row }) => (
        <div className="text-left text-sm tabular-nums">
          {row.original.debtYield}
        </div>
      ),
    },
  ]

  if (variant === "portfolio") {
    columns.push({
      id: "lift",
      accessorFn: (row) => row.liftPercent,
      enableHiding: true,
      meta: { columnLabel: "Potential Lift" },
      header: ({ column }) => (
        <SortableHeader column={column}>Potential Lift</SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        Number(rowA.getValue(id)) - Number(rowB.getValue(id)),
      cell: ({ row }) => (
        <div className="flex justify-start">
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
              liftPillClassFromStrength(liftStrength(row.original.liftPercent))
            )}
          >
            {row.original.lift}
          </span>
        </div>
      ),
    })
    columns.push({
      accessorKey: "recommendation",
      enableHiding: true,
      meta: { columnLabel: "Recommendations" },
      header: ({ column }) => (
        <SortableHeader column={column}>Recommendations</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-left text-sm">{row.original.recommendation}</span>
      ),
    })
  } else {
    columns.push({
      id: "modifications",
      enableHiding: false,
      header: "Modifications",
      cell: ({ row }) => (
        <AssetModificationSetSelect
          assetId={row.original.id}
          building={row.original.building}
        />
      ),
      enableSorting: false,
    })
  }

  return columns
}
