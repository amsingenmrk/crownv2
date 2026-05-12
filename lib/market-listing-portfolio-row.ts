import type { PortfolioMapboxPin } from "@/components/portfolio-mapbox"
import type { AssetGroupId } from "@/lib/assets"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import { portfolioValueNoiCapFromSeed } from "@/lib/portfolio-asset-financials"
import { marketSearchDemoHash32 } from "@/lib/market-search-demo-listings"
import { portfolioClassLabelForSeed } from "@/lib/portfolio-row-for-asset"
import { formatUsdPortfolioCompact } from "@/lib/scenario-kpi-format"

const ASSET_STATUS_LABELS = [
  "Stabilized",
  "Lease-up",
  "Redevelopment",
] as const

const GROUP_ROTATION: AssetGroupId[] = ["office", "industrial", "retail"]

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
  const seed = marketSearchDemoHash32(`market-row:${pin.id}`)
  const fin = portfolioValueNoiCapFromSeed(seed)
  const g = GROUP_ROTATION[seed % GROUP_ROTATION.length]!

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
    building: pin.building,
    location: pin.location ?? "",
    ownership: "Market",
    typeLabel,
    classLabel: portfolioClassLabelForSeed(seed, 60 + (seed % 35)),
    rsf: formatRsfShort(fin.rsfSqft),
    occPct: `${60 + (seed % 35)}%`,
    pricePerSf: `$${fin.pricePerSfN}`,
    revenue: formatUsdPortfolioCompact(fin.annualRevenueUsd),
    opex: formatUsdPortfolioCompact(fin.annualOpexUsd),
    noi,
    value,
    capRate: `${fin.capRatePct.toFixed(1)}%`,
    wale: `${(4.5 + (seed % 35) / 10).toFixed(1)}y`,
    status: ASSET_STATUS_LABELS[seed % ASSET_STATUS_LABELS.length]!,
    lift: pin.lift,
    liftPercent: pin.liftPercent,
    recommendedModification: null,
  }
}

export { isMarketListingPinId as isMarketListingRowId } from "@/lib/market-search-demo-listings"
