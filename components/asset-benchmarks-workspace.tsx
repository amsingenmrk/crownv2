"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { AssetBenchmarksTable } from "@/components/asset-benchmarks-table"
import { usePortfolioAssetCoordinates } from "@/hooks/use-portfolio-asset-coordinates"
import { getAssetById } from "@/lib/assets"
import {
  curatedBenchmarkMarketAreas,
  resolveBenchmarkAreaById,
  type BenchmarkArea,
  US_NATIONAL_BENCHMARK_AREA,
} from "@/lib/benchmark-area-search"
import {
  benchmarkAreaSnapshot,
  type BenchmarkAreaSnapshot,
  benchmarkBuildingTableRowForAsset,
  benchmarkStateSnapshot,
  benchmarkZipCodeSnapshot,
  type BenchmarkKpiKey,
} from "@/lib/benchmark-area-model"
import { getMarketListingPinById } from "@/lib/market-search-demo-listings"
import { lngLatForPortfolioAsset } from "@/lib/portfolio-asset-lng-lat"
import {
  stateBenchmarkAreaForCode,
  stateCodeFromAddressLike,
} from "@/lib/benchmark-state-areas"
import {
  zipBenchmarkAreaForCode,
  zipCodeFromAddressLike,
} from "@/lib/benchmark-zip-areas"

function assetNameForAsset(assetId: string): string {
  const asset = getAssetById(assetId)
  if (asset?.name) return asset.name
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

  const pin = getMarketListingPinById(assetId)
  if (pin) {
    return { longitude: pin.longitude, latitude: pin.latitude }
  }

  return null
}

function stateAreaForAsset(assetId: string) {
  const asset = getAssetById(assetId)
  if (asset) {
    return stateBenchmarkAreaForCode(stateCodeFromAddressLike(asset.address))
  }

  const pin = getMarketListingPinById(assetId)
  return stateBenchmarkAreaForCode(stateCodeFromAddressLike(pin?.location))
}

function zipCodeForAsset(assetId: string): string | null {
  const asset = getAssetById(assetId)
  if (asset) return zipCodeFromAddressLike(asset.address)
  const pin = getMarketListingPinById(assetId)
  return zipCodeFromAddressLike(pin?.location)
}

function stateCodeForAsset(assetId: string): string | null {
  const asset = getAssetById(assetId)
  if (asset) return stateCodeFromAddressLike(asset.address)
  const pin = getMarketListingPinById(assetId)
  return stateCodeFromAddressLike(pin?.location)
}

function kpisRecordFromSnapshot(
  snapshot: BenchmarkAreaSnapshot
): Record<BenchmarkKpiKey, string> {
  return Object.fromEntries(
    snapshot.kpis.map((kpi) => [kpi.key, kpi.value])
  ) as Record<BenchmarkKpiKey, string>
}

export function AssetBenchmarksWorkspace({
  assetId,
  benchmarkAreaId,
}: {
  assetId: string
  benchmarkAreaId?: string
}) {
  const pathname = usePathname()
  const { coordinates } = usePortfolioAssetCoordinates()
  const [selectedZipBenchmarkAreaId, setSelectedZipBenchmarkAreaId] =
    React.useState<string | undefined>(undefined)
  const [selectedRegionBenchmarkAreaId, setSelectedRegionBenchmarkAreaId] =
    React.useState(benchmarkAreaId)

  React.useEffect(() => {
    setSelectedZipBenchmarkAreaId(undefined)
    setSelectedRegionBenchmarkAreaId(benchmarkAreaId)
  }, [assetId, benchmarkAreaId])

  React.useEffect(() => {
    if (!benchmarkAreaId || !pathname || typeof window === "undefined") return
    const url = new URL(window.location.href)
    url.searchParams.delete("area")
    const nextSearch = url.searchParams.toString()
    window.history.replaceState(
      window.history.state,
      "",
      `${pathname}${nextSearch ? `?${nextSearch}` : ""}${url.hash}`
    )
  }, [benchmarkAreaId, pathname])

  const assetRow = React.useMemo(
    () => benchmarkBuildingTableRowForAsset(assetId, coordinates),
    [assetId, coordinates]
  )

  const assetName = React.useMemo(() => assetNameForAsset(assetId), [assetId])

  const assetPin = React.useMemo(
    () => assetPinForAsset(assetId, coordinates),
    [assetId, coordinates]
  )

  const defaultRegionArea = React.useMemo(() => {
    return stateAreaForAsset(assetId) ?? US_NATIONAL_BENCHMARK_AREA
  }, [assetId])

  const zipCode = React.useMemo(() => zipCodeForAsset(assetId), [assetId])
  const defaultZipArea = React.useMemo(
    () => zipBenchmarkAreaForCode(zipCode),
    [zipCode]
  )
  const stateCode = React.useMemo(() => stateCodeForAsset(assetId), [assetId])

  const selectedZipBenchmarkArea = React.useMemo(() => {
    return resolveBenchmarkAreaById(selectedZipBenchmarkAreaId)
  }, [selectedZipBenchmarkAreaId])

  const selectedRegionBenchmarkArea = React.useMemo(() => {
    return resolveBenchmarkAreaById(selectedRegionBenchmarkAreaId)
  }, [selectedRegionBenchmarkAreaId])

  const zipArea = selectedZipBenchmarkArea ?? defaultZipArea
  const homeArea = selectedRegionBenchmarkArea ?? defaultRegionArea
  const columnsAltered =
    (zipArea?.id ?? null) !== (defaultZipArea?.id ?? null) ||
    homeArea.id !== defaultRegionArea.id

  const benchmarkOptions = React.useMemo(() => {
    const options = [
      defaultZipArea,
      defaultRegionArea,
      US_NATIONAL_BENCHMARK_AREA,
      selectedZipBenchmarkArea,
      selectedRegionBenchmarkArea,
      ...curatedBenchmarkMarketAreas(),
    ].filter((area): area is BenchmarkArea => area != null)

    const seen = new Set<string>()
    return options
      .filter((area) => {
        if (seen.has(area.id)) return false
        seen.add(area.id)
        return true
      })
      .map((area) => ({ id: area.id, label: area.label }))
  }, [
    defaultRegionArea,
    defaultZipArea,
    selectedRegionBenchmarkArea,
    selectedZipBenchmarkArea,
  ])

  function snapshotForArea(area: BenchmarkArea | null): BenchmarkAreaSnapshot {
    if (!area) return benchmarkZipCodeSnapshot(null, coordinates)
    const zipMatch = /^zip-(\d{5})$/.exec(area.id)
    if (zipMatch) {
      return benchmarkZipCodeSnapshot(zipMatch[1]!, coordinates)
    }
    const stateMatch = /^state-([a-z]{2})$/.exec(area.id)
    if (stateMatch) {
      return benchmarkStateSnapshot(
        stateMatch[1]!.toUpperCase(),
        area.label,
        coordinates
      )
    }
    return benchmarkAreaSnapshot(area, coordinates)
  }

  const { zipLabel, zipKpis, regionLabel, regionKpis } =
    React.useMemo(() => {
      const zipSnapshot = snapshotForArea(zipArea)
      const regionSnapshot = snapshotForArea(homeArea)

      return {
        zipLabel: zipSnapshot.areaLabel,
        zipKpis: kpisRecordFromSnapshot(zipSnapshot),
        regionLabel: homeArea.label,
        regionKpis: kpisRecordFromSnapshot(regionSnapshot),
      }
    }, [coordinates, homeArea, zipArea])

  return (
    <AssetBenchmarksTable
      assetRow={assetRow}
      assetName={assetName}
      assetPin={assetPin}
      homeArea={homeArea}
      zipArea={zipArea}
      zipLabel={zipLabel}
      zipKpis={zipKpis}
      regionLabel={regionLabel}
      regionKpis={regionKpis}
      benchmarkOptions={benchmarkOptions}
      onZipBenchmarkChange={setSelectedZipBenchmarkAreaId}
      onRegionBenchmarkChange={setSelectedRegionBenchmarkAreaId}
      showReset={columnsAltered}
      onReset={() => {
        setSelectedZipBenchmarkAreaId(undefined)
        setSelectedRegionBenchmarkAreaId(undefined)
      }}
    />
  )
}
