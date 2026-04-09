"use client"

import * as React from "react"
import { MoreVertical, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react"

import { AssetForecastCharts } from "@/components/asset-forecast-charts"
import { AssetForecastSummaryStrip } from "@/components/asset-forecast-summary-strip"
import { AssetForecastsTable } from "@/components/asset-forecasts-table"
import {
  INITIAL_MOD_VALUES,
  parseStoredSets,
  storageKeyForAsset,
  type ModificationSetRecord,
} from "@/components/building-modifications-sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import {
  cloneScenario,
  cloneScenarios,
  forecastOutlookSetStorageKey,
  forecastScenarioStorageKey,
  parseStoredForecastOutlookSets,
  parseStoredForecastScenarios,
  type ForecastOutlookSet,
} from "@/lib/forecast-scenario-storage"
import { formatUsdPortfolioCompact } from "@/lib/scenario-kpi-format"
import { cn } from "@/lib/utils"

const macroAverageFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

const BASELINE_BUILDING_VERSION_ID = "__baseline_building_version__"

const MACRO_FIELDS = [
  { key: "inflationPct", label: "Inflation", suffix: "%", min: 0, max: 8, step: 0.1 },
  { key: "treasuryRatePct", label: "Treasury", suffix: "%", min: 0, max: 10, step: 0.05 },
  {
    key: "submarketOccupancyPct",
    label: "Occupancy",
    suffix: "%",
    min: 50,
    max: 100,
    step: 0.1,
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
      <div className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
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
  const [saveSetDialogOpen, setSaveSetDialogOpen] = React.useState(false)
  const [saveSetDialogMode, setSaveSetDialogMode] = React.useState<"save" | "saveAs">("save")
  const [saveSetDraftName, setSaveSetDraftName] = React.useState("")
  const [deleteSetDialogOpen, setDeleteSetDialogOpen] = React.useState(false)
  const [deleteSetCandidateId, setDeleteSetCandidateId] = React.useState<string>("")
  const saveSetInputId = React.useId()

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
      Object.fromEntries(buildingVersions.map((version) => [version.id, version.name])) as Record<
        string,
        string
      >,
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
          })
        : null,
    [activeBuildingVersion, activeOutlook, assetId, assumptions]
  )

  const includedModels = React.useMemo(
    () =>
      includedOutlooks.map((outlook) =>
        buildAssetForecastModel({
          assetId,
          scenario: outlook,
          assumptions,
          modValues: activeBuildingVersion?.values ?? INITIAL_MOD_VALUES,
        })
      ),
    [activeBuildingVersion, assetId, assumptions, includedOutlooks]
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

  const outlookSetLabels = React.useMemo(
    () =>
      Object.fromEntries(outlookSets.map((set) => [set.id, set.name])) as Record<string, string>,
    [outlookSets]
  )

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
    if (!saveSetDialogOpen) return
    const id = requestAnimationFrame(() => {
      const el = document.getElementById(saveSetInputId)
      if (el instanceof HTMLInputElement) {
        el.focus()
        el.select()
      }
    })
    return () => cancelAnimationFrame(id)
  }, [saveSetDialogOpen, saveSetInputId])

  React.useEffect(() => {
    if (saveSetDialogOpen) return
    setSaveSetDraftName("")
    setSaveSetDialogMode("save")
  }, [saveSetDialogOpen])

  React.useEffect(() => {
    if (activeOutlookSetId === "") return
    if (activeOutlookSetMatchesCurrentState) return
    setActiveOutlookSetId("")
  }, [activeOutlookSetId, activeOutlookSetMatchesCurrentState])

  React.useEffect(() => {
    if (activeBuildingVersionId === BASELINE_BUILDING_VERSION_ID) return
    if (savedModificationSets.some((set) => set.id === activeBuildingVersionId)) return
    setActiveBuildingVersionId(BASELINE_BUILDING_VERSION_ID)
  }, [activeBuildingVersionId, savedModificationSets])

  React.useEffect(() => {
    if (deleteSetDialogOpen) return
    setDeleteSetCandidateId("")
  }, [deleteSetDialogOpen])

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

  const saveCurrentOutlookSet = React.useCallback(
    ({
      nameOverride,
      forceNew = false,
    }: {
      nameOverride?: string
      forceNew?: boolean
    } = {}) => {
      const existingName =
        !forceNew && activeOutlookSetId !== ""
          ? outlookSets.find((set) => set.id === activeOutlookSetId)?.name
          : null
      const name =
        nameOverride?.trim() ||
        existingName ||
        `Outlook Set ${outlookSets.length + 1}`
      const snapshotOutlooks = normalizeOutlooksForSetComparison(outlooks)

      const nextSet: ForecastOutlookSet = {
        id: forceNew ? crypto.randomUUID() : activeOutlookSetId || crypto.randomUUID(),
        name,
        includedOutlookIds: includedOutlookIds.filter((outlookId) =>
          snapshotOutlooks.some((outlook) => outlook.id === outlookId)
        ),
        activeOutlookId,
        savedAt: Date.now(),
        outlooks: snapshotOutlooks,
      }

      const existingIndex = outlookSets.findIndex((set) => set.id === nextSet.id)
      const nextSets =
        existingIndex >= 0
          ? outlookSets.map((set, index) => (index === existingIndex ? nextSet : set))
          : [...outlookSets, nextSet]

      persistOutlookSets(nextSets)
      setActiveOutlookSetId(nextSet.id)
    },
    [activeOutlookId, activeOutlookSetId, includedOutlookIds, outlookSets, outlooks, persistOutlookSets]
  )

  const openSaveSetDialog = React.useCallback(
    (mode: "save" | "saveAs") => {
      const existingName =
        mode === "save"
          ? outlookSets.find((set) => set.id === activeOutlookSetId)?.name
          : null
      setSaveSetDialogMode(mode)
      setSaveSetDraftName(existingName ?? `Outlook Set ${outlookSets.length + 1}`)
      setSaveSetDialogOpen(true)
    },
    [activeOutlookSetId, outlookSets]
  )

  const handleSaveSet = React.useCallback(() => {
    if (activeOutlookSetId !== "") {
      saveCurrentOutlookSet()
      return
    }
    openSaveSetDialog("save")
  }, [activeOutlookSetId, openSaveSetDialog, saveCurrentOutlookSet])

  const submitSaveSetDialog = React.useCallback(() => {
    const trimmed = saveSetDraftName.trim()
    if (!trimmed) return
    saveCurrentOutlookSet({
      nameOverride: trimmed,
      forceNew: saveSetDialogMode === "saveAs",
    })
    setSaveSetDialogOpen(false)
  }, [saveCurrentOutlookSet, saveSetDialogMode, saveSetDraftName])

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

  const requestDeleteActiveOutlookSet = React.useCallback(() => {
    if (activeOutlookSetId === "") return
    setDeleteSetCandidateId(activeOutlookSetId)
    setDeleteSetDialogOpen(true)
  }, [activeOutlookSetId])

  const confirmDeleteOutlookSet = React.useCallback(() => {
    if (deleteSetCandidateId === "") return
    const nextSets = outlookSets.filter((set) => set.id !== deleteSetCandidateId)
    persistOutlookSets(nextSets)
    setActiveOutlookSetId("")
    setDeleteSetDialogOpen(false)
  }, [deleteSetCandidateId, outlookSets, persistOutlookSets])

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
        className="flex w-full shrink-0 flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm lg:w-72 xl:w-80"
        aria-label="Forecast inputs"
      >
        <h2 className="text-sm font-semibold text-foreground">Forecast Inputs</h2>

        <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Building Version
          </p>
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
            <SelectTrigger size="sm" className="w-full text-[0.8rem]" aria-label="Building version">
              <SelectValue placeholder="Baseline building" />
            </SelectTrigger>
            <SelectContent>
              {buildingVersions.map((version) => (
                <SelectItem key={version.id} value={version.id}>
                  {version.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Economic Outlooks
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Saved set
            </span>
            <Select
              items={outlookSetLabels}
              value={activeOutlookSetId}
              onValueChange={(value) => {
                const nextValue = value ?? ""
                if (nextValue === "") return
                applyOutlookSetById(nextValue)
              }}
              disabled={outlookSets.length === 0 || editingOutlookId != null}
            >
              <SelectTrigger
                size="sm"
                className="min-w-0 flex-1 text-[0.8rem]"
                aria-label="Saved outlook sets"
              >
                <SelectValue placeholder="Unsaved set" />
              </SelectTrigger>
              <SelectContent>
                {outlookSets.map((set) => (
                  <SelectItem key={set.id} value={set.id}>
                    {set.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={editingOutlookId != null}
              onClick={handleSaveSet}
            >
              Save
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={editingOutlookId != null}
                    aria-label="Saved outlook set actions"
                  />
                }
              >
                <MoreVertical className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={6} className="min-w-40">
                <DropdownMenuItem onClick={() => openSaveSetDialog("saveAs")}>
                  <Plus className="size-4" />
                  Save as
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={activeOutlookSetId === ""}
                  onClick={requestDeleteActiveOutlookSet}
                >
                  <Trash2 className="size-4" />
                  Delete set
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

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
                  <div className="px-3 py-3">
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
                            "flex min-h-7 min-w-0 items-center gap-2",
                            outlook.isPreset ? "pr-10" : "pr-[72px]"
                          )}
                        >
                          <span className="truncate text-sm font-medium text-foreground">
                            {outlook.name}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-3">
                          {MACRO_FIELDS.map((field) => (
                            <div
                              key={`${outlook.id}-${field.key}-avg`}
                              className="min-w-0 border-l border-border/40 pl-3 first:border-l-0 first:pl-0"
                            >
                              <div className="truncate text-[10px] font-medium text-muted-foreground">
                                {field.label}
                              </div>
                              <div className="mt-0.5 text-[11px] font-semibold tabular-nums text-foreground">
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

                        <div className="grid grid-cols-[64px_repeat(3,minmax(0,1fr))] gap-2 text-[11px] text-muted-foreground">
                          <div className="font-medium uppercase tracking-[0.08em]">Quarter</div>
                          {MACRO_FIELDS.map((field) => (
                            <div key={field.key} className="font-medium uppercase tracking-[0.08em]">
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
                                <div key={`${period.label}-${field.key}`} className="relative">
                                  <Input
                                    type="number"
                                    value={period[field.key]}
                                    min={field.min}
                                    max={field.max}
                                    step={field.step}
                                    className="h-8 pr-8 text-[0.8rem] tabular-nums md:text-[0.8rem]"
                                    onChange={(event) => {
                                      const next = Number(event.target.value)
                                      if (Number.isNaN(next)) return
                                      updateOutlook(outlook.id, (currentOutlook) => ({
                                        ...currentOutlook,
                                        macroPeriods: currentOutlook.macroPeriods.map(
                                          (macroPeriod, index) =>
                                            index === periodIndex
                                              ? {
                                                  ...macroPeriod,
                                                  [field.key]: clamp(
                                                    next,
                                                    field.min,
                                                    field.max
                                                  ),
                                                }
                                              : macroPeriod
                                        ),
                                      }))
                                    }}
                                  />
                                  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] text-muted-foreground">
                                    {field.suffix}
                                  </span>
                                </div>
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
                            variant="secondary"
                            size="sm"
                            onClick={() => saveEditingOutlook(outlook.id)}
                          >
                            <Save className="size-3.5" />
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="mt-1 self-center rounded-full"
              disabled={editingOutlookId != null}
              onClick={createOutlook}
              aria-label="Add outlook scenario"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Leasing Assumptions
          </p>
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
        </section>

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
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <AssetForecastCharts models={includedModels} />

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

      <Dialog open={saveSetDialogOpen} onOpenChange={setSaveSetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{saveSetDialogMode === "saveAs" ? "Save outlook set as" : "Save outlook set"}</DialogTitle>
            <DialogDescription>
              Name this saved set so you can reapply the current economic outlook selection later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <label htmlFor={saveSetInputId} className="sr-only">
              Outlook set name
            </label>
            <Input
              id={saveSetInputId}
              value={saveSetDraftName}
              onChange={(event) => setSaveSetDraftName(event.target.value)}
              placeholder="Quarterly outlook set"
              autoComplete="off"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  submitSaveSetDialog()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveSetDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitSaveSetDialog} disabled={!saveSetDraftName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteSetDialogOpen} onOpenChange={setDeleteSetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete saved set</DialogTitle>
            <DialogDescription>
              {deleteSetCandidateId !== ""
                ? `Delete "${outlookSets.find((set) => set.id === deleteSetCandidateId)?.name ?? "this saved set"}"? Your current outlook cards will stay in place as an unsaved working state.`
                : "Delete this saved set? Your current outlook cards will stay in place as an unsaved working state."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteSetDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDeleteOutlookSet}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
