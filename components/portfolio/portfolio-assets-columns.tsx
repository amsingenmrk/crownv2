"use client"

import { type ReactNode, useState } from "react"
import type { Column, ColumnDef, Table } from "@tanstack/react-table"
import Link from "next/link"
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react"
import { PortfolioProvenanceIndicator } from "@/components/portfolio/portfolio-provenance-indicator"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AssetModificationSetSelect } from "@/components/portfolio/asset-modification-set-select"
import { AssetScopeSelect } from "@/components/portfolio/asset-scope-select"
import { assetHref } from "@/lib/assets"
import { isMarketListingRowId } from "@/lib/market-listing-portfolio-row"
import { buildRecommendedModificationHref } from "@/lib/modification-recommendations"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import {
  liftPillClassFromStrength,
  normalizedLiftStrength,
} from "@/lib/portfolio-lift"
import { cn } from "@/lib/utils"
import { useScenarioModificationSelections } from "@/components/scenario-modification-selections-context"

export type PortfolioAssetsTableVariant = "portfolio" | "scenarios"

type PortfolioAssetColumnOptions = {
  showScopeColumn?: boolean
  customGroups?: Record<string, string>
}

const CLASS_SOURCE_LABEL =
  "Modeled building class estimate for the demo portfolio table."

const PRICING_SOURCE_LABEL =
  "Modeled pricing estimate. This is not presented as raw client-reported pricing."

const VALUE_SOURCE_LABEL =
  "Modeled asset value estimate derived from the portfolio financial model."

const POTENTIAL_LIFT_SOURCE_LABEL =
  "Derived from the highest-lift single recommended modification for this asset."

function SortableHeader({
  column,
  className,
  sourceLabel,
  children,
}: {
  column: Column<PortfolioAssetRow, unknown>
  className?: string
  /** Provenance tooltip; kept in the header so rows are not repeated with (?) icons. */
  sourceLabel?: string
  children: ReactNode
}) {
  const provenance =
    sourceLabel != null && sourceLabel !== "" ? (
      <PortfolioProvenanceIndicator label={sourceLabel} />
    ) : null

  if (!column.getCanSort()) {
    return (
      <div className="flex w-full min-w-0 items-center gap-1.5 justify-start">
        <div className={cn("min-w-0 font-medium", className)}>{children}</div>
        {provenance}
      </div>
    )
  }
  return (
    <div className="flex w-full min-w-0 items-center gap-1.5 justify-start">
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "-mx-2 h-auto min-h-0 min-w-0 gap-1.5 px-2 py-0 font-medium text-foreground",
          className
        )}
        onClick={column.getToggleSortingHandler()}
      >
        <span className="min-w-0">{children}</span>
        {column.getIsSorted() === "desc" ? (
          <ArrowDown className="size-4 shrink-0 opacity-70" aria-hidden />
        ) : column.getIsSorted() === "asc" ? (
          <ArrowUp className="size-4 shrink-0 opacity-70" aria-hidden />
        ) : null}
      </Button>
      {provenance}
    </div>
  )
}

export function ScenarioRemoveFromScenarioCell({
  assetId,
  building,
}: {
  assetId: string
  building: string
}) {
  const { excludeAssetsFromScenario } = useScenarioModificationSelections()
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="flex justify-end">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={`Remove ${building} from scenario`}
        aria-haspopup="dialog"
        aria-expanded={confirmOpen}
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove asset from scenario</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{building}</span>{" "}
              will be removed from this scenario. Saved modification sets in the
              sidebar are not deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                excludeAssetsFromScenario([assetId])
                setConfirmOpen(false)
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  liftExtent: { min: number; max: number },
  {
    showScopeColumn = false,
    customGroups = {},
  }: PortfolioAssetColumnOptions = {}
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
            {isMarketListingRowId(row.original.id) ? (
              <span className="inline-flex w-fit max-w-full font-semibold leading-snug text-foreground">
                <span className="truncate">{row.original.building}</span>
              </span>
            ) : (
              <Link
                href={assetHref(row.original.id)}
                className="inline-flex w-fit max-w-full rounded-sm font-semibold leading-snug text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="truncate">{row.original.building}</span>
              </Link>
            )}
            <span className="text-xs leading-snug text-muted-foreground">
              {row.original.location}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "ownership",
      enableHiding: true,
      meta: { columnLabel: "Ownership" },
      header: () => <div className="font-medium">Ownership</div>,
      enableSorting: false,
      cell: ({ row }) =>
        isMarketListingRowId(row.original.id) ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground">
            {row.original.ownership}
          </span>
        ),
    },
    {
      accessorKey: "typeLabel",
      enableHiding: true,
      meta: { columnLabel: "Sector" },
      header: ({ column }) => (
        <SortableHeader column={column}>Sector</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-left text-sm">{row.original.typeLabel}</span>
      ),
    },
    {
      accessorKey: "classLabel",
      enableHiding: true,
      meta: { columnLabel: "Class" },
      header: ({ column }) => (
        <SortableHeader column={column} sourceLabel={CLASS_SOURCE_LABEL}>
          Class
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="min-w-0 truncate text-left text-sm">
          {row.original.classLabel}
        </div>
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
        <SortableHeader column={column} sourceLabel={PRICING_SOURCE_LABEL}>
          $/SF
        </SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        Number.parseInt(String(rowA.getValue(id)).replace(/\D/g, ""), 10) -
        Number.parseInt(String(rowB.getValue(id)).replace(/\D/g, ""), 10),
      cell: ({ row }) => (
        <div className="min-w-0 truncate text-left text-sm tabular-nums">
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
        <SortableHeader column={column} sourceLabel={VALUE_SOURCE_LABEL}>
          Value
        </SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        String(rowA.getValue(id)).localeCompare(String(rowB.getValue(id)), undefined, {
          numeric: true,
        }),
      cell: ({ row }) => (
        <div className="min-w-0 truncate text-left text-sm tabular-nums">
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
  ]

  if (variant === "portfolio" && showScopeColumn) {
    columns.splice(3, 0, {
      id: "scope",
      accessorFn: (row) => row.groupId,
      enableHiding: true,
      meta: { columnLabel: "Scope" },
      header: () => <div className="font-medium">Scope</div>,
      cell: ({ row }) => (
        <AssetScopeSelect
          assetId={row.original.id}
          building={row.original.building}
          groupId={row.original.groupId}
          customGroups={customGroups}
        />
      ),
      enableSorting: false,
    })
  }

  if (variant === "portfolio") {
    columns.push({
      id: "lift",
      accessorFn: (row) => row.liftPercent,
      enableHiding: true,
      meta: { columnLabel: "Potential Lift" },
      header: ({ column }) => (
        <SortableHeader
          column={column}
          sourceLabel={POTENTIAL_LIFT_SOURCE_LABEL}
        >
          Potential Lift
        </SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        Number(rowA.getValue(id)) - Number(rowB.getValue(id)),
      cell: ({ row }) => (
        <div className="flex justify-start">
          {row.original.recommendedModification == null ||
          isMarketListingRowId(row.original.id) ? (
            <span
              className={cn(
                "inline-flex items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                liftPillClassFromStrength(liftStrength(row.original.liftPercent))
              )}
            >
              {row.original.lift}
            </span>
          ) : (
            <Link
              href={buildRecommendedModificationHref(
                row.original.id,
                row.original.recommendedModification
              )}
              className="inline-flex rounded-full focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
              aria-label={`Potential lift ${row.original.lift}. Open ${row.original.recommendedModification.optionTitle} in modifications.`}
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums transition-opacity hover:opacity-90",
                  liftPillClassFromStrength(liftStrength(row.original.liftPercent))
                )}
              >
                {row.original.lift}
              </span>
            </Link>
          )}
        </div>
      ),
    })
  } else {
    columns.push({
      id: "modifications",
      enableHiding: false,
      header: "Modifications",
      cell: ({ row }) =>
        isMarketListingRowId(row.original.id) ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <AssetModificationSetSelect
            assetId={row.original.id}
            building={row.original.building}
          />
        ),
      enableSorting: false,
    })
    columns.push({
      id: "scenarioRemove",
      enableHiding: false,
      header: () => (
        <span className="sr-only">Remove from scenario</span>
      ),
      cell: ({ row }) => (
        <ScenarioRemoveFromScenarioCell
          assetId={row.original.id}
          building={row.original.building}
        />
      ),
      enableSorting: false,
    })
  }

  return columns
}
