"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import { Check, ChevronDown, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TableBody, TableCell, TableRow } from "@/components/ui/table"
import {
  compareGridTemplateColumns,
  COMPARE_ROW_LABEL_COL_PX,
  formatCompareMetricDelta,
  KPI_TABLE_ROWS,
  MAX_COMPARE_COLUMNS,
  MIN_COMPARE_COLUMNS,
  numericForMetricKey,
  type CompareColumn,
  type ComparePickerOption,
  type HeaderKpiMetrics,
} from "@/lib/portfolio-compare-model"
import { cn } from "@/lib/utils"

export type CompareTableRow =
  | { id: "header-select"; kind: "header-select" }
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
  pickerOptionsGrouped: { group: string; items: ComparePickerOption[] }[]
  optionLabelByValue: Map<string, string>
  baseColumns: CompareColumn[]
  onAddColumn: () => void
  onRemoveColumn: (index: number) => void
}

const COMPARE_ROWS: CompareTableRow[] = [
  { id: "header-select", kind: "header-select" },
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

function groupPickerOptions(
  options: ComparePickerOption[]
): { group: string; items: ComparePickerOption[] }[] {
  const order: string[] = []
  const map = new Map<string, ComparePickerOption[]>()
  for (const o of options) {
    if (!map.has(o.group)) {
      order.push(o.group)
      map.set(o.group, [])
    }
    map.get(o.group)!.push(o)
  }
  return order.map((group) => ({ group, items: map.get(group)! }))
}

function CompareSlotPicker({
  value,
  triggerLabel,
  groupedOptions,
  onSelect,
  ariaLabel,
}: {
  value: string
  triggerLabel: string
  groupedOptions: { group: string; items: ComparePickerOption[] }[]
  onSelect: (v: string) => void
  ariaLabel: string
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-w-0 flex-1 justify-between gap-1 font-normal"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="truncate text-left">{triggerLabel}</span>
        <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="gap-0 overflow-hidden p-0 sm:max-w-lg"
          showCloseButton
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Compare source</DialogTitle>
          </DialogHeader>
          <Command className="rounded-none border-0 shadow-none">
            <CommandInput placeholder="Search…" />
            <CommandList>
              <CommandEmpty>No match.</CommandEmpty>
              {groupedOptions.map(({ group, items }) => (
                <CommandGroup key={group} heading={group}>
                  {items.map((opt) => (
                    <CommandItem
                      key={opt.value}
                      value={`${opt.label} ${opt.keywords ?? ""} ${opt.value}`}
                      onSelect={() => {
                        onSelect(opt.value)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "size-4 shrink-0",
                          value === opt.value ? "opacity-100" : "opacity-0"
                        )}
                        aria-hidden
                      />
                      <span className="truncate">{opt.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}

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
          const triggerLabel =
            meta.optionLabelByValue.get(key) ?? "Select source"
          return (
            <div className="flex min-w-0 items-center gap-1">
              <CompareSlotPicker
                value={key}
                triggerLabel={triggerLabel}
                groupedOptions={meta.pickerOptionsGrouped}
                onSelect={(v) => meta.setSlot(slotIndex, v)}
                ariaLabel="Compare column source"
              />
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

        const baseCol = meta.baseColumns[slotIndex]!
        const refCol = meta.baseColumns[0]!

        const absolute = r.get(baseCol.metrics)
        const deltaNumeric =
          slotIndex > 0
            ? numericForMetricKey(baseCol.numeric, r.metricKey) -
              numericForMetricKey(refCol.numeric, r.metricKey)
            : null
        const deltaStr =
          deltaNumeric != null
            ? formatCompareMetricDelta(r.metricKey, deltaNumeric)
            : null
        const showDeltaAfter = deltaStr != null && deltaStr !== "—"

        const deltaEps = 1e-6
        const deltaClass =
          deltaNumeric == null || Math.abs(deltaNumeric) < deltaEps
            ? "text-muted-foreground tabular-nums"
            : deltaNumeric > 0
              ? "tabular-nums text-emerald-700 dark:text-emerald-500"
              : "tabular-nums text-rose-700 dark:text-rose-500"

        return (
          <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-1">
            <span>{absolute}</span>
            {showDeltaAfter ? (
              <span className={deltaClass}>{deltaStr}</span>
            ) : null}
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
  pickerOptions,
  baseColumns,
  onAddColumn,
  onRemoveColumn,
}: {
  slotKeys: string[]
  setSlot: (index: number, value: string) => void
  pickerOptions: ComparePickerOption[]
  baseColumns: CompareColumn[]
  onAddColumn: () => void
  onRemoveColumn: (index: number) => void
}) {
  const slotCount = slotKeys.length

  const pickerOptionsGrouped = React.useMemo(
    () => groupPickerOptions(pickerOptions),
    [pickerOptions]
  )

  const optionLabelByValue = React.useMemo(() => {
    const m = new Map<string, string>()
    for (const o of pickerOptions) {
      m.set(o.value, o.label)
    }
    return m
  }, [pickerOptions])

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
      pickerOptionsGrouped,
      optionLabelByValue,
      baseColumns,
      onAddColumn,
      onRemoveColumn,
    }),
    [
      slotKeys,
      setSlot,
      pickerOptionsGrouped,
      optionLabelByValue,
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
            const isHeaderRow = kind === "header-select"
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
