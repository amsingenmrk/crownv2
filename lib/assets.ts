/**
 * Demo assets for sidebar navigation and asset detail pages.
 */

import {
  readAssetGroupOverrides,
  readCustomAssetGroups,
  readFundDisplayLabels,
} from "@/lib/asset-group-overrides"

const BUILDING_IMAGES = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1516344301847-92e6c9ff876f?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1594230381576-0a45731e0e2e?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1576723658630-86ee5118f257?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop",
] as const

/** Historical built-in portfolio scope ids. They map to Fund I/II/III, not sectors. */
export type AssetGroupId = "office" | "industrial" | "retail"

export const OFFICE_SECTOR_LABEL = "Office"

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

export const PORTFOLIO_OVERVIEW_LABEL = "Entire portfolio"

/** Labels used in the sidebar asset groups and portfolio group filter. */
export const ASSET_GROUP_SIDEBAR_LABELS: Record<AssetGroupId, string> = {
  office: "Fund I",
  industrial: "Fund II",
  retail: "Fund III",
}

/** Default subtitles for built-in fund scopes (Fund I–III). */
export const ASSET_GROUP_DESCRIPTIONS: Record<AssetGroupId, string> = {
  office: "Core gateway office with trophy concentration in New York and Boston.",
  industrial: "Diversified value-add office in growth CBD and Sun Belt markets.",
  retail: "Lease-up and opportunistic office in coastal innovation corridors.",
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

const FUND_I_RAW: Omit<Asset, "imageUrl" | "id">[] = [
  {
    name: "One Vanderbilt",
    groupId: "office",
    groupLabel: "Fund I",
    address: "1 Vanderbilt Ave, New York, NY 10017",
    occupiedPercent: 91,
  },
  {
    name: "425 Park Avenue",
    groupId: "office",
    groupLabel: "Fund I",
    address: "425 Park Ave, New York, NY 10022",
    occupiedPercent: 86,
  },
  {
    name: "Two Manhattan West",
    groupId: "office",
    groupLabel: "Fund I",
    address: "385 9th Ave, New York, NY 10001",
    occupiedPercent: 84,
  },
  {
    name: "200 Park Avenue",
    groupId: "office",
    groupLabel: "Fund I",
    address: "200 Park Ave, New York, NY 10166",
    occupiedPercent: 88,
  },
  {
    name: "550 Madison Avenue",
    groupId: "office",
    groupLabel: "Fund I",
    address: "550 Madison Ave, New York, NY 10022",
    occupiedPercent: 79,
  },
  {
    name: "200 Clarendon",
    groupId: "office",
    groupLabel: "Fund I",
    address: "200 Clarendon St, Boston, MA 02116",
    occupiedPercent: 82,
  },
]

const FUND_II_RAW: Omit<Asset, "imageUrl" | "id">[] = [
  {
    name: "Bank of America Plaza",
    groupId: "industrial",
    groupLabel: "Fund II",
    address: "600 Peachtree St NE, Atlanta, GA 30308",
    occupiedPercent: 78,
  },
  {
    name: "Trammell Crow Center",
    groupId: "industrial",
    groupLabel: "Fund II",
    address: "2001 Ross Ave, Dallas, TX 75201",
    occupiedPercent: 74,
  },
  {
    name: "Frost Bank Tower",
    groupId: "industrial",
    groupLabel: "Fund II",
    address: "401 Congress Ave, Austin, TX 78701",
    occupiedPercent: 76,
  },
  {
    name: "Ally Charlotte Center",
    groupId: "industrial",
    groupLabel: "Fund II",
    address: "550 S Tryon St, Charlotte, NC 28202",
    occupiedPercent: 81,
  },
  {
    name: "Denver Place",
    groupId: "industrial",
    groupLabel: "Fund II",
    address: "999 18th St, Denver, CO 80202",
    occupiedPercent: 73,
  },
  {
    name: "Fifth Third Center",
    groupId: "industrial",
    groupLabel: "Fund II",
    address: "424 Church St, Nashville, TN 37219",
    occupiedPercent: 77,
  },
]

const FUND_III_RAW: Omit<Asset, "imageUrl" | "id">[] = [
  {
    name: "Brickell City Tower",
    groupId: "retail",
    groupLabel: "Fund III",
    address: "80 SW 8th St, Miami, FL 33130",
    occupiedPercent: 72,
  },
  {
    name: "Bellevue City Center",
    groupId: "retail",
    groupLabel: "Fund III",
    address: "500 108th Ave NE, Bellevue, WA 98004",
    occupiedPercent: 69,
  },
  {
    name: "Mission Bay Center",
    groupId: "retail",
    groupLabel: "Fund III",
    address: "1100 4th St, San Francisco, CA 94158",
    occupiedPercent: 71,
  },
  {
    name: "Culver Creative Offices",
    groupId: "retail",
    groupLabel: "Fund III",
    address: "10000 Washington Blvd, Culver City, CA 90232",
    occupiedPercent: 67,
  },
  {
    name: "Kendall Square Center",
    groupId: "retail",
    groupLabel: "Fund III",
    address: "245 Main St, Cambridge, MA 02142",
    occupiedPercent: 75,
  },
  {
    name: "Santa Monica Business Park",
    groupId: "retail",
    groupLabel: "Fund III",
    address: "2500 Colorado Ave, Santa Monica, CA 90404",
    occupiedPercent: 68,
  },
]

function buildList(raw: Omit<Asset, "imageUrl" | "id">[], offset: number): Asset[] {
  return raw.map((a, i) => withImage(a, offset + i))
}

export const ASSETS: Asset[] = [
  ...buildList(FUND_I_RAW, 0),
  ...buildList(FUND_II_RAW, 6),
  ...buildList(FUND_III_RAW, 12),
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
