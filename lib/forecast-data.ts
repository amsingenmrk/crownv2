import { getAssetById } from "@/lib/assets"
import {
  INITIAL_MOD_VALUES,
  type ModValues,
} from "@/components/building-modifications-sidebar"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import { upliftFromModValues } from "@/lib/scenario-modification-uplift"
import {
  getSampleStackingPlanData,
  type StackingPlanDataset,
  type StackingPlanTenant,
} from "@/lib/stacking-plan-data"

export type ForecastScenarioId = string

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

export type ForecastScenarioMacroPeriod = ForecastPeriod & {
  inflationPct: number
  treasuryRatePct: number
  submarketOccupancyPct: number
}

export type ForecastEconomicOutlookScenario = {
  id: ForecastScenarioId
  name: string
  isPreset: boolean
  macroPeriods: ForecastScenarioMacroPeriod[]
}

export type ForecastRowKind = "currency" | "expense" | "percent"

export type ForecastStatementUncertaintyBand = {
  lowerValues: number[]
  upperValues: number[]
  label: string
}

export type ForecastStatementRow = {
  id: string
  label: string
  kind: ForecastRowKind
  values: number[]
  uncertaintyBand?: ForecastStatementUncertaintyBand
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
  scenario: ForecastEconomicOutlookScenario
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

export function buildForecastPeriods(
  count = FORECAST_QUARTER_COUNT
): ForecastPeriod[] {
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

function valueForPeriod(values: readonly number[], index: number) {
  return (
    values[Math.min(index, values.length - 1)] ?? values[values.length - 1] ?? 0
  )
}

function buildMacroPeriods({
  inflationValues,
  treasuryValues,
  occupancyValues,
}: {
  inflationValues: readonly number[]
  treasuryValues: readonly number[]
  occupancyValues: readonly number[]
}): ForecastScenarioMacroPeriod[] {
  return buildForecastPeriods().map((period, index) => ({
    ...period,
    inflationPct: valueForPeriod(inflationValues, index),
    treasuryRatePct: valueForPeriod(treasuryValues, index),
    submarketOccupancyPct: valueForPeriod(occupancyValues, index),
  }))
}

function buildPresetScenario({
  id,
  name,
  inflationValues,
  treasuryValues,
  occupancyValues,
}: {
  id: ForecastScenarioId
  name: string
  inflationValues: readonly number[]
  treasuryValues: readonly number[]
  occupancyValues: readonly number[]
}): ForecastEconomicOutlookScenario {
  return {
    id,
    name,
    isPreset: true,
    macroPeriods: buildMacroPeriods({
      inflationValues,
      treasuryValues,
      occupancyValues,
    }),
  }
}

export function buildDefaultForecastScenarios(): ForecastEconomicOutlookScenario[] {
  return [
    buildPresetScenario({
      id: "baseline",
      name: "Baseline",
      inflationValues: [3.0, 2.9, 2.9, 2.8, 2.8, 2.7, 2.7, 2.6],
      treasuryValues: [4.5, 4.45, 4.4, 4.35, 4.3, 4.25, 4.2, 4.15],
      occupancyValues: [86.0, 86.2, 86.4, 86.6, 86.8, 87.0, 87.1, 87.2],
    }),
    buildPresetScenario({
      id: "optimistic",
      name: "Optimistic",
      inflationValues: [2.8, 2.7, 2.6, 2.6, 2.5, 2.5, 2.4, 2.4],
      treasuryValues: [4.35, 4.25, 4.15, 4.1, 4.0, 3.95, 3.9, 3.85],
      occupancyValues: [87.0, 87.4, 87.8, 88.2, 88.6, 89.0, 89.3, 89.5],
    }),
    buildPresetScenario({
      id: "pessimistic",
      name: "Pessimistic",
      inflationValues: [3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.0],
      treasuryValues: [4.75, 4.85, 4.95, 5.05, 5.15, 5.25, 5.35, 5.45],
      occupancyValues: [85.2, 84.8, 84.4, 84.0, 83.6, 83.2, 82.8, 82.4],
    }),
  ]
}

export function createForecastScenarioFromTemplate({
  id,
  name,
  template,
}: {
  id: ForecastScenarioId
  name: string
  template?: ForecastEconomicOutlookScenario
}): ForecastEconomicOutlookScenario {
  const baseTemplate = template ?? buildDefaultForecastScenarios()[0]!

  return {
    id,
    name,
    isPreset: false,
    macroPeriods: baseTemplate.macroPeriods.map((period) => ({
      ...period,
    })),
  }
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

function scaleSeries(values: number[], factors: number[]) {
  return values.map((value, index) => value * (factors[index] ?? 1))
}

function deriveLeaseUpShare(
  currentOccupancyPct: number,
  targetOccupancyPct: number
) {
  const currentOccupancy = currentOccupancyPct / 100
  const currentVacancy = Math.max(0.01, 1 - currentOccupancy)
  const targetOccupancy = targetOccupancyPct / 100

  if (targetOccupancy <= currentOccupancy) {
    return 0
  }

  return clamp((targetOccupancy - currentOccupancy) / currentVacancy, 0, 1)
}

function defaultContractRateForVacancy(tenant: StackingPlanTenant) {
  if (tenant.predictedRentPsfValue != null)
    return tenant.predictedRentPsfValue * 0.9
  return 38
}

function macroPeriodForIndex(
  scenario: ForecastEconomicOutlookScenario,
  index: number
): ForecastScenarioMacroPeriod {
  return scenario.macroPeriods[
    Math.min(index, scenario.macroPeriods.length - 1)
  ]!
}

function scenarioEffectsForPeriod(macroPeriod: ForecastScenarioMacroPeriod): {
  rentFactor: number
  releaseFactor: number
  opexFactor: number
  occupancyTargetAdjustmentPct: number
  exitCapAdjustmentPct: number
} {
  const inflationDelta = macroPeriod.inflationPct - 3
  const treasuryDelta = macroPeriod.treasuryRatePct - 4.5
  const occupancyDelta = macroPeriod.submarketOccupancyPct - 86

  return {
    rentFactor: clamp(
      1 +
        inflationDelta * 0.025 +
        occupancyDelta * 0.007 -
        treasuryDelta * 0.015,
      0.88,
      1.18
    ),
    releaseFactor: clamp(
      1 + occupancyDelta * 0.01 - treasuryDelta * 0.02,
      0.82,
      1.22
    ),
    opexFactor: clamp(
      1 + inflationDelta * 0.04 + macroPeriod.inflationPct * 0.012,
      0.96,
      1.18
    ),
    occupancyTargetAdjustmentPct: occupancyDelta * 0.45 - treasuryDelta * 0.25,
    exitCapAdjustmentPct:
      treasuryDelta * 0.32 - occupancyDelta * 0.03 + inflationDelta * 0.04,
  }
}

function buildQuarterlySpaceRevenue({
  tenant,
  assumptions,
  scenario,
  currentOccupancyPct,
  periods,
}: {
  tenant: StackingPlanTenant
  assumptions: ForecastAssumptions
  scenario: ForecastEconomicOutlookScenario
  currentOccupancyPct: number
  periods: ForecastPeriod[]
}) {
  const contractRate =
    tenant.contractRatePsfValue ?? defaultContractRateForVacancy(tenant)
  const predictedRate = tenant.predictedRentPsfValue ?? contractRate * 1.08
  const renewalProbability = clamp(
    (tenant.renewalProbabilityPct ?? assumptions.defaultRenewalProbabilityPct) / 100,
    0,
    1
  )
  const timeToLeaseQuarters = Math.max(
    1,
    Math.ceil((tenant.timeToLeaseMonths ?? assumptions.timeToLeaseMonths) / 3)
  )
  const expiryQuarter = expirationQuarterIndex(tenant.leaseExpirationDate)

  return periods.map((period) => {
    const macroPeriod = macroPeriodForIndex(scenario, period.index)
    const effects = scenarioEffectsForPeriod(macroPeriod)
    const effectiveTargetOccupancyPct = clamp(
      assumptions.occupancyTargetPct + effects.occupancyTargetAdjustmentPct,
      65,
      99
    )
    const leaseUpShare = deriveLeaseUpShare(
      currentOccupancyPct,
      effectiveTargetOccupancyPct
    )
    const contractQuarterRevenue =
      (tenant.sqft * contractRate * effects.rentFactor) / 4
    const predictedQuarterRevenue =
      (tenant.sqft * predictedRate * effects.rentFactor) / 4

    if (tenant.isVacant) {
      const hasLeased = period.index >= timeToLeaseQuarters
      return hasLeased
        ? predictedQuarterRevenue * leaseUpShare * effects.releaseFactor
        : 0
    }

    if (period.index <= expiryQuarter) {
      return contractQuarterRevenue
    }

    const nonRenewalLeaseUpActive =
      period.index >= expiryQuarter + timeToLeaseQuarters
    const releaseRevenue = nonRenewalLeaseUpActive
      ? predictedQuarterRevenue *
        (1 - renewalProbability) *
        leaseUpShare *
        effects.releaseFactor
      : 0

    return contractQuarterRevenue * renewalProbability + releaseRevenue
  })
}

export function deriveBaseAnnualOpex(assetId: string, annualRevenue: number) {
  const financials = financialMetricsForAssetId(assetId)
  const seed = assetSeed(assetId)
  const fallbackAnnualNoi = annualRevenue * (0.56 + (seed % 7) * 0.025)
  const seededNoi = financials?.noiUsd ?? fallbackAnnualNoi
  const constrainedNoi = clamp(
    seededNoi,
    annualRevenue * 0.44,
    annualRevenue * 0.76
  )

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
  scenario: ForecastEconomicOutlookScenario
}) {
  const baseQuarterOpex = baseAnnualOpex / 4
  const revenueBaseline = Math.max(grossRevenue[0] ?? 0, 1)
  const occupancyInfluence = 0.92 + (targetOccupancyPct / 100) * 0.16

  return periods.map((period) => {
    const macroPeriod = macroPeriodForIndex(scenario, period.index)
    const effects = scenarioEffectsForPeriod(macroPeriod)
    const revenueInfluence =
      (grossRevenue[period.index] ?? revenueBaseline) / revenueBaseline
    const marketOccupancyInfluence =
      0.84 + (macroPeriod.submarketOccupancyPct / 100) * 0.18

    return (
      baseQuarterOpex *
      effects.opexFactor *
      (occupancyInfluence * 0.55 +
        revenueInfluence * 0.25 +
        marketOccupancyInfluence * 0.2)
    )
  })
}

function buildHeuristicUncertaintyBand({
  rowId,
  kind,
  values,
}: {
  rowId: string
  kind: ForecastRowKind
  values: number[]
}): ForecastStatementUncertaintyBand {
  const lowerValues = values.map((value, index) => {
    const spread = heuristicUncertaintySpread({ rowId, kind, value, index })
    if (kind === "percent") {
      return clamp(Number((value - spread).toFixed(2)), 0, 100)
    }
    return Math.max(0, Number((value - spread).toFixed(2)))
  })

  const upperValues = values.map((value, index) => {
    const spread = heuristicUncertaintySpread({ rowId, kind, value, index })
    if (kind === "percent") {
      return clamp(Number((value + spread).toFixed(2)), 0, 100)
    }
    return Math.max(0, Number((value + spread).toFixed(2)))
  })

  return {
    lowerValues,
    upperValues,
    label: "Estimated uncertainty envelope",
  }
}

function heuristicUncertaintySpread({
  rowId,
  kind,
  value,
  index,
}: {
  rowId: string
  kind: ForecastRowKind
  value: number
  index: number
}) {
  if (kind === "percent") {
    const base =
      rowId === "capRate"
        ? 0.18
        : 0.3
    const step =
      rowId === "capRate"
        ? 0.05
        : 0.08
    return Number((base + index * step).toFixed(2))
  }

  const absoluteValue = Math.abs(value)
  const basePct =
    rowId === "salePrice"
      ? 0.06
      : rowId === "noi"
        ? 0.05
        : rowId === "opex"
          ? 0.035
          : 0.04
  const periodStep =
    rowId === "salePrice"
      ? 0.02
      : rowId === "noi"
        ? 0.017
        : rowId === "opex"
          ? 0.01
          : 0.013

  return Number((absoluteValue * (basePct + index * periodStep)).toFixed(2))
}

export function defaultForecastAssumptionsForAsset(
  assetId: string
): ForecastAssumptions {
  const dataset = getSampleStackingPlanData(assetId)
  const financials = financialMetricsForAssetId(assetId)

  return {
    markToMarketEnabled: true,
    timeToLeaseMonths: 9,
    occupancyTargetPct: clamp(
      dataset.summary.overallOccupancyPercent + 4,
      82,
      96
    ),
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
  scenario,
  assumptions,
  modValues = INITIAL_MOD_VALUES,
  stackingPlanData,
}: {
  assetId: string
  scenario: ForecastEconomicOutlookScenario
  assumptions: ForecastAssumptions
  modValues?: ModValues
  stackingPlanData?: StackingPlanDataset
}): AssetForecastModel {
  const asset = getAssetById(assetId)
  const dataset = stackingPlanData ?? getSampleStackingPlanData(assetId)
  const periods = buildForecastPeriods()

  const normalizedAssumptions: ForecastAssumptions = {
    markToMarketEnabled: true,
    timeToLeaseMonths: clamp(Math.round(assumptions.timeToLeaseMonths), 3, 24),
    occupancyTargetPct: clamp(
      Math.round(assumptions.occupancyTargetPct),
      65,
      99
    ),
    defaultRenewalProbabilityPct: clamp(
      Math.round(assumptions.defaultRenewalProbabilityPct),
      10,
      95
    ),
    exitCapRatePct: clamp(Number(assumptions.exitCapRatePct.toFixed(2)), 4, 8),
  }

  const baseRevenueBreakdown: ForecastRevenueFloorRow[] = dataset.floors.map(
    (floor) => {
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
          currentOccupancyPct: dataset.summary.overallOccupancyPercent,
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
    }
  )

  const baseGrossRevenue = sumSeries(
    baseRevenueBreakdown.map((floor) => floor.values)
  )
  const baseCurrentAnnualRevenue = (baseGrossRevenue[0] ?? 0) * 4
  const { valueMult, noiMult } = upliftFromModValues(modValues)
  const baseAnnualOpex = deriveBaseAnnualOpex(assetId, baseCurrentAnnualRevenue)
  const baseOpex = buildQuarterlyOpex({
    periods,
    grossRevenue: baseGrossRevenue,
    baseAnnualOpex,
    targetOccupancyPct: normalizedAssumptions.occupancyTargetPct,
    scenario,
  })
  const baseNoi = baseGrossRevenue.map(
    (value, index) => value - (baseOpex[index] ?? 0)
  )

  const grossRevenue = baseGrossRevenue.map(
    (value, index) => value + Math.max(0, baseNoi[index] ?? 0) * (noiMult - 1)
  )
  const revenueScaleFactors = baseGrossRevenue.map((value, index) =>
    value > 0 ? (grossRevenue[index] ?? value) / value : 1
  )
  const revenueBreakdown = baseRevenueBreakdown.map((floor) => ({
    ...floor,
    values: scaleSeries(floor.values, revenueScaleFactors),
    spaces: floor.spaces.map((space) => ({
      ...space,
      values: scaleSeries(space.values, revenueScaleFactors),
    })),
  }))
  const currentAnnualRevenue = (grossRevenue[0] ?? 0) * 4
  const opex = buildQuarterlyOpex({
    periods,
    grossRevenue,
    baseAnnualOpex,
    targetOccupancyPct: normalizedAssumptions.occupancyTargetPct,
    scenario,
  })
  const noi = grossRevenue.map((value, index) => value - (opex[index] ?? 0))
  const capRate = periods.map((period) => {
    const macroPeriod = macroPeriodForIndex(scenario, period.index)
    const effects = scenarioEffectsForPeriod(macroPeriod)

    return clamp(
      Number(
        (
          normalizedAssumptions.exitCapRatePct + effects.exitCapAdjustmentPct
        ).toFixed(2)
      ),
      4,
      8
    )
  })
  const baseSalePrice = baseNoi.map((value, index) =>
    Math.max(
      0,
      (value * 4) /
        ((capRate[index] ?? normalizedAssumptions.exitCapRatePct) / 100)
    )
  )
  const salePrice = baseSalePrice.map((value) => value * valueMult)

  const baseStatementRows: ForecastStatementRow[] = [
    {
      id: "grossRevenue",
      label: "Gross Revenue",
      kind: "currency",
      values: grossRevenue,
    },
    { id: "opex", label: "OpEx", kind: "expense", values: opex },
    { id: "noi", label: "NOI", kind: "currency", values: noi },
    {
      id: "salePrice",
      label: "Asset Value",
      kind: "currency",
      values: salePrice,
    },
    { id: "capRate", label: "Cap Rate", kind: "percent", values: capRate },
  ]
  const statementRows: ForecastStatementRow[] = baseStatementRows.map((row) => ({
    ...row,
    uncertaintyBand: buildHeuristicUncertaintyBand({
      rowId: row.id,
      kind: row.kind,
      values: row.values,
    }),
  }))

  return {
    assetId,
    assetName: asset?.name ?? "Selected asset",
    scenario,
    assumptions: normalizedAssumptions,
    periods,
    statementRows,
    revenueBreakdown,
    summary: {
      currentOccupancyPct: dataset.summary.overallOccupancyPercent,
      targetOccupancyPct: normalizedAssumptions.occupancyTargetPct,
      currentAnnualRevenue,
      currentAnnualOpex: baseAnnualOpex,
      currentAnnualNoi: (noi[0] ?? 0) * 4,
      exitCapRatePct:
        capRate[capRate.length - 1] ?? normalizedAssumptions.exitCapRatePct,
    },
  }
}
