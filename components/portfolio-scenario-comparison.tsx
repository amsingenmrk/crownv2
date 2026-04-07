"use client"

import * as React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ASSETS } from "@/lib/assets"
import {
  BUILTIN_SCENARIO,
  getUserScenariosStoreSnapshot,
  subscribeUserScenarios,
  USER_SCENARIOS_SERVER_SNAPSHOT,
  type UserScenario,
} from "@/lib/user-scenarios"
import { cn } from "@/lib/utils"

const PORTFOLIO_KEY = "portfolio"
const COMPARE_SLOT_COUNT = 3
/** Fixed layout: label column width; data columns share the rest equally. */
const COMPARE_ROW_LABEL_COL_PX = 200

function scenarioKey(slug: string) {
  return `scenario:${slug}`
}

type CompareKind = "portfolio" | "scenario"

/** Same headline fields as the KPI row on `PortfolioDashboard` (/portfolio and /scenarios). */
type HeaderKpiMetrics = {
  estValue: string
  estValuePerSf: string
  occupancy: string
  vacancy: string
  noi: string
  noiPerSf: string
  capRate: string
  wale: string
}

type CompareColumn = {
  id: string
  kind: CompareKind
  slug?: string
  name: string
  address: string
  image: string
  metrics: HeaderKpiMetrics
}

/** Baseline matches `KPIS` in `portfolio-dashboard.tsx`. */
const PORTFOLIO_KPIS_BASELINE: HeaderKpiMetrics = {
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
const METRIC_KEYS_AFFECTED_BY_MODS = new Set<keyof HeaderKpiMetrics>([
  "estValue",
  "estValuePerSf",
  "noi",
  "noiPerSf",
  "capRate",
])

const KPI_TABLE_ROWS: {
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

function columnForEntityKey(
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

function entitySelectOptions(userScenarios: readonly UserScenario[]) {
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

export function PortfolioScenarioComparison() {
  const userScenarios = React.useSyncExternalStore(
    subscribeUserScenarios,
    getUserScenariosStoreSnapshot,
    () => USER_SCENARIOS_SERVER_SNAPSHOT
  )

  const validKeys = React.useMemo(() => {
    return new Set(entitySelectOptions(userScenarios).map((o) => o.value))
  }, [userScenarios])

  const [slotKeys, setSlotKeys] = React.useState<string[]>(() => [
    PORTFOLIO_KEY,
    scenarioKey(BUILTIN_SCENARIO.slug),
    scenarioKey(BUILTIN_SCENARIO.slug),
  ])

  const [modificationsOn, setModificationsOn] = React.useState<boolean[]>(() =>
    Array.from({ length: COMPARE_SLOT_COUNT }, () => true)
  )

  React.useEffect(() => {
    setSlotKeys((prev) => {
      const next = prev.map((k) => (validKeys.has(k) ? k : PORTFOLIO_KEY))
      while (next.length < COMPARE_SLOT_COUNT) {
        next.push(scenarioKey(BUILTIN_SCENARIO.slug))
      }
      if (next.length > COMPARE_SLOT_COUNT) {
        return next.slice(0, COMPARE_SLOT_COUNT)
      }
      return next
    })
  }, [validKeys])

  const options = React.useMemo(
    () => entitySelectOptions(userScenarios),
    [userScenarios]
  )

  const columns = React.useMemo(
    () => slotKeys.map((key) => columnForEntityKey(key, userScenarios)),
    [slotKeys, userScenarios]
  )

  const setSlot = React.useCallback((index: number, value: string) => {
    setSlotKeys((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }, [])

  const setModificationsOnAt = React.useCallback(
    (index: number, on: boolean) => {
      setModificationsOn((prev) => {
        const next = [...prev]
        next[index] = on
        return next
      })
    },
    []
  )

  return (
    <div className="mb-6">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table className="table-fixed">
          <colgroup>
            <col style={{ width: COMPARE_ROW_LABEL_COL_PX }} />
            {Array.from({ length: COMPARE_SLOT_COUNT }).map((_, i) => (
              <col
                key={i}
                style={{
                  width: `calc((100% - ${COMPARE_ROW_LABEL_COL_PX}px) / ${COMPARE_SLOT_COUNT})`,
                }}
              />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead
                className="h-auto min-w-0 p-2 align-middle"
                style={{ width: COMPARE_ROW_LABEL_COL_PX }}
                aria-hidden
              />
              {slotKeys.map((key, slotIndex) => (
                <TableHead
                  key={`select-slot-${slotIndex}`}
                  className="h-auto min-w-0 p-2 align-middle"
                >
                  <Select
                    value={key}
                    items={options}
                    onValueChange={(v) => {
                      if (v) setSlot(slotIndex, v)
                    }}
                  >
                    <SelectTrigger
                      className="w-full min-w-0 max-w-full"
                      aria-label="Compare column source"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </TableHead>
              ))}
            </TableRow>
            <TableRow>
              <TableHead
                className="h-auto min-w-0 p-2 align-middle font-medium"
                style={{ width: COMPARE_ROW_LABEL_COL_PX }}
              >
                Modifications
              </TableHead>
              {slotKeys.map((_, slotIndex) => (
                <TableHead
                  key={`mods-slot-${slotIndex}`}
                  className="h-auto min-w-0 p-2 align-middle"
                >
                  <div className="flex items-center justify-start gap-2">
                    <Checkbox
                      checked={modificationsOn[slotIndex] === true}
                      onCheckedChange={(checked) =>
                        setModificationsOnAt(slotIndex, !!checked)
                      }
                      aria-label={`Include modifications for column ${slotIndex + 1}`}
                    />
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {KPI_TABLE_ROWS.map((row) => (
              <TableRow key={row.label}>
                <TableCell
                  className="min-w-0 bg-muted/30 p-2 font-medium"
                  style={{ width: COMPARE_ROW_LABEL_COL_PX }}
                >
                  {row.label}
                </TableCell>
                {columns.map((baseCol, slotIndex) => {
                  const modsOn = modificationsOn[slotIndex] === true
                  const displayMetrics = modsOn
                    ? baseCol.metrics
                    : PORTFOLIO_KPIS_BASELINE
                  const value = row.get(displayMetrics)
                  const affectedByMods =
                    modsOn &&
                    METRIC_KEYS_AFFECTED_BY_MODS.has(row.metricKey) &&
                    baseCol.metrics[row.metricKey] !==
                      PORTFOLIO_KPIS_BASELINE[row.metricKey]
                  return (
                    <TableCell
                      key={`${row.label}-slot-${slotIndex}`}
                      className="min-w-0 bg-muted/10 p-2 text-left text-sm tabular-nums"
                    >
                      <span
                        className={cn(
                          affectedByMods &&
                            "font-semibold text-violet-800 dark:text-violet-200"
                        )}
                      >
                        {value}
                      </span>
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
