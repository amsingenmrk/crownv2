import { AppTopbar } from "@/components/app-topbar"
import { PortfolioDashboard } from "@/components/portfolio-dashboard"

export default function Scenario2026CapitalPlanningPage() {
  return (
    <>
      <AppTopbar />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 md:px-6">
        <PortfolioDashboard
          assetsTableVariant="scenarios"
          scenarioRelaxedAssetFilter={false}
        />
      </div>
    </>
  )
}
