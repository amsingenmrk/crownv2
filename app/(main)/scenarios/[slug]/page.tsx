import { AppTopbar } from "@/components/app-topbar"
import { PortfolioDashboard } from "@/components/portfolio-dashboard"

export default function ScenarioBySlugPage() {
  return (
    <>
      <AppTopbar />
      <div className="flex flex-1 flex-col px-4 py-6 md:px-6">
        <PortfolioDashboard assetsTableVariant="scenarios" />
      </div>
    </>
  )
}
