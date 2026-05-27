import {
  getAssetById,
  resolveAssetGroupLabel,
  type Asset,
  type AssetGroupId,
} from "@/lib/assets"
import {
  getMarketListingPinById,
  isMarketListingPinId,
  marketSearchDemoHash32,
} from "@/lib/market-search-demo-listings"

type MarketTier = "gateway" | "coastal" | "sunbelt" | "secondary"

export type SyntheticAssetContext = {
  assetId: string
  assetName: string
  address: string
  groupId: AssetGroupId
  groupLabel: string
  occupiedPercent: number
  scope: "owned" | "market"
  seed: number
}

const MARKET_GROUP_ROTATION: readonly AssetGroupId[] = [
  "office",
  "industrial",
  "retail",
]

const BASE_MARKET_RENT_PSF: Record<AssetGroupId, Record<MarketTier, number>> = {
  office: {
    gateway: 76,
    coastal: 62,
    sunbelt: 49,
    secondary: 42,
  },
  industrial: {
    gateway: 20.5,
    coastal: 17.5,
    sunbelt: 15,
    secondary: 12.75,
  },
  retail: {
    gateway: 84,
    coastal: 62,
    sunbelt: 47,
    secondary: 39,
  },
}

const FIXED_OPEX_PSF: Record<AssetGroupId, number> = {
  office: 11.5,
  industrial: 3.75,
  retail: 5.25,
}

const VACANCY_BURDEN_PSF: Record<AssetGroupId, number> = {
  office: 4.25,
  industrial: 1.35,
  retail: 2.4,
}

const VARIABLE_OPEX_RATIO: Record<AssetGroupId, number> = {
  office: 0.17,
  industrial: 0.11,
  retail: 0.1,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function roundToHundredths(value: number) {
  return Number(value.toFixed(2))
}

function signedJitter(seedText: string, amplitude: number) {
  const unit = marketSearchDemoHash32(seedText) / 0xffff_ffff
  return (unit * 2 - 1) * amplitude
}

function normalizeAssetGroupId(groupId: string | null | undefined): AssetGroupId {
  if (groupId === "industrial" || groupId === "retail") {
    return groupId
  }
  return "office"
}

function marketTierForAddress(address: string): MarketTier {
  const normalized = address.toLowerCase()
  if (
    normalized.includes("new york") ||
    normalized.includes("san francisco") ||
    normalized.includes("boston")
  ) {
    return "gateway"
  }
  if (
    normalized.includes("seattle") ||
    normalized.includes("los angeles") ||
    normalized.includes("miami") ||
    normalized.includes("washington")
  ) {
    return "coastal"
  }
  if (
    normalized.includes("dallas") ||
    normalized.includes("atlanta") ||
    normalized.includes("phoenix") ||
    normalized.includes("charlotte") ||
    normalized.includes("nashville") ||
    normalized.includes("denver") ||
    normalized.includes("austin")
  ) {
    return "sunbelt"
  }
  return "secondary"
}

export function marketAssetGroupIdForId(assetId: string): AssetGroupId {
  const seed = marketSearchDemoHash32(`market-group:${assetId}`)
  return MARKET_GROUP_ROTATION[seed % MARKET_GROUP_ROTATION.length]!
}

export function marketListingOccupiedPercent(assetId: string): number {
  const groupId = marketAssetGroupIdForId(assetId)
  const base =
    groupId === "industrial" ? 93 : groupId === "retail" ? 86 : 79
  return clamp(
    Math.round(base + signedJitter(`market-occ:${assetId}`, 7)),
    63,
    97
  )
}

function buildSyntheticMarketAsset(assetId: string): Asset | undefined {
  const pin = getMarketListingPinById(assetId)
  if (pin == null) {
    return undefined
  }

  const groupId = marketAssetGroupIdForId(assetId)
  return {
    id: assetId,
    name: pin.building,
    groupId,
    groupLabel: resolveAssetGroupLabel(groupId),
    address: pin.location ?? "Market listing",
    imageUrl: pin.imageUrl ?? "",
    occupiedPercent: marketListingOccupiedPercent(assetId),
  }
}

export function resolveSyntheticAssetRecord(
  assetId: string,
  assetOverride?: Asset
): Asset | undefined {
  if (assetOverride != null) {
    return assetOverride
  }

  const ownedAsset = getAssetById(assetId, { overrides: {} })
  if (ownedAsset != null) {
    return ownedAsset
  }

  if (isMarketListingPinId(assetId)) {
    return buildSyntheticMarketAsset(assetId)
  }

  return undefined
}

export function resolveSyntheticAssetContext(
  assetId: string,
  assetOverride?: Asset
): SyntheticAssetContext | null {
  const asset = resolveSyntheticAssetRecord(assetId, assetOverride)
  if (asset == null) {
    return null
  }

  const groupId = normalizeAssetGroupId(asset.groupId)
  return {
    assetId,
    assetName: asset.name,
    address: asset.address,
    groupId,
    groupLabel: resolveAssetGroupLabel(groupId),
    occupiedPercent: asset.occupiedPercent,
    scope: isMarketListingPinId(assetId) ? "market" : "owned",
    seed: marketSearchDemoHash32(`asset-context:${assetId}`),
  }
}

export function syntheticAssetClassLabel(
  context: SyntheticAssetContext
): "A" | "B" | "C" {
  const tier = marketTierForAddress(context.address)
  const tierBonus =
    tier === "gateway" ? 10 : tier === "coastal" ? 5 : tier === "sunbelt" ? 2 : 0
  const qualityScore = clamp(
    28 +
      context.occupiedPercent * 0.55 +
      tierBonus +
      signedJitter(`${context.assetId}:quality`, 6),
    35,
    92
  )

  if (qualityScore >= 78) {
    return "A"
  }
  if (qualityScore >= 62) {
    return "B"
  }
  return "C"
}

function buildoutRentAdjustment(
  buildout: "Shell" | "White Box" | "Fully Built-Out"
) {
  if (buildout === "Fully Built-Out") {
    return 0.025
  }
  if (buildout === "Shell") {
    return -0.055
  }
  return 0
}

function leaseTypeRentAdjustment(leaseType?: string) {
  if (leaseType === "NNN") {
    return 0.012
  }
  if (leaseType === "Full Service") {
    return -0.01
  }
  return 0
}

function sizeRentAdjustment(groupId: AssetGroupId, sqft: number) {
  if (groupId === "industrial") {
    if (sqft >= 25_000) return 0.03
    if (sqft <= 6_000) return -0.02
    return 0
  }

  if (sqft <= 4_500) return 0.045
  if (sqft >= 18_000) return -0.04
  return 0
}

function floorRentAdjustment(
  groupId: AssetGroupId,
  floor: number,
  totalFloors: number
) {
  const position =
    totalFloors <= 1
      ? 0
      : clamp((floor - 1) / Math.max(totalFloors - 1, 1), 0, 1)

  if (groupId === "retail") {
    return roundToHundredths((0.08 - position * 0.12) * 100) / 100
  }
  if (groupId === "industrial") {
    return roundToHundredths((-0.01 + position * 0.03) * 100) / 100
  }
  return roundToHundredths((-0.03 + position * 0.11) * 100) / 100
}

function sunViewRentAdjustment(
  groupId: AssetGroupId,
  sunScore: number,
  viewScore: number
) {
  const signal = ((sunScore - 60) / 100) * 0.02 + ((viewScore - 60) / 100) * 0.03
  if (groupId === "industrial") {
    return signal * 0.35
  }
  return signal
}

export function syntheticMarketRentPsf(args: {
  asset: SyntheticAssetContext
  floor: number
  totalFloors: number
  sqft: number
  buildout: "Shell" | "White Box" | "Fully Built-Out"
  leaseType?: string
  sunScore: number
  viewScore: number
  suiteKey: string
}): number {
  const tier = marketTierForAddress(args.asset.address)
  const assetClass = syntheticAssetClassLabel(args.asset)
  const classAdj =
    assetClass === "A" ? 0.085 : assetClass === "B" ? 0 : -0.1
  const demandAdj = clamp((args.asset.occupiedPercent - 88) / 180, -0.05, 0.04)
  const jitter = signedJitter(
    `${args.asset.assetId}:${args.suiteKey}:market-rent`,
    0.025
  )

  const raw =
    BASE_MARKET_RENT_PSF[args.asset.groupId][tier] *
    (1 +
      classAdj +
      demandAdj +
      floorRentAdjustment(args.asset.groupId, args.floor, args.totalFloors) +
      sizeRentAdjustment(args.asset.groupId, args.sqft) +
      buildoutRentAdjustment(args.buildout) +
      leaseTypeRentAdjustment(args.leaseType) +
      sunViewRentAdjustment(args.asset.groupId, args.sunScore, args.viewScore) +
      jitter)

  return roundToHundredths(
    clamp(
      raw,
      BASE_MARKET_RENT_PSF[args.asset.groupId][tier] * 0.72,
      BASE_MARKET_RENT_PSF[args.asset.groupId][tier] * 1.38
    )
  )
}

export function syntheticContractRentPsf(args: {
  asset: SyntheticAssetContext
  marketRentPsf: number
  buildout: "Shell" | "White Box" | "Fully Built-Out"
  leaseType?: string
  yearsRemaining: number | null
  suiteKey: string
}): number {
  const yearsSignal =
    args.yearsRemaining == null
      ? 0
      : clamp((args.yearsRemaining - 4.5) / 4.5, -1, 1)
  const leaseTypeAdj = leaseTypeRentAdjustment(args.leaseType)
  const buildoutAdj =
    args.buildout === "Fully Built-Out"
      ? 0.015
      : args.buildout === "Shell"
        ? -0.03
        : 0
  const jitter = signedJitter(
    `${args.asset.assetId}:${args.suiteKey}:contract-rent`,
    0.045
  )
  const vintageAdj = clamp(-yearsSignal * 0.055 + jitter, -0.12, 0.08)

  return roundToHundredths(
    clamp(
      args.marketRentPsf * (1 + vintageAdj + leaseTypeAdj + buildoutAdj),
      args.marketRentPsf * 0.78,
      args.marketRentPsf * 1.12
    )
  )
}

export function syntheticPredictedRentPsf(args: {
  asset: SyntheticAssetContext
  marketRentPsf: number
  buildout: "Shell" | "White Box" | "Fully Built-Out"
  yearsRemaining: number | null
  isVacant: boolean
  suiteKey: string
}): number {
  const demandAdj = clamp((args.asset.occupiedPercent - 90) / 200, -0.045, 0.035)
  const buildoutAdj =
    args.buildout === "Fully Built-Out"
      ? 0.015
      : args.buildout === "Shell"
        ? -0.025
        : 0
  const leaseTimingAdj =
    args.yearsRemaining == null
      ? 0.01
      : clamp((2.5 - args.yearsRemaining) / 70, -0.03, 0.03)
  const vacancyAdj = args.isVacant ? -0.01 : 0
  const jitter = signedJitter(
    `${args.asset.assetId}:${args.suiteKey}:predicted-rent`,
    0.025
  )

  return roundToHundredths(
    clamp(
      args.marketRentPsf *
        (1 + demandAdj + buildoutAdj + leaseTimingAdj + vacancyAdj + jitter),
      args.marketRentPsf * 0.94,
      args.marketRentPsf * 1.08
    )
  )
}

export function syntheticAnnualOpexUsd(args: {
  asset: SyntheticAssetContext
  rsfSqft: number
  occupiedPercent: number
  annualRevenueUsd: number
}): number {
  const fixedOpexUsd = args.rsfSqft * FIXED_OPEX_PSF[args.asset.groupId]
  const vacancyBurdenUsd =
    args.rsfSqft *
    Math.max(0, 1 - args.occupiedPercent / 100) *
    VACANCY_BURDEN_PSF[args.asset.groupId]
  const variableOpexUsd =
    args.annualRevenueUsd * VARIABLE_OPEX_RATIO[args.asset.groupId]

  return roundToHundredths(fixedOpexUsd + vacancyBurdenUsd + variableOpexUsd)
}

export function syntheticCapRatePct(args: {
  asset: SyntheticAssetContext
  occupancyPct: number
  waleYears: number
}): number {
  const tier = marketTierForAddress(args.asset.address)
  const assetClass = syntheticAssetClassLabel(args.asset)
  const base =
    args.asset.groupId === "industrial"
      ? 5.15
      : args.asset.groupId === "retail"
        ? 5.85
        : 5.55
  const tierAdj =
    tier === "gateway"
      ? -0.35
      : tier === "coastal"
        ? -0.12
        : tier === "sunbelt"
          ? 0.05
          : 0.18
  const classAdj =
    assetClass === "A" ? -0.24 : assetClass === "B" ? 0 : 0.32
  const occupancyAdj = clamp((90 - args.occupancyPct) / 40, -0.08, 0.32)
  const waleAdj = clamp((4.5 - args.waleYears) / 18, -0.06, 0.16)
  const scopeAdj = args.asset.scope === "market" ? 0.12 : 0
  const jitter = signedJitter(`${args.asset.assetId}:cap-rate`, 0.08)

  return roundToHundredths(
    clamp(base + tierAdj + classAdj + occupancyAdj + waleAdj + scopeAdj + jitter, 4.5, 7.25)
  )
}

export function syntheticAssetStatus(args: {
  occupancyPct: number
  waleYears: number
}): "Stabilized" | "Lease-up" | "Redevelopment" {
  if (args.occupancyPct >= 90 && args.waleYears >= 4.5) {
    return "Stabilized"
  }
  if (args.occupancyPct >= 74) {
    return "Lease-up"
  }
  return "Redevelopment"
}

export function syntheticDefaultLeaseType(args: {
  asset: SyntheticAssetContext
  suiteKey: string
  isVacant: boolean
}): "Modified Gross" | "NNN" | "Full Service" | undefined {
  if (args.isVacant) {
    return undefined
  }

  const roll = marketSearchDemoHash32(
    `${args.asset.assetId}:${args.suiteKey}:lease-type`
  ) % 100
  if (args.asset.groupId === "industrial") {
    return roll < 78 ? "NNN" : "Modified Gross"
  }
  if (args.asset.groupId === "retail") {
    return roll < 68 ? "NNN" : "Modified Gross"
  }
  return roll < 56 ? "Modified Gross" : "Full Service"
}

export function syntheticDefaultTimeToLeaseMonths(args: {
  asset: SyntheticAssetContext
  buildout: "Shell" | "White Box" | "Fully Built-Out"
  floor: number
  totalFloors: number
  sqft: number
  suiteKey: string
}): number {
  const base =
    args.asset.groupId === "industrial"
      ? 6
      : args.asset.groupId === "retail"
        ? 7
        : 9
  const buildoutAdj =
    args.buildout === "Fully Built-Out"
      ? -2
      : args.buildout === "Shell"
        ? 3
        : 0
  const floorAdj =
    args.asset.groupId === "retail"
      ? args.floor <= 2
        ? -1
        : 1
      : args.asset.groupId === "office"
        ? args.floor / Math.max(args.totalFloors, 1) > 0.75
          ? -1
          : 0
        : 0
  const sizeAdj =
    args.sqft >= 18_000 ? 2 : args.sqft <= 4_500 ? -1 : 0
  const occupancyAdj =
    args.asset.occupiedPercent >= 90
      ? -1
      : args.asset.occupiedPercent <= 72
        ? 2
        : 0
  const jitter = Math.round(
    signedJitter(`${args.asset.assetId}:${args.suiteKey}:ttl`, 1.2)
  )

  return clamp(base + buildoutAdj + floorAdj + sizeAdj + occupancyAdj + jitter, 3, 18)
}

export function syntheticDefaultRenewalProbabilityPct(args: {
  asset: SyntheticAssetContext
  leaseType?: string
  yearsRemaining: number | null
  suiteKey: string
}): number {
  const base =
    args.asset.groupId === "industrial"
      ? 67
      : args.asset.groupId === "retail"
        ? 56
        : 54
  const leaseTypeAdj =
    args.leaseType === "NNN" ? 4 : args.leaseType === "Full Service" ? -2 : 0
  const termAdj =
    args.yearsRemaining == null
      ? 0
      : Math.round(clamp((args.yearsRemaining - 4.5) * 1.8, -6, 6))
  const occupancyAdj =
    args.asset.occupiedPercent >= 90
      ? 3
      : args.asset.occupiedPercent <= 72
        ? -4
        : 0
  const jitter = Math.round(
    signedJitter(`${args.asset.assetId}:${args.suiteKey}:renewal`, 4)
  )

  return clamp(base + leaseTypeAdj + termAdj + occupancyAdj + jitter, 28, 82)
}
