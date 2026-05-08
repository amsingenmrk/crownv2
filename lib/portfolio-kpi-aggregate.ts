import { getAssetById } from "@/lib/assets"
import { INITIAL_MOD_VALUES } from "@/lib/building-modifications"
import {
  buildDefaultForecastScenarios,
  defaultForecastAssumptionsForAsset,
} from "@/lib/forecast-data"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import type {
  HeaderKpiMetrics,
  HeaderKpiNumeric,
} from "@/lib/portfolio-compare-model"
import {
  formatUsdPerSf,
  formatUsdPortfolioCompact,
} from "@/lib/scenario-kpi-format"
import { getSampleStackingPlanData } from "@/lib/stacking-plan-data"
import {
  buildValuationConditionMetricMap,
  aggregateValuationConditionMetrics,
} from "@/lib/valuation-condition-metrics"
import {
  DEFAULT_VALUATION_CONDITION_ID,
  VALUATION_CONDITION_OPTIONS,
  type ValuationConditionId,
} from "@/lib/valuation-condition-config"
import type { ValuationConditionMetrics } from "@/lib/valuation-condition-metrics"

export type PortfolioKpiDisplay = {
  label: string
  value: string
  subLabel?: string
  subValue?: string
}

export type PortfolioRowAggregate = {
  totalRevenueUsd: number
  totalOpexUsd: number
  totalNoiUsd: number
  totalValueUsd: number
  totalRsfSqft: number
  weightedOccPct: number
  avgWaleYears: number
  portfolioCapPct: number
}

function emptyKpiStrip(): PortfolioKpiDisplay[] {
  const dash = "—"
  return [
    { label: "Gross Revenue", value: dash },
    { label: "OpEx", value: dash },
    { label: "NOI", value: dash },
    { label: "Asset Value", value: dash },
    { label: "Cap Rate", value: dash },
  ]
}

export function aggregatePortfolioRows(
  rows: PortfolioAssetRow[]
): PortfolioRowAggregate | null {
  if (rows.length === 0) return null

  let totalRevenueUsd = 0
  let totalOpexUsd = 0
  let totalNoiUsd = 0
  let totalValueUsd = 0
  let totalRsfSqft = 0
  let occWeightedSum = 0
  let waleSum = 0
  let waleN = 0

  for (const row of rows) {
    const fin = financialMetricsForAssetId(row.id)
    if (!fin) continue

    totalRevenueUsd += fin.annualRevenueUsd
    totalOpexUsd += fin.annualOpexUsd
    totalNoiUsd += fin.noiUsd
    totalValueUsd += fin.valueUsd
    totalRsfSqft += fin.rsfSqft

    const asset = getAssetById(row.id)
    const occRaw = asset
      ? asset.occupiedPercent
      : parseFloat(String(row.occPct).replace(/%/g, "").trim())
    const occ = Number.isFinite(occRaw) ? occRaw : 0
    occWeightedSum += (occ / 100) * fin.rsfSqft

    const waleMatch = row.wale.match(/^([\d.]+)/)
    if (waleMatch) {
      waleSum += parseFloat(waleMatch[1]!)
      waleN += 1
    }
  }

  if (totalRsfSqft <= 0) return null

  const weightedOccPct = (occWeightedSum / totalRsfSqft) * 100
  const portfolioCapPct =
    totalValueUsd > 0 ? (totalNoiUsd / totalValueUsd) * 100 : 0
  const avgWaleYears = waleN > 0 ? waleSum / waleN : 0

  return {
    totalRevenueUsd,
    totalOpexUsd,
    totalNoiUsd,
    totalValueUsd,
    totalRsfSqft,
    weightedOccPct,
    avgWaleYears,
    portfolioCapPct,
  }
}

/** Roll up valuation-condition metrics across visible portfolio rows (one aggregate per condition). */
export function aggregatePortfolioValuationByCondition(
  rows: PortfolioAssetRow[]
): Record<ValuationConditionId, ValuationConditionMetrics> | null {
  if (rows.length === 0) return null
  const baselineScenario = buildDefaultForecastScenarios()[0]
  if (baselineScenario == null) return null

  const out = {} as Record<ValuationConditionId, ValuationConditionMetrics>
  for (const condition of VALUATION_CONDITION_OPTIONS.map((o) => o.id)) {
    const valuationMetrics = aggregateValuationConditionMetrics(
      rows.map((row) => {
        const assumptions = defaultForecastAssumptionsForAsset(row.id)
        const financials = financialMetricsForAssetId(row.id)
        const metricMap = buildValuationConditionMetricMap({
          assetId: row.id,
          dataset: getSampleStackingPlanData(row.id),
          assumptions,
          scenario: baselineScenario,
          baseCapRatePct: financials?.capRatePct ?? assumptions.exitCapRatePct,
          modValues: INITIAL_MOD_VALUES,
        })
        return metricMap[condition]
      })
    )
    out[condition] = valuationMetrics
  }
  return out
}

/** KPI strip for the portfolio dashboard, derived from the currently visible table rows (fund filter + search). */
export function portfolioKpiStripFromRows(
  rows: PortfolioAssetRow[],
  valuationCondition: ValuationConditionId = DEFAULT_VALUATION_CONDITION_ID
): PortfolioKpiDisplay[] {
  if (rows.length === 0) return emptyKpiStrip()

  const baselineScenario = buildDefaultForecastScenarios()[0]
  if (baselineScenario == null) return emptyKpiStrip()

  const valuationMetrics = aggregateValuationConditionMetrics(
    rows.map((row) => {
      const assumptions = defaultForecastAssumptionsForAsset(row.id)
      const financials = financialMetricsForAssetId(row.id)
      const metricMap = buildValuationConditionMetricMap({
        assetId: row.id,
        dataset: getSampleStackingPlanData(row.id),
        assumptions,
        scenario: baselineScenario,
        baseCapRatePct: financials?.capRatePct ?? assumptions.exitCapRatePct,
        modValues: INITIAL_MOD_VALUES,
      })
      return metricMap[valuationCondition]
    })
  )

  return [
    {
      label: "Gross Revenue",
      value: `${formatUsdPortfolioCompact(valuationMetrics.grossRevenue)} / yr`,
    },
    {
      label: "OpEx",
      value: `${formatUsdPortfolioCompact(valuationMetrics.opex)} / yr`,
    },
    {
      label: "NOI",
      value: `${formatUsdPortfolioCompact(valuationMetrics.noi)} / yr`,
    },
    {
      label: "Asset Value",
      value: formatUsdPortfolioCompact(valuationMetrics.assetValue),
    },
    {
      label: "Cap Rate",
      value: `${valuationMetrics.capRate.toFixed(2)}%`,
    },
  ]
}

const EMPTY_HEADER_METRICS: HeaderKpiMetrics = {
  estValue: "—",
  estValuePerSf: "—",
  occupancy: "—",
  vacancy: "—",
  noi: "—",
  noiPerSf: "—",
  capRate: "—",
  wale: "—",
}

const EMPTY_HEADER_NUMERIC: HeaderKpiNumeric = {
  estValueBillions: 0,
  estValuePerSfUsd: 0,
  occupancyPct: 0,
  vacancyPct: 0,
  noiMillionsPerYr: 0,
  noiPerSfUsd: 0,
  capRatePct: 0,
  waleYears: 0,
}

/** Compare / shared headline KPIs from portfolio table rows (same math as the dashboard strip). */
export function headerKpiFromPortfolioRows(rows: PortfolioAssetRow[]): {
  metrics: HeaderKpiMetrics
  numeric: HeaderKpiNumeric
} {
  const agg = aggregatePortfolioRows(rows)
  if (!agg) {
    return { metrics: { ...EMPTY_HEADER_METRICS }, numeric: { ...EMPTY_HEADER_NUMERIC } }
  }
  const vac = 100 - agg.weightedOccPct
  const metrics: HeaderKpiMetrics = {
    estValue: formatUsdPortfolioCompact(agg.totalValueUsd),
    estValuePerSf: formatUsdPerSf(agg.totalValueUsd, agg.totalRsfSqft),
    occupancy: `${agg.weightedOccPct.toFixed(2)}%`,
    vacancy: `${vac.toFixed(2)}%`,
    noi: `${formatUsdPortfolioCompact(agg.totalNoiUsd)} / yr`,
    noiPerSf: formatUsdPerSf(agg.totalNoiUsd, agg.totalRsfSqft),
    capRate: `${agg.portfolioCapPct.toFixed(2)}%`,
    wale: `${agg.avgWaleYears.toFixed(1)} yrs`,
  }
  const numeric: HeaderKpiNumeric = {
    estValueBillions: agg.totalValueUsd / 1_000_000_000,
    estValuePerSfUsd:
      agg.totalRsfSqft > 0 ? agg.totalValueUsd / agg.totalRsfSqft : 0,
    occupancyPct: agg.weightedOccPct,
    vacancyPct: vac,
    noiMillionsPerYr: agg.totalNoiUsd / 1_000_000,
    noiPerSfUsd: agg.totalRsfSqft > 0 ? agg.totalNoiUsd / agg.totalRsfSqft : 0,
    capRatePct: agg.portfolioCapPct,
    waleYears: agg.avgWaleYears,
  }
  return { metrics, numeric }
}
