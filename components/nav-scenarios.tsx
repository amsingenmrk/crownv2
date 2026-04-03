"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, Plus } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NewScenarioDialog } from "@/components/new-scenario-dialog"
import {
  BUILTIN_SCENARIO,
  readUserScenarios,
  USER_SCENARIOS_CHANGED_EVENT,
  type UserScenario,
} from "@/lib/user-scenarios"

const BUILTIN_HREF = `/scenarios/${BUILTIN_SCENARIO.slug}` as const

export function NavScenarios() {
  const pathname = usePathname()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [userScenarios, setUserScenarios] = React.useState<UserScenario[]>([])

  const builtinActive =
    pathname === BUILTIN_HREF || pathname.startsWith(`${BUILTIN_HREF}/`)

  const userScenariosSorted = React.useMemo(
    () =>
      [...userScenarios].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      ),
    [userScenarios]
  )

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

      <NewScenarioDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
