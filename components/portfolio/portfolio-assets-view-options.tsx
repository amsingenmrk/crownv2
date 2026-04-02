"use client"

import * as React from "react"
import type { Column, Table } from "@tanstack/react-table"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import { cn } from "@/lib/utils"

function columnMenuLabel(column: Column<PortfolioAssetRow, unknown>): string {
  const meta = column.columnDef.meta as { columnLabel?: string } | undefined
  return meta?.columnLabel ?? column.id
}

/** Column visibility: pill “Columns” trigger and checkbox menu (shadcn Data Table pattern). */
export function PortfolioAssetsViewOptions({
  table,
  className,
}: {
  table: Table<PortfolioAssetRow>
  className?: string
}) {
  const hideable = table
    .getAllColumns()
    .filter(
      (column) =>
        typeof column.accessorFn !== "undefined" && column.getCanHide()
    )

  return (
    <div className={cn("shrink-0", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-full border-border bg-muted/50 px-4 font-medium text-foreground shadow-sm hover:bg-muted dark:bg-muted/30"
              aria-label="Choose which columns to show"
            />
          }
        >
          Columns
          <ChevronDown className="size-4 opacity-60" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          <DropdownMenuLabel className="font-normal text-muted-foreground">
            Toggle columns
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {hideable.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              className="normal-case"
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {columnMenuLabel(column)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
