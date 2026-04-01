import { AssetStatCards } from "@/components/asset-stat-cards"

export default function AssetForecastsPage() {
  return (
    <div className="flex flex-col gap-6">
      <AssetStatCards variant="forecasts" />
    </div>
  )
}
