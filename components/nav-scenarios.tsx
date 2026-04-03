"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { CalendarDays, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  slugifyScenarioName,
  uniqueScenarioSlug,
} from "@/lib/scenario-slug"
import {
  appendUserScenario,
  BUILTIN_SCENARIO,
  readUserScenarios,
  USER_SCENARIOS_CHANGED_EVENT,
  type UserScenario,
} from "@/lib/user-scenarios"

const BUILTIN_HREF = `/scenarios/${BUILTIN_SCENARIO.slug}` as const

export function NavScenarios() {
  const pathname = usePathname()
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [userScenarios, setUserScenarios] = React.useState<UserScenario[]>([])

  React.useEffect(() => {
    if (!dialogOpen) return
    const id = requestAnimationFrame(() => {
      const el = document.getElementById("new-scenario-name")
      if (el instanceof HTMLInputElement) {
        el.focus()
        el.select()
      }
    })
    return () => cancelAnimationFrame(id)
  }, [dialogOpen])

  const builtinActive =
    pathname === BUILTIN_HREF || pathname.startsWith(`${BUILTIN_HREF}/`)

  const userScenariosSorted = React.useMemo(
    () =>
      [...userScenarios].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      ),
    [userScenarios]
  )

  const submitNewScenario = React.useCallback(() => {
    const trimmed = newName.trim()
    if (!trimmed) return

    const base = slugifyScenarioName(trimmed)
    const reserved = new Set<string>([
      BUILTIN_SCENARIO.slug,
      ...readUserScenarios().map((s) => s.slug),
    ])
    const slug = uniqueScenarioSlug(base, reserved)
    const scenario: UserScenario = { name: trimmed, slug }
    const next = appendUserScenario(scenario)
    setUserScenarios(next)
    setNewName("")
    setDialogOpen(false)
    router.push(`/scenarios/${slug}`)
  }, [newName, router])

  React.useEffect(() => {
    const sync = () => setUserScenarios(readUserScenarios())
    sync()
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "glassbox:user-scenarios") return
      sync()
    }
    window.addEventListener(USER_SCENARIOS_CHANGED_EVENT, sync)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener(USER_SCENARIOS_CHANGED_EVENT, sync)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Scenarios</SidebarGroupLabel>
        <SidebarGroupAction
          type="button"
          title="New scenario"
          aria-label="New scenario"
          onClick={() => setDialogOpen(true)}
        >
          <Plus />
        </SidebarGroupAction>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={BUILTIN_SCENARIO.name}
              isActive={builtinActive}
              render={<Link href={BUILTIN_HREF} />}
            >
              <CalendarDays />
              <span>{BUILTIN_SCENARIO.name}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {userScenariosSorted.map((s) => {
            const href = `/scenarios/${s.slug}`
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <SidebarMenuItem key={s.slug}>
                <SidebarMenuButton
                  tooltip={s.name}
                  isActive={active}
                  render={<Link href={href} />}
                >
                  <CalendarDays />
                  <span className="truncate">{s.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroup>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setNewName("")
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New scenario</DialogTitle>
            <DialogDescription>
              Choose a name for this scenario. You can open it from the sidebar
              anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <label htmlFor="new-scenario-name" className="sr-only">
              Scenario name
            </label>
            <Input
              id="new-scenario-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Q3 disposition plan"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  submitNewScenario()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitNewScenario}
              disabled={!newName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
