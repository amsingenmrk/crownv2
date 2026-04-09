"use client"

import * as React from "react"
import { ListPlus } from "lucide-react"
import { useAppToast } from "@/components/app-toast"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { StackingPlanTenant } from "@/lib/stacking-plan-data"
import {
  addScenarioIncludedProperty,
  isPropertyTrackedInScenario,
} from "@/lib/scenario-included-properties-storage"
import {
  BUILTIN_SCENARIO,
  getUserScenariosStoreSnapshot,
  subscribeUserScenarios,
  USER_SCENARIOS_SERVER_SNAPSHOT,
} from "@/lib/user-scenarios"

export function TrackSuiteInScenarioMenu({
  assetId,
  tenant,
  size = "sm",
  variant = "outline",
}: {
  assetId: string
  tenant: StackingPlanTenant
  size?: React.ComponentProps<typeof Button>["size"]
  variant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const toast = useAppToast()
  const userScenarios = React.useSyncExternalStore(
    subscribeUserScenarios,
    getUserScenariosStoreSnapshot,
    () => USER_SCENARIOS_SERVER_SNAPSHOT
  )

  const scenarios = React.useMemo(
    () => [
      { name: BUILTIN_SCENARIO.name, slug: BUILTIN_SCENARIO.slug },
      ...userScenarios.map((s) => ({ name: s.name, slug: s.slug })),
    ],
    [userScenarios]
  )

  const track = React.useCallback(
    (slug: string, label: string) => {
      const item = { assetId, tenantId: tenant.id }
      if (isPropertyTrackedInScenario(slug, item)) {
        toast(`Already tracked in ${label}`)
        return
      }
      addScenarioIncludedProperty(slug, item)
      toast(`Tracked in ${label}`)
    },
    [assetId, tenant.id, toast]
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant={variant}
            size={size}
            className="gap-1.5"
          />
        }
      >
        <ListPlus className="size-3.5" aria-hidden />
        Track in scenario
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
        {scenarios.map((s) => (
          <DropdownMenuItem
            key={s.slug}
            onClick={() => track(s.slug, s.name)}
          >
            {s.name}
            {isPropertyTrackedInScenario(s.slug, {
              assetId,
              tenantId: tenant.id,
            })
              ? " · tracked"
              : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
