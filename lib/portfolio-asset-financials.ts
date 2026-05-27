import { ASSETS, type Asset } from "@/lib/assets"
import {
  isMarketListingPinId,
  marketSearchDemoHash32,
} from "@/lib/market-search-demo-listings"
import { getSampleStackingPlanData } from "@/lib/stacking-plan-data"

export function seedForAsset(asset: Asset, index: number): number {
  return (
    asset.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) +
    index * 31
  )
}

function seededCapRatePct(seed: number) {
  return 4.2 + (seed % 28) / 10
}

function seededNoiMargin(seed: number) {
  return 0.56 + (seed % 7) * 0.025
}

function seededRsfSqft(seed: number) {
  return 120_000 + (seed * 97_331) % 3_800_000
}

function seededAnnualRevenueUsd(seed: number, rsfSqft: number) {
  const occupiedShare = 0.62 + (seed % 25) / 100
  const inPlaceRentPsf = 24 + ((seed >> 4) % 24)
  return rsfSqft * occupiedShare * inPlaceRentPsf
}

function datasetAnnualRevenueUsd(assetId: string, asset?: Asset) {
  const dataset = getSampleStackingPlanData(assetId, asset)
  const annualRevenueUsd = dataset.floors.reduce(
    (total, floor) =>
      total +
      floor.tenants.reduce((floorTotal, tenant) => {
        if (tenant.isVacant) {
          return floorTotal
        }
        return floorTotal + tenant.sqft * (tenant.contractRatePsfValue ?? 0)
      }, 0),
    0
  )

  return {
    annualRevenueUsd,
    rsfSqft: dataset.summary.totalSqft,
  }
}

/** Value / NOI / cap inputs derived from the same seed as portfolio table rows. */
export function portfolioValueNoiCapFromSeed(
  seed: number,
  overrides?: {
    annualRevenueUsd?: number
    rsfSqft?: number
  }
): {
  valueMills: number
  valueUsd: number
  noiTenthM: number
  noiUsd: number
  annualRevenueUsd: number
  annualOpexUsd: number
  capRatePct: number
  rsfSqft: number
  pricePerSfN: number
} {
  const rsfSqft = overrides?.rsfSqft ?? seededRsfSqft(seed)
  const annualRevenueUsd =
    overrides?.annualRevenueUsd ?? seededAnnualRevenueUsd(seed, rsfSqft)
  const noiMargin = seededNoiMargin(seed)
  const noiUsd = annualRevenueUsd * noiMargin
  const annualOpexUsd = Math.max(annualRevenueUsd - noiUsd, 0)
  const capRatePct = seededCapRatePct(seed)
  const valueUsd = capRatePct > 0 ? noiUsd / (capRatePct / 100) : 0
  const valueMills = valueUsd / 1_000_000
  const noiTenthM = noiUsd / 1_000_000
  const pricePerSfN =
    rsfSqft > 0 ? Math.max(1, Math.round(valueUsd / rsfSqft)) : 0
  return {
    valueMills,
    valueUsd,
    noiTenthM,
    noiUsd,
    annualRevenueUsd,
    annualOpexUsd,
    capRatePct,
    rsfSqft,
    pricePerSfN,
  }
}

export function financialMetricsForAssetAtIndex(asset: Asset, index: number) {
  const seed = seedForAsset(asset, index)
  const { annualRevenueUsd, rsfSqft } = datasetAnnualRevenueUsd(asset.id, asset)
  return portfolioValueNoiCapFromSeed(seed, {
    annualRevenueUsd,
    rsfSqft,
  })
}

export function financialMetricsForAssetId(assetId: string) {
  if (isMarketListingPinId(assetId)) {
    const seed = marketSearchDemoHash32(`market-row:${assetId}`)
    return portfolioValueNoiCapFromSeed(seed)
  }
  const index = ASSETS.findIndex((a) => a.id === assetId)
  if (index < 0) return null
  return financialMetricsForAssetAtIndex(ASSETS[index]!, index)
}
