import { ScopedForecastsWorkspace } from "@/components/scoped-forecasts-workspace"

export default function PortfolioForecastsAltPage() {
  return <ScopedForecastsWorkspace scope={{ kind: "portfolio" }} layout="alt" />
}
