import { redirect } from "next/navigation"

import {
  portfolioScopeHref,
  portfolioScopeIdFromRouteParam,
} from "@/lib/assets"

export default async function PortfolioScopeForecastsAltPage({
  params,
}: {
  params: Promise<{ scopeId: string }>
}) {
  const { scopeId } = await params
  const resolvedScopeId = portfolioScopeIdFromRouteParam(scopeId)

  redirect(`${portfolioScopeHref(resolvedScopeId)}/forecasts`)
}
