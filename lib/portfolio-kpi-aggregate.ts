import { getAssetById } from "@/lib/assets"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import {
  formatUsdPerSf,
  formatUsdPortfolioCompact,
} from "@/lib/scenario-kpi-format"

export type PortfolioKpiDisplay = {
  label: string
  value: string
  subLabel?: string
  subValue?: string
}

function emptyKpiStrip(): PortfolioKpiDisplay[] {
  const dash = "—"
  return [
    {
      label: "Est. Value",
      value: dash,
      subLabel: "Est. Value / SF",
      subValue: dash,
    },
    {
      label: "Occupancy",
      value: dash,
      subLabel: "Vacancy",
      subValue: dash,
    },
    {
      label: "NOI",
      value: dash,
      subLabel: "NOI / SF",
      subValue: dash,
    },
    { label: "Cap Rate", value: dash },
    { label: "WALE / WALT", value: dash },
  ]
}

function aggregateFromRows(rows: PortfolioAssetRow[]): {
  totalValueUsd: number
  totalNoiUsd: number
  totalRsfSqft: number
  weightedOccPct: number
  avgWaleYears: number
  portfolioCapPct: number
} | null {
  if (rows.length === 0) return null

  let totalValueUsd = 0
  let totalNoiUsd = 0
  let totalRsfSqft = 0
  let occWeightedSum = 0
  let waleSum = 0
  let waleN = 0

  for (const row of rows) {
    const fin = financialMetricsForAssetId(row.id)
    if (!fin) continue

    totalValueUsd += fin.valueUsd
    totalNoiUsd += fin.noiUsd
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
    totalValueUsd,
    totalNoiUsd,
    totalRsfSqft,
    weightedOccPct,
    avgWaleYears,
    portfolioCapPct,
  }
}

/** KPI strip for the portfolio dashboard, derived from the currently visible table rows (fund filter + search). */
export function portfolioKpiStripFromRows(
  rows: PortfolioAssetRow[]
): PortfolioKpiDisplay[] {
  const agg = aggregateFromRows(rows)
  if (!agg) return emptyKpiStrip()

  const vac = 100 - agg.weightedOccPct

  return [
    {
      label: "Est. Value",
      value: formatUsdPortfolioCompact(agg.totalValueUsd),
      subLabel: "Est. Value / SF",
      subValue: formatUsdPerSf(agg.totalValueUsd, agg.totalRsfSqft),
    },
    {
      label: "Occupancy",
      value: `${agg.weightedOccPct.toFixed(2)}%`,
      subLabel: "Vacancy",
      subValue: `${vac.toFixed(2)}%`,
    },
    {
      label: "NOI",
      value: `${formatUsdPortfolioCompact(agg.totalNoiUsd)} / yr`,
      subLabel: "NOI / SF",
      subValue: formatUsdPerSf(agg.totalNoiUsd, agg.totalRsfSqft),
    },
    {
      label: "Cap Rate",
      value: `${agg.portfolioCapPct.toFixed(2)}%`,
    },
    {
      label: "WALE / WALT",
      value: `${agg.avgWaleYears.toFixed(1)} yrs`,
    },
  ]
}
