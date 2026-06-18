"use client"

import { type ReactNode } from "react"
import type { Column, ColumnDef, Table } from "@tanstack/react-table"
import Link from "next/link"
import { ArrowDown, ArrowUp, Sun, Wrench } from "lucide-react"
import {
  buildPortfolioAssetMetadataItems,
  PortfolioAssetIdentity,
  PortfolioRemoveAssetButton,
  ScenarioRemoveAssetButton,
} from "@/components/portfolio/portfolio-asset-identity"
import { PortfolioProvenanceIndicator } from "@/components/portfolio/portfolio-provenance-indicator"
import { PortfolioRowStatusBadge } from "@/components/portfolio/portfolio-row-status-badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { AssetModificationSetSelect } from "@/components/portfolio/asset-modification-set-select"
import { AssetOutlookSetSelect } from "@/components/portfolio/asset-outlook-set-select"
import { AssetScopeSelect } from "@/components/portfolio/asset-scope-select"
import {
  modificationSetMetricDelta,
  type ModificationSelectionMetricKey,
} from "@/lib/modification-selection-value-delta"
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
}

const ASSET_METADATA_SOURCE_LABEL =
  "Class shown in the asset metadata strip is a modeled building class estimate for the demo portfolio table."

const PRICING_SOURCE_LABEL =
  "Modeled pricing estimate. This is not presented as raw client-reported pricing."

const VALUE_SOURCE_LABEL =
  "Modeled asset value estimate derived from lease-level revenue, modeled OpEx, and a calibrated cap rate."

const OCCUPANCY_SOURCE_LABEL =
  "Lease-derived occupancy from the synthetic rent roll (occupied SF divided by total RSF)."

const WALT_SOURCE_LABEL =
  "WALT is the weighted average remaining lease term by occupied square feet."

const REVENUE_SOURCE_LABEL =
  "In-place annual revenue from occupied suites in the synthetic lease roll."

const OPEX_SOURCE_LABEL =
  "Modeled annual operating expense built from sector burden, vacancy carry, and revenue-linked costs."

const NOI_SOURCE_LABEL =
  "Modeled annual NOI calculated as in-place revenue less modeled OpEx."

const CAP_RATE_SOURCE_LABEL =
  "Modeled cap rate calibrated by sector, market tier, occupancy, and WALT."

const POTENTIAL_LIFT_SOURCE_LABEL =
  "Derived from the highest-lift single recommended modification for this asset."

function parseCompactUsdDisplay(value: string): number {
  const match = value.trim().match(/^\$([\d,.]+)([MB])$/i)
  if (match == null) {
    const fallback = Number.parseFloat(value.replace(/[^\d.-]/g, ""))
    return Number.isFinite(fallback) ? fallback : 0
  }

  const magnitude = Number.parseFloat(match[1].replace(/,/g, ""))
  if (!Number.isFinite(magnitude)) return 0
  return match[2].toUpperCase() === "B" ? magnitude * 1_000_000_000 : magnitude * 1_000_000
}

function deltaClassName(delta: number, direction: "normal" | "inverse" = "normal") {
  if (Math.abs(delta) < 1e-6) {
    return "text-muted-foreground tabular-nums"
  }
  const positiveIsGood = direction === "normal"
  const isPositive = delta > 0
  const isGood = positiveIsGood ? isPositive : !isPositive
  return isGood
    ? "tabular-nums text-emerald-700 dark:text-emerald-500"
    : "tabular-nums text-rose-700 dark:text-rose-500"
}

function ScenarioAssetMetricCell({
  assetId,
  baseDisplay,
  metricKey,
}: {
  assetId: string
  baseDisplay: string
  metricKey: ModificationSelectionMetricKey
}) {
  const { selections } = useScenarioModificationSelections()
  const selectedSetId = selections[assetId] ?? ""
  const delta = modificationSetMetricDelta(assetId, selectedSetId, metricKey)

  return (
    <span className="flex min-w-0 flex-col items-start gap-0.5">
      <span className="truncate">{baseDisplay}</span>
      {delta != null ? (
        <span
          className={cn(
            "truncate text-[11px] leading-tight",
            deltaClassName(delta.value, metricKey === "opex" ? "inverse" : "normal")
          )}
        >
          {delta.text}
        </span>
      ) : null}
    </span>
  )
}

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
        <SortableHeader column={column} sourceLabel={ASSET_METADATA_SOURCE_LABEL}>
          Asset
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="flex min-w-0 items-start gap-2 text-left">
          <PortfolioAssetIdentity
            assetId={row.original.id}
            building={row.original.building}
            location={row.original.location}
            metadataItems={buildPortfolioAssetMetadataItems({
              sector: row.original.typeLabel,
              assetClass: row.original.classLabel,
              rsf: row.original.rsf,
            })}
          />
        </div>
      ),
    },
    {
      accessorKey: "occPct",
      enableHiding: true,
      meta: { columnLabel: "Occ%" },
      header: ({ column }) => (
        <SortableHeader column={column} sourceLabel={OCCUPANCY_SOURCE_LABEL}>
          Occ%
        </SortableHeader>
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
      accessorKey: "wale",
      enableHiding: true,
      meta: { columnLabel: "WALT" },
      header: ({ column }) => (
        <SortableHeader column={column} sourceLabel={WALT_SOURCE_LABEL}>
          WALT
        </SortableHeader>
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
          {variant === "scenarios" ? (
            <ScenarioAssetMetricCell
              assetId={row.original.id}
              baseDisplay={row.original.pricePerSf}
              metricKey="pricePerSf"
            />
          ) : (
            row.original.pricePerSf
          )}
        </div>
      ),
    },
    {
      accessorKey: "revenue",
      enableHiding: true,
      meta: { columnLabel: "Revenue" },
      header: ({ column }) => (
        <SortableHeader column={column} sourceLabel={REVENUE_SOURCE_LABEL}>
          Revenue
        </SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        parseCompactUsdDisplay(String(rowA.getValue(id))) -
        parseCompactUsdDisplay(String(rowB.getValue(id))),
      cell: ({ row }) => (
        <div className="min-w-0 truncate text-left text-sm tabular-nums">
          {variant === "scenarios" ? (
            <ScenarioAssetMetricCell
              assetId={row.original.id}
              baseDisplay={row.original.revenue}
              metricKey="revenue"
            />
          ) : (
            row.original.revenue
          )}
        </div>
      ),
    },
    {
      accessorKey: "opex",
      enableHiding: true,
      meta: { columnLabel: "OpEx" },
      header: ({ column }) => (
        <SortableHeader column={column} sourceLabel={OPEX_SOURCE_LABEL}>
          OpEx
        </SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        parseCompactUsdDisplay(String(rowA.getValue(id))) -
        parseCompactUsdDisplay(String(rowB.getValue(id))),
      cell: ({ row }) => (
        <div className="min-w-0 truncate text-left text-sm tabular-nums">
          {variant === "scenarios" ? (
            <ScenarioAssetMetricCell
              assetId={row.original.id}
              baseDisplay={row.original.opex}
              metricKey="opex"
            />
          ) : (
            row.original.opex
          )}
        </div>
      ),
    },
    {
      accessorKey: "noi",
      enableHiding: true,
      meta: { columnLabel: "NOI" },
      header: ({ column }) => (
        <SortableHeader column={column} sourceLabel={NOI_SOURCE_LABEL}>
          NOI
        </SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        parseCompactUsdDisplay(String(rowA.getValue(id))) -
        parseCompactUsdDisplay(String(rowB.getValue(id))),
      cell: ({ row }) => (
        <div className="text-left text-sm tabular-nums">
          {variant === "scenarios" ? (
            <ScenarioAssetMetricCell
              assetId={row.original.id}
              baseDisplay={row.original.noi}
              metricKey="noi"
            />
          ) : (
            row.original.noi
          )}
        </div>
      ),
    },
    {
      accessorKey: "value",
      enableHiding: true,
      meta: { columnLabel: "Asset Value" },
      header: ({ column }) => (
        <SortableHeader column={column} sourceLabel={VALUE_SOURCE_LABEL}>
          Asset Value
        </SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        parseCompactUsdDisplay(String(rowA.getValue(id))) -
        parseCompactUsdDisplay(String(rowB.getValue(id))),
      cell: ({ row }) => (
        <div className="min-w-0 truncate text-left text-sm tabular-nums">
          {variant === "scenarios" ? (
            <ScenarioAssetMetricCell
              assetId={row.original.id}
              baseDisplay={row.original.value}
              metricKey="value"
            />
          ) : (
            row.original.value
          )}
        </div>
      ),
    },
    {
      accessorKey: "capRate",
      enableHiding: true,
      meta: { columnLabel: "Cap Rate" },
      header: ({ column }) => (
        <SortableHeader column={column} sourceLabel={CAP_RATE_SOURCE_LABEL}>
          Cap Rate
        </SortableHeader>
      ),
      sortingFn: (rowA, rowB, id) =>
        Number.parseFloat(String(rowA.getValue(id))) -
        Number.parseFloat(String(rowB.getValue(id))),
      cell: ({ row }) => (
        <div className="text-left text-sm tabular-nums">
          {variant === "scenarios" ? (
            <ScenarioAssetMetricCell
              assetId={row.original.id}
              baseDisplay={row.original.capRate}
              metricKey="capRate"
            />
          ) : (
            row.original.capRate
          )}
        </div>
      ),
    },
  ]

  if (variant === "portfolio" && showScopeColumn) {
    columns.splice(2, 0, {
      id: "scope",
      accessorFn: (row) => row.groupId,
      enableHiding: true,
      meta: { columnLabel: "Portfolio group" },
      header: () => <div className="font-medium">Portfolio group</div>,
      cell: ({ row }) => (
        <AssetScopeSelect
          assetId={row.original.id}
          building={row.original.building}
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
    columns.push({
      id: "portfolioRemove",
      enableHiding: false,
      enableSorting: false,
      meta: { columnLabel: "Remove from portfolio" },
      header: () => <span className="sr-only">Remove from portfolio</span>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <PortfolioRemoveAssetButton
            assetId={row.original.id}
            building={row.original.building}
          />
        </div>
      ),
    })
  } else {
    // Scenario overview: Asset column shows address in subtitle — keep Modifications next.
    columns.splice(2, 0, {
      id: "modifications",
      enableHiding: false,
      meta: { columnLabel: "Modifications" },
      header: () => (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <Wrench className="size-3.5 shrink-0 opacity-80" aria-hidden />
          Modifications
        </span>
      ),
      cell: ({ row }) => (
        <AssetModificationSetSelect
          assetId={row.original.id}
          building={row.original.building}
          matchOutlookRowSelect
        />
      ),
      enableSorting: false,
    })
    columns.splice(3, 0, {
      id: "outlook",
      enableHiding: false,
      meta: { columnLabel: "Outlook" },
      header: () => (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <Sun className="size-3.5 shrink-0 opacity-80" aria-hidden />
          Outlook
        </span>
      ),
      cell: ({ row }) => (
        <AssetOutlookSetSelect
          assetId={row.original.id}
          building={row.original.building}
        />
      ),
      enableSorting: false,
    })
    columns.splice(4, 0, {
      id: "assetListingKind",
      accessorFn: (row) =>
        isMarketListingRowId(row.id) ? "Listing" : "Asset",
      sortingFn: (rowA, rowB) => {
        const a = isMarketListingRowId(rowA.original.id) ? 1 : 0
        const b = isMarketListingRowId(rowB.original.id) ? 1 : 0
        return a - b
      },
      enableHiding: false,
      meta: { columnLabel: "Status" },
      header: ({ column }) => (
        <SortableHeader column={column}>Status</SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="flex justify-start">
          <PortfolioRowStatusBadge rowId={row.original.id} />
        </div>
      ),
    })
    columns.push({
      id: "scenarioRemove",
      enableHiding: false,
      enableSorting: false,
      meta: { columnLabel: "Remove from scenario" },
      header: () => (
        <span className="sr-only">Remove from scenario</span>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ScenarioRemoveAssetButton
            assetId={row.original.id}
            building={row.original.building}
          />
        </div>
      ),
    })
  }

  return columns
}
