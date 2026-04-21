import { redirect } from "next/navigation"

import {
  portfolioScopeHref,
  portfolioScopeIdFromRouteParam,
  portfolioScopeSlug,
} from "@/lib/assets"

export default async function PortfolioScopeForecastsAltPage({
  params,
}: {
  params: Promise<{ scopeId: string }>
}) {
  const { scopeId } = await params
  const resolvedScopeId = portfolioScopeIdFromRouteParam(scopeId)
  const canonicalScopeSlug = portfolioScopeSlug(resolvedScopeId)

  redirect(`${portfolioScopeHref(resolvedScopeId)}/forecasts`)
}
