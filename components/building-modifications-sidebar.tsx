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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

type ModId =
  | "gym"
  | "bar"
  | "cafe"
  | "restaurant"
  | "leed"

type ModValues = Record<ModId, string>

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

const INITIAL_VALUES: ModValues = {
  gym: "",
  bar: "",
  cafe: "",
  restaurant: "",
  leed: "",
}

export function BuildingModificationsSidebar({
  className,
  ...props
}: React.ComponentProps<"aside">) {
  const baseId = React.useId()
  const [values, setValues] = React.useState<ModValues>(() => ({
    ...INITIAL_VALUES,
  }))

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
        Clear
      </Button>
    </aside>
  )
}
