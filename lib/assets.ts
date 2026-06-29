/**
 * Demo assets for sidebar navigation and asset detail pages.
 */

import {
  readAssetGroupOverrides,
  readAssetDisplayLabels,
  readCustomAssetGroups,
  readFundDisplayLabels,
  resolveAssetGroupIds,
  type parseAssetGroupOverrideSnapshot,
} from "@/lib/asset-group-overrides"
import { realAssetList } from "@/lib/real-properties"

/** Historical seeded portfolio group ids. They map to Fund I/II/III, not sectors. */
export type AssetGroupId = "office" | "industrial" | "retail"

export const OFFICE_SECTOR_LABEL = "Office"

/**
 * Owned portfolio has no seeded fund grouping — the three real properties are a
 * flat list under "Your Assets". Users can still create custom groups.
 */
export const SEEDED_PORTFOLIO_GROUP_IDS: readonly AssetGroupId[] = []

const SEEDED_PORTFOLIO_SCOPE_SLUGS: Record<AssetGroupId, string> = {
  office: "fund-i",
  industrial: "fund-ii",
  retail: "fund-iii",
}

const SEEDED_PORTFOLIO_SCOPE_IDS_BY_SLUG: Record<string, AssetGroupId> = {
  "fund-i": "office",
  "fund-ii": "industrial",
  "fund-iii": "retail",
  // Preserve legacy scope URLs in case any old links still exist.
  office: "office",
  industrial: "industrial",
  retail: "retail",
}

export const PORTFOLIO_OVERVIEW_LABEL = "Portfolio"

/** Labels used in the sidebar asset groups and portfolio group filter. */
export const ASSET_GROUP_SIDEBAR_LABELS: Record<AssetGroupId, string> = {
  office: "Fund I",
  industrial: "Fund II",
  retail: "Fund III",
}

/** Default subtitles for the seeded demo portfolio groups (Fund I–III). */
export const ASSET_GROUP_DESCRIPTIONS: Record<AssetGroupId, string> = {
  office: "Core gateway office with trophy concentration in New York and Boston.",
  industrial: "Diversified value-add office in growth CBD and Sun Belt markets.",
  retail: "Lease-up and opportunistic office in coastal innovation corridors.",
}

export interface Asset {
  id: string
  name: string
  groupId: string
  /** All portfolio groups this asset belongs to (resolved). */
  groupIds?: string[]
  groupLabel: string
  address: string
  imageUrl: string
  /** 0–100 */
  occupiedPercent: number
}

type AssetGroupSnapshot = ReturnType<typeof parseAssetGroupOverrideSnapshot>

type AssetGroupResolutionOptions = {
  overrides?: Record<string, string[]>
  customGroups?: Record<string, string>
  assetLabelOverrides?: Record<string, string>
}

/** Owned portfolio is sourced from real exported property data. */
export const ASSETS: Asset[] = realAssetList()

export function resolveAssetGroupLabel(
  groupId: string,
  customGroups?: Record<string, string>
): string {
  if (
    groupId === "office" ||
    groupId === "industrial" ||
    groupId === "retail"
  ) {
    if (typeof window !== "undefined") {
      const fundOverride = readFundDisplayLabels()[groupId]
      if (fundOverride != null && fundOverride.trim() !== "") {
        return fundOverride
      }
    }
    return ASSET_GROUP_SIDEBAR_LABELS[groupId]
  }
  if (customGroups != null) return customGroups[groupId] ?? groupId
  if (typeof window === "undefined") return groupId
  return readCustomAssetGroups()[groupId] ?? groupId
}

export function resolveAssetGroupIdsForAsset(
  id: string,
  options?: AssetGroupResolutionOptions | AssetGroupSnapshot
): string[] {
  const base = ASSETS.find((a) => a.id === id)
  if (!base) return []

  if (options != null && "overrides" in options && "customGroups" in options) {
    return resolveAssetGroupIds(id, base.groupId, options.overrides ?? {})
  }

  const resolution = options as AssetGroupResolutionOptions | undefined
  const overrides =
    resolution?.overrides ??
    (typeof window !== "undefined" ? readAssetGroupOverrides() : {})
  return resolveAssetGroupIds(id, base.groupId, overrides)
}

export function assetIsInPortfolioGroup(
  assetId: string,
  groupId: string,
  options?: AssetGroupResolutionOptions | AssetGroupSnapshot
): boolean {
  return resolveAssetGroupIdsForAsset(assetId, options).includes(groupId)
}

function assetWithResolvedGroups(
  base: Asset,
  options?: AssetGroupResolutionOptions | AssetGroupSnapshot
): Asset {
  const groupIds = resolveAssetGroupIdsForAsset(base.id, options)
  const primaryGroupId = groupIds[0] ?? base.groupId
  const assetLabelOverrides =
    options != null && "assetLabelOverrides" in options
      ? options.assetLabelOverrides
      : (options as AssetGroupResolutionOptions | undefined)?.assetLabelOverrides
  const name = assetLabelOverrides?.[base.id] ??
    (typeof window !== "undefined" ? readAssetDisplayLabels()[base.id] : undefined) ??
    base.name
  if (
    primaryGroupId === base.groupId &&
    groupIds.length === 1 &&
    groupIds[0] === base.groupId &&
    name === base.name
  ) {
    return { ...base, groupIds }
  }
  const customGroups =
    options != null && "customGroups" in options
      ? options.customGroups
      : (options as AssetGroupResolutionOptions | undefined)?.customGroups
  return {
    ...base,
    name,
    groupId: primaryGroupId,
    groupIds,
    groupLabel: resolveAssetGroupLabel(primaryGroupId, customGroups),
  }
}

export function getAssetById(
  id: string,
  options?: AssetGroupResolutionOptions | AssetGroupSnapshot
): Asset | undefined {
  const base = ASSETS.find((a) => a.id === id)
  if (!base) return undefined
  if (options != null || typeof window !== "undefined") {
    return assetWithResolvedGroups(base, options)
  }
  return { ...base, groupIds: [base.groupId] }
}

export function formatPortfolioGroupMembershipLabel(
  groupIds: readonly string[],
  labels: Record<string, string>
): string {
  if (groupIds.length === 0) return ""
  const names = groupIds.map((id) => labels[id] ?? id)
  if (names.length === 1) return names[0]
  return `${names[0]} +${names.length - 1}`
}

export function assetHref(id: string): string {
  return `/properties/${id}/stacking-plan`
}

export function assetForecastHref(id: string): string {
  return `/properties/${id}/forecasts`
}

export function portfolioScopeSlug(scopeId: string): string {
  if (
    scopeId === "office" ||
    scopeId === "industrial" ||
    scopeId === "retail"
  ) {
    return SEEDED_PORTFOLIO_SCOPE_SLUGS[scopeId]
  }
  return scopeId
}

export function portfolioScopeIdFromRouteParam(scopeParam: string): string {
  const decoded = decodeURIComponent(scopeParam)
  return SEEDED_PORTFOLIO_SCOPE_IDS_BY_SLUG[decoded] ?? decoded
}

export function portfolioScopeHref(scopeId: string): string {
  return `/portfolio/scopes/${encodeURIComponent(portfolioScopeSlug(scopeId))}`
}

/** Description line under a scoped portfolio title (headers). Overview uses a count subtitle in the page header instead. */
export function resolvePortfolioScopeDescription(
  portfolioScopeId: string | null,
  customGroupDescriptions: Record<string, string>,
  fundDescriptionOverrides?: Record<string, string>
): string | null {
  if (portfolioScopeId == null) return null
  if (
    portfolioScopeId === "office" ||
    portfolioScopeId === "industrial" ||
    portfolioScopeId === "retail"
  ) {
    const base = ASSET_GROUP_DESCRIPTIONS[portfolioScopeId]
    const ov = fundDescriptionOverrides?.[portfolioScopeId]?.trim()
    if (ov != null && ov.length > 0) return ov.slice(0, 600)
    return base ?? null
  }
  const custom = customGroupDescriptions[portfolioScopeId]?.trim()
  return custom ? custom : null
}
