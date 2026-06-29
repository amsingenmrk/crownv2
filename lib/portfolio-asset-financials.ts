import { type Asset } from "@/lib/assets"
import {
  buildRealFinancialMetrics,
  isRealAssetId,
} from "@/lib/real-properties"
import {
  getSampleStackingPlanData,
  syntheticAssetDataCacheKey,
} from "@/lib/stacking-plan-data"
import {
  resolveSyntheticAssetContext,
  resolveSyntheticAssetRecord,
  syntheticAnnualOpexUsd,
  syntheticAssetClassLabel,
  syntheticAssetStatus,
  syntheticCapRatePct,
} from "@/lib/synthetic-asset-calibration"

export function seedForAsset(asset: Asset, index: number): number {
  return (
    asset.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) +
    index * 31
  )
}

export type AssetFinancialMetrics = {
  assetId: string
  assetName: string
  groupId: string
  groupLabel: string
  scope: "owned" | "market"
  valueMills: number
  valueUsd: number
  noiTenthM: number
  noiUsd: number
  annualRevenueUsd: number
  annualMarketRevenueUsd: number
  annualPredictedRevenueUsd: number
  annualOpexUsd: number
  currentExpenseRatio: number
  capRatePct: number
  rsfSqft: number
  occupiedSqft: number
  vacantSqft: number
  occupancyPct: number
  vacancyPct: number
  inPlaceRentPsf: number
  marketRentPsf: number
  predictedRentPsf: number
  pricePerSfN: number
  waleYears: number
  classLabel: "A" | "B" | "C"
  status: "Stabilized" | "Lease-up" | "Redevelopment"
}

const financialMetricsCache = new Map<string, AssetFinancialMetrics | null>()

function buildDatasetRevenueRollups(assetId: string, asset?: Asset) {
  const dataset = getSampleStackingPlanData(assetId, asset)
  const rollups = dataset.floors.flatMap((floor) => floor.tenants).reduce(
    (acc, tenant) => {
      acc.marketRevenueUsd += tenant.sqft * (tenant.marketRentPsfValue ?? 0)
      acc.predictedRevenueUsd += tenant.sqft * (tenant.predictedRentPsfValue ?? 0)

      if (!tenant.isVacant) {
        acc.inPlaceRevenueUsd += tenant.sqft * (tenant.contractRatePsfValue ?? 0)
      }

      return acc
    },
    {
      inPlaceRevenueUsd: 0,
      marketRevenueUsd: 0,
      predictedRevenueUsd: 0,
    }
  )

  return { dataset, ...rollups }
}

function buildFinancialMetrics(assetId: string, asset?: Asset): AssetFinancialMetrics | null {
  if (isRealAssetId(assetId)) {
    return buildRealFinancialMetrics(assetId)
  }

  const cacheKey = syntheticAssetDataCacheKey(assetId, asset)
  if (financialMetricsCache.has(cacheKey)) {
    return financialMetricsCache.get(cacheKey) ?? null
  }

  const resolvedAsset = resolveSyntheticAssetRecord(assetId, asset)
  const assetContext = resolveSyntheticAssetContext(assetId, resolvedAsset)
  if (assetContext == null) {
    financialMetricsCache.set(cacheKey, null)
    return null
  }

  const { dataset, inPlaceRevenueUsd, marketRevenueUsd, predictedRevenueUsd } =
    buildDatasetRevenueRollups(assetId, resolvedAsset)
  const rsfSqft = dataset.summary.totalSqft
  const occupiedSqft = dataset.summary.occupiedSqft
  const vacantSqft = dataset.summary.vacantSqft
  const occupancyPct = dataset.summary.overallOccupancyPercent
  const vacancyPct = Math.max(0, 100 - occupancyPct)
  const inPlaceRentPsf =
    occupiedSqft > 0
      ? inPlaceRevenueUsd / occupiedSqft
      : dataset.summary.averageContractRentPsf
  const marketRentPsf =
    rsfSqft > 0
      ? marketRevenueUsd / rsfSqft
      : dataset.summary.averageMarketRentPsf
  const predictedRentPsf =
    rsfSqft > 0
      ? predictedRevenueUsd / rsfSqft
      : dataset.summary.averagePredictedRentPsf
  const annualOpexUsd = syntheticAnnualOpexUsd({
    asset: assetContext,
    rsfSqft,
    occupiedPercent: occupancyPct,
    annualRevenueUsd: inPlaceRevenueUsd,
  })
  const noiUsd = Math.max(0, inPlaceRevenueUsd - annualOpexUsd)
  const waleYears = dataset.summary.waleYears
  const capRatePct = syntheticCapRatePct({
    asset: assetContext,
    occupancyPct,
    waleYears,
  })
  const valueUsd = capRatePct > 0 ? noiUsd / (capRatePct / 100) : 0

  const metrics = {
    assetId,
    assetName: assetContext.assetName,
    groupId: assetContext.groupId,
    groupLabel: assetContext.groupLabel,
    scope: assetContext.scope,
    valueMills: valueUsd / 1_000_000,
    valueUsd,
    noiTenthM: noiUsd / 1_000_000,
    noiUsd,
    annualRevenueUsd: inPlaceRevenueUsd,
    annualMarketRevenueUsd: marketRevenueUsd,
    annualPredictedRevenueUsd: predictedRevenueUsd,
    annualOpexUsd,
    currentExpenseRatio:
      inPlaceRevenueUsd > 0 ? annualOpexUsd / inPlaceRevenueUsd : 0,
    capRatePct,
    rsfSqft,
    occupiedSqft,
    vacantSqft,
    occupancyPct,
    vacancyPct,
    inPlaceRentPsf,
    marketRentPsf,
    predictedRentPsf,
    pricePerSfN:
      rsfSqft > 0 ? Math.max(1, Math.round(valueUsd / rsfSqft)) : 0,
    waleYears,
    classLabel: syntheticAssetClassLabel(assetContext),
    status: syntheticAssetStatus({ occupancyPct, waleYears }),
  }

  financialMetricsCache.set(cacheKey, metrics)
  return metrics
}

/** Canonical synthetic financial snapshot used across portfolio, search, compare, and detail surfaces. */
export function financialMetricsForAssetAtIndex(
  asset: Asset,
  _index: number
): AssetFinancialMetrics | null {
  return buildFinancialMetrics(asset.id, asset)
}

export function financialMetricsForAssetId(
  assetId: string
): AssetFinancialMetrics | null {
  return buildFinancialMetrics(assetId)
}
