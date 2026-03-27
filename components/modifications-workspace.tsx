"use client"

import * as React from "react"
import { useParams } from "next/navigation"

import {
  BuildingModificationsSidebar,
  INITIAL_MOD_VALUES,
  type ModId,
  type ModValues,
} from "@/components/building-modifications-sidebar"
import { AssetStatCardsSkeleton } from "@/components/asset-stat-cards-skeleton"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { StackingPlanSkeleton } from "@/components/stacking-plan-skeleton"
import { cn } from "@/lib/utils"

const MOD_IDS: ModId[] = ["gym", "bar", "cafe", "restaurant", "leed"]

type ModificationSetRecord = {
  id: string
  name: string
  values: ModValues
  savedAt: number
}

function storageKeyForAsset(assetId: string) {
  return `glassbox:modification-sets:${assetId}`
}

function parseModValues(raw: unknown): ModValues | null {
  if (raw === null || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const next: ModValues = { ...INITIAL_MOD_VALUES }
  for (const id of MOD_IDS) {
    const v = o[id]
    if (v !== undefined && typeof v !== "string") return null
    if (typeof v === "string") next[id] = v
  }
  return next
}

function parseStoredSets(raw: string | null): ModificationSetRecord[] {
  if (!raw) return []
  try {
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return []
    const out: ModificationSetRecord[] = []
    for (const item of data) {
      if (item === null || typeof item !== "object") continue
      const row = item as Record<string, unknown>
      if (typeof row.id !== "string" || typeof row.name !== "string") continue
      const values = parseModValues(row.values)
      if (!values) continue
      const savedAt =
        typeof row.savedAt === "number" ? row.savedAt : Date.now()
      out.push({
        id: row.id,
        name: row.name.trim() || "Untitled",
        values,
        savedAt,
      })
    }
    return out
  } catch {
    return []
  }
}

function valuesEqual(a: ModValues, b: ModValues) {
  return MOD_IDS.every((id) => a[id] === b[id])
}

export function ModificationsWorkspace() {
  const params = useParams()
  const assetId =
    typeof params?.id === "string" && params.id.length > 0
      ? params.id
      : "default"
  const persistKey = storageKeyForAsset(assetId)
  const toolbarId = React.useId()

  const [values, setValues] = React.useState<ModValues>(() => ({
    ...INITIAL_MOD_VALUES,
  }))
  const [savedSets, setSavedSets] = React.useState<ModificationSetRecord[]>([])
  const [activePresetId, setActivePresetId] = React.useState<string | null>(
    null
  )
  const [presetName, setPresetName] = React.useState("")

  React.useEffect(() => {
    setSavedSets(parseStoredSets(localStorage.getItem(persistKey)))
  }, [persistKey])

  React.useEffect(() => {
    if (activePresetId === null) return
    const preset = savedSets.find((s) => s.id === activePresetId)
    if (!preset) {
      setActivePresetId(null)
      return
    }
    if (!valuesEqual(preset.values, values)) {
      setActivePresetId(null)
    }
  }, [values, activePresetId, savedSets])

  const persistSets = React.useCallback(
    (next: ModificationSetRecord[]) => {
      setSavedSets(next)
      try {
        localStorage.setItem(persistKey, JSON.stringify(next))
      } catch {
        /* ignore */
      }
    },
    [persistKey]
  )

  const applyPreset = React.useCallback((record: ModificationSetRecord) => {
    setValues({ ...record.values })
    setActivePresetId(record.id)
  }, [])

  const saveCurrentAsPreset = () => {
    const name = presetName.trim()
    if (!name) return
    const now = Date.now()
    const existingIdx = savedSets.findIndex(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    )
    let next: ModificationSetRecord[]
    let appliedId: string
    if (existingIdx >= 0) {
      appliedId = savedSets[existingIdx]!.id
      next = savedSets.map((s, i) =>
        i === existingIdx
          ? { ...s, name, values: { ...values }, savedAt: now }
          : s
      )
    } else {
      appliedId = crypto.randomUUID()
      next = [
        ...savedSets,
        { id: appliedId, name, values: { ...values }, savedAt: now },
      ]
    }
    persistSets(next)
    setActivePresetId(appliedId)
    setPresetName("")
  }

  const sortedSavedSets = React.useMemo(
    () => [...savedSets].sort((a, b) => a.name.localeCompare(b.name)),
    [savedSets]
  )
  const canSave = presetName.trim().length > 0

  const selectClass = cn(
    "box-border h-7 w-full min-w-0 cursor-pointer rounded-[min(var(--radius-md),12px)] border border-input bg-transparent px-2.5 py-0 text-[0.8rem] leading-7 text-foreground outline-none transition-colors",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "dark:bg-input/30"
  )

  return (
    <div className="flex min-h-0 w-full flex-col gap-4">
      <section
        aria-label="Saved modification sets"
        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
      >
        <Field className="min-w-0 flex-1 gap-1.5 sm:min-w-[12rem] sm:max-w-xs">
          <FieldLabel
            htmlFor={`${toolbarId}-saved-set`}
            className="text-xs font-medium text-muted-foreground"
          >
            Saved set
          </FieldLabel>
          <select
            id={`${toolbarId}-saved-set`}
            className={selectClass}
            value={activePresetId ?? ""}
            disabled={sortedSavedSets.length === 0}
            onChange={(e) => {
              const id = e.target.value
              if (!id) {
                setActivePresetId(null)
                return
              }
              const record = savedSets.find((s) => s.id === id)
              if (record) applyPreset(record)
            }}
          >
            <option value="">Select a saved set…</option>
            {sortedSavedSets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        <Field className="min-w-0 flex-1 gap-1.5 sm:min-w-[16rem]">
          <FieldLabel
            htmlFor={`${toolbarId}-preset-name`}
            className="text-xs font-medium text-muted-foreground"
          >
            Save current as
          </FieldLabel>
          <div className="flex min-w-0 items-center gap-2">
            <Input
              id={`${toolbarId}-preset-name`}
              className="h-7 min-w-0 flex-1 py-0 text-[0.8rem] leading-7 md:text-[0.8rem]"
              placeholder="Name this set"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSave) {
                  e.preventDefault()
                  saveCurrentAsPreset()
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0"
              disabled={!canSave}
              onClick={saveCurrentAsPreset}
            >
              Save
            </Button>
          </div>
        </Field>
      </section>

      <div className="flex min-h-0 w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <BuildingModificationsSidebar value={values} onValuesChange={setValues} />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <AssetStatCardsSkeleton />
          <StackingPlanSkeleton />
        </div>
      </div>
    </div>
  )
}
