"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { slugifyScenarioName, uniqueScenarioSlug } from "@/lib/scenario-slug"
import { useAppToast } from "@/components/app-toast"
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
  const [name, setName] = React.useState("")

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
    if (!open) setName("")
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
    const scenario: UserScenario = { name: trimmed, slug }
    appendUserScenario(scenario)
    setName("")
    onOpenChange(false)
    if (afterCreate) {
      afterCreate(scenario)
    } else {
      router.push(`/scenarios/${slug}`)
      showToast(`Scenario “${trimmed}” created.`)
    }
  }, [afterCreate, name, onOpenChange, router, showToast])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New scenario</DialogTitle>
          <DialogDescription>
            Choose a name for this scenario. You can open it from the sidebar
            anytime.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <label htmlFor={inputId} className="sr-only">
            Scenario name
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
