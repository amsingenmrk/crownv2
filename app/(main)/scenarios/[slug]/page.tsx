import { AppTopbar } from "@/components/app-topbar"
import { PortfolioDashboard } from "@/components/portfolio-dashboard"

export default function ScenarioBySlugPage() {
  return (
    <>
      <AppTopbar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 py-6 md:px-6">
        <PortfolioDashboard assetsTableVariant="scenarios" />
      </div>
    </>
  )
}
