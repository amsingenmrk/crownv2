"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
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
  COMPARE_SLOT_COUNT,
  compareGridTemplateColumns,
  KPI_TABLE_ROWS,
  METRIC_KEYS_AFFECTED_BY_MODS,
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

function compareColumns(): ColumnDef<CompareTableRow>[] {
  const labelCol: ColumnDef<CompareTableRow> = {
    id: "label",
    header: () => null,
    cell: ({ row, table }) => {
      const r = row.original
      if (r.kind === "header-select") {
        return null
      }
      if (r.kind === "header-mods") {
        return <span className="font-medium">Modifications</span>
      }
      return <span className="font-medium">{r.label}</span>
    },
  }

  const slots: ColumnDef<CompareTableRow>[] = Array.from(
    { length: COMPARE_SLOT_COUNT },
    (_, slotIndex) => ({
      id: `slot${slotIndex}`,
      header: () => null,
      cell: ({ row, table }) => {
        const meta = table.options.meta as PortfolioCompareTableMeta | undefined
        if (!meta) return null
        const r = row.original

        if (r.kind === "header-select") {
          const key = meta.slotKeys[slotIndex]!
          return (
            <Select
              value={key}
              items={meta.options}
              onValueChange={(v) => {
                if (v) meta.setSlot(slotIndex, v)
              }}
            >
              <SelectTrigger
                className="w-full min-w-0 max-w-full"
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

const compareColumnDefs = compareColumns()

export function PortfolioCompareDataTable({
  slotKeys,
  setSlot,
  options,
  modificationsOn,
  setModificationsOnAt,
  baseColumns,
}: {
  slotKeys: string[]
  setSlot: (index: number, value: string) => void
  options: { value: string; label: string }[]
  modificationsOn: boolean[]
  setModificationsOnAt: (index: number, on: boolean) => void
  baseColumns: CompareColumn[]
}) {
  const gridTemplateColumns = compareGridTemplateColumns()

  const meta = React.useMemo<PortfolioCompareTableMeta>(
    () => ({
      slotKeys,
      setSlot,
      options,
      modificationsOn,
      setModificationsOnAt,
      baseColumns,
    }),
    [
      slotKeys,
      setSlot,
      options,
      modificationsOn,
      setModificationsOnAt,
      baseColumns,
    ]
  )

  const table = useReactTable({
    data: COMPARE_ROWS,
    columns: compareColumnDefs,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    meta,
  })

  const rows = table.getRowModel().rows

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table
        className="grid w-full min-w-[720px] px-0 caption-bottom text-sm"
        style={{ gridTemplateColumns }}
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
