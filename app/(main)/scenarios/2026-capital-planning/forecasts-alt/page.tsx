import { ScopedForecastsWorkspace } from "@/components/scoped-forecasts-workspace"

import { BUILTIN_SCENARIO } from "@/lib/user-scenarios"

export default function Scenario2026CapitalPlanningForecastsAltPage() {
  return (
    <ScopedForecastsWorkspace
      scope={{ kind: "scenario", scenarioSlug: BUILTIN_SCENARIO.slug }}
      layout="alt"
    />
  )
}
