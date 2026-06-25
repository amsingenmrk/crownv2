"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { useAppToast } from "@/components/app-toast"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { addCustomCompetitiveGroup } from "@/lib/competitive-group-overrides"
import { cn } from "@/lib/utils"

export function NewCompetitiveGroupDialog({
  open,
  onOpenChange,
  afterCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  afterCreate?: (created: { id: string; label: string }) => void
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
      const element = document.getElementById(inputId)
      if (element instanceof HTMLInputElement) {
        element.focus()
        element.select()
      }
    })
    return () => cancelAnimationFrame(id)
  }, [inputId, open])

  React.useEffect(() => {
    if (!open) {
      setName("")
      setDescription("")
    }
  }, [open])

  const submit = React.useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed) return
    const created = addCustomCompetitiveGroup(trimmed, description.trim() || undefined)
    if (!created) {
      showToast("Could not create competitive group.")
      return
    }

    setName("")
    setDescription("")
    onOpenChange(false)
    if (afterCreate) {
      afterCreate(created)
      return
    }

    const nextHref = `/other-assets/groups/${encodeURIComponent(created.id)}`
    if (process.env.NODE_ENV !== "production") {
      console.info("[other-assets] created competitive group", {
        groupId: created.id,
        href: nextHref,
      })
    }
    router.push(nextHref)
    showToast(`Competitive group “${trimmed}” created.`)
  }, [afterCreate, description, name, onOpenChange, router, showToast])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New competitive group</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <label htmlFor={inputId} className="text-sm font-medium text-foreground">
              Name
            </label>
            <Input
              id={inputId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. CBD peer set"
              autoComplete="off"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
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
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional: explain the strategy for this competitive group."
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
