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

export type CompareColumn = {
  id: string
  kind: CompareKind
  slug?: string
  name: string
  address: string
  image: string
  metrics: HeaderKpiMetrics
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

const KPI_METRIC_PRESETS: HeaderKpiMetrics[] = [
  PORTFOLIO_KPIS_BASELINE,
  {
    estValue: "$1.27B",
    estValuePerSf: "$498 / SF",
    occupancy: PORTFOLIO_KPIS_BASELINE.occupancy,
    vacancy: PORTFOLIO_KPIS_BASELINE.vacancy,
    noi: "$76.1M / yr",
    noiPerSf: "$29.85 / SF",
    capRate: "5.95%",
    wale: PORTFOLIO_KPIS_BASELINE.wale,
  },
  {
    estValue: "$1.21B",
    estValuePerSf: "$472 / SF",
    occupancy: PORTFOLIO_KPIS_BASELINE.occupancy,
    vacancy: PORTFOLIO_KPIS_BASELINE.vacancy,
    noi: "$72.8M / yr",
    noiPerSf: "$28.40 / SF",
    capRate: "6.08%",
    wale: PORTFOLIO_KPIS_BASELINE.wale,
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

function metricsPresetAt(index: number): HeaderKpiMetrics {
  return { ...KPI_METRIC_PRESETS[index % KPI_METRIC_PRESETS.length]! }
}

function portfolioColumn(): CompareColumn {
  const flagship = ASSETS[0]
  return {
    id: "portfolio",
    kind: "portfolio",
    name: "Portfolio",
    address: `Consolidated holdings, ${flagship?.address ?? "All assets"}`,
    image:
      flagship?.imageUrl ??
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop",
    metrics: metricsPresetAt(0),
  }
}

function builtinScenarioColumn(): CompareColumn {
  return {
    id: `scenario-${BUILTIN_SCENARIO.slug}`,
    kind: "scenario",
    slug: BUILTIN_SCENARIO.slug,
    name: BUILTIN_SCENARIO.name,
    address: "Scenario workspace · capital planning",
    image:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop",
    metrics: metricsPresetAt(1),
  }
}

function userScenarioColumn(s: UserScenario, index: number): CompareColumn {
  return {
    id: `scenario-${s.slug}`,
    kind: "scenario",
    slug: s.slug,
    name: s.name,
    address: `User scenario · ${s.slug.replace(/-/g, " ")}`,
    image:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
    metrics: metricsPresetAt(2 + index),
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
