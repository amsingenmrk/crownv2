"use client"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  VALUATION_CONDITION_OPTIONS,
  isValuationConditionId,
  type ValuationConditionId,
} from "@/lib/valuation-condition-config"
import { cn } from "@/lib/utils"

export function ValuationConditionToggle({
  value,
  onValueChange,
  className,
  label = "Valuation Condition",
  ariaLabel = "Select valuation condition for KPI strip",
}: {
  value: ValuationConditionId
  onValueChange: (next: ValuationConditionId) => void
  className?: string
  label?: string
  ariaLabel?: string
}) {
  return (
    <TooltipProvider delay={120}>
      <div className={cn("min-w-0 space-y-2", className)}>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <ToggleGroup
            value={[value]}
            onValueChange={(values) => {
              const next = values[0]
              if (typeof next === "string" && isValuationConditionId(next)) {
                onValueChange(next)
              }
            }}
            aria-label={ariaLabel}
            className="w-max"
          >
            {VALUATION_CONDITION_OPTIONS.map((option) => (
              <div key={option.id} className="relative flex items-center">
                <ToggleGroupItem
                  value={option.id}
                  className="min-w-fit whitespace-nowrap pl-2.5 pr-8 sm:pl-3 sm:pr-9"
                  aria-label={`Select ${option.label} valuation condition`}
                >
                  {option.label}
                </ToggleGroupItem>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        className={cn(
                          "absolute right-1 top-1/2 z-10 inline-flex size-4 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-semibold leading-none text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:right-1.5",
                          option.id === value && "text-foreground/80"
                        )}
                        aria-label={`Explain ${option.label} valuation condition`}
                      />
                    }
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    ?
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[260px] text-pretty">
                    {option.description}
                  </TooltipContent>
                </Tooltip>
              </div>
            ))}
          </ToggleGroup>
        </div>
      </div>
    </TooltipProvider>
  )
}
