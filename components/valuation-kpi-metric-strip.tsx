"use client"

import { Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  VALUATION_CONDITION_OPTIONS,
} from "@/lib/valuation-condition-config"
import type {
  ValuationKpiStripCellCompare,
  ValuationKpiStripConditionCell,
  ValuationKpiStripRowModel,
} from "@/lib/valuation-kpi-strip-model"
import { cn } from "@/lib/utils"

function deltaToneClass(direction: ValuationKpiStripCellCompare["deltaDirection"] | undefined) {
  if (direction === "up") {
    return "text-emerald-700 dark:text-emerald-300"
  }
  if (direction === "down") {
    return "text-rose-700 dark:text-rose-300"
  }
  return "text-muted-foreground"
}

function ConditionHeader({
  label,
  tooltip,
}: {
  label: string
  tooltip: string
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="truncate text-sm font-medium leading-tight text-foreground">
        {label}
      </span>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label={`Info: ${label}`}
            />
          }
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Info className="size-3 stroke-[1.5]" aria-hidden />
        </TooltipTrigger>
        <TooltipContent className="max-w-[320px] text-pretty">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

function ConditionValueCell({ cell }: { cell: ValuationKpiStripConditionCell }) {
  const showDelta = cell.compare?.deltaLine != null && cell.compare.deltaLine !== ""
  const showPct = cell.compare?.pctLine != null && cell.compare.pctLine !== ""
  const deltaClassName = deltaToneClass(cell.compare?.deltaDirection)

  return (
    <div className="min-w-0 space-y-0.5">
      <div className="text-sm font-semibold leading-tight tracking-tight tabular-nums text-foreground">
        {cell.value}
      </div>
      {showDelta ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] leading-tight tabular-nums",
            deltaClassName
          )}
        >
          <span className="font-semibold">
            {cell.compare?.deltaLine}
          </span>
          {showPct ? (
            <span className="opacity-80">
              {cell.compare?.pctLine}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function ValuationKpiMetricStrip({
  ariaLabel,
  rows,
  className,
}: {
  ariaLabel: string
  rows: readonly ValuationKpiStripRowModel[]
  className?: string
}) {
  const tableMinWidthRem = 11.5 + VALUATION_CONDITION_OPTIONS.length * 9.25
  const cellBorderClass = "border-border/50"

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        className
      )}
      aria-label={ariaLabel}
    >
      <div className="overflow-x-auto">
        <table
          className="w-full table-fixed border-separate border-spacing-0"
          style={{ minWidth: `${tableMinWidthRem}rem` }}
        >
          <colgroup>
            <col className="w-[11.5rem]" />
            {VALUATION_CONDITION_OPTIONS.map((option) => (
              <col key={option.id} className="w-[9.25rem]" />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                scope="col"
                aria-label="Metric"
                className={cn(
                  "bg-muted/[0.22] px-2.5 py-2 text-left align-middle border-b",
                  cellBorderClass
                )}
              />
              {VALUATION_CONDITION_OPTIONS.map((option) => (
                <th
                  key={option.id}
                  scope="col"
                  className={cn(
                    "bg-muted/[0.22] px-2.5 py-2 text-left align-middle border-b border-l",
                    cellBorderClass
                  )}
                >
                  <ConditionHeader
                    label={option.label}
                    tooltip={option.description}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isLastRow = index === rows.length - 1
              const bottomBorderClass = isLastRow ? "" : "border-b"

              return (
              <tr key={row.label}>
                <th
                  scope="row"
                  className={cn(
                    "bg-muted/[0.08] px-2.5 py-2 text-left align-middle",
                    bottomBorderClass,
                    cellBorderClass
                  )}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="text-sm font-semibold leading-tight text-foreground">
                      {row.label}
                    </div>
                    {row.rowSuffix != null && row.rowSuffix !== "" ? (
                      <div className="inline-flex items-center rounded-full bg-muted/70 px-1.5 py-px text-[10px] font-medium leading-none text-muted-foreground ring-1 ring-border/60">
                        {row.rowSuffix}
                      </div>
                    ) : null}
                  </div>
                </th>
                {VALUATION_CONDITION_OPTIONS.map((option) => (
                  <td
                    key={option.id}
                    className={cn(
                      "bg-card px-2.5 py-2 align-middle border-l",
                      bottomBorderClass,
                      cellBorderClass
                    )}
                  >
                    <ConditionValueCell cell={row.conditionValues[option.id]} />
                  </td>
                ))}
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </section>
  )
}
