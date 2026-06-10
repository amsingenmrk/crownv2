import type { PortfolioMapboxPin } from "@/components/portfolio-mapbox"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import { formatUsdPortfolioCompact } from "@/lib/scenario-kpi-format"
import { marketAssetGroupIdForId } from "@/lib/synthetic-asset-calibration"

function formatRsfShort(sqft: number): string {
  if (sqft >= 1_000_000) {
    const m = sqft / 1_000_000
    const rounded = Math.round(m * 10) / 10
    const s =
      rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1)
    return `${s}M`
  }
  if (sqft >= 1000) {
    return `${Math.round(sqft / 1000)}K`
  }
  return String(sqft)
}

/**
 * Table row for a synthetic market listing — same shape as portfolio assets for scenarios / search cards.
 */
export function portfolioAssetRowForMarketPin(
  pin: PortfolioMapboxPin
): PortfolioAssetRow {
  const fin = financialMetricsForAssetId(pin.id)
  const g = marketAssetGroupIdForId(pin.id)

  if (fin == null) {
    return {
      id: pin.id,
      groupId: g,
      groupIds: [g],
      building: pin.building,
      location: pin.location ?? "",
      ownership: "Market",
      typeLabel: g === "office" ? "Office" : g === "industrial" ? "Industrial" : "Retail",
      classLabel: "B",
      rsf: "—",
      occPct: "—",
      pricePerSf: "—",
      revenue: "—",
      opex: "—",
      noi: "—",
      value: "—",
      capRate: "—",
      wale: "—",
      status: "Lease-up",
      lift: pin.lift,
      liftPercent: pin.liftPercent,
      recommendedModification: null,
    }
  }

  const value =
    fin.valueMills >= 1000
      ? `$${(fin.valueMills / 1000).toFixed(1)}B`
      : `$${fin.valueMills.toFixed(1)}M`

  const noi =
    fin.noiTenthM < 0.15 ? "$0.0" : `$${fin.noiTenthM.toFixed(1)}M`

  const typeLabel =
    g === "office" ? "Office" : g === "industrial" ? "Industrial" : "Retail"

  return {
    id: pin.id,
    groupId: g,
    groupIds: [g],
    building: pin.building,
    location: pin.location ?? "",
    ownership: "Market",
    typeLabel,
    classLabel: fin.classLabel,
    rsf: formatRsfShort(fin.rsfSqft),
    occPct: `${fin.occupancyPct.toFixed(1)}%`,
    pricePerSf: `$${fin.pricePerSfN}`,
    revenue: formatUsdPortfolioCompact(fin.annualRevenueUsd),
    opex: formatUsdPortfolioCompact(fin.annualOpexUsd),
    noi,
    value,
    capRate: `${fin.capRatePct.toFixed(1)}%`,
    wale: `${fin.waleYears.toFixed(1)} yrs`,
    status: fin.status,
    lift: pin.lift,
    liftPercent: pin.liftPercent,
    recommendedModification: null,
  }
}

export { isMarketListingPinId as isMarketListingRowId } from "@/lib/market-search-demo-listings"
