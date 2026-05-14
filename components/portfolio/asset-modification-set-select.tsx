"use client"

import * as React from "react"
import {
  parseStoredSets,
  storageKeyForAsset,
  type ModificationSetRecord,
} from "@/lib/building-modification-sets-storage"
import { modificationSetValueDeltaUsd } from "@/lib/modification-selection-value-delta"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useScenarioModificationSelections } from "@/components/scenario-modification-selections-context"
import { cn } from "@/lib/utils"

export const NO_TABLE_MOD_PRESET_VALUE = "__no_table_mod_preset__"

const VALUE_DELTA_NEUTRAL_USD = 1

function selectedModificationTriggerToneClassName(
  value: string,
  valueDeltaUsd: number | null
): string | undefined {
  if (value === "") return undefined
  if (valueDeltaUsd == null) {
    return cn(
      "border-muted-foreground/40 bg-muted/45 font-medium text-foreground shadow-sm hover:bg-muted/55 hover:border-muted-foreground/50 focus-visible:border-muted-foreground/60 focus-visible:ring-muted-foreground/20 dark:border-muted-foreground/35 dark:bg-muted/30 dark:hover:bg-muted/40 dark:hover:border-muted-foreground/45 dark:focus-visible:border-muted-foreground/50 dark:focus-visible:ring-muted-foreground/25 [&_svg]:text-muted-foreground dark:[&_svg]:text-muted-foreground/90"
    )
  }
  if (valueDeltaUsd > VALUE_DELTA_NEUTRAL_USD) {
    return cn(
      "border-emerald-500/45 bg-emerald-500/[0.09] font-medium text-emerald-800 shadow-sm hover:bg-emerald-500/[0.12] hover:border-emerald-500/55 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/25 dark:border-emerald-400/40 dark:bg-emerald-500/[0.14] dark:text-emerald-200 dark:hover:bg-emerald-500/20 dark:hover:border-emerald-400/55 dark:focus-visible:border-emerald-400 dark:focus-visible:ring-emerald-400/30 [&_svg]:text-emerald-600 dark:[&_svg]:text-emerald-400"
    )
  }
  if (valueDeltaUsd < -VALUE_DELTA_NEUTRAL_USD) {
    return cn(
      "border-rose-500/45 bg-rose-500/[0.09] font-medium text-rose-800 shadow-sm hover:bg-rose-500/[0.12] hover:border-rose-500/55 focus-visible:border-rose-500 focus-visible:ring-rose-500/25 dark:border-rose-400/40 dark:bg-rose-500/[0.14] dark:text-rose-200 dark:hover:bg-rose-500/20 dark:hover:border-rose-400/55 dark:focus-visible:border-rose-400 dark:focus-visible:ring-rose-400/30 [&_svg]:text-rose-600 dark:[&_svg]:text-rose-400"
    )
  }
  return cn(
    "border-muted-foreground/35 bg-muted/40 font-medium text-foreground shadow-sm hover:bg-muted/50 hover:border-muted-foreground/45 focus-visible:border-muted-foreground/55 focus-visible:ring-muted-foreground/20 dark:border-muted-foreground/30 dark:bg-muted/25 dark:hover:bg-muted/35 dark:hover:border-muted-foreground/40 dark:focus-visible:border-muted-foreground/45 dark:focus-visible:ring-muted-foreground/25 [&_svg]:text-muted-foreground dark:[&_svg]:text-muted-foreground/90"
  )
}

function useSavedModificationSets(assetId: string) {
  const storageKey = storageKeyForAsset(assetId)
  const [sets, setSets] = React.useState<ModificationSetRecord[]>([])

  const reload = React.useCallback(() => {
    setSets(parseStoredSets(localStorage.getItem(storageKey)))
  }, [storageKey])

  React.useEffect(() => {
    reload()
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey) reload()
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [storageKey, reload])

  const sortedSets = React.useMemo(
    () => [...sets].sort((a, b) => a.name.localeCompare(b.name)),
    [sets]
  )

  return { sortedSets, reload }
}

export function AssetModificationSetSelect({
  assetId,
  building,
  /** Same trigger sizing as the scoped forecasts Outlook column (`h-7`, `max-w-[7.25rem]`, `text-[0.75rem]`). */
  matchOutlookRowSelect = false,
}: {
  assetId: string
  building: string
  matchOutlookRowSelect?: boolean
}) {
  const { sortedSets, reload } = useSavedModificationSets(assetId)
  const { selections, setTableSelection } = useScenarioModificationSelections()
  const value = selections[assetId] ?? ""

  const valueDeltaUsd = React.useMemo(
    () => modificationSetValueDeltaUsd(assetId, value),
    [assetId, value, sortedSets]
  )

  const modificationSetItemLabels = React.useMemo(() => {
    const labels: Record<string, React.ReactNode> = {
      [NO_TABLE_MOD_PRESET_VALUE]: "None",
    }
    for (const s of sortedSets) {
      labels[s.id] = s.name
    }
    return labels
  }, [sortedSets])

  return (
    <span
      className="block min-w-0 w-full max-w-full"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Select
        items={modificationSetItemLabels}
        value={value === "" ? NO_TABLE_MOD_PRESET_VALUE : value}
        onValueChange={(v) =>
          setTableSelection(
            assetId,
            v == null || v === NO_TABLE_MOD_PRESET_VALUE ? "" : v
          )
        }
        onOpenChange={(open) => {
          if (open) reload()
        }}
      >
        <SelectTrigger
          size={matchOutlookRowSelect ? "sm" : "default"}
          className={cn(
            matchOutlookRowSelect
              ? "h-7 w-full max-w-[7.25rem] min-w-0 text-[0.75rem]"
              : "w-full max-w-full min-w-0",
            selectedModificationTriggerToneClassName(value, valueDeltaUsd)
          )}
          aria-label={`Modifications saved set for ${building}`}
        >
          <SelectValue placeholder="None" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_TABLE_MOD_PRESET_VALUE}>None</SelectItem>
          {sortedSets.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  )
}
