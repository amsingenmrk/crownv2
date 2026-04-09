import { AppTopbar } from "@/components/app-topbar"
import { PortfolioDashboard } from "@/components/portfolio-dashboard"
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
    <>
      <AppTopbar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 py-6 md:px-6">
        <PortfolioDashboard
          assetsTableVariant="portfolio"
          portfolioScopeId={resolvedScopeId}
        />
      </div>
    </>
  )
}
