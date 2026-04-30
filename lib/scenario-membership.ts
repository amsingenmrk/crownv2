import { BUILTIN_SCENARIO } from "@/lib/user-scenarios"

export type ScenarioMembershipMode = "off" | "builtin" | "explicit-inclusion"

export function scenarioMembershipModeFromPathname(
  pathname: string | null
): ScenarioMembershipMode {
  if (pathname == null || !pathname.startsWith("/scenarios/")) return "off"
  const base = `/scenarios/${BUILTIN_SCENARIO.slug}`
  if (pathname === base || pathname.startsWith(`${base}/`)) return "builtin"
  return "explicit-inclusion"
}

export function scenarioPathFromSlug(slug: string): string {
  return `/scenarios/${slug}`
}
