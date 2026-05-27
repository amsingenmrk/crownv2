import type { Asset } from "@/lib/assets"
import { financialMetricsForAssetAtIndex } from "@/lib/portfolio-asset-financials"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import { formatUsdPortfolioCompact } from "@/lib/scenario-kpi-format"
import { getTopSingleModificationRecommendationForAsset } from "@/lib/modification-recommendations"

export function formatRsfShort(sqft: number): string {
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

function formatLiftPercent(value: number) {
  const rounded = Number(value.toFixed(1))
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`
}

function sectorLabelForAsset(asset: Asset) {
  return asset.groupId === "office"
    ? "Office"
    : asset.groupId === "industrial"
      ? "Industrial"
      : asset.groupId === "retail"
        ? "Retail"
        : asset.groupLabel.length > 18
          ? `${asset.groupLabel.slice(0, 16)}…`
          : asset.groupLabel
}

/** One portfolio table row — same values as the main portfolio assets grid. */
export function portfolioAssetRowForAsset(
  asset: Asset,
  index: number
): PortfolioAssetRow {
  const fin = financialMetricsForAssetAtIndex(asset, index)
  const recommendation = getTopSingleModificationRecommendationForAsset(
    asset.id,
    asset
  )
  const typeLabel = sectorLabelForAsset(asset)
  const liftPercent = Number((recommendation?.averageLiftPct ?? 0).toFixed(1))

  if (fin == null) {
    return {
      id: asset.id,
      groupId: asset.groupId,
      building: asset.name,
      location: asset.address,
      ownership: "Owned",
      typeLabel,
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
      lift: recommendation == null ? "—" : formatLiftPercent(liftPercent),
      liftPercent,
      recommendedModification: recommendation,
    }
  }

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
    lift: recommendation == null ? "—" : formatLiftPercent(liftPercent),
    liftPercent,
    recommendedModification: recommendation,
  }
}
