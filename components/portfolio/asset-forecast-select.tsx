"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export const FORECAST_SELECT_DEFAULT = "baseline" as const

const FORECAST_ITEMS: Record<string, React.ReactNode> = {
  baseline: "Baseline",
  conservative: "Conservative",
  upside: "Upside",
}

export function AssetForecastSelect({
  building,
  className,
}: {
  building: string
  className?: string
}) {
  const [value, setValue] = React.useState<string>(FORECAST_SELECT_DEFAULT)

  return (
    <span
      className="block min-w-0 w-full max-w-full"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Select
        items={FORECAST_ITEMS}
        value={value}
        onValueChange={(v) => {
          if (v != null) setValue(v)
        }}
      >
        <SelectTrigger
          className={cn(
            "h-8 w-full max-w-full min-w-0 text-left text-sm",
            className
          )}
          aria-label={`Forecast for ${building}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="baseline">Baseline</SelectItem>
          <SelectItem value="conservative">Conservative</SelectItem>
          <SelectItem value="upside">Upside</SelectItem>
        </SelectContent>
      </Select>
    </span>
  )
}
