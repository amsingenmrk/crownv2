"use client"

import * as React from "react"
import { Check, Pencil, RotateCcw } from "lucide-react"

import {
  BenchmarkHeaderMapLink,
  BenchmarkHeaderMapPreview,
} from "@/components/benchmark-header-map-link"
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
import { TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table"
import {
  BENCHMARK_KPI_DEFINITIONS,
  type BenchmarkBuildingTableRow,
  type BenchmarkKpiDefinition,
  type BenchmarkKpiKey,
} from "@/lib/benchmark-area-model"
import type { BenchmarkArea } from "@/lib/benchmark-area-search"
import { benchmarksPageHref } from "@/lib/benchmark-area-url"
import { COMPARE_ROW_LABEL_COL_PX } from "@/lib/portfolio-compare-model"
import { qualityScoreValueClass } from "@/lib/stacking-plan-visual-tokens"
import { cn } from "@/lib/utils"

const VALUE_COL_MIN_PX = 140
const HEADER_MAP_PLACEHOLDER_CLASS =
  "h-[12.75rem] w-full rounded-md border border-border/80 bg-muted/25"

export type AssetBenchmarkOption = {
  id: string
  label: string
}

const gridRowStyle = {
  gridColumn: "1 / -1",
  gridTemplateColumns: "subgrid",
  columnGap: "0.75rem",
} as const

function scoreCellClass(
  definition: BenchmarkKpiDefinition,
  value: string
): string | undefined {
  if (definition.format !== "score" || value === "—") return undefined
  const n = Number(value)
  if (!Number.isFinite(n)) return undefined
  return qualityScoreValueClass(n)
}

function BenchmarkColumnSelect({
  value,
  options,
  onValueChange,
  ariaLabel,
}: {
  value: string
  options: AssetBenchmarkOption[]
  onValueChange: (value: string) => void
  ariaLabel: string
}) {
  const [open, setOpen] = React.useState(false)
  const selectedLabel =
    options.find((option) => option.id === value)?.label ?? "Select benchmark"

  return (
    <>
      <div className="flex h-7 min-w-0 items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
          {selectedLabel}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-foreground"
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Pencil className="size-3.5" aria-hidden />
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="gap-0 overflow-hidden p-0 sm:max-w-lg"
          showCloseButton
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Select benchmark</DialogTitle>
          </DialogHeader>
          <Command className="rounded-none border-0 shadow-none">
            <CommandInput placeholder="Search benchmark…" />
            <CommandList>
              <CommandEmpty>No benchmark found.</CommandEmpty>
              <CommandGroup heading="Benchmarks">
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={`${option.label} ${option.id}`}
                    onSelect={() => {
                      onValueChange(option.id)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "size-4 shrink-0",
                        value === option.id ? "opacity-100" : "opacity-0"
                      )}
                      aria-hidden
                    />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}

function HeaderTitleRow({ children }: { children: React.ReactNode }) {
  return <div className="flex h-7 min-w-0 items-center">{children}</div>
}

function HeaderColumnFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_1.75rem] gap-1.5">
      {children}
    </div>
  )
}

export function AssetBenchmarksTable({
  assetRow,
  assetName,
  assetPin,
  homeArea,
  zipArea,
  zipLabel,
  zipKpis,
  regionLabel,
  regionKpis,
  benchmarkOptions,
  onZipBenchmarkChange,
  onRegionBenchmarkChange,
  showReset = false,
  onReset,
  className,
}: {
  assetRow: BenchmarkBuildingTableRow | null
  assetName: string
  assetPin: { longitude: number; latitude: number } | null
  homeArea: BenchmarkArea
  zipArea: BenchmarkArea | null
  zipLabel: string
  zipKpis: Record<BenchmarkKpiKey, string>
  regionLabel: string
  regionKpis: Record<BenchmarkKpiKey, string>
  benchmarkOptions: AssetBenchmarkOption[]
  onZipBenchmarkChange: (areaId: string) => void
  onRegionBenchmarkChange: (areaId: string) => void
  showReset?: boolean
  onReset?: () => void
  className?: string
}) {
  const gridTemplateColumns = `${COMPARE_ROW_LABEL_COL_PX}px minmax(${VALUE_COL_MIN_PX}px, 1fr) minmax(${VALUE_COL_MIN_PX}px, 1fr) minmax(${VALUE_COL_MIN_PX}px, 1fr)`
  const tableMinWidth = COMPARE_ROW_LABEL_COL_PX + VALUE_COL_MIN_PX * 3

  return (
    <div className={cn("min-w-0", className)}>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table
          className="grid w-full px-0 caption-bottom text-sm"
          style={{
            gridTemplateColumns,
            minWidth: Math.max(tableMinWidth, 360),
          }}
        >
          <TableBody className="contents [&_tr:last-child]:border-b-0">
            <TableRow
              className="grid items-start border-b border-border bg-muted/50 hover:bg-muted/50"
              style={gridRowStyle}
            >
              <TableHead className="h-auto self-stretch border-0 px-2 py-2 text-left font-medium text-foreground">
                {showReset ? (
                  <div className="flex h-full items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onReset}
                    >
                      <RotateCcw className="size-3.5" aria-hidden />
                      Reset
                    </Button>
                  </div>
                ) : null}
              </TableHead>
              <TableHead className="flex h-auto min-w-0 flex-col border-0 px-2 py-2 text-left font-normal">
                <HeaderColumnFrame>
                  {assetPin ? (
                    <BenchmarkHeaderMapPreview
                      label={assetName}
                      pin={assetPin}
                      showLabel={false}
                    />
                  ) : (
                    <div className={HEADER_MAP_PLACEHOLDER_CLASS} />
                  )}
                  <HeaderTitleRow>
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                      {assetName}
                    </span>
                  </HeaderTitleRow>
                </HeaderColumnFrame>
              </TableHead>
              <TableHead className="flex h-auto min-w-0 flex-col border-0 px-2 py-2 text-left font-normal">
                <HeaderColumnFrame>
                  {zipArea ? (
                    <BenchmarkHeaderMapLink
                      href={benchmarksPageHref(zipArea.id)}
                      label={zipLabel}
                      area={zipArea}
                      pin={assetPin ?? undefined}
                      showLabel={false}
                    />
                  ) : (
                    <div className={HEADER_MAP_PLACEHOLDER_CLASS} />
                  )}
                  <BenchmarkColumnSelect
                    value={zipArea?.id ?? ""}
                    options={benchmarkOptions}
                    onValueChange={onZipBenchmarkChange}
                    ariaLabel="Select second benchmark column"
                  />
                </HeaderColumnFrame>
              </TableHead>
              <TableHead className="flex h-auto min-w-0 flex-col border-0 px-2 py-2 text-left font-normal">
                <HeaderColumnFrame>
                  <BenchmarkHeaderMapLink
                    href={benchmarksPageHref(homeArea.id)}
                    label={regionLabel}
                    area={homeArea}
                    pin={assetPin ?? undefined}
                    showLabel={false}
                  />
                  <BenchmarkColumnSelect
                    value={homeArea.id}
                    options={benchmarkOptions}
                    onValueChange={onRegionBenchmarkChange}
                    ariaLabel="Select third benchmark column"
                  />
                </HeaderColumnFrame>
              </TableHead>
            </TableRow>

            {assetRow == null ? (
              <TableRow
                className="grid items-center border-b border-border hover:bg-muted/50"
                style={gridRowStyle}
              >
                <TableCell
                  style={{ gridColumn: "1 / -1" }}
                  className="border-0 px-2 py-6 text-center text-sm text-muted-foreground"
                >
                  Benchmark data is not available for this asset.
                </TableCell>
              </TableRow>
            ) : (
              BENCHMARK_KPI_DEFINITIONS.map((definition) => {
                const assetValue = assetRow.kpis[definition.key]
                const zipValue = zipKpis[definition.key] ?? "—"
                const regionValue = regionKpis[definition.key] ?? "—"
                const assetValueClass = scoreCellClass(definition, assetValue)
                const zipValueClass = scoreCellClass(definition, zipValue)
                const regionValueClass = scoreCellClass(definition, regionValue)

                return (
                  <TableRow
                    key={definition.key}
                    className="grid items-center border-b border-border hover:bg-muted/50"
                    style={gridRowStyle}
                  >
                    <TableCell className="min-w-0 border-0 px-2 py-2 text-left align-middle font-medium">
                      {definition.label}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "min-w-0 border-0 px-2 py-2 text-left align-middle text-sm tabular-nums",
                        assetValueClass ?? "text-foreground"
                      )}
                    >
                      {assetValue}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "min-w-0 border-0 px-2 py-2 text-left align-middle text-sm tabular-nums",
                        zipValueClass ?? "text-foreground"
                      )}
                    >
                      {zipValue}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "min-w-0 border-0 px-2 py-2 text-left align-middle text-sm tabular-nums",
                        regionValueClass ?? "text-foreground"
                      )}
                    >
                      {regionValue}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </table>
      </div>
    </div>
  )
}
