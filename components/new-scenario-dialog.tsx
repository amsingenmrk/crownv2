"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { slugifyScenarioName, uniqueScenarioSlug } from "@/lib/scenario-slug"
import { useAppToast } from "@/components/app-toast"
import { cn } from "@/lib/utils"
import {
  appendUserScenario,
  BUILTIN_SCENARIO,
  readUserScenarios,
  type UserScenario,
} from "@/lib/user-scenarios"

export function NewScenarioDialog({
  open,
  onOpenChange,
  afterCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, runs after persist instead of navigating to the new scenario. */
  afterCreate?: (scenario: UserScenario) => void
}) {
  const router = useRouter()
  const showToast = useAppToast()
  const inputId = React.useId()
  const descriptionId = React.useId()
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")

  React.useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => {
      const el = document.getElementById(inputId)
      if (el instanceof HTMLInputElement) {
        el.focus()
        el.select()
      }
    })
    return () => cancelAnimationFrame(id)
  }, [open, inputId])

  React.useEffect(() => {
    if (!open) {
      setName("")
      setDescription("")
    }
  }, [open])

  const submit = React.useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed) return

    const base = slugifyScenarioName(trimmed)
    const reserved = new Set<string>([
      BUILTIN_SCENARIO.slug,
      ...readUserScenarios().map((s) => s.slug),
    ])
    const slug = uniqueScenarioSlug(base, reserved)
    const descTrimmed = description.trim()
    const scenario: UserScenario = {
      name: trimmed,
      slug,
      ...(descTrimmed !== ""
        ? { description: descTrimmed.slice(0, 600) }
        : {}),
    }
    appendUserScenario(scenario)
    setName("")
    setDescription("")
    onOpenChange(false)
    if (afterCreate) {
      afterCreate(scenario)
    } else {
      router.push(`/scenarios/${slug}`)
      showToast(`Scenario “${trimmed}” created.`)
    }
  }, [afterCreate, description, name, onOpenChange, router, showToast])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New scenario</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <label htmlFor={inputId} className="text-sm font-medium text-foreground">
              Name
            </label>
            <Input
              id={inputId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 disposition plan"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  submit()
                }
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <label
              htmlFor={descriptionId}
              className="text-sm font-medium text-foreground"
            >
              Description{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id={descriptionId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this scenario is for…"
              rows={3}
              maxLength={600}
              className={cn(
                "min-h-[4.5rem] w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
              )}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={!name.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
