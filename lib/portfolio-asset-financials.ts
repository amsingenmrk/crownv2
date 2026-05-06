import { ASSETS, type Asset } from "@/lib/assets"
import {
  isMarketListingPinId,
  marketSearchDemoHash32,
} from "@/lib/market-search-demo-listings"

export function seedForAsset(asset: Asset, index: number): number {
  return (
    asset.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) +
    index * 31
  )
}

/** Value / NOI / cap inputs derived from the same seed as portfolio table rows. */
export function portfolioValueNoiCapFromSeed(seed: number): {
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
  const valueMills = 180 + (seed * 53) % 2_320
  const valueUsd = valueMills * 1_000_000
  const noiTenthM = (seed % 95) / 10
  const noiUsd = noiTenthM * 1_000_000
  // Keep seeded revenue aligned with the forecast model's typical NOI margin band.
  const noiMargin = 0.56 + (seed % 7) * 0.025
  const annualRevenueUsd = noiMargin > 0 ? noiUsd / noiMargin : noiUsd
  const annualOpexUsd = Math.max(annualRevenueUsd - noiUsd, 0)
  const capRatePct = 4.2 + (seed % 28) / 10
  const rsfSqft = 120_000 + (seed * 97_331) % 3_800_000
  const pricePerSfN = 38 + (seed % 68)
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
  return portfolioValueNoiCapFromSeed(seed)
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
