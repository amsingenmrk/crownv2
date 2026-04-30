"use client"

import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"

import { cn } from "@/lib/utils"

function ToggleGroup({
  className,
  ...props
}: ToggleGroupPrimitive.Props) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn(
        "inline-flex h-8 shrink-0 items-center rounded-lg border border-border bg-muted/40 p-0.5 shadow-xs",
        className
      )}
      {...props}
    />
  )
}

function ToggleGroupItem({
  className,
  ...props
}: TogglePrimitive.Props) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex h-[calc(100%-2px)] min-w-[4.5rem] items-center justify-center rounded-[min(var(--radius-md),10px)] px-3 text-xs font-medium text-muted-foreground outline-none transition-colors select-none hover:text-foreground focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-pressed:bg-background data-pressed:text-foreground data-pressed:shadow-sm",
        className
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
