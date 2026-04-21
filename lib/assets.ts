/**
 * Demo assets for sidebar navigation and asset detail pages.
 */

import {
  readAssetGroupOverrides,
  readCustomAssetGroups,
} from "@/lib/asset-group-overrides"

const BUILDING_IMAGES = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1516344301847-92e6c9ff876f?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1594230381576-0a45731e0e2e?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1576723658630-86ee5118f257?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop",
] as const

export type AssetGroupId = "office" | "industrial" | "retail"

export const BUILT_IN_ASSET_GROUP_IDS: readonly AssetGroupId[] = [
  "office",
  "industrial",
  "retail",
]

const BUILT_IN_PORTFOLIO_SCOPE_SLUGS: Record<AssetGroupId, string> = {
  office: "fund-i",
  industrial: "fund-ii",
  retail: "fund-iii",
}

const BUILT_IN_PORTFOLIO_SCOPE_IDS_BY_SLUG: Record<string, AssetGroupId> = {
  "fund-i": "office",
  "fund-ii": "industrial",
  "fund-iii": "retail",
  // Preserve legacy scope URLs in case any old links still exist.
  office: "office",
  industrial: "industrial",
  retail: "retail",
}

export const PORTFOLIO_OVERVIEW_LABEL = "Portfolio overview"

/** Labels used in the sidebar asset groups and portfolio group filter. */
export const ASSET_GROUP_SIDEBAR_LABELS: Record<AssetGroupId, string> = {
  office: "Fund I",
  industrial: "Fund II",
  retail: "Fund III",
}

export interface Asset {
  id: string
  name: string
  groupId: string
  groupLabel: string
  address: string
  imageUrl: string
  /** 0–100 */
  occupiedPercent: number
}

type AssetGroupResolutionOptions = {
  overrides?: Record<string, string>
  customGroups?: Record<string, string>
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

function withImage(asset: Omit<Asset, "imageUrl" | "id">, index: number): Asset {
  return {
    ...asset,
    id: slugify(asset.name),
    imageUrl: BUILDING_IMAGES[index % BUILDING_IMAGES.length]!,
  }
}

const OFFICE_RAW: Omit<Asset, "imageUrl" | "id">[] = [
  {
    name: "One Vanderbilt",
    groupId: "office",
    groupLabel: "Fund I",
    address: "1 Vanderbilt Ave, New York, NY 10017",
    occupiedPercent: 78,
  },
  {
    name: "Empire State Building",
    groupId: "office",
    groupLabel: "Fund I",
    address: "350 5th Ave, New York, NY 10118",
    occupiedPercent: 82,
  },
  {
    name: "425 Park Avenue",
    groupId: "office",
    groupLabel: "Fund I",
    address: "425 Park Ave, New York, NY 10022",
    occupiedPercent: 71,
  },
  {
    name: "50 Hudson Yards",
    groupId: "office",
    groupLabel: "Fund I",
    address: "50 Hudson Yards, New York, NY 10001",
    occupiedPercent: 88,
  },
  {
    name: "MetLife Building",
    groupId: "office",
    groupLabel: "Fund I",
    address: "200 Park Ave, New York, NY 10166",
    occupiedPercent: 76,
  },
  {
    name: "280 Park Avenue",
    groupId: "office",
    groupLabel: "Fund I",
    address: "280 Park Ave, New York, NY 10017",
    occupiedPercent: 69,
  },
]

const INDUSTRIAL_RAW: Omit<Asset, "imageUrl" | "id">[] = [
  {
    name: "Willis Tower",
    groupId: "industrial",
    groupLabel: "Fund II",
    address: "233 S Wacker Dr, Chicago, IL 60606",
    occupiedPercent: 74,
  },
  {
    name: "Salesforce Tower",
    groupId: "industrial",
    groupLabel: "Fund II",
    address: "415 Mission St, San Francisco, CA 94105",
    occupiedPercent: 91,
  },
  {
    name: "Denver Logistics Center",
    groupId: "industrial",
    groupLabel: "Fund II",
    address: "Denver, CO 80239",
    occupiedPercent: 95,
  },
  {
    name: "Phoenix Distribution Park",
    groupId: "industrial",
    groupLabel: "Fund II",
    address: "Phoenix, AZ 85043",
    occupiedPercent: 88,
  },
  {
    name: "Nashville Cold Storage",
    groupId: "industrial",
    groupLabel: "Fund II",
    address: "Nashville, TN 37209",
    occupiedPercent: 92,
  },
  {
    name: "Charlotte Last-Mile Hub",
    groupId: "industrial",
    groupLabel: "Fund II",
    address: "Charlotte, NC 28208",
    occupiedPercent: 86,
  },
]

const RETAIL_RAW: Omit<Asset, "imageUrl" | "id">[] = [
  {
    name: "3001-3003 Washington Blvd",
    groupId: "retail",
    groupLabel: "Fund III",
    address: "3001 Washington Blvd, Baltimore, MD 21230",
    occupiedPercent: 81,
  },
  {
    name: "200 Clarendon",
    groupId: "retail",
    groupLabel: "Fund III",
    address: "200 Clarendon St, Boston, MA 02116",
    occupiedPercent: 77,
  },
  {
    name: "Miami Design District",
    groupId: "retail",
    groupLabel: "Fund III",
    address: "Miami, FL 33137",
    occupiedPercent: 84,
  },
  {
    name: "Austin Domain Northside",
    groupId: "retail",
    groupLabel: "Fund III",
    address: "Austin, TX 78758",
    occupiedPercent: 79,
  },
  {
    name: "Seattle University Village",
    groupId: "retail",
    groupLabel: "Fund III",
    address: "Seattle, WA 98105",
    occupiedPercent: 73,
  },
  {
    name: "Boston Newbury Street",
    groupId: "retail",
    groupLabel: "Fund III",
    address: "Newbury St, Boston, MA 02116",
    occupiedPercent: 68,
  },
]

function buildList(raw: Omit<Asset, "imageUrl" | "id">[], offset: number): Asset[] {
  return raw.map((a, i) => withImage(a, offset + i))
}

export const ASSETS: Asset[] = [
  ...buildList(OFFICE_RAW, 0),
  ...buildList(INDUSTRIAL_RAW, 6),
  ...buildList(RETAIL_RAW, 12),
]

export function resolveAssetGroupLabel(
  groupId: string,
  customGroups?: Record<string, string>
): string {
  if (
    groupId === "office" ||
    groupId === "industrial" ||
    groupId === "retail"
  ) {
    return ASSET_GROUP_SIDEBAR_LABELS[groupId]
  }
  if (customGroups != null) return customGroups[groupId] ?? groupId
  if (typeof window === "undefined") return groupId
  return readCustomAssetGroups()[groupId] ?? groupId
}

export function getAssetById(
  id: string,
  options?: AssetGroupResolutionOptions
): Asset | undefined {
  const base = ASSETS.find((a) => a.id === id)
  if (!base) return undefined
  if (options != null) {
    const override = options.overrides?.[id]
    if (!override || override === base.groupId) return base
    return {
      ...base,
      groupId: override,
      groupLabel: resolveAssetGroupLabel(override, options.customGroups),
    }
  }
  if (typeof window === "undefined") return base
  const o = readAssetGroupOverrides()[id]
  if (!o || o === base.groupId) return base
  return {
    ...base,
    groupId: o,
    groupLabel: resolveAssetGroupLabel(o),
  }
}

export function assetHref(id: string): string {
  return `/assets/${id}/stacking-plan`
}

export function assetForecastHref(id: string): string {
  return `/assets/${id}/forecasts`
}

export function portfolioScopeSlug(scopeId: string): string {
  if (
    scopeId === "office" ||
    scopeId === "industrial" ||
    scopeId === "retail"
  ) {
    return BUILT_IN_PORTFOLIO_SCOPE_SLUGS[scopeId]
  }
  return scopeId
}

export function portfolioScopeIdFromRouteParam(scopeParam: string): string {
  const decoded = decodeURIComponent(scopeParam)
  return BUILT_IN_PORTFOLIO_SCOPE_IDS_BY_SLUG[decoded] ?? decoded
}

export function portfolioScopeHref(scopeId: string): string {
  return `/portfolio/scopes/${encodeURIComponent(portfolioScopeSlug(scopeId))}`
}
