"use client"

import * as React from "react"

import { AssetBenchmarksTable } from "@/components/asset-benchmarks-table"
import { usePortfolioAssetCoordinates } from "@/hooks/use-portfolio-asset-coordinates"
import { getAssetById } from "@/lib/assets"
import { resolveBenchmarkAreaForAsset } from "@/lib/benchmark-area-for-asset"
import { US_NATIONAL_BENCHMARK_AREA } from "@/lib/benchmark-area-search"
import {
  benchmarkAreaSnapshot,
  benchmarkBuildingTableRowForAsset,
  type BenchmarkKpiKey,
} from "@/lib/benchmark-area-model"
import { getMarketListingPinById } from "@/lib/market-search-demo-listings"

function assetNameForAsset(assetId: string): string {
  const asset = getAssetById(assetId)
  if (asset?.name) return asset.name
  const pin = getMarketListingPinById(assetId)
  if (pin?.building) return pin.building
  return "—"
}

function kpisRecordFromSnapshot(
  snapshot: ReturnType<typeof benchmarkAreaSnapshot>
): Record<BenchmarkKpiKey, string> {
  return Object.fromEntries(
    snapshot.kpis.map((kpi) => [kpi.key, kpi.value])
  ) as Record<BenchmarkKpiKey, string>
}

export function AssetBenchmarksWorkspace({ assetId }: { assetId: string }) {
  const { coordinates } = usePortfolioAssetCoordinates()

  const assetRow = React.useMemo(
    () => benchmarkBuildingTableRowForAsset(assetId, coordinates),
    [assetId, coordinates]
  )

  const assetName = React.useMemo(() => assetNameForAsset(assetId), [assetId])

  const homeArea = React.useMemo(
    () => resolveBenchmarkAreaForAsset(assetId),
    [assetId]
  )

  const { regionLabel, regionKpis, nationalLabel, nationalKpis } =
    React.useMemo(() => {
      const homeSnapshot = benchmarkAreaSnapshot(homeArea, coordinates)
      const nationalSnapshot = benchmarkAreaSnapshot(
        US_NATIONAL_BENCHMARK_AREA,
        coordinates
      )

      return {
        regionLabel: homeArea.label,
        regionKpis: kpisRecordFromSnapshot(homeSnapshot),
        nationalLabel: US_NATIONAL_BENCHMARK_AREA.label,
        nationalKpis: kpisRecordFromSnapshot(nationalSnapshot),
      }
    }, [coordinates, homeArea])

  return (
    <AssetBenchmarksTable
      assetRow={assetRow}
      assetName={assetName}
      regionLabel={regionLabel}
      regionKpis={regionKpis}
      nationalLabel={nationalLabel}
      nationalKpis={nationalKpis}
    />
  )
}
