import { redirect } from "next/navigation"
import {
  portfolioScopeHref,
  portfolioScopeIdFromRouteParam,
  portfolioScopeSlug,
} from "@/lib/assets"

export default async function PortfolioScopePage({
  params,
}: {
  params: Promise<{ scopeId: string }>
}) {
  const { scopeId } = await params
  const resolvedScopeId = portfolioScopeIdFromRouteParam(scopeId)
  const canonicalScopeSlug = portfolioScopeSlug(resolvedScopeId)

  if (decodeURIComponent(scopeId) !== canonicalScopeSlug) {
    redirect(portfolioScopeHref(resolvedScopeId))
  }

  return (
    null
  )
}
