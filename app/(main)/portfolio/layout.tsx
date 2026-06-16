import { AppTopbar } from "@/components/app-topbar"
import { PortfolioPageHeader } from "@/components/portfolio-page-header"
import { PortfolioRouteSurface } from "@/components/portfolio-route-surface"
import { InactiveScenarioModificationSelectionsProvider } from "@/components/scenario-modification-selections-context"

export default function PortfolioLayout({
  children: _children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <InactiveScenarioModificationSelectionsProvider>
      <AppTopbar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PortfolioPageHeader />
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-clip px-4 py-6 md:px-6">
          <PortfolioRouteSurface />
        </div>
      </div>
    </InactiveScenarioModificationSelectionsProvider>
  )
}
