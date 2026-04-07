"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TableBody, TableCell, TableRow } from "@/components/ui/table"
import {
  compareGridTemplateColumns,
  COMPARE_ROW_LABEL_COL_PX,
  KPI_TABLE_ROWS,
  MAX_COMPARE_COLUMNS,
  METRIC_KEYS_AFFECTED_BY_MODS,
  MIN_COMPARE_COLUMNS,
  PORTFOLIO_KPIS_BASELINE,
  type CompareColumn,
  type HeaderKpiMetrics,
} from "@/lib/portfolio-compare-model"
import { cn } from "@/lib/utils"

export type CompareTableRow =
  | { id: "header-select"; kind: "header-select" }
  | { id: "header-mods"; kind: "header-mods" }
  | {
      id: string
      kind: "metric"
      label: string
      metricKey: keyof HeaderKpiMetrics
      get: (m: HeaderKpiMetrics) => string
    }

export type PortfolioCompareTableMeta = {
  slotKeys: string[]
  setSlot: (index: number, value: string) => void
  options: { value: string; label: string }[]
  modificationsOn: boolean[]
  setModificationsOnAt: (index: number, on: boolean) => void
  baseColumns: CompareColumn[]
  onAddColumn: () => void
  onRemoveColumn: (index: number) => void
}

const COMPARE_ROWS: CompareTableRow[] = [
  { id: "header-select", kind: "header-select" },
  { id: "header-mods", kind: "header-mods" },
  ...KPI_TABLE_ROWS.map((r) => ({
    id: `metric-${r.metricKey}`,
    kind: "metric" as const,
    label: r.label,
    metricKey: r.metricKey,
    get: r.get,
  })),
]

const gridRowStyle = {
  gridColumn: "1 / -1",
  gridTemplateColumns: "subgrid",
  columnGap: "0.75rem",
} as const

function createCompareColumns(
  slotCount: number
): ColumnDef<CompareTableRow>[] {
  const labelCol: ColumnDef<CompareTableRow> = {
    id: "label",
    header: () => null,
    cell: ({ row, table }) => {
      const r = row.original
      const meta = table.options.meta as PortfolioCompareTableMeta | undefined
      if (r.kind === "header-select") {
        const canAdd = (meta?.slotKeys.length ?? 0) < MAX_COMPARE_COLUMNS
        return (
          <div className="flex items-center justify-start">
            {canAdd ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-8 shrink-0"
                onClick={() => meta?.onAddColumn()}
                aria-label="Add compare column"
              >
                <Plus className="size-4" aria-hidden />
              </Button>
            ) : null}
          </div>
        )
      }
      if (r.kind === "header-mods") {
        return <span className="font-medium">Modifications</span>
      }
      return <span className="font-medium">{r.label}</span>
    },
  }

  const slots: ColumnDef<CompareTableRow>[] = Array.from(
    { length: slotCount },
    (_, slotIndex) => ({
      id: `slot${slotIndex}`,
      header: () => null,
      cell: ({ row, table }) => {
        const meta = table.options.meta as PortfolioCompareTableMeta | undefined
        if (!meta) return null
        const r = row.original

        if (r.kind === "header-select") {
          const key = meta.slotKeys[slotIndex]!
          const canRemove = meta.slotKeys.length > MIN_COMPARE_COLUMNS
          return (
            <div className="flex min-w-0 items-center gap-1">
              <Select
                value={key}
                items={meta.options}
                onValueChange={(v) => {
                  if (v) meta.setSlot(slotIndex, v)
                }}
              >
                <SelectTrigger
                  className="min-w-0 flex-1"
                  aria-label="Compare column source"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {meta.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {canRemove ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => meta.onRemoveColumn(slotIndex)}
                  aria-label={`Remove compare column ${slotIndex + 1}`}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              ) : null}
            </div>
          )
        }

        if (r.kind === "header-mods") {
          return (
            <div className="flex items-center justify-start gap-2">
              <Checkbox
                checked={meta.modificationsOn[slotIndex] === true}
                onCheckedChange={(checked) =>
                  meta.setModificationsOnAt(slotIndex, !!checked)
                }
                aria-label={`Include modifications for column ${slotIndex + 1}`}
              />
            </div>
          )
        }

        const baseCol = meta.baseColumns[slotIndex]!
        const modsOn = meta.modificationsOn[slotIndex] === true
        const displayMetrics = modsOn ? baseCol.metrics : PORTFOLIO_KPIS_BASELINE
        const value = r.get(displayMetrics)
        const affectedByMods =
          modsOn &&
          METRIC_KEYS_AFFECTED_BY_MODS.has(r.metricKey) &&
          baseCol.metrics[r.metricKey] !== PORTFOLIO_KPIS_BASELINE[r.metricKey]

        return (
          <span
            className={cn(
              affectedByMods &&
                "font-semibold text-violet-800 dark:text-violet-200"
            )}
          >
            {value}
          </span>
        )
      },
    })
  )

  return [labelCol, ...slots]
}

export function PortfolioCompareDataTable({
  slotKeys,
  setSlot,
  options,
  modificationsOn,
  setModificationsOnAt,
  baseColumns,
  onAddColumn,
  onRemoveColumn,
}: {
  slotKeys: string[]
  setSlot: (index: number, value: string) => void
  options: { value: string; label: string }[]
  modificationsOn: boolean[]
  setModificationsOnAt: (index: number, on: boolean) => void
  baseColumns: CompareColumn[]
  onAddColumn: () => void
  onRemoveColumn: (index: number) => void
}) {
  const slotCount = slotKeys.length

  const gridTemplateColumns = React.useMemo(
    () => compareGridTemplateColumns(slotCount),
    [slotCount]
  )

  const columnDefs = React.useMemo(
    () => createCompareColumns(slotCount),
    [slotCount]
  )

  const meta = React.useMemo<PortfolioCompareTableMeta>(
    () => ({
      slotKeys,
      setSlot,
      options,
      modificationsOn,
      setModificationsOnAt,
      baseColumns,
      onAddColumn,
      onRemoveColumn,
    }),
    [
      slotKeys,
      setSlot,
      options,
      modificationsOn,
      setModificationsOnAt,
      baseColumns,
      onAddColumn,
      onRemoveColumn,
    ]
  )

  const table = useReactTable({
    data: COMPARE_ROWS,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    meta,
  })

  const rows = table.getRowModel().rows

  const tableMinWidth = COMPARE_ROW_LABEL_COL_PX + slotCount * 160

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table
        className="grid w-full px-0 caption-bottom text-sm"
        style={{
          gridTemplateColumns,
          minWidth: Math.max(tableMinWidth, 360),
        }}
      >
        <TableBody className="contents [&_tr:last-child]:border-b-0">
          {rows.map((row) => {
            const kind = row.original.kind
            const isHeaderRow =
              kind === "header-select" || kind === "header-mods"
            return (
              <TableRow
                key={row.id}
                className={cn(
                  "grid items-center border-b border-border",
                  isHeaderRow
                    ? "bg-muted/50 hover:bg-muted/50"
                    : "hover:bg-muted/50"
                )}
                style={gridRowStyle}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "min-w-0 border-0 py-2 text-left align-middle px-2",
                      row.original.kind === "metric" &&
                        "text-sm tabular-nums"
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </table>
    </div>
  )
}
