"use client"

import * as React from "react"
import {
  Coffee,
  Dumbbell,
  Leaf,
  Mic,
  UtensilsCrossed,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

export type ModId =
  | "gym"
  | "bar"
  | "cafe"
  | "restaurant"
  | "leed"

export type ModValues = Record<ModId, string>

/** Sub-options — copy from `planning/modifications.md`. */
const GYM_OPTIONS: { value: string; title: string; description: string }[] = [
  {
    value: "training-gym",
    title: "Training gym",
    description:
      "Martial arts, boxing, or class-led training concept.",
  },
  {
    value: "weight-room",
    title: "Weight room",
    description:
      "Strength-focused tenant gym with moderate staffing needs.",
  },
  {
    value: "yoga-pilates",
    title: "Yoga / Pilates studio",
    description:
      "Wellness-forward studio centered on classes, stretching, and recovery.",
  },
  {
    value: "full-service",
    title: "Full-service",
    description:
      "Equinox-style amenity with full staffing, broader programming, and the largest gym footprint.",
  },
]

/** Sub-options for “Add Cafe” — copy from `planning/modifications.md`. */
const CAFE_OPTIONS: { value: string; title: string; description: string }[] = [
  {
    value: "grab-and-go",
    title: "Grab-and-go coffee / tea",
    description:
      "Small counter service focused on speed and convenience.",
  },
  {
    value: "social-work-friendly-cafe",
    title: "Social / work-friendly cafe",
    description:
      "Longer dwell-time cafe with seating and informal work zones.",
  },
  {
    value: "health-drinks",
    title: "Health drinks",
    description:
      "Smoothies, juices, and wellness-oriented grab-and-go service.",
  },
]

/** Sub-options for “Add Restaurant” — copy from `planning/modifications.md`. */
const RESTAURANT_OPTIONS: { value: string; title: string; description: string }[] =
  [
    {
      value: "white-cloth",
      title: "White Cloth",
      description:
        "Destination dining concept with the broadest operating scope and uplift case.",
    },
    {
      value: "takeout",
      title: "Takeout",
      description:
        "Compact service footprint optimized for speed and low staffing.",
    },
    {
      value: "fast-casual",
      title: "Fast Casual (fast food)",
      description:
        "Mid-range buildout with good reach and efficient operations.",
    },
    {
      value: "family-friendly",
      title: "Family-friendly",
      description:
        "Broader-appeal dining concept with a larger seating footprint.",
    },
    {
      value: "deli",
      title: "Deli",
      description:
        "Efficient daytime F&B offer with a modest but durable premium.",
    },
  ]

/** Sub-options for “LEED certification” — copy from `planning/modifications.md`. */
const LEED_OPTIONS: { value: string; title: string; description: string }[] = [
  {
    value: "leed-certified",
    title: "Certified",
    description:
      "Entry-level sustainability upgrade with the lightest retrofit scope.",
  },
  {
    value: "leed-silver",
    title: "Silver",
    description:
      "Moderate efficiency and materials upgrade with broader marketability.",
  },
  {
    value: "leed-gold",
    title: "Gold",
    description:
      "Stronger certification target with clearer rent and leasing upside.",
  },
  {
    value: "leed-platinum",
    title: "Platinum",
    description:
      "Highest certification ambition with the strongest premium assumptions.",
  },
]

/** Sub-options for “Add Bar” — copy from `planning/modifications.md`. */
const BAR_OPTIONS: { value: string; title: string; description: string }[] = [
  {
    value: "sports-bar",
    title: "Sports bar",
    description:
      "Game-day destination with AV buildout and heavier operations.",
  },
  {
    value: "traditional-pubs",
    title: "Traditional bars/ pubs",
    description:
      "Steady neighborhood-style hospitality with balanced cost profile.",
  },
  {
    value: "cocktail-bar",
    title: "Cocktail bar",
    description:
      "Evening-focused hospitality concept targeting stronger rent lift.",
  },
  {
    value: "beer-garden",
    title: "Beer garden",
    description:
      "Indoor-outdoor style concept with lighter build cost but broader reach.",
  },
]

type ModOption = { value: string; title: string; description: string }

type ModConfig = {
  id: ModId
  checkboxLabel: string
  icon: React.ComponentType<{ className?: string }>
  options: ModOption[]
}

const MOD_CONFIGS: ModConfig[] = [
  { id: "gym", checkboxLabel: "Add Gym", icon: Dumbbell, options: GYM_OPTIONS },
  {
    id: "bar",
    checkboxLabel: "Add Bar",
    icon: Mic,
    options: BAR_OPTIONS,
  },
  {
    id: "cafe",
    checkboxLabel: "Add Cafe",
    icon: Coffee,
    options: CAFE_OPTIONS,
  },
  {
    id: "restaurant",
    checkboxLabel: "Add Restaurant",
    icon: UtensilsCrossed,
    options: RESTAURANT_OPTIONS,
  },
  {
    id: "leed",
    checkboxLabel: "LEED certification",
    icon: Leaf,
    options: LEED_OPTIONS,
  },
]

export const INITIAL_MOD_VALUES: ModValues = {
  gym: "",
  bar: "",
  cafe: "",
  restaurant: "",
  leed: "",
}

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
      const rowValues = parseModValues(row.values)
      if (!rowValues) continue
      const savedAt =
        typeof row.savedAt === "number" ? row.savedAt : Date.now()
      out.push({
        id: row.id,
        name: row.name.trim() || "Untitled",
        values: rowValues,
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

export type BuildingModificationsSidebarProps = Omit<
  React.ComponentProps<"aside">,
  "onChange"
> & {
  assetId: string
  value: ModValues
  onValuesChange: React.Dispatch<React.SetStateAction<ModValues>>
}

export function BuildingModificationsSidebar({
  className,
  assetId,
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
  }, [setValues])

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

      <section
        aria-label="Saved modification sets"
        className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3"
      >
        <Field className="min-w-0 gap-1.5">
          <FieldLabel
            htmlFor={`${baseId}-saved-set`}
            className="text-xs font-medium text-muted-foreground"
          >
            Saved sets
          </FieldLabel>
          <select
            id={`${baseId}-saved-set`}
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 shrink-0"
              disabled={!canSave}
              onClick={saveCurrentAsPreset}
            >
              Save
            </Button>
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
                  "box-content flex w-full items-center gap-2.5 px-3 py-2 text-left outline-none transition-colors",
                  "hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  enabled
                    ? "rounded-t-lg rounded-b-none"
                    : "rounded-lg"
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
                    "min-w-0 flex-1 text-sm font-medium leading-snug",
                    enabled ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {checkboxLabel}
                </span>
              </button>

              {enabled ? (
                <div className="px-3 pb-3 pt-1">
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
                            "rounded-md p-2 transition-colors",
                            value === opt.value
                              ? "bg-primary/10"
                              : "hover:bg-muted/40"
                          )}
                        >
                          <RadioGroupItem value={opt.value} id={itemId} />
                          <FieldContent>
                            <FieldLabel htmlFor={itemId}>
                              {opt.title}
                            </FieldLabel>
                            <FieldDescription>
                              {opt.description}
                            </FieldDescription>
                          </FieldContent>
                        </Field>
                      )
                    })}
                  </RadioGroup>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full shrink-0"
        disabled={!hasAnySelection}
        onClick={clear}
      >
        Clear all
      </Button>
    </aside>
  )
}
