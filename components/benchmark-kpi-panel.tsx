"use client"

import * as React from "react"
import {
  ChevronDown,
  Info,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react"

import { AssetForecastCharts } from "@/components/asset-forecast-charts"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SidebarGroupAction } from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  BENCHMARK_KPI_DEFINITIONS,
  type BenchmarkAreaSnapshot,
  type BenchmarkStatsRaw,
  type BenchmarkKpiDefinition,
} from "@/lib/benchmark-area-model"
import type { BenchmarkArea } from "@/lib/benchmark-area-search"
import {
  benchmarkAreaForecastInputs,
  buildBenchmarkAreaForecastModelForScenario,
  defaultBenchmarkForecastAssumptions,
} from "@/lib/benchmark-area-forecast"
import type { ForecastChartTab } from "@/lib/forecast-chart-config"
import {
  buildDefaultForecastScenarios,
  createForecastScenarioFromTemplate,
  type ForecastEconomicOutlookScenario,
  type ForecastScenarioId,
} from "@/lib/forecast-data"
import {
  cloneScenario,
  cloneScenarios,
  parseStoredForecastOutlookSets,
  parseStoredForecastScenarios,
  type ForecastOutlookSet,
} from "@/lib/forecast-scenario-storage"
import { outlookSetStoredNameDisplay } from "@/lib/scoped-forecast-select-labels"
import { qualityScoreValueClass } from "@/lib/stacking-plan-visual-tokens"
import { cn } from "@/lib/utils"

function scoreValueClass(
  definition: BenchmarkKpiDefinition,
  value: string
): string | undefined {
  if (definition.format !== "score" || value === "—") return undefined
  const n = Number(value)
  if (!Number.isFinite(n)) return undefined
  return qualityScoreValueClass(n)
}

function BenchmarkKpiCard({
  definition,
  value,
  participantNote,
}: {
  definition: BenchmarkKpiDefinition
  value: string
  participantNote?: string
}) {
  const valueClassName = scoreValueClass(definition, value)

  return (
    <article className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-1.5">
        <h3 className="text-xs font-medium leading-snug text-muted-foreground">
          {definition.label}
        </h3>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label={`Info: ${definition.label}`}
              />
            }
          >
            <Info className="size-3 stroke-[1.5]" aria-hidden />
          </TooltipTrigger>
          <TooltipContent className="max-w-[280px] text-pretty text-xs">
            {definition.methodology}
          </TooltipContent>
        </Tooltip>
      </div>
      <p
        className={cn(
          "mt-1 text-lg font-semibold leading-tight tracking-tight tabular-nums",
          valueClassName ?? "text-foreground"
        )}
      >
        {value}
      </p>
      {participantNote ? (
        <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
          {participantNote}
        </p>
      ) : null}
    </article>
  )
}

const NO_ACTIVE_OUTLOOK_SET = "__benchmark_no_outlook_set__"

const MACRO_FIELDS = [
  { key: "inflationPct", label: "Inflation", suffix: "%", min: 0, max: 8 },
  { key: "treasuryRatePct", label: "Treasury", suffix: "%", min: 0, max: 10 },
  {
    key: "submarketOccupancyPct",
    label: "Occupancy",
    suffix: "%",
    min: 50,
    max: 100,
  },
] as const

type MacroFieldKey = (typeof MACRO_FIELDS)[number]["key"]

const macroAverageFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatMacroInputValue(n: number): string {
  const s = n.toFixed(4)
  if (!s.includes(".")) return s
  const trimmed = s.replace(/\.?0+$/, "")
  return trimmed === "" ? "0" : trimmed
}

function benchmarkForecastScenarioStorageKey(areaId: string) {
  return `glassbox:benchmark-forecast-scenarios:${areaId}`
}

function benchmarkForecastOutlookSetStorageKey(areaId: string) {
  return `glassbox:benchmark-forecast-outlook-sets:${areaId}`
}

function OutlookMacroFieldInput({
  value,
  min,
  max,
  suffix,
  disabled,
  onCommit,
}: {
  value: number
  min: number
  max: number
  suffix: string
  disabled?: boolean
  onCommit: (next: number) => void
}) {
  const [text, setText] = React.useState(() => formatMacroInputValue(value))

  React.useEffect(() => {
    setText(formatMacroInputValue(value))
  }, [value])

  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        className="h-7 min-h-7 px-2 py-0 pr-[1.125rem] text-[0.8rem] leading-none tabular-nums md:text-[0.8rem]"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          const cleaned = text.replace(/%/g, "").replace(/,/g, "").trim()
          const parsed = Number(cleaned)
          const next = Number.isFinite(parsed) ? clamp(parsed, min, max) : value
          setText(formatMacroInputValue(next))
          if (next !== value) {
            onCommit(next)
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            ;(event.target as HTMLInputElement).blur()
          }
        }}
      />
      <span className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-[10px] leading-none text-muted-foreground">
        {suffix}
      </span>
    </div>
  )
}

function sanitizeScenario(
  scenario: ForecastEconomicOutlookScenario,
  fallbackName: string
): ForecastEconomicOutlookScenario {
  return {
    ...cloneScenario(scenario),
    name: scenario.name.trim() || fallbackName,
  }
}

function getScenarioMacroAverage(
  scenario: ForecastEconomicOutlookScenario,
  fieldKey: MacroFieldKey
) {
  if (scenario.macroPeriods.length === 0) return 0

  const total = scenario.macroPeriods.reduce(
    (sum, period) => sum + period[fieldKey],
    0
  )
  return total / scenario.macroPeriods.length
}

function formatScenarioMacroAverage(value: number, suffix: string) {
  return `${macroAverageFormatter.format(value)}${suffix}`
}

function normalizeOutlooksForSetComparison(
  outlooks: ForecastEconomicOutlookScenario[]
) {
  return cloneScenarios(outlooks).map((outlook, index) =>
    sanitizeScenario(outlook, `Custom Outlook ${index + 1}`)
  )
}

function buildOutlookSetStateKey({
  outlooks,
  includedOutlookIds,
  activeOutlookId,
}: {
  outlooks: ForecastEconomicOutlookScenario[]
  includedOutlookIds: ForecastScenarioId[]
  activeOutlookId: ForecastScenarioId
}) {
  return JSON.stringify({
    outlooks: normalizeOutlooksForSetComparison(outlooks),
    includedOutlookIds,
    activeOutlookId,
  })
}

export function BenchmarkKpiPanel({
  area,
  snapshot,
  statsRaw,
  className,
}: {
  area: BenchmarkArea
  snapshot: BenchmarkAreaSnapshot
  statsRaw?: BenchmarkStatsRaw | null
  className?: string
}) {
  const [metricTab, setMetricTab] = React.useState<ForecastChartTab>("intrinsicRent")
  const defaultOutlooks = React.useMemo(() => buildDefaultForecastScenarios(), [])
  const marketInputs = React.useMemo(
    () => benchmarkAreaForecastInputs(area, statsRaw),
    [
      area,
      statsRaw?.askingRentPsf,
      statsRaw?.buildingCount,
      statsRaw?.inPlaceRentPsf,
      statsRaw?.intrinsicRentPsf,
      statsRaw?.occupancyPct,
    ]
  )
  const scenarioStorageKey = React.useMemo(
    () => benchmarkForecastScenarioStorageKey(area.id),
    [area.id]
  )
  const setStorageKey = React.useMemo(
    () => benchmarkForecastOutlookSetStorageKey(area.id),
    [area.id]
  )
  const assumptions = React.useMemo(
    () => defaultBenchmarkForecastAssumptions(marketInputs),
    [marketInputs]
  )
  const [outlooks, setOutlooks] = React.useState<ForecastEconomicOutlookScenario[]>(
    defaultOutlooks
  )
  const [includedOutlookIds, setIncludedOutlookIds] = React.useState<
    ForecastScenarioId[]
  >(defaultOutlooks.map((outlook) => outlook.id))
  const [activeOutlookId, setActiveOutlookId] =
    React.useState<ForecastScenarioId>(defaultOutlooks[0]?.id ?? "baseline")
  const [editingOutlookId, setEditingOutlookId] =
    React.useState<ForecastScenarioId | null>(null)
  const [originalEditingOutlook, setOriginalEditingOutlook] =
    React.useState<ForecastEconomicOutlookScenario | null>(null)
  const [outlookSets, setOutlookSets] = React.useState<ForecastOutlookSet[]>(
    []
  )
  const [activeOutlookSetId, setActiveOutlookSetId] =
    React.useState<string>("")
  const [outlookSaveName, setOutlookSaveName] = React.useState("")
  const [outlooksDropdownOpen, setOutlooksDropdownOpen] = React.useState(false)
  const outlookSaveFieldId = React.useId()

  React.useLayoutEffect(() => {
    const nextOutlooks = parseStoredForecastScenarios(
      typeof localStorage !== "undefined"
        ? localStorage.getItem(scenarioStorageKey)
        : null,
      defaultOutlooks
    )
    const nextOutlookSets = parseStoredForecastOutlookSets(
      typeof localStorage !== "undefined"
        ? localStorage.getItem(setStorageKey)
        : null,
      defaultOutlooks
    )

    setOutlooks(nextOutlooks)
    setIncludedOutlookIds(nextOutlooks.map((outlook) => outlook.id))
    setActiveOutlookId(nextOutlooks[0]?.id ?? defaultOutlooks[0]?.id ?? "baseline")
    setEditingOutlookId(null)
    setOriginalEditingOutlook(null)
    setOutlookSets(nextOutlookSets)
    setActiveOutlookSetId("")
    setOutlookSaveName("")
    setOutlooksDropdownOpen(false)
  }, [defaultOutlooks, scenarioStorageKey, setStorageKey])

  const persistOutlooks = React.useCallback(
    (nextOutlooks: ForecastEconomicOutlookScenario[]) => {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(scenarioStorageKey, JSON.stringify(nextOutlooks))
      }
      setOutlooks(nextOutlooks)
    },
    [scenarioStorageKey]
  )

  const persistOutlookSets = React.useCallback(
    (nextSets: ForecastOutlookSet[]) => {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(setStorageKey, JSON.stringify(nextSets))
      }
      setOutlookSets(nextSets)
    },
    [setStorageKey]
  )

  React.useEffect(() => {
    if (outlooks.some((outlook) => outlook.id === activeOutlookId)) return
    const fallbackId = outlooks[0]?.id ?? defaultOutlooks[0]?.id ?? "baseline"
    setActiveOutlookId(fallbackId)
  }, [activeOutlookId, defaultOutlooks, outlooks])

  React.useEffect(() => {
    const filteredIncluded = includedOutlookIds.filter((outlookId) =>
      outlooks.some((outlook) => outlook.id === outlookId)
    )
    if (filteredIncluded.length === 0 && outlooks[0] != null) {
      setIncludedOutlookIds([outlooks[0].id])
      return
    }
    if (filteredIncluded.length !== includedOutlookIds.length) {
      setIncludedOutlookIds(filteredIncluded)
    }
  }, [includedOutlookIds, outlooks])

  React.useEffect(() => {
    if (includedOutlookIds.includes(activeOutlookId)) return
    const fallbackId =
      includedOutlookIds[0] ?? outlooks[0]?.id ?? defaultOutlooks[0]?.id
    if (fallbackId != null) {
      setActiveOutlookId(fallbackId)
    }
  }, [activeOutlookId, defaultOutlooks, includedOutlookIds, outlooks])

  const activeOutlook =
    outlooks.find((outlook) => outlook.id === activeOutlookId) ?? outlooks[0] ?? null

  const includedOutlooks = React.useMemo(
    () =>
      includedOutlookIds
        .map((outlookId) =>
          outlooks.find((outlook) => outlook.id === outlookId)
        )
        .filter(
          (outlook): outlook is ForecastEconomicOutlookScenario => outlook != null
        ),
    [includedOutlookIds, outlooks]
  )

  const includedModels = React.useMemo(
    () =>
      includedOutlooks.map((outlook) =>
        buildBenchmarkAreaForecastModelForScenario({
          area,
          scenario: outlook,
          marketInputs,
          assumptions,
        })
      ),
    [area, assumptions, includedOutlooks, marketInputs]
  )
  const selectedOutlookSummary = React.useMemo(() => {
    if (includedOutlooks.length === 1) return "1 selected outlook"
    return `${includedOutlooks.length} selected outlooks`
  }, [includedOutlooks.length])

  const sortedOutlookSets = React.useMemo(
    () => [...outlookSets].sort((a, b) => a.name.localeCompare(b.name)),
    [outlookSets]
  )

  const outlookSetItemLabels = React.useMemo(() => {
    const labels: Record<string, React.ReactNode> = {}
    for (const set of sortedOutlookSets) {
      labels[set.id] = outlookSetStoredNameDisplay(set.name)
    }
    return labels
  }, [sortedOutlookSets])

  const currentOutlookSetStateKey = React.useMemo(
    () =>
      buildOutlookSetStateKey({
        outlooks,
        includedOutlookIds,
        activeOutlookId,
      }),
    [activeOutlookId, includedOutlookIds, outlooks]
  )

  const activeOutlookSetMatchesCurrentState = React.useMemo(() => {
    if (activeOutlookSetId === "") return false
    const activeSet = outlookSets.find((set) => set.id === activeOutlookSetId)
    if (activeSet == null) return false
    return (
      buildOutlookSetStateKey({
        outlooks: activeSet.outlooks,
        includedOutlookIds: activeSet.includedOutlookIds,
        activeOutlookId: activeSet.activeOutlookId,
      }) === currentOutlookSetStateKey
    )
  }, [activeOutlookSetId, currentOutlookSetStateKey, outlookSets])

  React.useEffect(() => {
    if (activeOutlookSetId === "") return
    const activeSet = outlookSets.find((set) => set.id === activeOutlookSetId)
    setOutlookSaveName(activeSet?.name ?? "")
  }, [activeOutlookSetId, outlookSets])

  React.useEffect(() => {
    if (activeOutlookSetId === "") return
    if (activeOutlookSetMatchesCurrentState) return
    setActiveOutlookSetId("")
    setOutlookSaveName("")
  }, [activeOutlookSetId, activeOutlookSetMatchesCurrentState])

  React.useEffect(() => {
    if (editingOutlookId == null) return
    setOutlooksDropdownOpen(true)
  }, [editingOutlookId])

  const handleOutlooksDropdownOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open && editingOutlookId != null) return
      setOutlooksDropdownOpen(open)
    },
    [editingOutlookId]
  )

  const updateOutlook = React.useCallback(
    (
      outlookId: ForecastScenarioId,
      updater: (
        outlook: ForecastEconomicOutlookScenario
      ) => ForecastEconomicOutlookScenario
    ) => {
      setOutlooks((previous) =>
        previous.map((outlook) =>
          outlook.id === outlookId ? updater(outlook) : outlook
        )
      )
    },
    []
  )

  const toggleOutlookIncluded = React.useCallback(
    (outlookId: ForecastScenarioId) => {
      setIncludedOutlookIds((previous) => {
        const isIncluded = previous.includes(outlookId)
        if (isIncluded) {
          if (previous.length === 1) return previous
          const next = previous.filter((id) => id !== outlookId)
          if (activeOutlookId === outlookId) {
            setActiveOutlookId(next[0] ?? outlookId)
          }
          return next
        }

        return [...previous, outlookId]
      })
    },
    [activeOutlookId]
  )

  const startEditingOutlook = React.useCallback(
    (outlookId: ForecastScenarioId) => {
      if (editingOutlookId != null && editingOutlookId !== outlookId) return
      const outlook = outlooks.find((entry) => entry.id === outlookId)
      if (outlook == null) return

      setEditingOutlookId(outlookId)
      setOriginalEditingOutlook(cloneScenario(outlook))
    },
    [editingOutlookId, outlooks]
  )

  const saveEditingOutlook = React.useCallback(
    (outlookId: ForecastScenarioId) => {
      const index = outlooks.findIndex((outlook) => outlook.id === outlookId)
      if (index < 0) return

      const sanitized = sanitizeScenario(
        outlooks[index]!,
        `Custom Outlook ${index + 1}`
      )
      const nextOutlooks = outlooks.map((outlook, currentIndex) =>
        currentIndex === index ? sanitized : outlook
      )

      setOutlooks(nextOutlooks)
      persistOutlooks(nextOutlooks)
      setEditingOutlookId(null)
      setOriginalEditingOutlook(null)
    },
    [outlooks, persistOutlooks]
  )

  const cancelEditingOutlook = React.useCallback(() => {
    if (editingOutlookId == null) return

    if (originalEditingOutlook == null) {
      const nextOutlooks = outlooks.filter(
        (outlook) => outlook.id !== editingOutlookId
      )
      setOutlooks(nextOutlooks)
    } else {
      setOutlooks((previous) =>
        previous.map((outlook) =>
          outlook.id === originalEditingOutlook.id
            ? cloneScenario(originalEditingOutlook)
            : outlook
        )
      )
    }

    setEditingOutlookId(null)
    setOriginalEditingOutlook(null)
  }, [editingOutlookId, originalEditingOutlook, outlooks])

  const createOutlook = React.useCallback(() => {
    if (editingOutlookId != null) return

    const template = activeOutlook ?? outlooks[0] ?? defaultOutlooks[0]!
    const nextOutlook = createForecastScenarioFromTemplate({
      id: crypto.randomUUID(),
      name: `Custom Outlook ${
        outlooks.filter((outlook) => !outlook.isPreset).length + 1
      }`,
      template,
    })

    setOutlooks((previous) => [...previous, nextOutlook])
    setIncludedOutlookIds((previous) => [...previous, nextOutlook.id])
    setActiveOutlookId(nextOutlook.id)
    setEditingOutlookId(nextOutlook.id)
    setOriginalEditingOutlook(null)
  }, [activeOutlook, defaultOutlooks, editingOutlookId, outlooks])

  const deleteOutlook = React.useCallback(
    (outlookId: ForecastScenarioId) => {
      const outlook = outlooks.find((entry) => entry.id === outlookId)
      if (outlook == null || outlook.isPreset || outlooks.length <= 1) return

      const nextOutlooks = outlooks.filter((entry) => entry.id !== outlookId)
      setOutlooks(nextOutlooks)
      setIncludedOutlookIds((previous) => {
        const filtered = previous.filter((id) => id !== outlookId)
        return filtered.length > 0
          ? filtered
          : [nextOutlooks[0]?.id ?? defaultOutlooks[0]?.id ?? "baseline"]
      })
      persistOutlooks(nextOutlooks)

      if (editingOutlookId === outlookId) {
        setEditingOutlookId(null)
        setOriginalEditingOutlook(null)
      }

      if (activeOutlookId === outlookId) {
        setActiveOutlookId(
          nextOutlooks[0]?.id ?? defaultOutlooks[0]?.id ?? "baseline"
        )
      }
    },
    [activeOutlookId, defaultOutlooks, editingOutlookId, outlooks, persistOutlooks]
  )

  const saveOutlookSetFromField = React.useCallback(() => {
    const name = outlookSaveName.trim()
    if (!name) return

    const snapshotOutlooks = normalizeOutlooksForSetComparison(outlooks)
    const buildSet = (id: string, setName: string): ForecastOutlookSet => ({
      id,
      name: setName,
      includedOutlookIds: includedOutlookIds.filter((outlookId) =>
        snapshotOutlooks.some((outlook) => outlook.id === outlookId)
      ),
      activeOutlookId,
      savedAt: Date.now(),
      outlooks: snapshotOutlooks,
    })

    if (activeOutlookSetId !== "") {
      const index = outlookSets.findIndex((set) => set.id === activeOutlookSetId)
      if (index < 0) return
      const nameTakenElsewhere = outlookSets.some(
        (set, currentIndex) =>
          currentIndex !== index &&
          set.name.toLowerCase() === name.toLowerCase()
      )
      if (nameTakenElsewhere) return
      persistOutlookSets(
        outlookSets.map((set, currentIndex) =>
          currentIndex === index ? buildSet(set.id, name) : set
        )
      )
      return
    }

    const existingIndex = outlookSets.findIndex(
      (set) => set.name.toLowerCase() === name.toLowerCase()
    )
    if (existingIndex >= 0) {
      const appliedId = outlookSets[existingIndex]!.id
      persistOutlookSets(
        outlookSets.map((set, currentIndex) =>
          currentIndex === existingIndex ? buildSet(set.id, name) : set
        )
      )
      setActiveOutlookSetId(appliedId)
      return
    }

    const appliedId = crypto.randomUUID()
    persistOutlookSets([...outlookSets, buildSet(appliedId, name)])
    setActiveOutlookSetId(appliedId)
  }, [
    activeOutlookId,
    activeOutlookSetId,
    includedOutlookIds,
    outlookSaveName,
    outlookSets,
    outlooks,
    persistOutlookSets,
  ])

  const applyOutlookSetById = React.useCallback(
    (setId: string) => {
      if (setId === "") return
      const selectedSet = outlookSets.find((set) => set.id === setId)
      if (selectedSet == null) return

      const nextOutlooks = cloneScenarios(selectedSet.outlooks)
      const fallbackId =
        nextOutlooks.find(
          (outlook) => outlook.id === selectedSet.activeOutlookId
        )?.id ??
        nextOutlooks[0]?.id ??
        defaultOutlooks[0]?.id ??
        "baseline"
      const nextIncluded = selectedSet.includedOutlookIds.filter((outlookId) =>
        nextOutlooks.some((outlook) => outlook.id === outlookId)
      )

      setOutlooks(nextOutlooks)
      setIncludedOutlookIds(
        nextIncluded.length > 0 ? nextIncluded : [fallbackId]
      )
      setActiveOutlookId(fallbackId)
      setEditingOutlookId(null)
      setOriginalEditingOutlook(null)
      setActiveOutlookSetId(setId)
      persistOutlooks(nextOutlooks)
    },
    [defaultOutlooks, outlookSets, persistOutlooks]
  )

  const deleteActiveOutlookSet = React.useCallback(() => {
    if (activeOutlookSetId === "") return
    persistOutlookSets(
      outlookSets.filter((set) => set.id !== activeOutlookSetId)
    )
    setActiveOutlookSetId("")
    setOutlookSaveName("")
  }, [activeOutlookSetId, outlookSets, persistOutlookSets])

  const resetWorkspace = React.useCallback(() => {
    const nextOutlooks = parseStoredForecastScenarios(
      typeof localStorage !== "undefined"
        ? localStorage.getItem(scenarioStorageKey)
        : null,
      defaultOutlooks
    )
    const nextOutlookSets = parseStoredForecastOutlookSets(
      typeof localStorage !== "undefined"
        ? localStorage.getItem(setStorageKey)
        : null,
      defaultOutlooks
    )

    setOutlooks(nextOutlooks)
    setIncludedOutlookIds(nextOutlooks.map((outlook) => outlook.id))
    setActiveOutlookId(nextOutlooks[0]?.id ?? defaultOutlooks[0]?.id ?? "baseline")
    setEditingOutlookId(null)
    setOriginalEditingOutlook(null)
    setOutlookSets(nextOutlookSets)
    setActiveOutlookSetId("")
    setOutlookSaveName("")
  }, [defaultOutlooks, scenarioStorageKey, setStorageKey])

  if (includedModels.length === 0) {
    return null
  }

  const kpiByKey = Object.fromEntries(
    snapshot.kpis.map((kpi) => [kpi.key, kpi])
  ) as Record<
    (typeof BENCHMARK_KPI_DEFINITIONS)[number]["key"],
    (typeof snapshot.kpis)[number]
  >

  return (
    <aside
      className={cn(
        "@container flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden",
        className
      )}
      aria-label="Benchmark metrics for map area"
    >
      <div className="shrink-0 border-b border-border pb-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-0.5">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {snapshot.areaLabel}
            </h2>
            <p className="text-xs text-muted-foreground">
              {snapshot.buildingCount === 1
                ? "1 building in view"
                : `${snapshot.buildingCount} buildings in view`}
              {snapshot.fullParticipantCount > 0 &&
              snapshot.fullParticipantCount < snapshot.buildingCount
                ? ` · ${snapshot.fullParticipantCount} full participants`
                : null}
            </p>
          </div>

          <DropdownMenu
            open={outlooksDropdownOpen}
            onOpenChange={handleOutlooksDropdownOpenChange}
            modal={false}
          >
            <DropdownMenuTrigger
              nativeButton
              render={
                <button
                  type="button"
                  className="flex min-h-0 shrink-0 cursor-pointer flex-col justify-center self-stretch rounded-lg border border-border bg-muted/30 px-2 py-0.5 text-left transition-[color,background-color,border-color,box-shadow,transform] duration-150 hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-expanded:border-primary/40 aria-expanded:bg-primary/[0.08] aria-expanded:shadow-sm aria-expanded:ring-2 aria-expanded:ring-primary/20 dark:aria-expanded:border-primary/30 dark:aria-expanded:bg-primary/[0.14] aria-expanded:[&_svg]:rotate-180 sm:px-2 sm:py-1"
                  aria-label="Set economic outlooks"
                />
              }
            >
              <span className="flex items-center gap-1 whitespace-nowrap text-[10px] font-medium leading-tight text-muted-foreground sm:text-[11px]">
                Set economic outlooks
                <ChevronDown
                  className="size-3 opacity-70 transition-transform duration-150"
                  aria-hidden
                />
              </span>
              <span className="mt-px text-xs font-semibold leading-tight text-foreground sm:text-[13px]">
                {selectedOutlookSummary}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="bottom"
              sideOffset={6}
              className="w-[min(100vw-2rem,24rem)] max-h-[min(80vh,36rem)] overflow-y-auto p-4"
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <h3 className="min-w-0 truncate text-sm font-semibold text-foreground">
                  Economic Outlooks
                </h3>
                <SidebarGroupAction
                  type="button"
                  title="Add outlook scenario"
                  aria-label="Add outlook scenario"
                  disabled={editingOutlookId != null}
                  onClick={createOutlook}
                  className="static shrink-0 text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Plus />
                </SidebarGroupAction>
              </div>

              <div
                id={`${outlookSaveFieldId}-outlooks-panel`}
                className="mt-3 min-w-0 space-y-3"
              >
              <div className="min-w-0">
                <Select
                  items={outlookSetItemLabels}
                  value={
                    activeOutlookSetId === ""
                      ? NO_ACTIVE_OUTLOOK_SET
                      : activeOutlookSetId
                  }
                  onValueChange={(value) => {
                    const next = value ?? NO_ACTIVE_OUTLOOK_SET
                    if (next === NO_ACTIVE_OUTLOOK_SET) {
                      setActiveOutlookSetId("")
                      setOutlookSaveName("")
                      return
                    }
                    applyOutlookSetById(next)
                  }}
                  disabled={
                    sortedOutlookSets.length === 0 || editingOutlookId != null
                  }
                >
                  <SelectTrigger
                    id={`${outlookSaveFieldId}-saved-set`}
                    size="sm"
                    className="w-full min-w-0 text-[0.8rem]"
                    aria-label="Saved outlook sets"
                  >
                    <SelectValue placeholder="Select a saved set…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ACTIVE_OUTLOOK_SET}>
                      Select a saved set…
                    </SelectItem>
                    {sortedOutlookSets.map((set) => (
                      <SelectItem key={set.id} value={set.id}>
                        {outlookSetStoredNameDisplay(set.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <section
                aria-label="Save outlook set"
                className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3"
              >
                <Field className="min-w-0 gap-1.5">
                  <FieldLabel
                    htmlFor={`${outlookSaveFieldId}-preset-name`}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Save current as
                  </FieldLabel>
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      id={`${outlookSaveFieldId}-preset-name`}
                      className="h-7 min-w-0 flex-1 py-0 text-[0.8rem] leading-7 md:text-[0.8rem]"
                      placeholder="Name this set"
                      value={outlookSaveName}
                      disabled={editingOutlookId != null}
                      onChange={(event) => setOutlookSaveName(event.target.value)}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          outlookSaveName.trim() !== "" &&
                          editingOutlookId == null
                        ) {
                          event.preventDefault()
                          saveOutlookSetFromField()
                        }
                      }}
                    />
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="h-7"
                        disabled={
                          outlookSaveName.trim() === "" ||
                          editingOutlookId != null
                        }
                        onClick={saveOutlookSetFromField}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="h-7 text-muted-foreground hover:text-destructive"
                        disabled={
                          activeOutlookSetId === "" || editingOutlookId != null
                        }
                        aria-label="Delete saved outlook set"
                        title="Delete saved outlook set"
                        onClick={deleteActiveOutlookSet}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </Button>
                    </div>
                  </div>
                </Field>
              </section>

              <div className="flex flex-col gap-2">
                {outlooks.map((outlook) => {
                  const isEditing = outlook.id === editingOutlookId
                  const isSelected = includedOutlookIds.includes(outlook.id)
                  const anotherOutlookIsEditing =
                    editingOutlookId != null && editingOutlookId !== outlook.id

                  return (
                    <div
                      key={outlook.id}
                      className={cn(
                        "overflow-hidden rounded-lg border transition-colors",
                        isSelected
                          ? "border-primary/40 bg-primary/[0.05] dark:bg-primary/10"
                          : "border-border bg-card"
                      )}
                    >
                      <div className="px-2.5 py-2">
                        <div className="relative min-w-0">
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            disabled={anotherOutlookIsEditing}
                            onClick={() => {
                              toggleOutlookIncluded(outlook.id)
                            }}
                            className="block w-full text-left transition-colors hover:bg-muted/25 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          >
                            <div
                              className={cn(
                                "flex min-h-6 min-w-0 items-center gap-1.5",
                                outlook.isPreset ? "pr-10" : "pr-[72px]"
                              )}
                            >
                              <span className="truncate text-xs font-medium leading-tight text-foreground">
                                {outlook.name}
                              </span>
                            </div>
                            <div className="mt-1.5 grid grid-cols-3 gap-2">
                              {MACRO_FIELDS.map((field) => (
                                <div
                                  key={`${outlook.id}-${field.key}-avg`}
                                  className="min-w-0 border-l border-border/40 pl-2 first:border-l-0 first:pl-0"
                                >
                                  <div className="truncate text-[12px] font-medium leading-tight text-muted-foreground">
                                    {field.label}
                                  </div>
                                  <div className="mt-0.5 text-[14px] font-semibold tabular-nums leading-tight text-foreground">
                                    {formatScenarioMacroAverage(
                                      getScenarioMacroAverage(outlook, field.key),
                                      field.suffix
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </button>

                          <div className="absolute right-0 top-0 flex h-7 shrink-0 items-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={anotherOutlookIsEditing}
                              aria-label={`Edit ${outlook.name}`}
                              onClick={() => {
                                if (isEditing) {
                                  cancelEditingOutlook()
                                } else {
                                  startEditingOutlook(outlook.id)
                                }
                              }}
                            >
                              {isEditing ? (
                                <X className="size-3.5" />
                              ) : (
                                <Pencil className="size-3.5" />
                              )}
                            </Button>
                            {!outlook.isPreset ? (
                              <DropdownMenu modal={false}>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      disabled={anotherOutlookIsEditing}
                                      aria-label={`${outlook.name} actions`}
                                    />
                                  }
                                >
                                  <MoreVertical className="size-3.5" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  sideOffset={6}
                                  className="min-w-32"
                                >
                                  <DropdownMenuItem
                                    variant="destructive"
                                    disabled={anotherOutlookIsEditing}
                                    onClick={() => {
                                      deleteOutlook(outlook.id)
                                    }}
                                  >
                                    <Trash2 className="size-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="border-t border-border px-3 pb-3 pt-2">
                          <div className="space-y-3">
                            <label className="space-y-1">
                              <span className="text-xs font-medium text-muted-foreground">
                                Outlook name
                              </span>
                              <Input
                                value={outlook.name}
                                className="h-8 text-[0.8rem] md:text-[0.8rem]"
                                onChange={(event) =>
                                  updateOutlook(outlook.id, (currentOutlook) => ({
                                    ...currentOutlook,
                                    name: event.target.value,
                                  }))
                                }
                              />
                            </label>

                            <div className="grid grid-cols-[64px_repeat(3,minmax(0,1fr))] gap-2 pt-3 text-[11px] text-muted-foreground">
                              <div className="font-medium">Quarter</div>
                              {MACRO_FIELDS.map((field) => (
                                <div key={field.key} className="font-medium">
                                  {field.label}
                                </div>
                              ))}
                            </div>

                            <div className="space-y-2">
                              {outlook.macroPeriods.map((period, periodIndex) => (
                                <div
                                  key={`${outlook.id}-${period.label}`}
                                  className="grid grid-cols-[64px_repeat(3,minmax(0,1fr))] gap-2"
                                >
                                  <div className="flex items-center text-xs font-medium text-foreground">
                                    {period.label}
                                  </div>
                                  {MACRO_FIELDS.map((field) => (
                                    <OutlookMacroFieldInput
                                      key={`${period.label}-${field.key}`}
                                      value={period[field.key]}
                                      min={field.min}
                                      max={field.max}
                                      suffix={field.suffix}
                                      disabled={anotherOutlookIsEditing}
                                      onCommit={(next) => {
                                        updateOutlook(
                                          outlook.id,
                                          (currentOutlook) => ({
                                            ...currentOutlook,
                                            macroPeriods:
                                              currentOutlook.macroPeriods.map(
                                                (macroPeriod, index) =>
                                                  index === periodIndex
                                                    ? {
                                                        ...macroPeriod,
                                                        [field.key]: next,
                                                      }
                                                    : macroPeriod
                                              ),
                                          })
                                        )
                                      }}
                                    />
                                  ))}
                                </div>
                              ))}
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={cancelEditingOutlook}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={() => saveEditingOutlook(outlook.id)}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-center"
                  disabled={editingOutlookId != null}
                  onClick={resetWorkspace}
                >
                  <RefreshCw className="size-3.5" />
                  Reset
                </Button>
              </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
        <div className="grid grid-cols-2 gap-2 @lg:grid-cols-4" role="list">
          {BENCHMARK_KPI_DEFINITIONS.map((definition) => {
            const kpi = kpiByKey[definition.key]
            return (
              <div key={definition.key} role="listitem" className="min-w-0">
                <BenchmarkKpiCard
                  definition={definition}
                  value={kpi?.value ?? "—"}
                  participantNote={kpi?.participantNote}
                />
              </div>
            )
          })}
        </div>


        <section className="space-y-3" aria-label={`${snapshot.areaLabel} forecast scenarios`}>
          <AssetForecastCharts
            models={includedModels}
            metricTab={metricTab}
            onMetricTabChange={setMetricTab}
            allowedMetricTabs={["intrinsicRent", "capRate"]}
            metricToolbarInCard
          />
        </section>
      </div>
    </aside>
  )
}
