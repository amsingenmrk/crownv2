"use client"

import * as React from "react"
import {
  parseStoredSets,
  storageKeyForAsset,
  type ModificationSetRecord,
} from "@/components/building-modifications-sidebar"
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
}: {
  assetId: string
  building: string
}) {
  const { sortedSets, reload } = useSavedModificationSets(assetId)
  const { selections, setTableSelection } = useScenarioModificationSelections()
  const value = selections[assetId] ?? ""

  const modificationSetItemLabels = React.useMemo(() => {
    const labels: Record<string, React.ReactNode> = {
      [NO_TABLE_MOD_PRESET_VALUE]: "Select a saved set…",
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
          className={cn(
            "w-full max-w-full min-w-0",
            value !== "" &&
              "border-violet-500/45 bg-violet-500/[0.09] font-medium text-violet-800 shadow-sm hover:bg-violet-500/[0.12] hover:border-violet-500/55 focus-visible:border-violet-500 focus-visible:ring-violet-500/25 dark:border-violet-400/40 dark:bg-violet-500/[0.14] dark:text-violet-200 dark:hover:bg-violet-500/20 dark:hover:border-violet-400/55 dark:focus-visible:border-violet-400 dark:focus-visible:ring-violet-400/30 [&_svg]:text-violet-600 dark:[&_svg]:text-violet-400"
          )}
          aria-label={`Modifications saved set for ${building}`}
        >
          <SelectValue placeholder="Select a saved set…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_TABLE_MOD_PRESET_VALUE}>
            Select a saved set…
          </SelectItem>
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
