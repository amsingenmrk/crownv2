import type { Asset } from "@/lib/assets"
import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"
import {
  resolveCompetitiveGroupIdsForAsset,
  type parseCompetitiveGroupSnapshot,
} from "@/lib/competitive-group-overrides"
import { portfolioAssetRowForAsset } from "@/lib/portfolio-row-for-asset"

import { otherRealAssetList } from "./index"

type CompetitiveGroupSnapshot = ReturnType<typeof parseCompetitiveGroupSnapshot>

function resolveOtherRealAssetGroupIds(
  asset: Asset,
  competitiveGroupData: CompetitiveGroupSnapshot
): string[] {
  return resolveCompetitiveGroupIdsForAsset(
    asset.id,
    competitiveGroupData.membershipOverrides,
    {
      customGroups: competitiveGroupData.customGroups,
      removedAssetIds: competitiveGroupData.removedAssetIds,
      removedSeededGroupIds: competitiveGroupData.removedSeededGroupIds,
    }
  )
}

/** JSON-backed Other Assets filtered by prospective group membership. */
export function scopedOtherRealAssets(
  competitiveGroupData: CompetitiveGroupSnapshot,
  competitiveGroupId?: string | null
): Asset[] {
  return otherRealAssetList()
    .filter((asset) => !competitiveGroupData.removedAssetIds.has(asset.id))
    .filter((asset) => {
      if (competitiveGroupId == null) return true
      return resolveOtherRealAssetGroupIds(asset, competitiveGroupData).includes(
        competitiveGroupId
      )
    })
}

export function otherRealAssetPortfolioRows(
  competitiveGroupData: CompetitiveGroupSnapshot,
  competitiveGroupId?: string | null
): PortfolioAssetRow[] {
  return scopedOtherRealAssets(competitiveGroupData, competitiveGroupId).map(
    (asset, index) => {
      const baseRow = portfolioAssetRowForAsset(asset, index, {
        ownership: "Prospective",
      })
      const groupIds = resolveOtherRealAssetGroupIds(asset, competitiveGroupData)
      return {
        ...baseRow,
        groupId: groupIds[0] ?? asset.groupId,
        groupIds,
      }
    }
  )
}
