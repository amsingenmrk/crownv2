import { ASSETS } from "@/lib/assets"
import {
  BUILTIN_SCENARIO,
  type UserScenario,
} from "@/lib/user-scenarios"

export const PORTFOLIO_KEY = "portfolio"
export const MIN_COMPARE_COLUMNS = 1
export const MAX_COMPARE_COLUMNS = 6
export const COMPARE_ROW_LABEL_COL_PX = 200

export function scenarioKey(slug: string) {
  return `scenario:${slug}`
}

export type CompareKind = "portfolio" | "scenario"

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
}

/** Baseline matches `KPIS` in `portfolio-dashboard.tsx`. */
export const PORTFOLIO_KPIS_BASELINE: HeaderKpiMetrics = {
  estValue: "$1.24B",
  estValuePerSf: "$485 / SF",
  occupancy: "91.60%",
  vacancy: "8.40%",
  noi: "$74.2M / yr",
  noiPerSf: "$29.10 / SF",
  capRate: "6.00%",
  wale: "5.8 yrs",
}

export const PORTFOLIO_KPIS_NUMERIC_BASELINE: HeaderKpiNumeric = {
  estValueBillions: 1.24,
  estValuePerSfUsd: 485,
  occupancyPct: 91.6,
  vacancyPct: 8.4,
  noiMillionsPerYr: 74.2,
  noiPerSfUsd: 29.1,
  capRatePct: 6.0,
  waleYears: 5.8,
}

type KpiPresetBundle = {
  display: HeaderKpiMetrics
  numeric: HeaderKpiNumeric
}

const KPI_PRESET_BUNDLES: KpiPresetBundle[] = [
  {
    display: PORTFOLIO_KPIS_BASELINE,
    numeric: PORTFOLIO_KPIS_NUMERIC_BASELINE,
  },
  {
    display: {
      estValue: "$1.27B",
      estValuePerSf: "$498 / SF",
      occupancy: PORTFOLIO_KPIS_BASELINE.occupancy,
      vacancy: PORTFOLIO_KPIS_BASELINE.vacancy,
      noi: "$76.1M / yr",
      noiPerSf: "$29.85 / SF",
      capRate: "5.95%",
      wale: PORTFOLIO_KPIS_BASELINE.wale,
    },
    numeric: {
      estValueBillions: 1.27,
      estValuePerSfUsd: 498,
      occupancyPct: 91.6,
      vacancyPct: 8.4,
      noiMillionsPerYr: 76.1,
      noiPerSfUsd: 29.85,
      capRatePct: 5.95,
      waleYears: 5.8,
    },
  },
  {
    display: {
      estValue: "$1.21B",
      estValuePerSf: "$472 / SF",
      occupancy: PORTFOLIO_KPIS_BASELINE.occupancy,
      vacancy: PORTFOLIO_KPIS_BASELINE.vacancy,
      noi: "$72.8M / yr",
      noiPerSf: "$28.40 / SF",
      capRate: "6.08%",
      wale: PORTFOLIO_KPIS_BASELINE.wale,
    },
    numeric: {
      estValueBillions: 1.21,
      estValuePerSfUsd: 472,
      occupancyPct: 91.6,
      vacancyPct: 8.4,
      noiMillionsPerYr: 72.8,
      noiPerSfUsd: 28.4,
      capRatePct: 6.08,
      waleYears: 5.8,
    },
  },
]

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
  { label: "WALE / WALT", metricKey: "wale", get: (m) => m.wale },
]

function presetBundleAt(index: number): KpiPresetBundle {
  return KPI_PRESET_BUNDLES[index % KPI_PRESET_BUNDLES.length]!
}

function portfolioColumn(): CompareColumn {
  const flagship = ASSETS[0]
  const b = presetBundleAt(0)
  return {
    id: "portfolio",
    kind: "portfolio",
    name: "Portfolio",
    address: `Consolidated holdings, ${flagship?.address ?? "All assets"}`,
    image:
      flagship?.imageUrl ??
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop",
    metrics: { ...b.display },
    numeric: { ...b.numeric },
  }
}

function builtinScenarioColumn(): CompareColumn {
  const b = presetBundleAt(1)
  return {
    id: `scenario-${BUILTIN_SCENARIO.slug}`,
    kind: "scenario",
    slug: BUILTIN_SCENARIO.slug,
    name: BUILTIN_SCENARIO.name,
    address: "Scenario workspace · capital planning",
    image:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop",
    metrics: { ...b.display },
    numeric: { ...b.numeric },
  }
}

function userScenarioColumn(s: UserScenario, index: number): CompareColumn {
  const b = presetBundleAt(2 + index)
  return {
    id: `scenario-${s.slug}`,
    kind: "scenario",
    slug: s.slug,
    name: s.name,
    address: `User scenario · ${s.slug.replace(/-/g, " ")}`,
    image:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
    metrics: { ...b.display },
    numeric: { ...b.numeric },
  }
}

export function columnForEntityKey(
  key: string,
  userScenarios: readonly UserScenario[]
): CompareColumn {
  if (key === PORTFOLIO_KEY) return portfolioColumn()
  if (!key.startsWith("scenario:")) return portfolioColumn()
  const slug = key.slice("scenario:".length)
  if (slug === BUILTIN_SCENARIO.slug) return builtinScenarioColumn()
  const idx = userScenarios.findIndex((s) => s.slug === slug)
  if (idx >= 0) return userScenarioColumn(userScenarios[idx]!, idx)
  return builtinScenarioColumn()
}

export function entitySelectOptions(userScenarios: readonly UserScenario[]) {
  return [
    { value: PORTFOLIO_KEY, label: "Portfolio" },
    {
      value: scenarioKey(BUILTIN_SCENARIO.slug),
      label: BUILTIN_SCENARIO.name,
    },
    ...userScenarios.map((s) => ({
      value: scenarioKey(s.slug),
      label: s.name,
    })),
  ]
}

export function compareGridTemplateColumns(slotCount: number): string {
  const n = Math.max(0, slotCount)
  return `${COMPARE_ROW_LABEL_COL_PX}px repeat(${n}, minmax(0, 1fr))`
}

/** Default columns: Portfolio → built-in scenario → first user scenario (or built-in again if none). */
export function defaultCompareSlotKeys(
  userScenarios: readonly UserScenario[]
): string[] {
  const built = scenarioKey(BUILTIN_SCENARIO.slug)
  const third =
    userScenarios[0] != null ? scenarioKey(userScenarios[0].slug) : built
  return [PORTFOLIO_KEY, built, third]
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

export function effectiveCompareNumeric(
  col: CompareColumn,
  modsOn: boolean
): HeaderKpiNumeric {
  return modsOn ? col.numeric : PORTFOLIO_KPIS_NUMERIC_BASELINE
}

export function effectiveCompareDisplay(
  col: CompareColumn,
  modsOn: boolean
): HeaderKpiMetrics {
  return modsOn ? col.metrics : PORTFOLIO_KPIS_BASELINE
}
