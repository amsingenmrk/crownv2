import { AppTopbar } from "@/components/app-topbar"
import { PortfolioPageHeader } from "@/components/portfolio-page-header"
import { ScenarioModificationSelectionsProvider } from "@/components/scenario-modification-selections-context"

export default function PortfolioLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ScenarioModificationSelectionsProvider>
      <AppTopbar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PortfolioPageHeader />
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 md:px-6">
          {children}
        </div>
      </div>
    </ScenarioModificationSelectionsProvider>
  )
}
