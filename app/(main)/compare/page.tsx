import { AppTopbar } from "@/components/app-topbar"
import { PortfolioScenarioComparison } from "@/components/portfolio-scenario-comparison"

export default function ComparePage() {
  return (
    <>
      <AppTopbar />
      <div
        role="main"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 md:px-6"
      >
        <PortfolioScenarioComparison />
      </div>
    </>
  )
}
