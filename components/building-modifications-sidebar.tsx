"use client"

import * as React from "react"
import { CircleHelp, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MOD_CONFIGS, type ModValues } from "@/lib/building-modifications"
import {
  parseStoredSets,
  storageKeyForAsset,
  type ModificationSetRecord,
} from "@/lib/building-modification-sets-storage"
import { cn } from "@/lib/utils"

export {
  INITIAL_MOD_VALUES,
  type ModId,
  type ModValues,
} from "@/lib/building-modifications"

const NO_SAVED_PRESET_VALUE = "__no_saved_preset__"

export type BuildingModificationsSidebarProps = Omit<
  React.ComponentProps<"aside">,
  "onChange"
> & {
  assetId: string
  hasPendingChanges: boolean
  onApply: () => void
  value: ModValues
  onValuesChange: React.Dispatch<React.SetStateAction<ModValues>>
}

export function BuildingModificationsSidebar({
  className,
  assetId,
  hasPendingChanges,
  onApply,
  value: values,
  onValuesChange: setValues,
  ...props
}: BuildingModificationsSidebarProps) {
  const baseId = React.useId()
  const persistKey = storageKeyForAsset(assetId)

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
      setPresetName("")
    }
  }, [activePresetId, savedSets])

  const persistSets = React.useCallback(
    (next: ModificationSetRecord[]) => {
      setSavedSets(next)
      try {
        localStorage.setItem(persistKey, JSON.stringify(next))
        window.dispatchEvent(new Event("glassbox:modification-sets-changed"))
      } catch {
        /* ignore */
      }
    },
    [persistKey]
  )

  const applyPreset = React.useCallback(
    (record: ModificationSetRecord) => {
      setValues({ ...record.values })
      setActivePresetId(record.id)
      setPresetName(record.name)
    },
    [setValues]
  )

  const saveCurrentAsPreset = () => {
    const name = presetName.trim()
    if (!name) return
    const now = Date.now()

    if (activePresetId != null) {
      const idx = savedSets.findIndex((s) => s.id === activePresetId)
      if (idx < 0) return
      const nameTakenElsewhere = savedSets.some(
        (s, i) => i !== idx && s.name.toLowerCase() === name.toLowerCase()
      )
      if (nameTakenElsewhere) return
      const next = savedSets.map((s, i) =>
        i === idx ? { ...s, name, values: { ...values }, savedAt: now } : s
      )
      persistSets(next)
      return
    }

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
    setPresetName(name)
  }

  const deleteActivePreset = () => {
    if (activePresetId == null) return
    const next = savedSets.filter((s) => s.id !== activePresetId)
    persistSets(next)
    setActivePresetId(null)
    setPresetName("")
  }

  const sortedSavedSets = React.useMemo(
    () => [...savedSets].sort((a, b) => a.name.localeCompare(b.name)),
    [savedSets]
  )

  const savedSetItemLabels = React.useMemo(() => {
    const labels: Record<string, React.ReactNode> = {
      [NO_SAVED_PRESET_VALUE]: "Select a saved set…",
    }
    for (const s of sortedSavedSets) {
      labels[s.id] = s.name
    }
    return labels
  }, [sortedSavedSets])

  const canSave = presetName.trim().length > 0

  const clear = () => {
    setValues({
      gym: "",
      bar: "",
      cafe: "",
      restaurant: "",
      leed: "",
    })
  }

  const hasAnySelection = Object.values(values).some((v) => v !== "")

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm lg:w-72 xl:w-80",
        className
      )}
      aria-label="Modification filters"
      {...props}
    >
      <h2 className="text-sm font-semibold text-foreground">
        Building modifications
      </h2>

      <div className="min-w-0">
        <Select
          items={savedSetItemLabels}
          value={activePresetId ?? NO_SAVED_PRESET_VALUE}
          onValueChange={(id) => {
            if (id == null || id === NO_SAVED_PRESET_VALUE) {
              setActivePresetId(null)
              setPresetName("")
              return
            }
            const record = savedSets.find((s) => s.id === id)
            if (record) applyPreset(record)
          }}
          disabled={sortedSavedSets.length === 0}
        >
          <SelectTrigger
            id={`${baseId}-saved-set`}
            size="sm"
            className="w-full min-w-0 text-[0.8rem]"
            aria-label="Saved sets"
          >
            <SelectValue placeholder="Select a saved set…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_SAVED_PRESET_VALUE}>
              Select a saved set…
            </SelectItem>
            {sortedSavedSets.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <section
        aria-label="Save modification set"
        className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3"
      >
        <Field className="min-w-0 gap-1.5">
          <FieldLabel
            htmlFor={`${baseId}-preset-name`}
            className="text-xs font-medium text-muted-foreground"
          >
            Save current as
          </FieldLabel>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id={`${baseId}-preset-name`}
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
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7"
                disabled={!canSave}
                onClick={saveCurrentAsPreset}
              >
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="h-7 text-muted-foreground hover:text-destructive"
                disabled={activePresetId == null}
                aria-label="Delete saved set"
                title="Delete saved set"
                onClick={deleteActivePreset}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </Button>
            </div>
          </div>
        </Field>
      </section>

      <div className="flex flex-col gap-3">
        {MOD_CONFIGS.map(({ id, checkboxLabel, icon: Icon, options }) => {
          const value = values[id]
          const enabled = value !== ""
          const regionId = `${baseId}-${id}-options`

          const setEnabled = (on: boolean) => {
            setValues((s) => ({
              ...s,
              [id]: on ? (options[0]?.value ?? "") : "",
            }))
          }

          return (
            <div
              key={id}
              className={cn(
                "w-full min-w-0 rounded-lg border transition-colors",
                enabled &&
                  "border-primary/40 bg-primary/[0.05] dark:bg-primary/10",
                !enabled && "border-border bg-card"
              )}
            >
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                aria-expanded={enabled}
                aria-controls={regionId}
                className={cn(
                  "box-content flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors outline-none",
                  "hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  enabled ? "rounded-t-lg rounded-b-none" : "rounded-lg"
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border",
                    enabled && "border-primary/30 bg-primary/10",
                    !enabled && "border-border bg-muted/30"
                  )}
                  aria-hidden
                >
                  <Icon
                    className={cn(
                      "size-3.5",
                      enabled ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 text-sm leading-snug font-medium",
                    enabled ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {checkboxLabel}
                </span>
              </button>

              {enabled ? (
                <div className="px-3 pt-1 pb-3">
                  <TooltipProvider delay={120}>
                    <RadioGroup
                      id={regionId}
                      aria-label={`${checkboxLabel} options`}
                      name={`${baseId}-mod-${id}`}
                      value={value}
                      onValueChange={(next) =>
                        setValues((s) => ({
                          ...s,
                          [id]: typeof next === "string" ? next : String(next),
                        }))
                      }
                      className="gap-2"
                    >
                      {options.map((opt) => {
                        const itemId = `${baseId}-${id}-${opt.value}`
                        return (
                          <Field
                            key={opt.value}
                            orientation="horizontal"
                            className={cn(
                              "cursor-pointer rounded-md p-2 transition-colors",
                              value === opt.value
                                ? "bg-primary/10"
                                : "hover:bg-muted/40"
                            )}
                            onClick={() =>
                              setValues((s) => ({
                                ...s,
                                [id]: opt.value,
                              }))
                            }
                          >
                            <RadioGroupItem value={opt.value} id={itemId} />
                            <FieldContent>
                              <div className="flex items-center gap-1.5">
                                <FieldLabel htmlFor={itemId}>
                                  {opt.title}
                                </FieldLabel>
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <button
                                        type="button"
                                        className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                                        aria-label={`About ${opt.title}`}
                                      />
                                    }
                                    onClick={(event) => event.stopPropagation()}
                                    onMouseDown={(event) =>
                                      event.stopPropagation()
                                    }
                                  >
                                    <CircleHelp className="size-3.5" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[220px] text-pretty">
                                    {opt.description}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </FieldContent>
                          </Field>
                        )
                      })}
                    </RadioGroup>
                  </TooltipProvider>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-w-0 flex-1"
          disabled={!hasAnySelection}
          onClick={clear}
        >
          Clear all
        </Button>
        <Button
          type="button"
          size="sm"
          className="min-w-0 flex-1"
          disabled={!hasPendingChanges}
          onClick={onApply}
        >
          Apply
        </Button>
      </div>
    </aside>
  )
}
