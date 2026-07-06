"use client"

import * as React from "react"

import {
  AssetBenchmarksTable,
  type BenchmarkComparisonOption,
} from "@/components/asset-benchmarks-table"
import { usePortfolioAssetCoordinates } from "@/hooks/use-portfolio-asset-coordinates"
import { getAssetById } from "@/lib/assets"
import {
  getBenchmarkAreaById,
  getBenchmarkAreaParent,
  getBenchmarkAreaPath,
  getBenchmarkAreaPathForPoint,
} from "@/lib/benchmark-area-hierarchy"
import { resolveBenchmarkAreaForAsset } from "@/lib/benchmark-area-for-asset"
import {
  resolveBenchmarkAreaSelection,
  resolveBenchmarkAreaById,
  type BenchmarkArea,
  US_NATIONAL_BENCHMARK_AREA,
} from "@/lib/benchmark-area-search"
import {
  benchmarkAreaHasSufficientCoverage,
  benchmarkAssetKpiPercentilesForArea,
  benchmarkAreaSnapshot,
  benchmarkBuildingTableRowForAsset,
  type BenchmarkKpiDisplayValue,
  type BenchmarkKpiKey,
} from "@/lib/benchmark-area-model"
import { isTrackedBenchmarkArea } from "@/lib/benchmark-market-stats"
import { zipBenchmarkAreaForCode } from "@/lib/benchmark-zip-areas"
import { stateBenchmarkAreaForCode } from "@/lib/benchmark-state-areas"
import { assetPercentileGeoAreas } from "@/lib/benchmark-data/asset-percentiles"
import { getMarketListingPinById } from "@/lib/market-search-demo-listings"
import { getOtherRealAssetById } from "@/lib/real-properties/other-assets"
import { lngLatForPortfolioAsset } from "@/lib/portfolio-asset-lng-lat"
import { curatedZipAssignmentsForZipCode } from "@/lib/benchmark-submarket-assignments"

function assetNameForAsset(assetId: string): string {
  const asset = getAssetById(assetId)
  if (asset?.name) return asset.name
  const other = getOtherRealAssetById(assetId)
  if (other?.name) return other.name
  const pin = getMarketListingPinById(assetId)
  if (pin?.building) return pin.building
  return "—"
}

function assetPinForAsset(
  assetId: string,
  coordinates: Record<string, readonly [number, number]>
): { longitude: number; latitude: number } | null {
  const asset = getAssetById(assetId)
  if (asset) {
    const [longitude, latitude] = lngLatForPortfolioAsset(
      asset.id,
      asset.groupId,
      coordinates
    )
    return { longitude, latitude }
  }

  const other = getOtherRealAssetById(assetId)
  if (other) {
    const [longitude, latitude] = lngLatForPortfolioAsset(
      other.id,
      other.groupId,
      coordinates
    )
    return { longitude, latitude }
  }

  const pin = getMarketListingPinById(assetId)
  if (pin) {
    return { longitude: pin.longitude, latitude: pin.latitude }
  }

  return null
}

function kpisRecordFromSnapshot(
  snapshot: ReturnType<typeof benchmarkAreaSnapshot>
): Record<BenchmarkKpiKey, BenchmarkKpiDisplayValue> {
  return Object.fromEntries(
    snapshot.kpis.map((kpi) => [
      kpi.key,
      { value: kpi.value, supportingRange: kpi.supportingRange },
    ])
  ) as Record<BenchmarkKpiKey, BenchmarkKpiDisplayValue>
}

function zipCodeFromText(value: string | undefined): string | null {
  if (!value) return null
  const match = value.match(/\b(\d{5})(?:-\d{4})?\b/)
  return match?.[1] ?? null
}

function stateCodeFromText(value: string | undefined): string | null {
  if (!value) return null
  const match = value.match(/,\s*([A-Z]{2})\s+\d{5}(?:-\d{4})?\b/)
  return match?.[1] ?? null
}

function assetZipForAssetId(assetId: string): string | null {
  const asset = getAssetById(assetId)
  if (asset) return zipCodeFromText(asset.address)
  const other = getOtherRealAssetById(assetId)
  if (other) return zipCodeFromText(other.address)
  const pin = getMarketListingPinById(assetId)
  return zipCodeFromText(pin?.location)
}

function assetStateForAssetId(assetId: string): string | null {
  const asset = getAssetById(assetId)
  if (asset) return stateCodeFromText(asset.address)
  const other = getOtherRealAssetById(assetId)
  if (other) return stateCodeFromText(other.address)
  const pin = getMarketListingPinById(assetId)
  return stateCodeFromText(pin?.location)
}

function defaultBenchmarkAreasForAsset(
  point: readonly [number, number] | null,
  fallbackMarketArea: BenchmarkArea,
  assetZipCode: string | null,
  assetStateCode: string | null,
  coordinates: Record<string, readonly [number, number]>
): { lowArea: BenchmarkArea; marketArea: BenchmarkArea } {
  // Prefer the asset's actual ZIP (low) and state (market) so it benchmarks
  // against its real geography from the export rather than a curated proxy.
  const realZipArea = zipBenchmarkAreaForCode(assetZipCode)
  if (realZipArea) {
    const realStateArea = stateBenchmarkAreaForCode(assetStateCode)
    return { lowArea: realZipArea, marketArea: realStateArea ?? fallbackMarketArea }
  }

  if (!point) {
    return { lowArea: fallbackMarketArea, marketArea: fallbackMarketArea }
  }

  const path = getBenchmarkAreaPathForPoint(point, "zip")
  const marketAreaFromPoint =
    path.find((area) => area.level === "market") ?? fallbackMarketArea
  if (assetZipCode) {
    const zipAssignments = curatedZipAssignmentsForZipCode(assetZipCode)
    const stateScopedZipAssignments =
      assetStateCode == null
        ? zipAssignments
        : zipAssignments.filter(
            (assignment) => assignment.stateCode === assetStateCode
          )
    const candidateZipAssignments =
      stateScopedZipAssignments.length > 0
        ? stateScopedZipAssignments
        : zipAssignments
    if (candidateZipAssignments.length > 0) {
      const preferredZipAssignment =
        candidateZipAssignments.find(
          (assignment) => assignment.marketId === marketAreaFromPoint.id
        ) ??
        candidateZipAssignments.find(
          (assignment) => assignment.marketId === fallbackMarketArea.id
        ) ??
        candidateZipAssignments[0]
      if (preferredZipAssignment) {
        const preferredMarket =
          getBenchmarkAreaById(preferredZipAssignment.marketId) ??
          marketAreaFromPoint
        const preferredZipArea = getBenchmarkAreaById(preferredZipAssignment.id)
        if (preferredZipArea) {
          return { lowArea: preferredZipArea, marketArea: preferredMarket }
        }
      }
    }
  }

  const marketArea = marketAreaFromPoint
  const marketIndex = path.findIndex((area) => area.id === marketAreaFromPoint.id)
  const marketBranch = marketIndex >= 0 ? path.slice(marketIndex) : [marketArea]

  for (let index = marketBranch.length - 1; index >= 0; index -= 1) {
    const candidate = marketBranch[index]
    if (candidate.level === "country") continue
    if (
      isTrackedBenchmarkArea(candidate.id) &&
      benchmarkAreaHasSufficientCoverage(candidate)
    ) {
      return { lowArea: candidate, marketArea }
    }
  }

  return { lowArea: marketArea, marketArea }
}

function dedupeAreas(areas: BenchmarkArea[]): BenchmarkArea[] {
  const seen = new Set<string>()
  const out: BenchmarkArea[] = []
  for (const area of areas) {
    if (seen.has(area.id)) continue
    seen.add(area.id)
    out.push(area)
  }
  return out
}

export function AssetBenchmarksWorkspace({ assetId }: { assetId: string }) {
  const { coordinates } = usePortfolioAssetCoordinates()
  const mapboxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim()

  const assetRow = React.useMemo(
    () => benchmarkBuildingTableRowForAsset(assetId, coordinates),
    [assetId, coordinates]
  )

  const assetName = React.useMemo(() => assetNameForAsset(assetId), [assetId])

  const assetPin = React.useMemo(
    () => assetPinForAsset(assetId, coordinates),
    [assetId, coordinates]
  )

  const fallbackMarketArea = React.useMemo(
    () => resolveBenchmarkAreaForAsset(assetId),
    [assetId]
  )

  const assetZipCode = React.useMemo(() => assetZipForAssetId(assetId), [assetId])
  const assetStateCode = React.useMemo(
    () => assetStateForAssetId(assetId),
    [assetId]
  )

  // Comparison areas come from the per-asset percentile table (the hierarchy
  // levels this asset belongs to), so the options reflect the export.
  const percentileAreas = React.useMemo(
    () => assetPercentileGeoAreas(assetId),
    [assetId]
  )

  const { lowArea, marketArea } = React.useMemo(() => {
    if (percentileAreas.length > 0) {
      const byLevel = (level: string) =>
        percentileAreas.find((area) => area.id.startsWith(`geo:${level}:`))
      const low =
        byLevel("zip") ?? percentileAreas[percentileAreas.length - 1]!
      const market =
        byLevel("cbsa") ??
        byLevel("state") ??
        byLevel("regional_hub") ??
        byLevel("national") ??
        percentileAreas[0]!
      return { lowArea: low, marketArea: market }
    }
    return defaultBenchmarkAreasForAsset(
      assetPin ? [assetPin.longitude, assetPin.latitude] : null,
      fallbackMarketArea,
      assetZipCode,
      assetStateCode,
      coordinates
    )
  }, [
    percentileAreas,
    assetPin,
    fallbackMarketArea,
    assetZipCode,
    assetStateCode,
    coordinates,
  ])

  const comparisonAreas = React.useMemo(() => {
    if (percentileAreas.length > 0) return percentileAreas
    const pathFromLow = getBenchmarkAreaPath(lowArea)
    const pathFromMarket = getBenchmarkAreaPath(marketArea)
    const merged = dedupeAreas([
      ...pathFromLow,
      ...pathFromMarket,
      US_NATIONAL_BENCHMARK_AREA,
    ])
    return merged.filter(
      (area) =>
        isTrackedBenchmarkArea(area.id) && benchmarkAreaHasSufficientCoverage(area)
    )
  }, [percentileAreas, lowArea, marketArea])

  const comparisonOptions = React.useMemo<BenchmarkComparisonOption[]>(
    () =>
      comparisonAreas.map((area) => ({
        id: area.id,
        label: area.label,
      })),
    [comparisonAreas]
  )

  const [lowSelectionId, setLowSelectionId] = React.useState<string>(lowArea.id)
  const [marketSelectionId, setMarketSelectionId] = React.useState<string>(marketArea.id)

  React.useEffect(() => {
    const availableIds = new Set(comparisonAreas.map((area) => area.id))
    if (!availableIds.has(lowSelectionId)) {
      setLowSelectionId(lowArea.id)
    }
    if (!availableIds.has(marketSelectionId)) {
      setMarketSelectionId(marketArea.id)
    }
  }, [comparisonAreas, lowArea.id, lowSelectionId, marketArea.id, marketSelectionId])

  React.useEffect(() => {
    setLowSelectionId((current) => (current === lowArea.id ? current : lowArea.id))
    setMarketSelectionId((current) =>
      current === marketArea.id ? current : marketArea.id
    )
  }, [assetId, lowArea.id, marketArea.id])

  const selectedLowArea = React.useMemo(
    () =>
      comparisonAreas.find((area) => area.id === lowSelectionId) ??
      resolveBenchmarkAreaById(lowSelectionId) ??
      getBenchmarkAreaById(lowSelectionId) ??
      lowArea,
    [comparisonAreas, lowArea, lowSelectionId]
  )

  const selectedMarketArea = React.useMemo(
    () =>
      comparisonAreas.find((area) => area.id === marketSelectionId) ??
      resolveBenchmarkAreaById(marketSelectionId) ??
      getBenchmarkAreaById(marketSelectionId) ??
      marketArea,
    [comparisonAreas, marketArea, marketSelectionId]
  )

  const [resolvedAreas, setResolvedAreas] = React.useState<{
    lowArea: BenchmarkArea
    marketArea: BenchmarkArea
  }>({
    lowArea: selectedLowArea,
    marketArea: selectedMarketArea,
  })

  React.useEffect(() => {
    let cancelled = false
    setResolvedAreas({ lowArea: selectedLowArea, marketArea: selectedMarketArea })

    // Resolve map bounds/geometry via Mapbox while keeping geo:* ids for stats lookup.
    if (!mapboxAccessToken) {
      return () => void (cancelled = true)
    }

    Promise.all([
      resolveBenchmarkAreaSelection(selectedLowArea, mapboxAccessToken),
      resolveBenchmarkAreaSelection(selectedMarketArea, mapboxAccessToken),
    ])
      .then(([resolvedLowArea, resolvedMarketArea]) => {
        if (cancelled) return
        setResolvedAreas({
          lowArea: resolvedLowArea,
          marketArea: resolvedMarketArea,
        })
      })
      .catch(() => {
        // Fallback to curated bounds when geocode/boundary enrichment fails.
      })

    return () => {
      cancelled = true
    }
  }, [selectedLowArea, selectedMarketArea, mapboxAccessToken])

  const { lowLabel, lowKpis, marketLabel, marketKpis } =
    React.useMemo(() => {
      const lowSnapshot = benchmarkAreaSnapshot(resolvedAreas.lowArea, coordinates)
      const marketSnapshot = benchmarkAreaSnapshot(
        resolvedAreas.marketArea,
        coordinates
      )

      return {
        lowLabel: resolvedAreas.lowArea.label,
        lowKpis: kpisRecordFromSnapshot(lowSnapshot),
        marketLabel: resolvedAreas.marketArea.label,
        marketKpis: kpisRecordFromSnapshot(marketSnapshot),
      }
    }, [coordinates, resolvedAreas])

  const lowPercentiles = React.useMemo(
    () =>
      benchmarkAssetKpiPercentilesForArea(
        resolvedAreas.lowArea,
        assetId,
        coordinates
      ),
    [assetId, coordinates, resolvedAreas]
  )

  const marketPercentiles = React.useMemo(
    () =>
      benchmarkAssetKpiPercentilesForArea(
        resolvedAreas.marketArea,
        assetId,
        coordinates
      ),
    [assetId, coordinates, resolvedAreas]
  )

  return (
    <div className="min-w-0 space-y-6">
      <AssetBenchmarksTable
        assetRow={assetRow}
        assetName={assetName}
        assetPin={assetPin}
        lowArea={resolvedAreas.lowArea}
        lowLabel={lowLabel}
        lowKpis={lowKpis}
        lowPercentiles={lowPercentiles}
        marketArea={resolvedAreas.marketArea}
        marketLabel={marketLabel}
        marketKpis={marketKpis}
        marketPercentiles={marketPercentiles}
        comparisonOptions={comparisonOptions}
        lowSelectionId={lowSelectionId}
        onLowSelectionChange={setLowSelectionId}
        marketSelectionId={marketSelectionId}
        onMarketSelectionChange={setMarketSelectionId}
      />
    </div>
  )
}
