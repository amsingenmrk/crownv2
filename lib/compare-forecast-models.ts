import { INITIAL_MOD_VALUES } from "@/lib/building-modifications"
import { ASSETS } from "@/lib/assets"
import {
  buildAssetForecastModel,
  buildDefaultForecastScenarios,
  buildForecastPeriods,
  defaultForecastAssumptionsForAsset,
  type AssetForecastModel,
  type ForecastEconomicOutlookScenario,
} from "@/lib/forecast-data"
import {
  ASSET_KEY_PREFIX,
  GROUP_KEY_PREFIX,
  PORTFOLIO_KEY,
  parsePropertySlotKey,
  type CompareColumn,
} from "@/lib/portfolio-compare-model"
import {
  allPortfolioAssetRowsBase,
  scenarioComparePortfolioRows,
} from "@/lib/scenario-compare-rows"

function scenarioSlugFromSlotKey(key: string): string | null {
  if (!key.startsWith("scenario:")) return null
  return key.slice("scenario:".length) || null
}

/**
 * Asset IDs whose stacking/forecast inputs roll up into a compare column (aligned with KPI scope).
 * When `applyScenarioMembershipFilter` is false (e.g. SSR / hydration), scenario columns use the
 * full portfolio row list so server and first client paint match; enable after mount to align with
 * the compare table.
 */
export function assetIdsForCompareSlotKey(
  key: string,
  applyScenarioMembershipFilter: boolean
): string[] {
  if (key === PORTFOLIO_KEY) {
    return ASSETS.map((a) => a.id)
  }
  if (key.startsWith(GROUP_KEY_PREFIX)) {
    const groupId = key.slice(GROUP_KEY_PREFIX.length)
    return ASSETS.filter((a) => a.groupId === groupId).map((a) => a.id)
  }
  if (key.startsWith(ASSET_KEY_PREFIX)) {
    return [key.slice(ASSET_KEY_PREFIX.length)]
  }
  const prop = parsePropertySlotKey(key)
  if (prop != null) {
    return [prop.assetId]
  }
  const slug = scenarioSlugFromSlotKey(key)
  if (slug != null) {
    const base = allPortfolioAssetRowsBase()
    const rows = applyScenarioMembershipFilter
      ? scenarioComparePortfolioRows(slug, base)
      : base
    return rows.map((r) => r.id)
  }
  return ASSETS.map((a) => a.id)
}

function scenarioForCompareLine(
  baseline: ForecastEconomicOutlookScenario,
  columnIndex: number,
  displayName: string
): ForecastEconomicOutlookScenario {
  return {
    ...baseline,
    id: `compare-col-${columnIndex}`,
    name: displayName,
  }
}

function mergeAssetForecastModels(
  models: AssetForecastModel[],
  columnIndex: number,
  displayName: string,
  baseline: ForecastEconomicOutlookScenario
): AssetForecastModel | null {
  if (models.length === 0) return null
  const scenario = scenarioForCompareLine(baseline, columnIndex, displayName)
  if (models.length === 1) {
    const m = models[0]!
    return { ...m, scenario }
  }

  const base = models[0]!
  const len = base.periods.length
  const sumRow = (rowId: string) =>
    Array.from({ length: len }, (_, i) =>
      models.reduce((sum, m) => {
        const row = m.statementRows.find((r) => r.id === rowId)
        return sum + (row?.values[i] ?? 0)
      }, 0)
    )

  const grossRevenue = sumRow("grossRevenue")
  const opex = sumRow("opex")
  const noi = sumRow("noi")
  const salePrice = sumRow("salePrice")
  const capRate = Array.from({ length: len }, (_, i) => {
    let weighted = 0
    let weight = 0
    for (const m of models) {
      const sp = Math.abs(
        m.statementRows.find((r) => r.id === "salePrice")?.values[i] ?? 0
      )
      const cr =
        m.statementRows.find((r) => r.id === "capRate")?.values[i] ?? 0
      weighted += cr * sp
      weight += sp
    }
    return weight > 0 ? Number((weighted / weight).toFixed(2)) : 0
  })

  return {
    assetId: `aggregate-${columnIndex}`,
    assetName: displayName,
    scenario,
    assumptions: base.assumptions,
    periods: base.periods,
    statementRows: [
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
    ],
    revenueBreakdown: base.revenueBreakdown,
    summary: {
      currentOccupancyPct: base.summary.currentOccupancyPct,
      targetOccupancyPct: base.summary.targetOccupancyPct,
      currentAnnualRevenue: (grossRevenue[0] ?? 0) * 4,
      currentAnnualOpex: models.reduce(
        (s, m) => s + m.summary.currentAnnualOpex,
        0
      ),
      currentAnnualNoi: (noi[0] ?? 0) * 4,
      exitCapRatePct:
        capRate[capRate.length - 1] ?? base.summary.exitCapRatePct,
    },
  }
}

function emptyAggregateModel(
  columnIndex: number,
  displayName: string,
  baseline: ForecastEconomicOutlookScenario
): AssetForecastModel {
  const periods = buildForecastPeriods()
  const zeros = periods.map(() => 0)
  const scenario = scenarioForCompareLine(baseline, columnIndex, displayName)
  return {
    assetId: `empty-${columnIndex}`,
    assetName: displayName,
    scenario,
    assumptions: defaultForecastAssumptionsForAsset(ASSETS[0]!.id),
    periods,
    statementRows: [
      {
        id: "grossRevenue",
        label: "Gross Revenue",
        kind: "currency",
        values: [...zeros],
      },
      { id: "opex", label: "OpEx", kind: "expense", values: [...zeros] },
      { id: "noi", label: "NOI", kind: "currency", values: [...zeros] },
      {
        id: "salePrice",
        label: "Asset Value",
        kind: "currency",
        values: [...zeros],
      },
      { id: "capRate", label: "Cap Rate", kind: "percent", values: [...zeros] },
    ],
    revenueBreakdown: [],
    summary: {
      currentOccupancyPct: 0,
      targetOccupancyPct: 0,
      currentAnnualRevenue: 0,
      currentAnnualOpex: 0,
      currentAnnualNoi: 0,
      exitCapRatePct: 0,
    },
  }
}

/**
 * One forecast model per compare column: series name = column title.
 * Uses the Baseline economic outlook and sums per-asset {@link buildAssetForecastModel} outputs
 * for all assets in that column’s scope (portfolio, group, scenario membership, single asset, etc.).
 */
export function buildCompareColumnForecastModels(
  baseColumns: readonly CompareColumn[],
  slotKeys: readonly string[],
  applyScenarioMembershipFilter: boolean
): AssetForecastModel[] {
  const baseline = buildDefaultForecastScenarios()[0]!
  return slotKeys.map((key, columnIndex) => {
    const col = baseColumns[columnIndex]
    const displayName = col?.name ?? `Column ${columnIndex + 1}`
    const ids = [
      ...new Set(assetIdsForCompareSlotKey(key, applyScenarioMembershipFilter)),
    ]
    if (ids.length === 0) {
      return emptyAggregateModel(columnIndex, displayName, baseline)
    }
    const perAsset = ids.map((assetId) =>
      buildAssetForecastModel({
        assetId,
        scenario: baseline,
        assumptions: defaultForecastAssumptionsForAsset(assetId),
        modValues: INITIAL_MOD_VALUES,
      })
    )
    return (
      mergeAssetForecastModels(
        perAsset,
        columnIndex,
        displayName,
        baseline
      ) ?? emptyAggregateModel(columnIndex, displayName, baseline)
    )
  })
}
