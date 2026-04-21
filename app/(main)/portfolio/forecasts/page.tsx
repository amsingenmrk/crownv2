import { ScopedForecastsWorkspace } from "@/components/scoped-forecasts-workspace"

export default function PortfolioForecastsPage() {
  return <ScopedForecastsWorkspace scope={{ kind: "portfolio" }} layout="alt" />
}
