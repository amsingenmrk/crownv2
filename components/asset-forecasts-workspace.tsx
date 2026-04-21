"use client"

import * as React from "react"
import { MoreVertical, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react"

import {
  AssetForecastCharts,
} from "@/components/asset-forecast-charts"
import { AssetForecastSummaryStrip } from "@/components/asset-forecast-summary-strip"
import { AssetForecastsTable } from "@/components/asset-forecasts-table"
import {
  INITIAL_MOD_VALUES,
  parseStoredSets,
  storageKeyForAsset,
  type ModificationSetRecord,
} from "@/components/building-modifications-sidebar"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SidebarGroupAction } from "@/components/ui/sidebar"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  buildAssetForecastModel,
  buildDefaultForecastScenarios,
  createForecastScenarioFromTemplate,
  defaultForecastAssumptionsForAsset,
  type ForecastAssumptions,
  type ForecastEconomicOutlookScenario,
  type ForecastStatementRow,
  type ForecastScenarioId,
} from "@/lib/forecast-data"
import type { ForecastChartTab } from "@/lib/forecast-chart-config"
import {
  cloneScenario,
  cloneScenarios,
  forecastOutlookSetStorageKey,
  forecastScenarioStorageKey,
  parseStoredForecastOutlookSets,
  parseStoredForecastScenarios,
  type ForecastOutlookSet,
} from "@/lib/forecast-scenario-storage"
import {
  modificationSelectLabel,
  modificationSelectPlaceholder,
  outlookSetStoredNameDisplay,
} from "@/lib/scoped-forecast-select-labels"
import { formatUsdPortfolioCompact } from "@/lib/scenario-kpi-format"
import { getSampleStackingPlanData } from "@/lib/stacking-plan-data"
import {
  applyStackingPlanTenantForecastOverrides,
  getStackingPlanTenantForecastOverrideSnapshot,
  parseStackingPlanTenantForecastOverrideSnapshot,
  subscribeStackingPlanTenantForecastOverrides,
} from "@/lib/stacking-plan-tenant-forecast-overrides"
import { cn } from "@/lib/utils"

const macroAverageFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

const BASELINE_BUILDING_VERSION_ID = "__baseline_building_version__"

/** Select sentinel when no saved outlook set is active (same pattern as modification presets). */
const NO_ACTIVE_OUTLOOK_SET = "__no_outlook_set__"

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

type ForecastBuildingVersion = {
  id: string
  name: string
  values: ModificationSetRecord["values"]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatMacroInputValue(n: number): string {
  const s = n.toFixed(4)
  if (!s.includes(".")) return s
  const trimmed = s.replace(/\.?0+$/, "")
  return trimmed === "" ? "0" : trimmed
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
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const cleaned = text.replace(/%/g, "").replace(/,/g, "").trim()
          const parsed = Number(cleaned)
          const next = Number.isFinite(parsed) ? clamp(parsed, min, max) : value
          setText(formatMacroInputValue(next))
          if (next !== value) {
            onCommit(next)
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            ;(e.target as HTMLInputElement).blur()
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

  const total = scenario.macroPeriods.reduce((sum, period) => sum + period[fieldKey], 0)
  return total / scenario.macroPeriods.length
}

function formatScenarioMacroAverage(value: number, suffix: string) {
  return `${macroAverageFormatter.format(value)}${suffix}`
}

function averageSeries(values: number[]) {
  if (values.length === 0) return 0
  const total = values.reduce((sum, value) => sum + value, 0)
  return total / values.length
}

function getStatementRowAverage(rows: ForecastStatementRow[], rowId: string) {
  return averageSeries(rows.find((row) => row.id === rowId)?.values ?? [])
}

function normalizeOutlooksForSetComparison(
  outlooks: ForecastEconomicOutlookScenario[]
): ForecastEconomicOutlookScenario[] {
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

function AssumptionField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  label: string
  value: number
  onChange: (next: number) => void
  min: number
  max: number
  step: number
  suffix: string
}) {
  return (
    <label className="min-w-0 space-y-0.5">
      <div className="truncate text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </div>
      <div className="relative">
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          className="h-8 border-border/60 bg-background/80 pr-11 text-[0.82rem] tabular-nums shadow-none"
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isNaN(next)) return
            onChange(clamp(next, min, max))
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] text-muted-foreground">
          {suffix}
        </span>
      </div>
    </label>
  )
}

export function AssetForecastsWorkspace({ assetId }: { assetId: string }) {
  const tenantForecastOverrideSnapshot = React.useSyncExternalStore(
    React.useCallback(
      (onStoreChange) =>
        subscribeStackingPlanTenantForecastOverrides(assetId, onStoreChange),
      [assetId]
    ),
    React.useCallback(
      () => getStackingPlanTenantForecastOverrideSnapshot(assetId),
      [assetId]
    ),
    () => ""
  )
  const tenantForecastOverrides = React.useMemo(
    () =>
      parseStackingPlanTenantForecastOverrideSnapshot(
        tenantForecastOverrideSnapshot
      ),
    [tenantForecastOverrideSnapshot]
  )
  const forecastDataset = React.useMemo(
    () =>
      applyStackingPlanTenantForecastOverrides(
        getSampleStackingPlanData(assetId),
        tenantForecastOverrides
      ),
    [assetId, tenantForecastOverrides]
  )
  const defaultAssumptions = React.useMemo(
    () => defaultForecastAssumptionsForAsset(assetId),
    [assetId]
  )
  const defaultOutlooks = React.useMemo(() => buildDefaultForecastScenarios(), [])
  const scenarioStorageKey = React.useMemo(() => forecastScenarioStorageKey(assetId), [assetId])
  const setStorageKey = React.useMemo(() => forecastOutlookSetStorageKey(assetId), [assetId])
  const buildingVersionStorageKey = React.useMemo(() => storageKeyForAsset(assetId), [assetId])

  const [outlooks, setOutlooks] = React.useState<ForecastEconomicOutlookScenario[]>(
    defaultOutlooks
  )
  const [includedOutlookIds, setIncludedOutlookIds] = React.useState<ForecastScenarioId[]>(
    defaultOutlooks.map((outlook) => outlook.id)
  )
  const [activeOutlookId, setActiveOutlookId] = React.useState<ForecastScenarioId>(
    defaultOutlooks[0]?.id ?? "baseline"
  )
  const [forecastChartMetricTab, setForecastChartMetricTab] =
    React.useState<ForecastChartTab>("grossRevenue")
  const [editingOutlookId, setEditingOutlookId] = React.useState<ForecastScenarioId | null>(null)
  const [originalEditingOutlook, setOriginalEditingOutlook] =
    React.useState<ForecastEconomicOutlookScenario | null>(null)
  const [assumptions, setAssumptions] = React.useState<ForecastAssumptions>(
    defaultAssumptions
  )
  const [outlookSets, setOutlookSets] = React.useState<ForecastOutlookSet[]>([])
  const [savedModificationSets, setSavedModificationSets] = React.useState<ModificationSetRecord[]>(
    []
  )
  const [activeBuildingVersionId, setActiveBuildingVersionId] = React.useState(
    BASELINE_BUILDING_VERSION_ID
  )
  const [activeOutlookSetId, setActiveOutlookSetId] = React.useState<string>("")
  const [outlookSaveName, setOutlookSaveName] = React.useState("")
  const outlookSaveFieldId = React.useId()

  React.useLayoutEffect(() => {
    const nextOutlooks = parseStoredForecastScenarios(
      typeof localStorage !== "undefined" ? localStorage.getItem(scenarioStorageKey) : null,
      defaultOutlooks
    )
    const nextOutlookSets = parseStoredForecastOutlookSets(
      typeof localStorage !== "undefined" ? localStorage.getItem(setStorageKey) : null,
      defaultOutlooks
    )

    setOutlooks(nextOutlooks)
    setIncludedOutlookIds(nextOutlooks.map((outlook) => outlook.id))
    setActiveOutlookId(nextOutlooks[0]?.id ?? defaultOutlooks[0]?.id ?? "baseline")
    setEditingOutlookId(null)
    setOriginalEditingOutlook(null)
    setAssumptions(defaultAssumptions)
    setOutlookSets(nextOutlookSets)
    setSavedModificationSets(
      typeof localStorage !== "undefined"
        ? parseStoredSets(localStorage.getItem(buildingVersionStorageKey))
        : []
    )
    setActiveBuildingVersionId(BASELINE_BUILDING_VERSION_ID)
    setActiveOutlookSetId("")
    setOutlookSaveName("")
  }, [buildingVersionStorageKey, defaultAssumptions, defaultOutlooks, scenarioStorageKey, setStorageKey])

  const reloadSavedModificationSets = React.useCallback(() => {
    if (typeof localStorage === "undefined") {
      setSavedModificationSets([])
      return
    }
    setSavedModificationSets(parseStoredSets(localStorage.getItem(buildingVersionStorageKey)))
  }, [buildingVersionStorageKey])

  const persistOutlooks = React.useCallback(
    (nextOutlooks: ForecastEconomicOutlookScenario[]) => {
      try {
        localStorage.setItem(scenarioStorageKey, JSON.stringify(nextOutlooks))
      } catch {
        /* ignore quota/private mode */
      }
    },
    [scenarioStorageKey]
  )

  const persistOutlookSets = React.useCallback(
    (nextSets: ForecastOutlookSet[]) => {
      try {
        localStorage.setItem(setStorageKey, JSON.stringify(nextSets))
        window.dispatchEvent(new Event("glassbox:forecast-outlook-sets-changed"))
      } catch {
        /* ignore quota/private mode */
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
    const handleStorage = (event: StorageEvent) => {
      if (event.key != null && event.key !== buildingVersionStorageKey) return
      reloadSavedModificationSets()
    }
    const handleLocalChange = () => {
      reloadSavedModificationSets()
    }

    window.addEventListener("storage", handleStorage)
    window.addEventListener("glassbox:modification-sets-changed", handleLocalChange)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("glassbox:modification-sets-changed", handleLocalChange)
    }
  }, [buildingVersionStorageKey, reloadSavedModificationSets])

  React.useEffect(() => {
    const filteredIncluded = includedOutlookIds.filter((outlookId) =>
      outlooks.some((outlook) => outlook.id === outlookId)
    )
    if (filteredIncluded.length === 0 && outlooks.length > 0) {
      setIncludedOutlookIds([outlooks[0]!.id])
      return
    }
    if (filteredIncluded.length !== includedOutlookIds.length) {
      setIncludedOutlookIds(filteredIncluded)
    }
  }, [includedOutlookIds, outlooks])

  React.useEffect(() => {
    if (includedOutlookIds.includes(activeOutlookId)) return
    const fallbackId = includedOutlookIds[0] ?? outlooks[0]?.id ?? defaultOutlooks[0]?.id
    if (fallbackId != null) {
      setActiveOutlookId(fallbackId)
    }
  }, [activeOutlookId, defaultOutlooks, includedOutlookIds, outlooks])

  const activeOutlook =
    outlooks.find((outlook) => outlook.id === activeOutlookId) ?? outlooks[0] ?? null

  const includedOutlooks = React.useMemo(
    () =>
      includedOutlookIds
        .map((outlookId) => outlooks.find((outlook) => outlook.id === outlookId))
        .filter((outlook): outlook is ForecastEconomicOutlookScenario => outlook != null),
    [includedOutlookIds, outlooks]
  )

  const buildingVersions = React.useMemo<ForecastBuildingVersion[]>(
    () => [
      {
        id: BASELINE_BUILDING_VERSION_ID,
        name: "Baseline building",
        values: INITIAL_MOD_VALUES,
      },
      ...[...savedModificationSets]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((set) => ({
          id: set.id,
          name: set.name,
          values: set.values,
        })),
    ],
    [savedModificationSets]
  )

  const activeBuildingVersion =
    buildingVersions.find((version) => version.id === activeBuildingVersionId) ?? buildingVersions[0]

  const buildingVersionLabels = React.useMemo(
    () =>
      Object.fromEntries(
        buildingVersions.map((version) => [
          version.id,
          modificationSelectLabel(version.id, version.name),
        ])
      ) as Record<string, string>,
    [buildingVersions]
  )

  const model = React.useMemo(
    () =>
      activeOutlook != null
        ? buildAssetForecastModel({
            assetId,
            scenario: activeOutlook,
            assumptions,
            modValues: activeBuildingVersion?.values ?? INITIAL_MOD_VALUES,
            stackingPlanData: forecastDataset,
          })
        : null,
    [activeBuildingVersion, activeOutlook, assetId, assumptions, forecastDataset]
  )

  const includedModels = React.useMemo(
    () =>
      includedOutlooks.map((outlook) =>
        buildAssetForecastModel({
          assetId,
          scenario: outlook,
          assumptions,
          modValues: activeBuildingVersion?.values ?? INITIAL_MOD_VALUES,
          stackingPlanData: forecastDataset,
        })
      ),
    [activeBuildingVersion, assetId, assumptions, forecastDataset, includedOutlooks]
  )

  const forecastSummaryItems = React.useMemo(() => {
    if (model == null) return []

    const averageGrossRevenue = getStatementRowAverage(model.statementRows, "grossRevenue") * 4
    const averageOpex = getStatementRowAverage(model.statementRows, "opex") * 4
    const averageNoi = getStatementRowAverage(model.statementRows, "noi") * 4
    const averageAssetValue = getStatementRowAverage(model.statementRows, "salePrice")

    return [
      {
        label: "Gross Revenue",
        value: formatUsdPortfolioCompact(averageGrossRevenue),
        valueSuffix: "/ yr",
      },
      {
        label: "OpEx",
        value: formatUsdPortfolioCompact(Math.abs(averageOpex)),
        valueSuffix: "/ yr",
      },
      {
        label: "NOI",
        value: formatUsdPortfolioCompact(averageNoi),
        valueSuffix: "/ yr",
      },
      {
        label: "Asset Value",
        value: formatUsdPortfolioCompact(averageAssetValue),
      },
    ]
  }, [model])

  const sortedOutlookSets = React.useMemo(
    () => [...outlookSets].sort((a, b) => a.name.localeCompare(b.name)),
    [outlookSets]
  )

  const outlookSetItemLabels = React.useMemo(() => {
    const labels: Record<string, React.ReactNode> = {
      [NO_ACTIVE_OUTLOOK_SET]: "Select a saved set…",
    }
    for (const s of sortedOutlookSets) {
      labels[s.id] = outlookSetStoredNameDisplay(s.name)
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
    const active = outlookSets.find((s) => s.id === activeOutlookSetId)
    setOutlookSaveName(active?.name ?? "")
  }, [activeOutlookSetId, outlookSets])

  React.useEffect(() => {
    if (activeOutlookSetId === "") return
    if (activeOutlookSetMatchesCurrentState) return
    setActiveOutlookSetId("")
    setOutlookSaveName("")
  }, [activeOutlookSetId, activeOutlookSetMatchesCurrentState])

  React.useEffect(() => {
    if (activeBuildingVersionId === BASELINE_BUILDING_VERSION_ID) return
    if (savedModificationSets.some((set) => set.id === activeBuildingVersionId)) return
    setActiveBuildingVersionId(BASELINE_BUILDING_VERSION_ID)
  }, [activeBuildingVersionId, savedModificationSets])

  const updateAssumption = React.useCallback((updates: Partial<ForecastAssumptions>) => {
    setAssumptions((prev) => ({
      ...prev,
      ...updates,
      markToMarketEnabled: true,
    }))
  }, [])

  const updateOutlook = React.useCallback(
    (
      outlookId: ForecastScenarioId,
      updater: (
        outlook: ForecastEconomicOutlookScenario
      ) => ForecastEconomicOutlookScenario
    ) => {
      setOutlooks((prev) =>
        prev.map((outlook) => (outlook.id === outlookId ? updater(outlook) : outlook))
      )
    },
    []
  )

  const toggleOutlookIncluded = React.useCallback(
    (outlookId: ForecastScenarioId) => {
      setIncludedOutlookIds((prev) => {
        const isIncluded = prev.includes(outlookId)
        if (isIncluded) {
          if (prev.length === 1) return prev
          const next = prev.filter((id) => id !== outlookId)
          if (activeOutlookId === outlookId) {
            setActiveOutlookId(next[0] ?? outlookId)
          }
          return next
        }

        return [...prev, outlookId]
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
      const nextOutlooks = outlooks.filter((outlook) => outlook.id !== editingOutlookId)
      setOutlooks(nextOutlooks)
    } else {
      setOutlooks((prev) =>
        prev.map((outlook) =>
          outlook.id === originalEditingOutlook.id ? cloneScenario(originalEditingOutlook) : outlook
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
      name: `Custom Outlook ${outlooks.filter((outlook) => !outlook.isPreset).length + 1}`,
      template,
    })

    setOutlooks((prev) => [...prev, nextOutlook])
    setIncludedOutlookIds((prev) => [...prev, nextOutlook.id])
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
      setIncludedOutlookIds((prev) => {
        const filtered = prev.filter((id) => id !== outlookId)
        return filtered.length > 0 ? filtered : [nextOutlooks[0]?.id ?? defaultOutlooks[0]?.id ?? "baseline"]
      })
      persistOutlooks(nextOutlooks)

      if (editingOutlookId === outlookId) {
        setEditingOutlookId(null)
        setOriginalEditingOutlook(null)
      }

      if (activeOutlookId === outlookId) {
        setActiveOutlookId(nextOutlooks[0]?.id ?? defaultOutlooks[0]?.id ?? "baseline")
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
      const idx = outlookSets.findIndex((s) => s.id === activeOutlookSetId)
      if (idx < 0) return
      const nameTakenElsewhere = outlookSets.some(
        (s, i) => i !== idx && s.name.toLowerCase() === name.toLowerCase()
      )
      if (nameTakenElsewhere) return
      persistOutlookSets(
        outlookSets.map((s, i) => (i === idx ? buildSet(s.id, name) : s))
      )
      return
    }

    const existingIdx = outlookSets.findIndex(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    )
    if (existingIdx >= 0) {
      const appliedId = outlookSets[existingIdx]!.id
      persistOutlookSets(
        outlookSets.map((s, i) => (i === existingIdx ? buildSet(s.id, name) : s))
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
        nextOutlooks.find((outlook) => outlook.id === selectedSet.activeOutlookId)?.id ??
        nextOutlooks[0]?.id ??
        defaultOutlooks[0]?.id ??
        "baseline"
      const nextIncluded =
        selectedSet.includedOutlookIds.filter((outlookId) =>
          nextOutlooks.some((outlook) => outlook.id === outlookId)
        )

      setOutlooks(nextOutlooks)
      setIncludedOutlookIds(nextIncluded.length > 0 ? nextIncluded : [fallbackId])
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
    persistOutlookSets(outlookSets.filter((s) => s.id !== activeOutlookSetId))
    setActiveOutlookSetId("")
    setOutlookSaveName("")
  }, [activeOutlookSetId, outlookSets, persistOutlookSets])

  const resetWorkspace = React.useCallback(() => {
    const nextOutlooks = parseStoredForecastScenarios(
      typeof localStorage !== "undefined" ? localStorage.getItem(scenarioStorageKey) : null,
      defaultOutlooks
    )
    const nextOutlookSets = parseStoredForecastOutlookSets(
      typeof localStorage !== "undefined" ? localStorage.getItem(setStorageKey) : null,
      defaultOutlooks
    )

    setOutlooks(nextOutlooks)
    setIncludedOutlookIds(nextOutlooks.map((outlook) => outlook.id))
    setActiveOutlookId(nextOutlooks[0]?.id ?? defaultOutlooks[0]?.id ?? "baseline")
    setEditingOutlookId(null)
    setOriginalEditingOutlook(null)
    setAssumptions(defaultAssumptions)
    setOutlookSets(nextOutlookSets)
    setSavedModificationSets(
      typeof localStorage !== "undefined"
        ? parseStoredSets(localStorage.getItem(buildingVersionStorageKey))
        : []
    )
    setActiveBuildingVersionId(BASELINE_BUILDING_VERSION_ID)
    setActiveOutlookSetId("")
    setOutlookSaveName("")
  }, [
    buildingVersionStorageKey,
    defaultAssumptions,
    defaultOutlooks,
    scenarioStorageKey,
    setStorageKey,
  ])

  if (activeOutlook == null || model == null) {
    return null
  }

  return (
    <div className="flex min-h-0 w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <aside
        className="flex w-full shrink-0 flex-col rounded-xl border border-border bg-card p-4 shadow-sm lg:w-72 xl:w-80"
        aria-label="Forecast inputs"
      >
        <h2 className="text-sm font-semibold text-foreground">Forecast Inputs</h2>

        <Select
          items={buildingVersionLabels}
          value={activeBuildingVersion?.id ?? BASELINE_BUILDING_VERSION_ID}
          onValueChange={(value) =>
            setActiveBuildingVersionId(value ?? BASELINE_BUILDING_VERSION_ID)
          }
          onOpenChange={(open) => {
            if (open) {
              reloadSavedModificationSets()
            }
          }}
        >
          <SelectTrigger className="mt-4 w-full min-w-0" aria-label="Building modifications">
            <SelectValue placeholder={modificationSelectPlaceholder()} />
          </SelectTrigger>
          <SelectContent>
            {buildingVersions.map((version) => (
              <SelectItem key={version.id} value={version.id}>
                {modificationSelectLabel(version.id, version.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="mt-4 min-w-0 space-y-3 border-t border-border pt-4">
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

          <div className="min-w-0">
            <Select
              items={outlookSetItemLabels}
              value={activeOutlookSetId === "" ? NO_ACTIVE_OUTLOOK_SET : activeOutlookSetId}
              onValueChange={(value) => {
                const next = value ?? NO_ACTIVE_OUTLOOK_SET
                if (next === NO_ACTIVE_OUTLOOK_SET) {
                  setActiveOutlookSetId("")
                  setOutlookSaveName("")
                  return
                }
                applyOutlookSetById(next)
              }}
              disabled={sortedOutlookSets.length === 0 || editingOutlookId != null}
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
                <SelectItem value={NO_ACTIVE_OUTLOOK_SET}>Select a saved set…</SelectItem>
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
                  onChange={(e) => setOutlookSaveName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && outlookSaveName.trim() !== "" && editingOutlookId == null) {
                      e.preventDefault()
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
                    disabled={outlookSaveName.trim() === "" || editingOutlookId != null}
                    onClick={saveOutlookSetFromField}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="h-7 text-muted-foreground hover:text-destructive"
                    disabled={activeOutlookSetId === "" || editingOutlookId != null}
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
                          {isEditing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
                        </Button>
                        {!outlook.isPreset ? (
                          <DropdownMenu>
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
                            <DropdownMenuContent align="end" sideOffset={6} className="min-w-32">
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
                                    updateOutlook(outlook.id, (currentOutlook) => ({
                                      ...currentOutlook,
                                      macroPeriods: currentOutlook.macroPeriods.map(
                                        (macroPeriod, index) =>
                                          index === periodIndex
                                            ? {
                                                ...macroPeriod,
                                                [field.key]: next,
                                              }
                                            : macroPeriod
                                      ),
                                    }))
                                  }}
                                />
                              ))}
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={cancelEditingOutlook}>
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
        </div>

        <div className="mt-4 min-w-0 space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground">Leasing Assumptions</h3>
          <div className="grid gap-3">
            <AssumptionField
              label="Time to Lease"
              value={assumptions.timeToLeaseMonths}
              onChange={(next) => updateAssumption({ timeToLeaseMonths: Math.round(next) })}
              min={3}
              max={24}
              step={1}
              suffix="mo"
            />
            <AssumptionField
              label="Occupancy Target"
              value={assumptions.occupancyTargetPct}
              onChange={(next) => updateAssumption({ occupancyTargetPct: Math.round(next) })}
              min={65}
              max={99}
              step={1}
              suffix="%"
            />
            <AssumptionField
              label="Renewal Probability"
              value={assumptions.defaultRenewalProbabilityPct}
              onChange={(next) =>
                updateAssumption({ defaultRenewalProbabilityPct: Math.round(next) })
              }
              min={10}
              max={95}
              step={1}
              suffix="%"
            />
          </div>
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
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <AssetForecastCharts
          models={includedModels}
          metricTab={forecastChartMetricTab}
          onMetricTabChange={setForecastChartMetricTab}
          metricToolbarInCard
        />

        <section
          className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          aria-label="Forecast statement"
        >
          <div className="space-y-4 border-b border-border/60 px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-foreground">Forecast Statement</h2>
              {includedOutlooks.length > 1 ? (
                <ToggleGroup
                  value={[activeOutlookId]}
                  onValueChange={(values) => {
                    const next = values[0]
                    if (typeof next === "string" && next !== "") {
                      setActiveOutlookId(next)
                    }
                  }}
                  aria-label="Switch compared outlook in forecast summary"
                  className="w-fit"
                >
                  {includedOutlooks.map((outlook) => (
                    <ToggleGroupItem key={outlook.id} value={outlook.id}>
                      {outlook.name}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              ) : (
                <div className="w-fit rounded-full border border-border/60 bg-muted/10 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {activeOutlook.name}
                </div>
              )}
            </div>

            <AssetForecastSummaryStrip items={forecastSummaryItems} />
          </div>

          <AssetForecastsTable
            key={activeOutlookId}
            periods={model.periods}
            rows={model.statementRows}
            revenueBreakdown={model.revenueBreakdown}
          />
        </section>
      </div>
    </div>
  )
}
