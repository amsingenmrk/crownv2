"use client"

import { ChevronDown } from "lucide-react"

import { AssetLeasingAssumptionsFields } from "@/components/asset-leasing-assumptions-fields"
import { useAssetLeasingAssumptions } from "@/components/asset-leasing-assumptions-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function AssetLeasingAssumptionsStat({ className }: { className?: string }) {
  const { assumptions, updateAssumptions } = useAssetLeasingAssumptions()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        nativeButton={false}
        render={
          <button
            type="button"
            className={cn(
              "flex min-h-0 shrink-0 cursor-pointer flex-col justify-center self-stretch rounded-lg border border-border bg-muted/30 px-2 py-0.5 text-left transition-[color,background-color,border-color,box-shadow,transform] duration-150 hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-expanded:border-primary/40 aria-expanded:bg-primary/[0.08] aria-expanded:shadow-sm aria-expanded:ring-2 aria-expanded:ring-primary/20 dark:aria-expanded:border-primary/30 dark:aria-expanded:bg-primary/[0.14] aria-expanded:[&_svg]:rotate-180 sm:px-2 sm:py-1",
              className
            )}
            aria-label="Set building defaults"
          />
        }
      >
        <span className="flex items-center gap-1 whitespace-nowrap text-[10px] font-medium leading-tight text-muted-foreground sm:text-[11px]">
          Set assumptions
          <ChevronDown
            className="size-3 opacity-70 transition-transform duration-150"
            aria-hidden
          />
        </span>
        <span className="mt-px text-xs font-semibold leading-tight text-foreground sm:text-[13px]">
          Building defaults
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={6}
        className="w-[min(100vw-2rem,20rem)] p-3"
      >
        <div className="mb-3 space-y-1.5">
          <p className="text-sm font-semibold text-foreground">Leasing assumptions</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Calculations are made using these building assumptions. Leasing
            assumptions for individual spaces made on the stacking plan will
            override building defaults.
          </p>
        </div>
        <AssetLeasingAssumptionsFields
          assumptions={assumptions}
          onAssumptionsChange={updateAssumptions}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
