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
import { useAppToast } from "@/components/app-toast"
import { addCustomAssetGroup } from "@/lib/asset-group-overrides"
import { portfolioScopeHref } from "@/lib/assets"

export function NewPortfolioScopeDialog({
  open,
  onOpenChange,
  afterCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, runs after the scope is created instead of navigating to it. */
  afterCreate?: (created: { id: string; label: string }) => void
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
    const created = addCustomAssetGroup(trimmed)
    if (!created) {
      showToast("Could not create portfolio scope.")
      return
    }
    setName("")
    onOpenChange(false)
    if (afterCreate) {
      afterCreate(created)
      return
    }
    router.push(portfolioScopeHref(created.id))
    showToast(`Portfolio scope “${trimmed}” created.`)
  }, [afterCreate, name, onOpenChange, router, showToast])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New portfolio scope</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <label htmlFor={inputId} className="sr-only">
            Portfolio scope name
          </label>
          <Input
            id={inputId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. JV stabilization"
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
