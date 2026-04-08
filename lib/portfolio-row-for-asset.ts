import type { Asset } from "@/lib/assets"
import {
  portfolioValueNoiCapFromSeed,
  seedForAsset,
} from "@/lib/portfolio-asset-financials"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"

const RECOMMENDATIONS = [
  "Renovate Lobby",
  "Upgrade Amenities",
  "New Leasing Strategy",
  "Refresh Units",
  "Re-Tenant Space",
] as const

const ASSET_STATUS_LABELS = [
  "Stabilized",
  "Lease-up",
  "Redevelopment",
] as const

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

/** One portfolio table row — same values as the main portfolio assets grid. */
export function portfolioAssetRowForAsset(
  asset: Asset,
  index: number
): PortfolioAssetRow {
  const seed = seedForAsset(asset, index)
  const fin = portfolioValueNoiCapFromSeed(seed)
  const liftPct = 3 + (seed % 15)

  const typeLabel =
    asset.groupId === "office"
      ? "Office"
      : asset.groupId === "industrial"
        ? "Industrial"
        : asset.groupId === "retail"
          ? "Retail"
          : asset.groupLabel.length > 18
            ? `${asset.groupLabel.slice(0, 16)}…`
            : asset.groupLabel

  const value =
    fin.valueMills >= 1000
      ? `$${(fin.valueMills / 1000).toFixed(1)}B`
      : `$${fin.valueMills.toFixed(1)}M`

  const noi =
    fin.noiTenthM < 0.15 ? "$0.0" : `$${fin.noiTenthM.toFixed(1)}M`

  return {
    id: asset.id,
    groupId: asset.groupId,
    building: asset.name,
    location: asset.address,
    ownership: "Owned",
    typeLabel,
    rsf: formatRsfShort(fin.rsfSqft),
    occPct: `${asset.occupiedPercent}%`,
    pricePerSf: `$${fin.pricePerSfN}`,
    noi,
    value,
    capRate: `${fin.capRatePct.toFixed(1)}%`,
    wale: `${(4.5 + (seed % 35) / 10).toFixed(1)}y`,
    status: ASSET_STATUS_LABELS[seed % ASSET_STATUS_LABELS.length]!,
    lift: `+${liftPct}%`,
    liftPercent: liftPct,
    recommendation: RECOMMENDATIONS[seed % RECOMMENDATIONS.length]!,
  }
}
