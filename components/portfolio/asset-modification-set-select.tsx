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
  const [value, setValue] = React.useState("")

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
          setValue(v == null || v === NO_TABLE_MOD_PRESET_VALUE ? "" : v)
        }
        onOpenChange={(open) => {
          if (open) reload()
        }}
      >
        <SelectTrigger
          className="w-full max-w-full min-w-0"
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
