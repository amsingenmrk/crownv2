import { getAssetById } from "@/lib/assets"
import { INITIAL_MOD_VALUES, type ModValues } from "@/lib/building-modifications"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import {
  getRealForecastJson,
  isRealAssetId,
  type RealForecastJson,
} from "@/lib/real-properties"
import {
  upliftFromModValues,
  type ModificationUnderwritingUplift,
} from "@/lib/scenario-modification-uplift"
import {
  getSampleStackingPlanData,
  type StackingPlanDataset,
  type StackingPlanTenant,
} from "@/lib/stacking-plan-data"
import {
  resolveSyntheticAssetContext,
  syntheticAnnualOpexUsd,
} from "@/lib/synthetic-asset-calibration"

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

export type ForecastRowKind = "currency" | "expense" | "percent" | "rentPsf"

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

export function deriveLeaseUpShare(
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

export function defaultContractRateForVacancy(tenant: StackingPlanTenant) {
  if (tenant.marketRentPsfValue != null) {
    return tenant.marketRentPsfValue * 0.97
  }
  if (tenant.predictedRentPsfValue != null) {
    return tenant.predictedRentPsfValue * 0.94
  }
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

export function scenarioEffectsForPeriod(macroPeriod: ForecastScenarioMacroPeriod): {
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

function effectiveForecastTargetOccupancyPct({
  currentOccupancyPct,
  periodIndex,
  scenario,
  modificationUplift,
}: {
  currentOccupancyPct: number
  periodIndex: number
  scenario: ForecastEconomicOutlookScenario
  modificationUplift: ModificationUnderwritingUplift
}) {
  const macroPeriod = macroPeriodForIndex(scenario, periodIndex)
  const effects = scenarioEffectsForPeriod(macroPeriod)
  return clamp(
    currentOccupancyPct +
      effects.occupancyTargetAdjustmentPct +
      modificationUplift.occupancyLiftPct,
    65,
    99
  )
}

function buildQuarterlySpaceRevenue({
  tenant,
  assumptions,
  scenario,
  currentOccupancyPct,
  periods,
  modificationUplift,
}: {
  tenant: StackingPlanTenant
  assumptions: ForecastAssumptions
  scenario: ForecastEconomicOutlookScenario
  currentOccupancyPct: number
  periods: ForecastPeriod[]
  modificationUplift: ModificationUnderwritingUplift
}) {
  const contractRate =
    tenant.contractRatePsfValue ?? defaultContractRateForVacancy(tenant)
  const reLeasingRateBase = assumptions.markToMarketEnabled
    ? tenant.predictedRentPsfValue ??
      tenant.marketRentPsfValue ??
      contractRate * 1.05
    : contractRate
  const predictedRate = reLeasingRateBase * (1 + modificationUplift.rentLiftPct)
  const renewalProbability = clamp(
    ((tenant.renewalProbabilityPct ?? assumptions.defaultRenewalProbabilityPct) +
      modificationUplift.renewalLiftPct) /
      100,
    0,
    1
  )
  const timeToLeaseQuarters = Math.max(
    1,
    Math.ceil(
      clamp(
        (tenant.timeToLeaseMonths ?? assumptions.timeToLeaseMonths) +
          modificationUplift.timeToLeaseDeltaMonths,
        3,
        24
      ) / 3
    )
  )
  const expiryQuarter = expirationQuarterIndex(tenant.leaseExpirationDate)

  return periods.map((period) => {
    const macroPeriod = macroPeriodForIndex(scenario, period.index)
    const effects = scenarioEffectsForPeriod(macroPeriod)
    const effectiveTargetOccupancyPct = effectiveForecastTargetOccupancyPct({
      currentOccupancyPct,
      periodIndex: period.index,
      scenario,
      modificationUplift,
    })
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
    const renewalQuarterRevenue = assumptions.markToMarketEnabled
      ? predictedQuarterRevenue * renewalProbability
      : contractQuarterRevenue * renewalProbability
    const releaseRevenue = nonRenewalLeaseUpActive
      ? predictedQuarterRevenue *
        (1 - renewalProbability) *
        leaseUpShare *
        effects.releaseFactor
      : 0

    return renewalQuarterRevenue + releaseRevenue
  })
}

export function deriveBaseAnnualOpex(assetId: string, annualRevenue: number) {
  const financials = financialMetricsForAssetId(assetId)

  // Real properties carry an actual operating-expense ratio from the export.
  // Scale that ratio with revenue so In-Place valuation reconciles with the
  // appraised as-is value (real revenue − real opex, at the real cap rate).
  if (isRealAssetId(assetId) && financials != null) {
    const ratio =
      financials.annualRevenueUsd > 0
        ? financials.annualOpexUsd / financials.annualRevenueUsd
        : 0.3
    return Math.max(0, annualRevenue * ratio)
  }

  const assetContext = resolveSyntheticAssetContext(assetId)
  if (financials == null || assetContext == null) {
    return Math.max(annualRevenue * 0.34, 0)
  }

  return syntheticAnnualOpexUsd({
    asset: assetContext,
    rsfSqft: financials.rsfSqft,
    occupiedPercent: financials.occupancyPct,
    annualRevenueUsd: annualRevenue,
  })
}

function buildQuarterlyOpex({
  periods,
  grossRevenue,
  baseAnnualOpex,
  annualOpexDeltaUsd = 0,
  currentOccupancyPct,
  scenario,
}: {
  periods: ForecastPeriod[]
  grossRevenue: number[]
  baseAnnualOpex: number
  annualOpexDeltaUsd?: number
  currentOccupancyPct: number
  scenario: ForecastEconomicOutlookScenario
}) {
  const baseQuarterOpex = Math.max(0, baseAnnualOpex + annualOpexDeltaUsd) / 4
  const revenueBaseline = Math.max(grossRevenue[0] ?? 0, 1)
  const occupancyInfluence = 0.92 + (currentOccupancyPct / 100) * 0.16

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
  assetId: string,
  stackingPlanData?: StackingPlanDataset
): ForecastAssumptions {
  const dataset = stackingPlanData ?? getSampleStackingPlanData(assetId)
  const financials = financialMetricsForAssetId(assetId)
  const occupiedTenants = dataset.floors
    .flatMap((floor) => floor.tenants)
    .filter((tenant) => !tenant.isVacant)
  const vacantTenants = dataset.floors
    .flatMap((floor) => floor.tenants)
    .filter((tenant) => tenant.isVacant)
  const averageTimeToLeaseMonths =
    vacantTenants.length > 0
      ? vacantTenants.reduce(
          (sum, tenant) => sum + (tenant.timeToLeaseMonths ?? 0),
          0
        ) / vacantTenants.length
      : 9
  const averageRenewalProbabilityPct =
    occupiedTenants.length > 0
      ? occupiedTenants.reduce(
          (sum, tenant) => sum + (tenant.renewalProbabilityPct ?? 0),
          0
        ) / occupiedTenants.length
      : 58

  return {
    markToMarketEnabled: true,
    timeToLeaseMonths: clamp(Math.round(averageTimeToLeaseMonths), 3, 18),
    occupancyTargetPct: clamp(
      dataset.summary.overallOccupancyPercent +
        (dataset.summary.vacantSqft > 0 ? 3 : 1.5),
      75,
      96
    ),
    defaultRenewalProbabilityPct: clamp(
      Math.round(averageRenewalProbabilityPct),
      35,
      80
    ),
    exitCapRatePct: clamp(
      Number(((financials?.capRatePct ?? 5.5) + 0.2).toFixed(2)),
      4.5,
      7.25
    ),
  }
}

/** Quarterly forecast periods derived from exported "YYYYQn" labels. */
function periodsFromQuarterLabels(labels: readonly string[]): ForecastPeriod[] {
  return labels.map((raw, index) => {
    const match = /^(\d{4})Q([1-4])$/.exec(raw.trim())
    const year = match ? Number(match[1]) : 2026 + Math.floor(index / 4)
    const quarter = match ? Number(match[2]) : (index % 4) + 1
    const startMonth = String((quarter - 1) * 3 + 1).padStart(2, "0")
    return {
      index,
      quarter,
      year,
      label: `Q${quarter} ${String(year).slice(-2)}`,
      startDate: `${year}-${startMonth}-01`,
    }
  })
}

/**
 * Build the asset forecast model directly from an exported per-building
 * forecast JSON scenario tree. Revenue arrays are annual run-rates (RSF × PSF),
 * so they are converted to the model's quarterly basis (÷4); OpEx, NOI, cap
 * rate, and sale price are derived with the same helpers as the synthetic path.
 */
function buildAssetForecastModelFromJson({
  assetId,
  scenario,
  assumptions,
  modValues = INITIAL_MOD_VALUES,
  forecastJson,
  tree,
  includeRevenueBreakdown = true,
}: {
  assetId: string
  scenario: ForecastEconomicOutlookScenario
  assumptions: ForecastAssumptions
  modValues?: ModValues
  forecastJson: RealForecastJson
  tree: RealForecastJson["floor_tree"][number]
  includeRevenueBreakdown?: boolean
}): AssetForecastModel {
  const asset = getAssetById(assetId)
  const periods = periodsFromQuarterLabels(forecastJson.quarter_labels)
  const modificationUplift = upliftFromModValues(modValues)
  const currentOccupancyPct = forecastJson.occupied_pct ?? 100

  const toQuarterly = (annual: number) => annual / 4

  const grossRevenue = periods.map((_, index) =>
    toQuarterly(tree.gross_revenue_per_quarter[index] ?? 0)
  )

  const revenueBreakdown: ForecastRevenueFloorRow[] = includeRevenueBreakdown
    ? [...tree.floors]
        .sort((a, b) => b.floor_number - a.floor_number)
        .map((floor) => ({
          id: `floor-${floor.floor_number}`,
          floor: floor.floor_number,
          label: `Floor ${floor.floor_number}`,
          sqft: floor.floor_rsf,
          values: periods.map((_, index) =>
            toQuarterly(floor.revenue_per_quarter[index] ?? 0)
          ),
          spaces: floor.spaces.map((space) => ({
            id: space.space_id,
            suite: space.suite,
            tenantName: space.tenant_name,
            floor: floor.floor_number,
            sqft: space.rentable_sq_ft,
            isVacant: space.occupancy_status !== "occupied",
            leaseExpiration: "",
            values: periods.map((_, index) =>
              toQuarterly(space.revenue_per_quarter[index] ?? 0)
            ),
          })),
        }))
    : []

  const normalizedAssumptions: ForecastAssumptions = {
    markToMarketEnabled: assumptions.markToMarketEnabled !== false,
    timeToLeaseMonths: clamp(Math.round(assumptions.timeToLeaseMonths), 3, 24),
    occupancyTargetPct: Math.round(
      effectiveForecastTargetOccupancyPct({
        currentOccupancyPct,
        periodIndex: 0,
        scenario,
        modificationUplift,
      })
    ),
    defaultRenewalProbabilityPct: clamp(
      Math.round(assumptions.defaultRenewalProbabilityPct),
      10,
      95
    ),
    exitCapRatePct: clamp(Number(assumptions.exitCapRatePct.toFixed(2)), 4, 8),
  }

  const currentAnnualRevenue = (grossRevenue[0] ?? 0) * 4
  const baseAnnualOpex = deriveBaseAnnualOpex(assetId, currentAnnualRevenue)
  const opex = buildQuarterlyOpex({
    periods,
    grossRevenue,
    baseAnnualOpex,
    annualOpexDeltaUsd: modificationUplift.annualOpexDeltaUsd,
    currentOccupancyPct,
    scenario,
  })
  const noi = grossRevenue.map((value, index) => value - (opex[index] ?? 0))
  const capRate = periods.map((period) => {
    const macroPeriod = macroPeriodForIndex(scenario, period.index)
    const effects = scenarioEffectsForPeriod(macroPeriod)
    return clamp(
      Number(
        (
          normalizedAssumptions.exitCapRatePct +
          modificationUplift.exitCapRateDeltaPct +
          effects.exitCapAdjustmentPct
        ).toFixed(2)
      ),
      4,
      8
    )
  })
  const salePrice = noi.map((value, index) =>
    Math.max(
      0,
      (value * 4) /
        ((capRate[index] ?? normalizedAssumptions.exitCapRatePct) / 100) -
        modificationUplift.upfrontCapexUsd
    )
  )

  const statementRows: ForecastStatementRow[] = (
    [
      { id: "grossRevenue", label: "Gross Revenue", kind: "currency", values: grossRevenue },
      { id: "opex", label: "OpEx", kind: "expense", values: opex },
      { id: "noi", label: "NOI", kind: "currency", values: noi },
      { id: "salePrice", label: "Asset Value", kind: "currency", values: salePrice },
      { id: "capRate", label: "Cap Rate", kind: "percent", values: capRate },
    ] as ForecastStatementRow[]
  ).map((row) => ({
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
      currentOccupancyPct,
      targetOccupancyPct: effectiveForecastTargetOccupancyPct({
        currentOccupancyPct,
        periodIndex: 0,
        scenario,
        modificationUplift,
      }),
      currentAnnualRevenue,
      currentAnnualOpex: (opex[0] ?? 0) * 4,
      currentAnnualNoi: (noi[0] ?? 0) * 4,
      exitCapRatePct:
        capRate[capRate.length - 1] ?? normalizedAssumptions.exitCapRatePct,
    },
  }
}

export function buildAssetForecastModel({
  assetId,
  scenario,
  assumptions,
  modValues = INITIAL_MOD_VALUES,
  stackingPlanData,
  includeRevenueBreakdown = true,
}: {
  assetId: string
  scenario: ForecastEconomicOutlookScenario
  assumptions: ForecastAssumptions
  modValues?: ModValues
  stackingPlanData?: StackingPlanDataset
  includeRevenueBreakdown?: boolean
}): AssetForecastModel {
  // Real buildings with an exported forecast JSON drive the projection directly
  // for the preset scenarios (baseline / optimistic / pessimistic). Custom
  // outlooks (no matching tree) fall through to the synthetic model below.
  const forecastJson = getRealForecastJson(assetId)
  if (forecastJson != null) {
    const tree = forecastJson.floor_tree.find((t) => t.name === scenario.id)
    if (tree != null) {
      return buildAssetForecastModelFromJson({
        assetId,
        scenario,
        assumptions,
        modValues,
        forecastJson,
        tree,
        includeRevenueBreakdown,
      })
    }
  }

  const asset = getAssetById(assetId)
  const dataset = stackingPlanData ?? getSampleStackingPlanData(assetId)
  const periods = buildForecastPeriods()
  const modificationUplift = upliftFromModValues(modValues)

  const normalizedAssumptions: ForecastAssumptions = {
    markToMarketEnabled: assumptions.markToMarketEnabled !== false,
    timeToLeaseMonths: clamp(Math.round(assumptions.timeToLeaseMonths), 3, 24),
    occupancyTargetPct: Math.round(
      effectiveForecastTargetOccupancyPct({
        currentOccupancyPct: dataset.summary.overallOccupancyPercent,
        periodIndex: 0,
        scenario,
        modificationUplift,
      })
    ),
    defaultRenewalProbabilityPct: clamp(
      Math.round(assumptions.defaultRenewalProbabilityPct),
      10,
      95
    ),
    exitCapRatePct: clamp(Number(assumptions.exitCapRatePct.toFixed(2)), 4, 8),
  }
  const grossRevenue = periods.map(() => 0)
  const revenueBreakdown: ForecastRevenueFloorRow[] = []

  for (const floor of dataset.floors) {
    const floorValues: number[] | null = includeRevenueBreakdown
      ? periods.map(() => 0)
      : null
    const spaces: ForecastRevenueSpaceRow[] | null = includeRevenueBreakdown
      ? []
      : null

    for (const tenant of floor.tenants) {
      const values = buildQuarterlySpaceRevenue({
        tenant,
        assumptions: normalizedAssumptions,
        scenario,
        currentOccupancyPct: dataset.summary.overallOccupancyPercent,
        periods,
        modificationUplift,
      })

      for (let index = 0; index < values.length; index += 1) {
        const value = values[index] ?? 0
        grossRevenue[index] = (grossRevenue[index] ?? 0) + value
        if (floorValues != null) {
          floorValues[index] = (floorValues[index] ?? 0) + value
        }
      }

      if (spaces != null) {
        spaces.push({
          id: tenant.id,
          suite: tenant.space,
          tenantName: tenant.name,
          floor: floor.floor,
          sqft: tenant.sqft,
          isVacant: tenant.isVacant,
          leaseExpiration: tenant.expiration,
          values,
        })
      }
    }

    if (floorValues != null && spaces != null) {
      revenueBreakdown.push({
        id: floor.floorKey,
        floor: floor.floor,
        label: floor.floorLabel,
        sqft: floor.tenants.reduce((sum, tenant) => sum + tenant.sqft, 0),
        values: floorValues,
        spaces,
      })
    }
  }

  const currentAnnualRevenue = (grossRevenue[0] ?? 0) * 4
  const baseAnnualOpex = deriveBaseAnnualOpex(assetId, currentAnnualRevenue)
  const opex = buildQuarterlyOpex({
    periods,
    grossRevenue,
    baseAnnualOpex,
    annualOpexDeltaUsd: modificationUplift.annualOpexDeltaUsd,
    currentOccupancyPct: dataset.summary.overallOccupancyPercent,
    scenario,
  })
  const noi = grossRevenue.map((value, index) => value - (opex[index] ?? 0))
  const capRate = periods.map((period) => {
    const macroPeriod = macroPeriodForIndex(scenario, period.index)
    const effects = scenarioEffectsForPeriod(macroPeriod)

    return clamp(
      Number(
        (
          normalizedAssumptions.exitCapRatePct +
          modificationUplift.exitCapRateDeltaPct +
          effects.exitCapAdjustmentPct
        ).toFixed(2)
      ),
      4,
      8
    )
  })
  const salePrice = noi.map((value, index) =>
    Math.max(
      0,
      (value * 4) /
        ((capRate[index] ?? normalizedAssumptions.exitCapRatePct) / 100) -
        modificationUplift.upfrontCapexUsd
    )
  )

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
      targetOccupancyPct: effectiveForecastTargetOccupancyPct({
        currentOccupancyPct: dataset.summary.overallOccupancyPercent,
        periodIndex: 0,
        scenario,
        modificationUplift,
      }),
      currentAnnualRevenue,
      currentAnnualOpex: (opex[0] ?? 0) * 4,
      currentAnnualNoi: (noi[0] ?? 0) * 4,
      exitCapRatePct:
        capRate[capRate.length - 1] ?? normalizedAssumptions.exitCapRatePct,
    },
  }
}
