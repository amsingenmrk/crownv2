"use client"

import * as React from "react"
import type { Column, Table } from "@tanstack/react-table"
import { ChevronDown } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
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

/** Column visibility: outline “Columns” trigger and checkbox menu (shadcn Data Table pattern). */
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
          className={cn(buttonVariants({ variant: "outline" }))}
          aria-label="Choose which columns to show"
        >
          Columns
          <ChevronDown
            className="size-4 opacity-60"
            aria-hidden
            data-icon="inline-end"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="z-[100] min-w-[10rem]"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              Toggle columns
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
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
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
