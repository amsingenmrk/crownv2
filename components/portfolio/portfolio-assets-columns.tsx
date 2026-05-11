"use client"

import { type ReactNode, useState } from "react"
import type { Column, ColumnDef, Table } from "@tanstack/react-table"
import Link from "next/link"
import { ArrowDown, ArrowUp, Sun, Trash2, Wrench } from "lucide-react"
import {
  parseStoredSets,
  storageKeyForAsset,
} from "@/lib/building-modification-sets-storage"
import { PortfolioProvenanceIndicator } from "@/components/portfolio/portfolio-provenance-indicator"
import { PortfolioRowStatusBadge } from "@/components/portfolio/portfolio-row-status-badge"
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
import { AssetOutlookSetSelect } from "@/components/portfolio/asset-outlook-set-select"
import { AssetScopeSelect } from "@/components/portfolio/asset-scope-select"
import { assetHref } from "@/lib/assets"
import { isMarketListingRowId } from "@/lib/market-listing-portfolio-row"
import { buildRecommendedModificationHref } from "@/lib/modification-recommendations"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import {
  liftPillClassFromStrength,
  normalizedLiftStrength,
} from "@/lib/portfolio-lift"
import { upliftFromModValues } from "@/lib/scenario-modification-uplift"
import {
  formatCapRatePts,
  formatUsdDeltaCompact,
} from "@/lib/scenario-kpi-format"
import { cn } from "@/lib/utils"
import { useScenarioModificationSelections } from "@/components/scenario-modification-selections-context"

export type PortfolioAssetsTableVariant = "portfolio" | "scenarios"

type PortfolioAssetColumnOptions = {
  showScopeColumn?: boolean
}

const CLASS_SOURCE_LABEL =
  "Modeled building class estimate for the demo portfolio table."

const PRICING_SOURCE_LABEL =
  "Modeled pricing estimate. This is not presented as raw client-reported pricing."

const VALUE_SOURCE_LABEL =
  "Modeled asset value estimate derived from the portfolio financial model."

const POTENTIAL_LIFT_SOURCE_LABEL =
  "Derived from the highest-lift single recommended modification for this asset."

type ScenarioDeltaMetricKey = "pricePerSf" | "noi" | "value" | "capRate"

function formatUsdPerSfDelta(delta: number): string {
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : ""
  return `${sign}$${Math.abs(delta).toFixed(1)} / SF`
}

function deltaClassName(delta: number) {
  if (Math.abs(delta) < 1e-6) {
    return "text-muted-foreground tabular-nums"
  }
  return delta > 0
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
  metricKey: ScenarioDeltaMetricKey
}) {
  const { selections } = useScenarioModificationSelections()
  const selectedSetId = selections[assetId] ?? ""

  const delta = (() => {
    if (selectedSetId === "" || typeof window === "undefined") {
      return null
    }

    const financials = financialMetricsForAssetId(assetId)
    if (financials == null) return null

    const selectedSet = parseStoredSets(localStorage.getItem(storageKeyForAsset(assetId))).find(
      (set) => set.id === selectedSetId
    )
    if (selectedSet == null) return null

    const uplift = upliftFromModValues(selectedSet.values)
    const modifiedValueUsd = financials.valueUsd * uplift.valueMult
    const modifiedNoiUsd = financials.noiUsd * uplift.noiMult
    const modifiedPricePerSf = financials.pricePerSfN * uplift.valueMult
    const modifiedCapRatePct =
      modifiedValueUsd > 0 ? (modifiedNoiUsd / modifiedValueUsd) * 100 : 0

    switch (metricKey) {
      case "pricePerSf":
        return {
          value: modifiedPricePerSf - financials.pricePerSfN,
          text: formatUsdPerSfDelta(modifiedPricePerSf - financials.pricePerSfN),
        }
      case "noi":
        return {
          value: modifiedNoiUsd - financials.noiUsd,
          text: formatUsdDeltaCompact(modifiedNoiUsd - financials.noiUsd),
        }
      case "value":
        return {
          value: modifiedValueUsd - financials.valueUsd,
          text: formatUsdDeltaCompact(modifiedValueUsd - financials.valueUsd),
        }
      case "capRate":
        return {
          value: modifiedCapRatePct - financials.capRatePct,
          text: formatCapRatePts(modifiedCapRatePct - financials.capRatePct),
        }
    }
  })()

  return (
    <span className="flex min-w-0 flex-col items-start gap-0.5">
      <span className="truncate">{baseDisplay}</span>
      {delta != null ? (
        <span className={cn("truncate text-[11px] leading-tight", deltaClassName(delta.value))}>
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
      meta: { columnLabel: "Cap" },
      header: ({ column }) => (
        <SortableHeader column={column}>Cap</SortableHeader>
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
          groupId={row.original.groupId}
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
