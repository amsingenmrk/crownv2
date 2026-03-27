"use client"

import * as React from "react"
import {
  ChevronDown,
  Coffee,
  Dumbbell,
  Leaf,
  Mic,
  UtensilsCrossed,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ModId =
  | "gym"
  | "bar"
  | "cafe"
  | "restaurant"
  | "leed"
  | "combine"

type ModValues = Record<ModId, string>

const INITIAL_VALUES: ModValues = {
  gym: "gym",
  bar: "traditional",
  cafe: "social-workspace",
  restaurant: "restaurant",
  leed: "leed",
  combine: "combine",
}

const MOD_ROWS: {
  id: ModId
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: "gym", label: "Add gym", icon: Dumbbell },
  { id: "bar", label: "Add bar", icon: Mic },
  { id: "cafe", label: "Add cafe", icon: Coffee },
  { id: "restaurant", label: "Add restaurant", icon: UtensilsCrossed },
  { id: "leed", label: "LEED certification", icon: Leaf },
  { id: "combine", label: "Combine & divide spaces", icon: Users },
]

const selectTriggerClass =
  "h-8 w-full min-w-0 cursor-pointer appearance-none rounded-lg border-0 bg-transparent py-1.5 pr-8 pl-9 text-xs font-medium outline-none focus:ring-0 focus-visible:ring-0"

function selectOptionsFor(
  modId: ModId,
  onLabel: string
): { value: string; label: string }[] {
  const placeholder = { value: "", label: "Select" }
  switch (modId) {
    case "gym":
    case "restaurant":
    case "leed":
      return [placeholder, { value: modId, label: onLabel }]
    case "bar":
      return [
        placeholder,
        { value: "traditional", label: "Traditional" },
      ]
    case "cafe":
      return [
        placeholder,
        { value: "social-workspace", label: "Social / wo…" },
      ]
    case "combine":
      return [placeholder, { value: "combine", label: onLabel }]
    default:
      return [placeholder]
  }
}

export function BuildingModificationsSidebar({
  className,
  ...props
}: React.ComponentProps<"aside">) {
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
      combine: "",
    })
  }

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm lg:w-52 xl:w-56",
        className
      )}
      aria-label="Modification filters"
      {...props}
    >
      <h2 className="text-sm font-semibold text-foreground">
        Building modifications
      </h2>

      <div className="flex flex-col gap-3">
        {MOD_ROWS.map(({ id, label, icon: Icon }) => {
          const value = values[id]
          const isActive = value !== ""

          return (
            <div
              key={id}
              className={cn(
                "relative w-full min-w-0 rounded-lg border transition-colors",
                isActive &&
                  "border-primary/40 bg-primary/[0.07] dark:bg-primary/10",
                !isActive && "border-border bg-card"
              )}
            >
              <Icon
                className={cn(
                  "pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                aria-hidden
              />
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <select
                className={cn(
                  selectTriggerClass,
                  value === ""
                    ? "text-muted-foreground"
                    : "text-primary"
                )}
                value={value}
                onChange={(e) =>
                  setValues((s) => ({ ...s, [id]: e.target.value }))
                }
                aria-label={label}
              >
                {selectOptionsFor(id, label).map((opt) => (
                  <option key={opt.value || "placeholder"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full shrink-0"
        onClick={clear}
      >
        Clear
      </Button>
    </aside>
  )
}
