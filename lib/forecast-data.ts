import { getAssetById } from "@/lib/assets"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import {
  getSampleStackingPlanData,
  type StackingPlanTenant,
} from "@/lib/stacking-plan-data"

export type ForecastScenarioId = "base" | "growth" | "defensive"

export type ForecastScenarioOption = {
  id: ForecastScenarioId
  label: string
  description: string
  quarterlyRevenueGrowthPct: number
  quarterlyOpexGrowthPct: number
  occupancyShiftPct: number
  exitCapShiftPct: number
}

export type ForecastAssumptions = {
  markToMarketEnabled: boolean
  timeToLeaseMonths: number
  occupancyTargetPct: number
  defaultRenewalProbabilityPct: number
  exitCapRatePct: number
}

export type ForecastPeriod = {
  index: number
  label: string
  quarter: number
  year: number
  startDate: string
}

export type ForecastRowKind = "currency" | "expense" | "percent"

export type ForecastStatementRow = {
  id: string
  label: string
  kind: ForecastRowKind
  values: number[]
}

export type ForecastRevenueSpaceRow = {
  id: string
  suite: string
  tenantName: string
  floor: number
  sqft: number
  isVacant: boolean
  leaseExpiration: string
  values: number[]
}

export type ForecastRevenueFloorRow = {
  id: string
  floor: number
  label: string
  sqft: number
  values: number[]
  spaces: ForecastRevenueSpaceRow[]
}

export type AssetForecastModel = {
  assetId: string
  assetName: string
  scenario: ForecastScenarioOption
  assumptions: ForecastAssumptions
  periods: ForecastPeriod[]
  statementRows: ForecastStatementRow[]
  revenueBreakdown: ForecastRevenueFloorRow[]
  summary: {
    currentOccupancyPct: number
    targetOccupancyPct: number
    currentAnnualRevenue: number
    currentAnnualOpex: number
    currentAnnualNoi: number
    exitCapRatePct: number
  }
}

const FORECAST_START_DATE = new Date("2026-04-01T00:00:00Z")
const FORECAST_QUARTER_COUNT = 8

export const FORECAST_SCENARIOS: readonly ForecastScenarioOption[] = [
  {
    id: "base",
    label: "Base",
    description: "Balanced rollover with modest growth and steady exit cap.",
    quarterlyRevenueGrowthPct: 0.75,
    quarterlyOpexGrowthPct: 0.6,
    occupancyShiftPct: 0,
    exitCapShiftPct: 0,
  },
  {
    id: "growth",
    label: "Growth",
    description: "Higher lease-up and stronger rent growth with a tighter exit cap.",
    quarterlyRevenueGrowthPct: 1.35,
    quarterlyOpexGrowthPct: 0.5,
    occupancyShiftPct: 4,
    exitCapShiftPct: -0.2,
  },
  {
    id: "defensive",
    label: "Defensive",
    description: "Slower lease-up, softer growth, and a wider terminal cap rate.",
    quarterlyRevenueGrowthPct: 0.2,
    quarterlyOpexGrowthPct: 0.9,
    occupancyShiftPct: -4,
    exitCapShiftPct: 0.35,
  },
] as const

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function assetSeed(assetId: string) {
  return assetId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setUTCMonth(next.getUTCMonth() + months)
  return next
}

function toIsoDate(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function buildForecastPeriods(count = FORECAST_QUARTER_COUNT): ForecastPeriod[] {
  return Array.from({ length: count }, (_, index) => {
    const start = addMonths(FORECAST_START_DATE, index * 3)
    const quarter = Math.floor(start.getUTCMonth() / 3) + 1
    const year = start.getUTCFullYear()
    return {
      index,
      quarter,
      year,
      label: `Q${quarter} ${String(year).slice(-2)}`,
      startDate: toIsoDate(start),
    }
  })
}

function diffInMonths(start: Date, end: Date) {
  return (
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth())
  )
}

function expirationQuarterIndex(dateValue?: string) {
  if (dateValue == null || dateValue === "") {
    return Number.POSITIVE_INFINITY
  }
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return Number.POSITIVE_INFINITY
  }
  return Math.floor(diffInMonths(FORECAST_START_DATE, date) / 3)
}

function fillArray(length: number, value: number) {
  return Array.from({ length }, () => value)
}

function sumSeries(seriesList: number[][]) {
  if (seriesList.length === 0) {
    return fillArray(FORECAST_QUARTER_COUNT, 0)
  }
  return seriesList[0]!.map((_, index) =>
    seriesList.reduce((sum, values) => sum + (values[index] ?? 0), 0)
  )
}

function deriveLeaseUpShare(currentOccupancyPct: number, targetOccupancyPct: number) {
  const currentOccupancy = currentOccupancyPct / 100
  const currentVacancy = Math.max(0.01, 1 - currentOccupancy)
  const targetOccupancy = targetOccupancyPct / 100

  if (targetOccupancy <= currentOccupancy) {
    return 0
  }

  return clamp((targetOccupancy - currentOccupancy) / currentVacancy, 0, 1)
}

function defaultContractRateForVacancy(tenant: StackingPlanTenant) {
  if (tenant.predictedRentPsfValue != null) return tenant.predictedRentPsfValue * 0.9
  return 38
}

function buildQuarterlySpaceRevenue({
  tenant,
  assumptions,
  scenario,
  leaseUpShare,
  periods,
}: {
  tenant: StackingPlanTenant
  assumptions: ForecastAssumptions
  scenario: ForecastScenarioOption
  leaseUpShare: number
  periods: ForecastPeriod[]
}) {
  const contractRate = tenant.contractRatePsfValue ?? defaultContractRateForVacancy(tenant)
  const predictedRate = tenant.predictedRentPsfValue ?? contractRate * 1.08
  const renewalProbability = clamp(assumptions.defaultRenewalProbabilityPct / 100, 0, 1)
  const timeToLeaseQuarters = Math.max(1, Math.ceil(assumptions.timeToLeaseMonths / 3))
  const expiryQuarter = expirationQuarterIndex(tenant.leaseExpirationDate)

  return periods.map((period) => {
    const growthFactor = Math.pow(1 + scenario.quarterlyRevenueGrowthPct / 100, period.index)
    const contractQuarterRevenue = (tenant.sqft * contractRate * growthFactor) / 4
    const predictedQuarterRevenue = (tenant.sqft * predictedRate * growthFactor) / 4

    if (tenant.isVacant) {
      const hasLeased = period.index >= timeToLeaseQuarters
      return hasLeased ? predictedQuarterRevenue * leaseUpShare : 0
    }

    if (period.index <= expiryQuarter) {
      return contractQuarterRevenue
    }

    const nonRenewalLeaseUpActive = period.index >= expiryQuarter + timeToLeaseQuarters

    if (!assumptions.markToMarketEnabled) {
      return contractQuarterRevenue * renewalProbability
    }

    const releaseRevenue = nonRenewalLeaseUpActive
      ? predictedQuarterRevenue * (1 - renewalProbability) * leaseUpShare
      : 0

    return contractQuarterRevenue * renewalProbability + releaseRevenue
  })
}

function deriveBaseAnnualOpex(assetId: string, annualRevenue: number) {
  const financials = financialMetricsForAssetId(assetId)
  const seed = assetSeed(assetId)
  const fallbackAnnualNoi = annualRevenue * (0.56 + ((seed % 7) * 0.025))
  const seededNoi = financials?.noiUsd ?? fallbackAnnualNoi
  const constrainedNoi = clamp(seededNoi, annualRevenue * 0.44, annualRevenue * 0.76)

  return Math.max(annualRevenue - constrainedNoi, annualRevenue * 0.22)
}

function buildQuarterlyOpex({
  periods,
  grossRevenue,
  baseAnnualOpex,
  targetOccupancyPct,
  scenario,
}: {
  periods: ForecastPeriod[]
  grossRevenue: number[]
  baseAnnualOpex: number
  targetOccupancyPct: number
  scenario: ForecastScenarioOption
}) {
  const baseQuarterOpex = baseAnnualOpex / 4
  const revenueBaseline = Math.max(grossRevenue[0] ?? 0, 1)
  const occupancyInfluence = 0.92 + (targetOccupancyPct / 100) * 0.16

  return periods.map((period) => {
    const growthFactor = Math.pow(1 + scenario.quarterlyOpexGrowthPct / 100, period.index)
    const revenueInfluence = (grossRevenue[period.index] ?? revenueBaseline) / revenueBaseline
    return baseQuarterOpex * growthFactor * (occupancyInfluence * 0.7 + revenueInfluence * 0.3)
  })
}

export function defaultForecastAssumptionsForAsset(assetId: string): ForecastAssumptions {
  const dataset = getSampleStackingPlanData(assetId)
  const financials = financialMetricsForAssetId(assetId)

  return {
    markToMarketEnabled: true,
    timeToLeaseMonths: 9,
    occupancyTargetPct: clamp(dataset.summary.overallOccupancyPercent + 4, 82, 96),
    defaultRenewalProbabilityPct: 58,
    exitCapRatePct: clamp(
      Number(((financials?.capRatePct ?? 5.25) + 0.35).toFixed(2)),
      4.75,
      6.75
    ),
  }
}

export function buildAssetForecastModel({
  assetId,
  scenarioId,
  assumptions,
}: {
  assetId: string
  scenarioId: ForecastScenarioId
  assumptions: ForecastAssumptions
}): AssetForecastModel {
  const asset = getAssetById(assetId)
  const dataset = getSampleStackingPlanData(assetId)
  const scenario =
    FORECAST_SCENARIOS.find((option) => option.id === scenarioId) ?? FORECAST_SCENARIOS[0]!
  const periods = buildForecastPeriods()

  const normalizedAssumptions: ForecastAssumptions = {
    markToMarketEnabled: assumptions.markToMarketEnabled,
    timeToLeaseMonths: clamp(Math.round(assumptions.timeToLeaseMonths), 3, 24),
    occupancyTargetPct: clamp(
      Math.round(assumptions.occupancyTargetPct + scenario.occupancyShiftPct),
      65,
      99
    ),
    defaultRenewalProbabilityPct: clamp(
      Math.round(assumptions.defaultRenewalProbabilityPct),
      10,
      95
    ),
    exitCapRatePct: clamp(
      Number((assumptions.exitCapRatePct + scenario.exitCapShiftPct).toFixed(2)),
      4,
      8
    ),
  }

  const leaseUpShare = deriveLeaseUpShare(
    dataset.summary.overallOccupancyPercent,
    normalizedAssumptions.occupancyTargetPct
  )

  const revenueBreakdown: ForecastRevenueFloorRow[] = dataset.floors.map((floor) => {
    const spaces = floor.tenants.map((tenant) => ({
      id: tenant.id,
      suite: tenant.space,
      tenantName: tenant.name,
      floor: floor.floor,
      sqft: tenant.sqft,
      isVacant: tenant.isVacant,
      leaseExpiration: tenant.expiration,
      values: buildQuarterlySpaceRevenue({
        tenant,
        assumptions: normalizedAssumptions,
        scenario,
        leaseUpShare,
        periods,
      }),
    }))

    return {
      id: `floor-${floor.floor}`,
      floor: floor.floor,
      label: `Floor ${floor.floor}`,
      sqft: floor.tenants.reduce((sum, tenant) => sum + tenant.sqft, 0),
      values: sumSeries(spaces.map((space) => space.values)),
      spaces,
    }
  })

  const grossRevenue = sumSeries(revenueBreakdown.map((floor) => floor.values))
  const currentAnnualRevenue = (grossRevenue[0] ?? 0) * 4
  const baseAnnualOpex = deriveBaseAnnualOpex(assetId, currentAnnualRevenue)
  const opex = buildQuarterlyOpex({
    periods,
    grossRevenue,
    baseAnnualOpex,
    targetOccupancyPct: normalizedAssumptions.occupancyTargetPct,
    scenario,
  })
  const noi = grossRevenue.map((value, index) => value - (opex[index] ?? 0))
  const salePrice = noi.map((value) =>
    Math.max(0, (value * 4) / (normalizedAssumptions.exitCapRatePct / 100))
  )
  const capRate = fillArray(periods.length, normalizedAssumptions.exitCapRatePct)

  return {
    assetId,
    assetName: asset?.name ?? "Selected asset",
    scenario,
    assumptions: normalizedAssumptions,
    periods,
    statementRows: [
      { id: "grossRevenue", label: "Gross Revenue", kind: "currency", values: grossRevenue },
      { id: "opex", label: "OpEx", kind: "expense", values: opex },
      { id: "noi", label: "NOI", kind: "currency", values: noi },
      { id: "salePrice", label: "Sale Price", kind: "currency", values: salePrice },
      { id: "capRate", label: "Cap Rate", kind: "percent", values: capRate },
    ],
    revenueBreakdown,
    summary: {
      currentOccupancyPct: dataset.summary.overallOccupancyPercent,
      targetOccupancyPct: normalizedAssumptions.occupancyTargetPct,
      currentAnnualRevenue,
      currentAnnualOpex: baseAnnualOpex,
      currentAnnualNoi: currentAnnualRevenue - baseAnnualOpex,
      exitCapRatePct: normalizedAssumptions.exitCapRatePct,
    },
  }
}
