import { redirect } from "next/navigation"

import { BUILTIN_SCENARIO } from "@/lib/user-scenarios"

export default function Scenario2026CapitalPlanningForecastsAltPage() {
  redirect(`/scenarios/${BUILTIN_SCENARIO.slug}/forecasts`)
}
