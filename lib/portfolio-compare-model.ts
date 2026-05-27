import { readCustomAssetGroups } from "@/lib/asset-group-overrides"
import {
  ASSETS,
  ASSET_GROUP_SIDEBAR_LABELS,
  BUILT_IN_ASSET_GROUP_IDS,
  getAssetById,
  resolveAssetGroupLabel,
} from "@/lib/assets"
import { headerKpiFromPortfolioRows } from "@/lib/portfolio-kpi-aggregate"
import { computeScenarioPortfolioAggregate } from "@/lib/scenario-portfolio-aggregate"
import {
  formatUsdPerSf,
  formatUsdPortfolioCompact,
} from "@/lib/scenario-kpi-format"
import { financialMetricsForAssetId } from "@/lib/portfolio-asset-financials"
import { getSampleStackingPlanData } from "@/lib/stacking-plan-data"
import {
  allPortfolioAssetRowsBase,
  scenarioComparePortfolioRows,
  scenarioCompareSelectionsForSlug,
} from "@/lib/scenario-compare-rows"
import { readScenarioIncludedPropertiesBySlug } from "@/lib/scenario-included-properties-storage"
import {
  BUILTIN_SCENARIO,
  scenarioDisplayTitleForSlug,
  type UserScenario,
} from "@/lib/user-scenarios"

export const PORTFOLIO_KEY = "portfolio"
export const GROUP_KEY_PREFIX = "group:" as const
export const ASSET_KEY_PREFIX = "asset:" as const
export const PROPERTY_KEY_PREFIX = "property:" as const
/** Separates slug, assetId, tenantId in property slot keys (slug must not contain `::`). */
export const PROPERTY_SLOT_SEP = "::" as const

export const MIN_COMPARE_COLUMNS = 1
export const MAX_COMPARE_COLUMNS = 6
export const COMPARE_ROW_LABEL_COL_PX = 200

export function scenarioKey(slug: string) {
  return `scenario:${slug}`
}

export function groupKey(groupId: string) {
  return `${GROUP_KEY_PREFIX}${groupId}`
}

export function assetKey(assetId: string) {
  return `${ASSET_KEY_PREFIX}${assetId}`
}

export function propertySlotKey(
  scenarioSlug: string,
  assetId: string,
  tenantId: string
) {
  return `${PROPERTY_KEY_PREFIX}${scenarioSlug}${PROPERTY_SLOT_SEP}${assetId}${PROPERTY_SLOT_SEP}${tenantId}`
}

export function parsePropertySlotKey(
  key: string
): { scenarioSlug: string; assetId: string; tenantId: string } | null {
  if (!key.startsWith(PROPERTY_KEY_PREFIX)) return null
  const rest = key.slice(PROPERTY_KEY_PREFIX.length)
  const parts = rest.split(PROPERTY_SLOT_SEP)
  if (parts.length !== 3) return null
  const [scenarioSlug, assetId, tenantId] = parts
  if (!scenarioSlug || !assetId || !tenantId) return null
  return { scenarioSlug, assetId, tenantId }
}

export type CompareKind =
  | "portfolio"
  | "portfolio_group"
  | "scenario"
  | "asset"
  | "property"

/** Same headline fields as the KPI row on `PortfolioDashboard` (/portfolio and /scenarios). */
export type HeaderKpiMetrics = {
  estValue: string
  estValuePerSf: string
  occupancy: string
  vacancy: string
  noi: string
  noiPerSf: string
  capRate: string
  wale: string
}

/** Canonical numbers for delta compare (aligned with `HeaderKpiMetrics` presets). */
export type HeaderKpiNumeric = {
  estValueBillions: number
  estValuePerSfUsd: number
  occupancyPct: number
  vacancyPct: number
  noiMillionsPerYr: number
  noiPerSfUsd: number
  capRatePct: number
  waleYears: number
}

export type CompareColumn = {
  id: string
  kind: CompareKind
  slug?: string
  name: string
  address: string
  image: string
  metrics: HeaderKpiMetrics
  numeric: HeaderKpiNumeric
  /** When true, mod-affected KPI cells use scenario highlight styling (vs baseline compare). */
  highlightModMetrics?: boolean
  groupId?: string
  assetId?: string
  tenantId?: string
  scenarioSlugForProperty?: string
}

const EMPTY_COMPARE_METRICS: HeaderKpiMetrics = {
  estValue: "—",
  estValuePerSf: "—",
  occupancy: "—",
  vacancy: "—",
  noi: "—",
  noiPerSf: "—",
  capRate: "—",
  wale: "—",
}

const EMPTY_COMPARE_NUMERIC: HeaderKpiNumeric = {
  estValueBillions: 0,
  estValuePerSfUsd: 0,
  occupancyPct: 0,
  vacancyPct: 0,
  noiMillionsPerYr: 0,
  noiPerSfUsd: 0,
  capRatePct: 0,
  waleYears: 0,
}

/** Only these headline metrics move with scenario modifications (vs physical portfolio stats). */
export const METRIC_KEYS_AFFECTED_BY_MODS = new Set<keyof HeaderKpiMetrics>([
  "estValue",
  "estValuePerSf",
  "noi",
  "noiPerSf",
  "capRate",
])

export const KPI_TABLE_ROWS: {
  label: string
  metricKey: keyof HeaderKpiMetrics
  get: (m: HeaderKpiMetrics) => string
}[] = [
  { label: "Est. Value", metricKey: "estValue", get: (m) => m.estValue },
  {
    label: "Est. Value / SF",
    metricKey: "estValuePerSf",
    get: (m) => m.estValuePerSf,
  },
  { label: "Occupancy", metricKey: "occupancy", get: (m) => m.occupancy },
  { label: "Vacancy", metricKey: "vacancy", get: (m) => m.vacancy },
  { label: "NOI", metricKey: "noi", get: (m) => m.noi },
  { label: "NOI / SF", metricKey: "noiPerSf", get: (m) => m.noiPerSf },
  { label: "Cap Rate", metricKey: "capRate", get: (m) => m.capRate },
  { label: "WALE", metricKey: "wale", get: (m) => m.wale },
]

function fallbackColumn(name: string, address: string, index: number): CompareColumn {
  return {
    id: `fallback-${index}`,
    kind: "portfolio",
    name,
    address,
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop",
    metrics: { ...EMPTY_COMPARE_METRICS },
    numeric: { ...EMPTY_COMPARE_NUMERIC },
  }
}

function entirePortfolioCompareColumn(): CompareColumn {
  const flagship = ASSETS[0]
  const rows = allPortfolioAssetRowsBase()
  const { metrics, numeric } = headerKpiFromPortfolioRows(rows)
  return {
    id: PORTFOLIO_KEY,
    kind: "portfolio",
    name: "All portfolio groups",
    address: `Consolidated holdings, ${flagship?.address ?? "full portfolio"}`,
    image:
      flagship?.imageUrl ??
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop",
    metrics,
    numeric,
  }
}

function portfolioGroupCompareColumn(groupId: string, index: number): CompareColumn {
  const label = resolveAssetGroupLabel(groupId)
  const rows = allPortfolioAssetRowsBase().filter((r) => r.groupId === groupId)
  if (rows.length === 0) {
    return fallbackColumn(label, "No assets in this group", index)
  }
  const asset = ASSETS.find((a) => a.groupId === groupId) ?? ASSETS[0]
  const { metrics, numeric } = headerKpiFromPortfolioRows(rows)
  return {
    id: groupKey(groupId),
    kind: "portfolio_group",
    groupId,
    name: label,
    address: `${rows.length} assets · ${label}`,
    image:
      asset?.imageUrl ??
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop",
    metrics,
    numeric,
  }
}

function singleAssetCompareColumn(assetId: string, index: number): CompareColumn {
  const asset = getAssetById(assetId)
  const rows = allPortfolioAssetRowsBase()
  const row = rows.find((r) => r.id === assetId)
  if (!asset || !row) {
    return fallbackColumn("Unknown asset", assetId, index)
  }
  const { metrics, numeric } = headerKpiFromPortfolioRows([row])
  return {
    id: assetKey(assetId),
    kind: "asset",
    assetId,
    name: row.building,
    address: row.location,
    image:
      asset.imageUrl ??
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop",
    metrics,
    numeric,
  }
}

function scenarioCompareColumn(
  slug: string,
  userScenarios: readonly UserScenario[],
  index: number,
  applyScenarioMembershipFilter = true
): CompareColumn {
  const baseRows = allPortfolioAssetRowsBase()
  const rows = applyScenarioMembershipFilter
    ? scenarioComparePortfolioRows(slug, baseRows)
    : baseRows
  const baseKpi = headerKpiFromPortfolioRows(rows)
  const readStorage =
    applyScenarioMembershipFilter && typeof window !== "undefined"
  const selections = applyScenarioMembershipFilter
    ? scenarioCompareSelectionsForSlug(slug)
    : {}
  const agg = computeScenarioPortfolioAggregate(rows, selections, readStorage)

  const rsf = agg.totalRsfSqft
  const metrics: HeaderKpiMetrics = {
    ...baseKpi.metrics,
    estValue: formatUsdPortfolioCompact(agg.scenarioValueUsd),
    estValuePerSf: formatUsdPerSf(agg.scenarioValueUsd, rsf),
    noi: `${formatUsdPortfolioCompact(agg.scenarioNoiUsd)} / yr`,
    noiPerSf: formatUsdPerSf(agg.scenarioNoiUsd, rsf),
    capRate: `${agg.scenarioCapPct.toFixed(2)}%`,
  }
  const numeric: HeaderKpiNumeric = {
    ...baseKpi.numeric,
    estValueBillions: agg.scenarioValueUsd / 1_000_000_000,
    estValuePerSfUsd: rsf > 0 ? agg.scenarioValueUsd / rsf : 0,
    noiMillionsPerYr: agg.scenarioNoiUsd / 1_000_000,
    noiPerSfUsd: rsf > 0 ? agg.scenarioNoiUsd / rsf : 0,
    capRatePct: agg.scenarioCapPct,
  }

  let name: string
  let address: string
  if (slug === BUILTIN_SCENARIO.slug) {
    name = scenarioDisplayTitleForSlug(slug, userScenarios)
    address = "Scenario workspace · capital planning"
  } else {
    const u = userScenarios.find((s) => s.slug === slug)
    name = u?.name ?? slug.replace(/-/g, " ")
    address = `User scenario · ${slug}`
  }

  return {
    id: `scenario-${slug}`,
    kind: "scenario",
    slug,
    name,
    address,
    image:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop",
    metrics,
    numeric,
    highlightModMetrics: agg.hasTableSelection,
  }
}

function propertyCompareColumn(
  scenarioSlug: string,
  assetId: string,
  tenantId: string,
  scenarioLabel: string,
  index: number
): CompareColumn {
  const asset = getAssetById(assetId)
  const financials = financialMetricsForAssetId(assetId)
  const data = getSampleStackingPlanData(assetId)
  const tenant = data.floors
    .flatMap((f) => f.tenants)
    .find((t) => t.id === tenantId)

  if (!tenant || financials == null) {
    return fallbackColumn("Unknown property", `${assetId} · ${tenantId}`, index)
  }

  const suiteRevenueUsdPerYr =
    !tenant.isVacant && tenant.contractRatePsfValue != null
      ? tenant.contractRatePsfValue * tenant.sqft
      : 0
  const expenseRatio = financials.currentExpenseRatio
  const noiUsdPerYr = suiteRevenueUsdPerYr * Math.max(0, 1 - expenseRatio)
  const impliedValueUsd =
    noiUsdPerYr > 0 ? noiUsdPerYr / (financials.capRatePct / 100) : 0

  const occPct = tenant.isVacant ? 0 : 100
  const vacPct = tenant.isVacant ? 100 : 0
  const waleYears =
    tenant.isVacant || tenant.leaseExpirationDate == null
      ? 0
      : Math.max(
          0.25,
          (new Date(tenant.leaseExpirationDate).getTime() -
            new Date("2026-04-08T00:00:00Z").getTime()) /
            (1000 * 60 * 60 * 24 * 365.25)
        )

  const metrics: HeaderKpiMetrics = {
    estValue:
      impliedValueUsd > 0
        ? formatUsdPortfolioCompact(impliedValueUsd)
        : "—",
    estValuePerSf:
      impliedValueUsd > 0 && tenant.sqft > 0
        ? formatUsdPerSf(impliedValueUsd, tenant.sqft)
        : "—",
    occupancy: `${occPct.toFixed(0)}%`,
    vacancy: `${vacPct.toFixed(0)}%`,
    noi:
      noiUsdPerYr > 0
        ? `${formatUsdPortfolioCompact(noiUsdPerYr)} / yr`
        : "—",
    noiPerSf:
      noiUsdPerYr > 0 && tenant.sqft > 0
        ? formatUsdPerSf(noiUsdPerYr, tenant.sqft)
        : "—",
    capRate:
      noiUsdPerYr > 0 && impliedValueUsd > 0
        ? `${financials.capRatePct.toFixed(2)}%`
        : "—",
    wale: tenant.isVacant ? "—" : `${waleYears.toFixed(1)} yrs`,
  }

  const numeric: HeaderKpiNumeric = {
    estValueBillions: impliedValueUsd / 1_000_000_000,
    estValuePerSfUsd:
      impliedValueUsd > 0 && tenant.sqft > 0
        ? impliedValueUsd / tenant.sqft
        : 0,
    occupancyPct: occPct,
    vacancyPct: vacPct,
    noiMillionsPerYr: noiUsdPerYr / 1_000_000,
    noiPerSfUsd:
      noiUsdPerYr > 0 && tenant.sqft > 0 ? noiUsdPerYr / tenant.sqft : 0,
    capRatePct: noiUsdPerYr > 0 ? financials.capRatePct : 0,
    waleYears,
  }

  return {
    id: propertySlotKey(scenarioSlug, assetId, tenantId),
    kind: "property",
    assetId,
    tenantId,
    scenarioSlugForProperty: scenarioSlug,
    name: tenant.isVacant ? `Vacant · ${tenant.space}` : tenant.name,
    address: `${asset?.name ?? financials.assetName} · ${tenant.floorLabel} · ${scenarioLabel}`,
    image:
      asset?.imageUrl ??
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop",
    metrics,
    numeric,
  }
}

export function columnForEntityKey(
  key: string,
  userScenarios: readonly UserScenario[],
  slotIndex = 0,
  applyScenarioMembershipFilter = true
): CompareColumn {
  if (key === PORTFOLIO_KEY) return entirePortfolioCompareColumn()

  if (key.startsWith(GROUP_KEY_PREFIX)) {
    const groupId = key.slice(GROUP_KEY_PREFIX.length)
    return portfolioGroupCompareColumn(groupId, slotIndex)
  }

  if (key.startsWith(ASSET_KEY_PREFIX)) {
    const assetId = key.slice(ASSET_KEY_PREFIX.length)
    return singleAssetCompareColumn(assetId, slotIndex)
  }

  const prop = parsePropertySlotKey(key)
  if (prop != null) {
    const scenarioLabel = scenarioDisplayTitleForSlug(
      prop.scenarioSlug,
      userScenarios
    )
    return propertyCompareColumn(
      prop.scenarioSlug,
      prop.assetId,
      prop.tenantId,
      scenarioLabel,
      slotIndex
    )
  }

  if (key.startsWith("scenario:")) {
    const slug = key.slice("scenario:".length)
    return scenarioCompareColumn(
      slug,
      userScenarios,
      slotIndex,
      applyScenarioMembershipFilter
    )
  }

  return entirePortfolioCompareColumn()
}

export type ComparePickerOption = {
  value: string
  label: string
  group: string
  keywords?: string
}

export function buildComparePickerOptions(
  userScenarios: readonly UserScenario[]
): ComparePickerOption[] {
  const out: ComparePickerOption[] = []

  out.push({
    value: PORTFOLIO_KEY,
    label: "All portfolio groups",
    group: "Portfolio groups",
    keywords: "portfolio entire full all assets",
  })

  for (const id of BUILT_IN_ASSET_GROUP_IDS) {
    out.push({
      value: groupKey(id),
      label: resolveAssetGroupLabel(id),
      group: "Portfolio groups",
      keywords: ASSET_GROUP_SIDEBAR_LABELS[id],
    })
  }

  const custom = readCustomAssetGroups()
  for (const [id, label] of Object.entries(custom).sort((a, b) =>
    a[1].localeCompare(b[1], undefined, { sensitivity: "base" })
  )) {
    out.push({
      value: groupKey(id),
      label,
      group: "Portfolio groups",
      keywords: label,
    })
  }

  out.push({
    value: scenarioKey(BUILTIN_SCENARIO.slug),
    label: scenarioDisplayTitleForSlug(BUILTIN_SCENARIO.slug, userScenarios),
    group: "Scenarios",
    keywords: "builtin capital planning",
  })
  for (const s of userScenarios) {
    out.push({
      value: scenarioKey(s.slug),
      label: s.name,
      group: "Scenarios",
      keywords: `${s.name} ${s.slug}`,
    })
  }

  for (const a of ASSETS) {
    out.push({
      value: assetKey(a.id),
      label: a.name,
      group: "Assets",
      keywords: `${a.name} ${a.address} ${a.id}`,
    })
  }

  const scenarioSlugs = [
    BUILTIN_SCENARIO.slug,
    ...userScenarios.map((s) => s.slug),
  ]
  for (const slug of scenarioSlugs) {
    const tracked = readScenarioIncludedPropertiesBySlug(slug)
    const scenarioLabel = scenarioDisplayTitleForSlug(slug, userScenarios)
    for (const { assetId, tenantId } of tracked) {
      const asset = getAssetById(assetId)
      const data = getSampleStackingPlanData(assetId)
      const tenant = data.floors
        .flatMap((f) => f.tenants)
        .find((t) => t.id === tenantId)
      const suiteLabel = tenant
        ? tenant.isVacant
          ? `Vacant ${tenant.space}`
          : tenant.name
        : tenantId
      out.push({
        value: propertySlotKey(slug, assetId, tenantId),
        label: `${suiteLabel} · ${asset?.name ?? assetId}`,
        group: `Properties · ${scenarioLabel}`,
        keywords: `${suiteLabel} ${asset?.name ?? ""} ${scenarioLabel} ${tenant?.floorLabel ?? ""}`,
      })
    }
  }

  return out
}

export function allComparePickerValues(
  userScenarios: readonly UserScenario[]
): Set<string> {
  return new Set(buildComparePickerOptions(userScenarios).map((o) => o.value))
}

/** Short label for one slot (saved comparison preview, breadcrumbs). */
export function labelForCompareSlotKey(
  key: string,
  userScenarios: readonly UserScenario[]
): string {
  if (key === PORTFOLIO_KEY) return "All portfolio groups"
  if (key.startsWith(GROUP_KEY_PREFIX)) {
    return resolveAssetGroupLabel(key.slice(GROUP_KEY_PREFIX.length))
  }
  if (key.startsWith(ASSET_KEY_PREFIX)) {
    const id = key.slice(ASSET_KEY_PREFIX.length)
    return getAssetById(id)?.name ?? id
  }
  const prop = parsePropertySlotKey(key)
  if (prop != null) {
    const data = getSampleStackingPlanData(prop.assetId)
    const tenant = data.floors
      .flatMap((f) => f.tenants)
      .find((t) => t.id === prop.tenantId)
    const asset = getAssetById(prop.assetId)
    if (tenant && asset) {
      return tenant.isVacant
        ? `Vacant · ${asset.name}`
        : `${tenant.name} · ${asset.name}`
    }
    return "Property"
  }
  if (key.startsWith("scenario:")) {
    const slug = key.slice("scenario:".length)
    return scenarioDisplayTitleForSlug(slug, userScenarios)
  }
  return "Compare"
}

export function entitySelectOptions(userScenarios: readonly UserScenario[]) {
  return buildComparePickerOptions(userScenarios).map((o) => ({
    value: o.value,
    label: o.label,
    group: o.group,
  }))
}

export function compareGridTemplateColumns(slotCount: number): string {
  const n = Math.max(0, slotCount)
  return `${COMPARE_ROW_LABEL_COL_PX}px repeat(${n}, minmax(0, 1fr))`
}

/** Default columns when starting a new comparison: all portfolio groups + built-in scenario. */
export function defaultCompareSlotKeys(): string[] {
  return [PORTFOLIO_KEY, scenarioKey(BUILTIN_SCENARIO.slug)]
}

export function numericForMetricKey(
  n: HeaderKpiNumeric,
  key: keyof HeaderKpiMetrics
): number {
  switch (key) {
    case "estValue":
      return n.estValueBillions
    case "estValuePerSf":
      return n.estValuePerSfUsd
    case "occupancy":
      return n.occupancyPct
    case "vacancy":
      return n.vacancyPct
    case "noi":
      return n.noiMillionsPerYr
    case "noiPerSf":
      return n.noiPerSfUsd
    case "capRate":
      return n.capRatePct
    case "wale":
      return n.waleYears
  }
}

/** Signed delta string for columns after the reference column; "—" when unchanged. */
export function formatCompareMetricDelta(
  metricKey: keyof HeaderKpiMetrics,
  delta: number
): string {
  const eps = 1e-6
  if (Math.abs(delta) < eps) return "—"
  const s = delta > 0 ? "+" : "−"
  const a = Math.abs(delta)
  switch (metricKey) {
    case "estValue":
      return `${s}$${a.toFixed(2)}B`
    case "estValuePerSf":
      return `${s}$${Math.round(a)} / SF`
    case "occupancy":
    case "vacancy":
      return `${s}${a.toFixed(2)} pts`
    case "noi":
      return `${s}$${a.toFixed(1)}M`
    case "noiPerSf":
      return `${s}$${a.toFixed(2)} / SF`
    case "capRate":
      return `${s}${a.toFixed(2)} pts`
    case "wale":
      return `${s}${a.toFixed(1)} yrs`
  }
}
