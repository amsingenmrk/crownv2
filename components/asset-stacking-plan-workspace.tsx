"use client"

import * as React from "react"
import { ArrowUpDown, Download } from "lucide-react"

import { AssetStackingPlanDrawer } from "@/components/asset-stacking-plan-drawer"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  getSampleStackingPlanData,
  STACKING_EXPIRATION_LEGEND,
  type StackingPlanFloor,
  type StackingLegendItem,
  type StackingPlanTenant,
  type StackingViewMode,
} from "@/lib/stacking-plan-data"
import { cn } from "@/lib/utils"

type AssetStackingPlanWorkspaceProps = {
  assetId: string
  lockedViewMode?: StackingViewMode
  showViewToggle?: boolean
  showSortControl?: boolean
}

type StackingVizMode =
  | "leaseExpiration"
  | "predictedRent"
  | "occupancy"
  | "vacancy"

const STACKING_VIZ_MODE_OPTIONS: Array<{ value: StackingVizMode; label: string }> = [
  { value: "leaseExpiration", label: "Lease Expiration" },
  { value: "predictedRent", label: "Predicted Rent" },
  { value: "occupancy", label: "Occupancy" },
  { value: "vacancy", label: "Vacancy" },
]

const PREDICTED_RENT_LEGEND: readonly StackingLegendItem[] = [
  { label: "Below Avg", color: "#f97316" },
  { label: "Within +/-5%", color: "#3b82f6" },
  { label: "Above Avg", color: "#22c55e" },
  { label: "Available", color: "#64748b" },
] as const

const OCCUPANCY_LEGEND: readonly StackingLegendItem[] = [
  { label: "<50%", color: "#ef4444" },
  { label: "50-79%", color: "#f59e0b" },
  { label: "80%+", color: "#22c55e" },
] as const

const VACANCY_LEGEND: readonly StackingLegendItem[] = [
  { label: "<20%", color: "#22c55e" },
  { label: "20-49%", color: "#f59e0b" },
  { label: "50%+", color: "#ef4444" },
] as const

function getOccupancyColors(occupancyPercent: number) {
  if (occupancyPercent >= 80) {
    return {
      text: "text-emerald-700",
      bar: "#22c55e",
      track: "#dcfce7",
    }
  }
  if (occupancyPercent >= 50) {
    return {
      text: "text-amber-700",
      bar: "#f59e0b",
      track: "#fef3c7",
    }
  }
  return {
    text: "text-rose-700",
    bar: "#ef4444",
    track: "#ffe4e6",
  }
}

function getOccupancyBandData(occupancyPercent: number) {
  if (occupancyPercent >= 80) {
    return { label: "80%+", color: "#22c55e" }
  }
  if (occupancyPercent >= 50) {
    return { label: "50-79%", color: "#f59e0b" }
  }
  return { label: "<50%", color: "#ef4444" }
}

function getVacancyBandData(vacancyPercent: number) {
  if (vacancyPercent < 20) {
    return { label: "<20%", color: "#22c55e" }
  }
  if (vacancyPercent < 50) {
    return { label: "20-49%", color: "#f59e0b" }
  }
  return { label: "50%+", color: "#ef4444" }
}

function getPredictedRentBandData(
  tenant: StackingPlanTenant,
  averagePredictedRentPsf: number | null
) {
  if (
    tenant.isVacant ||
    tenant.predictedRentPsfValue == null ||
    averagePredictedRentPsf == null ||
    averagePredictedRentPsf <= 0
  ) {
    return { label: "Available", color: "#64748b" }
  }

  const deltaPct =
    ((tenant.predictedRentPsfValue - averagePredictedRentPsf) / averagePredictedRentPsf) * 100

  if (deltaPct >= 5) {
    return { label: "Above Avg", color: "#22c55e" }
  }
  if (deltaPct <= -5) {
    return { label: "Below Avg", color: "#f97316" }
  }
  return { label: "Within +/-5%", color: "#3b82f6" }
}

function getTenantTone(color: string) {
  const colorMap: Record<
    string,
    {
      textColor: string
      metaColor: string
      borderColor: string
      accentColor: string
      backgroundColor: string
    }
  > = {
    "#22c55e": {
      textColor: "#14532d",
      metaColor: "#166534",
      borderColor: "rgba(34,197,94,0.28)",
      accentColor: "#22c55e",
      backgroundColor: "rgba(240,253,244,0.92)",
    },
    "#a855f7": {
      textColor: "#581c87",
      metaColor: "#6b21a8",
      borderColor: "rgba(168,85,247,0.28)",
      accentColor: "#a855f7",
      backgroundColor: "rgba(250,245,255,0.92)",
    },
    "#3b82f6": {
      textColor: "#1e3a8a",
      metaColor: "#1d4ed8",
      borderColor: "rgba(59,130,246,0.28)",
      accentColor: "#3b82f6",
      backgroundColor: "rgba(239,246,255,0.92)",
    },
    "#f97316": {
      textColor: "#7c2d12",
      metaColor: "#c2410c",
      borderColor: "rgba(249,115,22,0.28)",
      accentColor: "#f97316",
      backgroundColor: "rgba(255,247,237,0.92)",
    },
    "#ef4444": {
      textColor: "#7f1d1d",
      metaColor: "#b91c1c",
      borderColor: "rgba(239,68,68,0.28)",
      accentColor: "#ef4444",
      backgroundColor: "rgba(254,242,242,0.92)",
    },
    "#14b8a6": {
      textColor: "#134e4a",
      metaColor: "#0f766e",
      borderColor: "rgba(20,184,166,0.28)",
      accentColor: "#14b8a6",
      backgroundColor: "rgba(240,253,250,0.92)",
    },
    "#64748b": {
      textColor: "#0f172a",
      metaColor: "#475569",
      borderColor: "rgba(148,163,184,0.35)",
      accentColor: "#64748b",
      backgroundColor: "rgba(248,250,252,0.92)",
    },
  }

  return colorMap[color.toLowerCase()] ?? colorMap["#22c55e"]!
}

function getLegendItemsForMode(mode: StackingVizMode): readonly StackingLegendItem[] {
  if (mode === "predictedRent") return PREDICTED_RENT_LEGEND
  if (mode === "occupancy") return OCCUPANCY_LEGEND
  if (mode === "vacancy") return VACANCY_LEGEND
  return STACKING_EXPIRATION_LEGEND
}

function getLegendLabelForMode(mode: StackingVizMode) {
  return STACKING_VIZ_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? "Legend"
}

function getTenantVisualColor({
  tenant,
  floor,
  mode,
  averagePredictedRentPsf,
}: {
  tenant: StackingPlanTenant
  floor: StackingPlanFloor
  mode: StackingVizMode
  averagePredictedRentPsf: number | null
}) {
  if (mode === "predictedRent") {
    return getPredictedRentBandData(tenant, averagePredictedRentPsf).color
  }
  if (mode === "occupancy") {
    return getOccupancyBandData(floor.occupancyPercent).color
  }
  if (mode === "vacancy") {
    return getVacancyBandData(floor.vacancyPercent).color
  }
  return tenant.color
}

function getTenantVisualizationTitle({
  tenant,
  floor,
  mode,
  averagePredictedRentPsf,
}: {
  tenant: StackingPlanTenant
  floor: StackingPlanFloor
  mode: StackingVizMode
  averagePredictedRentPsf: number | null
}) {
  const base = `${tenant.name} • ${tenant.space}`

  if (mode === "predictedRent") {
    const band = getPredictedRentBandData(tenant, averagePredictedRentPsf)
    return `${base} • ${tenant.predictedRent ?? "N/A"} • ${band.label}`
  }
  if (mode === "occupancy") {
    return `${base} • Floor occupancy ${floor.occupancyPercent}%`
  }
  if (mode === "vacancy") {
    return `${base} • Floor vacancy ${floor.vacancyPercent}%`
  }
  return `${base} • ${tenant.expiration}`
}

function formatCompactRate(value: number | null) {
  if (value == null) {
    return "N/A"
  }

  return `$${value.toFixed(2)}`
}

function formatCompactScore(value: number | null) {
  if (value == null) {
    return "N/A"
  }

  return `${Math.round(value)}`
}

function getQualityScoreColor(value: number | null) {
  if (value == null) {
    return "#64748b"
  }
  if (value >= 67) {
    return "#15803d"
  }
  if (value >= 34) {
    return "#b45309"
  }
  return "#be123c"
}

function InlineMetricItem({
  label,
  value,
  valueClassName,
  valueStyle,
  className,
}: {
  label: string
  value: string
  valueClassName?: string
  valueStyle?: React.CSSProperties
  className?: string
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm bg-background/55 px-2 py-1 ring-1 ring-border/35",
        className
      )}
    >
      <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground/85">
        {label}
      </span>
      <span
        className={cn("text-[11px] font-semibold tabular-nums", valueClassName ?? "text-foreground/90")}
        style={valueStyle}
      >
        {value}
      </span>
    </div>
  )
}

function getWeightedFloorAverageRate(
  floor: StackingPlanFloor,
  metric: "predictedRentPsfValue" | "contractRatePsfValue"
) {
  const occupiedTenants = floor.tenants.filter(
    (tenant) => !tenant.isVacant && tenant[metric] != null
  )

  if (occupiedTenants.length === 0) {
    return null
  }

  const weightedTotal = occupiedTenants.reduce(
    (sum, tenant) => sum + tenant.sqft * (tenant[metric] ?? 0),
    0
  )
  const totalSqft = occupiedTenants.reduce((sum, tenant) => sum + tenant.sqft, 0)

  if (totalSqft === 0) {
    return null
  }

  return weightedTotal / totalSqft
}

function getWeightedFloorAverageScore(
  floor: StackingPlanFloor,
  metric: "sunScore" | "viewScore"
) {
  const scoredTenants = floor.tenants.filter((tenant) => tenant[metric] != null)

  if (scoredTenants.length === 0) {
    return null
  }

  const weightedTotal = scoredTenants.reduce(
    (sum, tenant) => sum + tenant.sqft * (tenant[metric] ?? 0),
    0
  )
  const totalSqft = scoredTenants.reduce((sum, tenant) => sum + tenant.sqft, 0)

  if (totalSqft === 0) {
    return null
  }

  return weightedTotal / totalSqft
}

function downloadCsv(assetId: string, floors: readonly StackingPlanFloor[]) {
  const header = [
    "Floor",
    "Suite",
    "Tenant",
    "Size SF",
    "Occupancy",
    "Lease Expiration",
    "Color",
    "Note",
  ]

  const rows = floors.flatMap((floor) =>
    floor.tenants.map((tenant) => [
      String(floor.floor),
      tenant.space,
      tenant.name,
      String(tenant.sqft),
      tenant.isVacant ? "Vacant" : "Occupied",
      tenant.expiration,
      tenant.color,
      tenant.note ?? "",
    ])
  )

  const toCell = (value: string) => `"${value.replace(/"/g, '""')}"`
  const csv = [header, ...rows].map((row) => row.map(toCell).join(",")).join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${assetId}-stacking-plan.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function AssetStackingPlanWorkspace({
  assetId,
  lockedViewMode,
  showViewToggle = true,
  showSortControl = true,
}: AssetStackingPlanWorkspaceProps) {
  const dataset = React.useMemo(() => getSampleStackingPlanData(assetId), [assetId])
  const [viewMode, setViewMode] = React.useState<StackingViewMode>("detailed")
  const [vizMode, setVizMode] = React.useState<StackingVizMode>("leaseExpiration")
  const [isDesc, setIsDesc] = React.useState(true)
  const [selectedTenant, setSelectedTenant] = React.useState<StackingPlanTenant | null>(
    null
  )
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)
  const averagePredictedRentPsf = React.useMemo(() => {
    const occupiedTenants = dataset.floors
      .flatMap((floor) => floor.tenants)
      .filter((tenant) => !tenant.isVacant && tenant.predictedRentPsfValue != null)

    if (occupiedTenants.length === 0) {
      return null
    }

    const weightedTotal = occupiedTenants.reduce(
      (sum, tenant) => sum + tenant.sqft * (tenant.predictedRentPsfValue ?? 0),
      0
    )
    const totalSqft = occupiedTenants.reduce((sum, tenant) => sum + tenant.sqft, 0)

    if (totalSqft === 0) {
      return null
    }

    return weightedTotal / totalSqft
  }, [dataset.floors])
  const averageContractRatePsf = React.useMemo(() => {
    const occupiedTenants = dataset.floors
      .flatMap((floor) => floor.tenants)
      .filter((tenant) => !tenant.isVacant && tenant.contractRatePsfValue != null)

    if (occupiedTenants.length === 0) {
      return null
    }

    const weightedTotal = occupiedTenants.reduce(
      (sum, tenant) => sum + tenant.sqft * (tenant.contractRatePsfValue ?? 0),
      0
    )
    const totalSqft = occupiedTenants.reduce((sum, tenant) => sum + tenant.sqft, 0)

    if (totalSqft === 0) {
      return null
    }

    return weightedTotal / totalSqft
  }, [dataset.floors])
  const averageSunScore = React.useMemo(() => {
    const scoredTenants = dataset.floors
      .flatMap((floor) => floor.tenants)
      .filter((tenant) => tenant.sunScore != null)

    if (scoredTenants.length === 0) {
      return null
    }

    const weightedTotal = scoredTenants.reduce(
      (sum, tenant) => sum + tenant.sqft * (tenant.sunScore ?? 0),
      0
    )
    const totalSqft = scoredTenants.reduce((sum, tenant) => sum + tenant.sqft, 0)

    if (totalSqft === 0) {
      return null
    }

    return weightedTotal / totalSqft
  }, [dataset.floors])
  const averageViewScore = React.useMemo(() => {
    const scoredTenants = dataset.floors
      .flatMap((floor) => floor.tenants)
      .filter((tenant) => tenant.viewScore != null)

    if (scoredTenants.length === 0) {
      return null
    }

    const weightedTotal = scoredTenants.reduce(
      (sum, tenant) => sum + tenant.sqft * (tenant.viewScore ?? 0),
      0
    )
    const totalSqft = scoredTenants.reduce((sum, tenant) => sum + tenant.sqft, 0)

    if (totalSqft === 0) {
      return null
    }

    return weightedTotal / totalSqft
  }, [dataset.floors])

  const displayedFloors = React.useMemo(
    () => (isDesc ? dataset.floors : [...dataset.floors].reverse()),
    [dataset.floors, isDesc]
  )
  const effectiveViewMode = lockedViewMode ?? viewMode
  const shouldShowViewToggle = lockedViewMode == null && showViewToggle
  const shouldShowSortControl = showSortControl && effectiveViewMode === "simplified"

  const handleTenantSelect = React.useCallback((tenant: StackingPlanTenant) => {
    setSelectedTenant(tenant)
    setIsDrawerOpen(true)
  }, [])

  const handleDrawerOpenChange = React.useCallback((open: boolean) => {
    setIsDrawerOpen(open)
    if (!open) {
      setSelectedTenant(null)
    }
  }, [])

  React.useEffect(() => {
    setIsDrawerOpen(false)
    setSelectedTenant(null)
  }, [assetId])

  return (
    <>
      <section
        role="region"
        aria-label="Stacking plan"
        className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5">
          {shouldShowViewToggle || shouldShowSortControl ? (
            <div className="flex flex-wrap items-center gap-2">
              {shouldShowViewToggle ? (
                <ToggleGroup
                  value={[effectiveViewMode]}
                  onValueChange={(values) => {
                    const next = values[0]
                    if (next === "detailed" || next === "simplified") {
                      setViewMode(next)
                    }
                  }}
                  aria-label="Switch stacking plan view"
                >
                  <ToggleGroupItem value="detailed">Detailed</ToggleGroupItem>
                  <ToggleGroupItem value="simplified">Floor</ToggleGroupItem>
                </ToggleGroup>
              ) : null}

              {shouldShowSortControl ? (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="rounded-lg"
                  onClick={() => setIsDesc((prev) => !prev)}
                >
                  <ArrowUpDown className="size-3" />
                  {isDesc ? "Top down" : "Bottom up"}
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <Select
              value={vizMode}
              onValueChange={(value) => {
                if (
                  value === "leaseExpiration" ||
                  value === "predictedRent" ||
                  value === "occupancy" ||
                  value === "vacancy"
                ) {
                  setVizMode(value)
                }
              }}
            >
              <SelectTrigger
                size="sm"
                className="min-w-[176px] rounded-lg border-border bg-background shadow-sm"
                aria-label="Select stacking visualization mode"
              >
                <span className="truncate">{getLegendLabelForMode(vizMode)}</span>
              </SelectTrigger>
              <SelectContent align="end">
                {STACKING_VIZ_MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <StackingPlanLegend mode={vizMode} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => downloadCsv(assetId, dataset.floors)}
            >
              <Download className="size-3.5 text-primary" />
              Export
            </Button>
          </div>
        </div>

        {effectiveViewMode === "detailed" ? (
          <>
            <DetailedColumnHeaders
              isDesc={isDesc}
              onToggle={() => setIsDesc((prev) => !prev)}
            />
            <div className="bg-background">
              {displayedFloors.map((floor, index) => (
                <DetailedFloorRow
                  key={floor.floor}
                  floor={floor}
                  isLast={index === displayedFloors.length - 1}
                  vizMode={vizMode}
                  averagePredictedRentPsf={averagePredictedRentPsf}
                  onTenantSelect={handleTenantSelect}
                  selectedTenantId={selectedTenant?.id ?? null}
                />
              ))}
            </div>
            <SummaryFooter
              totalSqft={dataset.summary.totalSqft}
              overallOccupancyPercent={dataset.summary.overallOccupancyPercent}
              averagePredictedRentPsf={averagePredictedRentPsf}
              averageContractRatePsf={averageContractRatePsf}
              averageSunScore={averageSunScore}
              averageViewScore={averageViewScore}
              totalTenants={dataset.summary.totalTenants}
            />
          </>
        ) : (
          <div className="bg-background">
            <div className="mx-auto w-full max-w-[800px]">
              {displayedFloors.map((floor) => (
                <SimplifiedFloorRow
                  key={floor.floor}
                  floor={floor}
                  vizMode={vizMode}
                  averagePredictedRentPsf={averagePredictedRentPsf}
                  onTenantSelect={handleTenantSelect}
                  selectedTenantId={selectedTenant?.id ?? null}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <AssetStackingPlanDrawer
        open={isDrawerOpen}
        tenant={selectedTenant}
        onOpenChange={handleDrawerOpenChange}
      />
    </>
  )
}

function StackingPlanLegend({ mode }: { mode: StackingVizMode }) {
  const legendItems = getLegendItemsForMode(mode)
  const legendLabel = getLegendLabelForMode(mode)

  return (
    <div
      className="flex items-center text-[11px] text-muted-foreground"
      aria-label={`${legendLabel} legend`}
    >
      <div className="flex items-center gap-2.5 rounded-full border border-border/70 bg-muted/20 px-2.5 py-1">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full ring-1 ring-black/5"
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
            <span className="text-[10px] font-medium text-foreground/80">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DetailedColumnHeaders({
  isDesc,
  onToggle,
}: {
  isDesc: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center border-b border-border bg-muted/35">
      <div className="flex w-[116px] items-center justify-center gap-1.5 px-3 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Floor
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label={`Toggle floor order. Currently ${isDesc ? "descending" : "ascending"}.`}
          className="inline-flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ArrowUpDown className="h-3 w-3" />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center gap-[10px] px-3 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Stack
        </div>
      </div>
    </div>
  )
}

function DetailedFloorRow({
  floor,
  isLast,
  vizMode,
  averagePredictedRentPsf,
  onTenantSelect,
  selectedTenantId,
}: {
  floor: StackingPlanFloor
  isLast: boolean
  vizMode: StackingVizMode
  averagePredictedRentPsf: number | null
  onTenantSelect: (tenant: StackingPlanTenant) => void
  selectedTenantId: string | null
}) {
  const occupancyTone = getOccupancyColors(floor.occupancyPercent)
  const averagePredictedRate = getWeightedFloorAverageRate(floor, "predictedRentPsfValue")
  const averageContractRate = getWeightedFloorAverageRate(floor, "contractRatePsfValue")
  const averageSunScore = getWeightedFloorAverageScore(floor, "sunScore")
  const averageViewScore = getWeightedFloorAverageScore(floor, "viewScore")

  return (
    <div
      className={`grid min-h-16 grid-cols-[116px_minmax(0,1fr)] items-stretch bg-background transition-colors hover:bg-muted/10 ${
        !isLast ? "border-b border-border/70" : ""
      }`}
    >
      <div className="flex items-center justify-center px-3 py-3">
        <div className="flex min-w-[72px] flex-col items-center justify-center gap-1.5">
          <div className="flex h-10 min-w-[52px] items-center justify-center rounded-lg border border-border/60 bg-muted/35 px-3">
            <div className="text-[15px] font-semibold tabular-nums text-foreground">
              {floor.floor}
            </div>
          </div>
          <div className="text-center text-[11px] font-medium tabular-nums text-muted-foreground/90">
            {floor.sqft}
          </div>
        </div>
      </div>

      <div className="min-w-0 py-2 pr-2">
        <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-muted/10">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-border/30 px-2.5 py-1.5">
            <InlineMetricItem
              label="Occ"
              value={`${floor.occupancyPercent}%`}
              valueClassName={occupancyTone.text}
              className="bg-background/70"
            />
            <InlineMetricItem
              label="Pred"
              value={formatCompactRate(averagePredictedRate)}
            />
            <InlineMetricItem
              label="Contract"
              value={formatCompactRate(averageContractRate)}
            />
            <InlineMetricItem
              label="Sun"
              value={formatCompactScore(averageSunScore)}
              valueStyle={{ color: getQualityScoreColor(averageSunScore) }}
            />
            <InlineMetricItem
              label="View"
              value={formatCompactScore(averageViewScore)}
              valueStyle={{ color: getQualityScoreColor(averageViewScore) }}
            />
          </div>
          <div className="flex min-h-[60px] min-w-0 flex-1 overflow-hidden">
            {floor.tenants.map((tenant, index) => (
              <TenantSegment
                key={tenant.id}
                tenant={tenant}
                visualColor={getTenantVisualColor({
                  tenant,
                  floor,
                  mode: vizMode,
                  averagePredictedRentPsf,
                })}
                title={getTenantVisualizationTitle({
                  tenant,
                  floor,
                  mode: vizMode,
                  averagePredictedRentPsf,
                })}
                isLastTenant={index === floor.tenants.length - 1}
                isSelected={selectedTenantId === tenant.id}
                onOpenTenant={onTenantSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TenantSegment({
  tenant,
  visualColor,
  title,
  isLastTenant,
  isSelected,
  onOpenTenant,
}: {
  tenant: StackingPlanTenant
  visualColor: string
  title: string
  isLastTenant: boolean
  isSelected: boolean
  onOpenTenant: (tenant: StackingPlanTenant) => void
}) {
  const tone = getTenantTone(visualColor)
  const isCompact = tenant.widthPercent < 14
  const isSemiCompact = tenant.widthPercent < 18
  const isVeryCompact = tenant.widthPercent < 7
  const selectionShadow = isSelected
    ? "inset 0 0 0 2px rgba(59,130,246,0.22), inset 0 2px 0 0"
    : "inset 0 2px 0 0"

  return (
    <button
      type="button"
      onClick={() => onOpenTenant(tenant)}
      aria-haspopup="dialog"
      aria-expanded={isSelected}
      aria-label={`${tenant.name}, ${tenant.space}, ${tenant.sqftLabel}, ${
        tenant.isVacant ? tenant.availabilityStatus : `expires ${tenant.expiration}`
      }. Open details.`}
      className={`relative flex h-full min-h-[60px] cursor-pointer flex-col justify-center gap-1 px-2 py-1.5 text-left transition-[filter,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset hover:z-10 hover:brightness-[0.99] ${
        isSelected ? "z-10" : ""
      }`}
      style={{
        width: `${tenant.widthPercent}%`,
        minWidth: isVeryCompact ? "12px" : "28px",
        borderRight: isLastTenant ? "none" : "1px solid rgba(148,163,184,0.18)",
        backgroundColor: tone.backgroundColor,
        boxShadow: `${selectionShadow} ${tone.accentColor}`,
      }}
      title={title}
    >
      <div
        className="self-stretch truncate text-center text-[10.5px] font-semibold leading-4"
        style={{ color: tone.textColor }}
      >
        {tenant.name}
      </div>

      {!isCompact ? (
        <div className="flex items-start justify-center gap-1.5 overflow-hidden whitespace-nowrap text-[9px] font-medium">
          <div className="truncate" style={{ color: tone.metaColor }}>
            {tenant.space}
          </div>
          {!isSemiCompact ? (
            <div className="truncate" style={{ color: tone.metaColor }}>
              {tenant.sqftLabel}
            </div>
          ) : null}
          <div className="truncate" style={{ color: tone.metaColor }}>
            {tenant.expiration}
          </div>
        </div>
      ) : null}
    </button>
  )
}

function SimplifiedFloorRow({
  floor,
  vizMode,
  averagePredictedRentPsf,
  onTenantSelect,
  selectedTenantId,
}: {
  floor: StackingPlanFloor
  vizMode: StackingVizMode
  averagePredictedRentPsf: number | null
  onTenantSelect: (tenant: StackingPlanTenant) => void
  selectedTenantId: string | null
}) {
  return (
    <div className="flex h-6 items-center bg-background transition-colors hover:bg-muted/10">
      <div className="flex w-[52px] items-center justify-center px-1">
        <div className="flex h-5 min-w-[28px] justify-center rounded-sm border border-border bg-muted/60 px-1.5 shadow-sm">
          <div className="text-[11px] font-semibold tabular-nums leading-4 text-foreground">
            {floor.floor}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center px-1">
        <div className="flex w-full">
          <div className="flex h-5 w-full overflow-hidden rounded-sm border border-border/70 bg-muted/20 shadow-sm">
            {floor.tenants.map((tenant, index) => (
              <button
                key={tenant.id}
                type="button"
                onClick={() => onTenantSelect(tenant)}
                aria-haspopup="dialog"
                aria-expanded={selectedTenantId === tenant.id}
                aria-label={`${tenant.name}, ${tenant.space}, ${
                  tenant.isVacant ? tenant.availabilityStatus : `expires ${tenant.expiration}`
                }. Open details.`}
                className={`h-full focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset ${
                  selectedTenantId === tenant.id ? "z-10 brightness-95" : "hover:brightness-95"
                }`}
                style={{
                  width: `${tenant.widthPercent}%`,
                  minWidth: "10px",
                  backgroundColor: getTenantVisualColor({
                    tenant,
                    floor,
                    mode: vizMode,
                    averagePredictedRentPsf,
                  }),
                  boxShadow:
                    selectedTenantId === tenant.id
                      ? "inset 0 0 0 2px rgba(255,255,255,0.72)"
                      : undefined,
                  borderRight:
                    index === floor.tenants.length - 1
                      ? "none"
                      : "1px solid rgba(255,255,255,0.55)",
                }}
                title={getTenantVisualizationTitle({
                  tenant,
                  floor,
                  mode: vizMode,
                  averagePredictedRentPsf,
                })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryFooter({
  totalSqft,
  overallOccupancyPercent,
  averagePredictedRentPsf,
  averageContractRatePsf,
  averageSunScore,
  averageViewScore,
  totalTenants,
}: {
  totalSqft: number
  overallOccupancyPercent: number
  averagePredictedRentPsf: number | null
  averageContractRatePsf: number | null
  averageSunScore: number | null
  averageViewScore: number | null
  totalTenants: number
}) {
  return (
    <div className="flex items-center border-t border-border bg-muted/20">
      <div className="flex w-[116px] flex-col items-center px-3 py-3 text-center">
        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Total RSF
        </div>
        <div className="mt-1 text-[11px] font-semibold tabular-nums text-foreground">
          {totalSqft.toLocaleString()} SF
        </div>
      </div>
      <div className="flex flex-1 items-center justify-between gap-3 px-3 py-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <InlineMetricItem
            label="Occ"
            value={`${overallOccupancyPercent.toFixed(2)}%`}
            className="bg-background/70"
          />
          <InlineMetricItem
            label="Pred"
            value={formatCompactRate(averagePredictedRentPsf)}
          />
          <InlineMetricItem
            label="Contract"
            value={formatCompactRate(averageContractRatePsf)}
          />
          <InlineMetricItem
            label="Sun"
            value={formatCompactScore(averageSunScore)}
            valueStyle={{ color: getQualityScoreColor(averageSunScore) }}
          />
          <InlineMetricItem
            label="View"
            value={formatCompactScore(averageViewScore)}
            valueStyle={{ color: getQualityScoreColor(averageViewScore) }}
          />
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold text-foreground shadow-sm">
          <span className="text-muted-foreground">Tenants</span>
          <span className="tabular-nums">{totalTenants}</span>
        </div>
      </div>
    </div>
  )
}
