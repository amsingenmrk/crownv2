"use client"

import { CircleHelp } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function PortfolioProvenanceIndicator({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  return (
    <TooltipProvider delay={120}>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className={cn(
                "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                className
              )}
              aria-label="Explain data source"
            />
          }
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <CircleHelp className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[220px] text-pretty">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
