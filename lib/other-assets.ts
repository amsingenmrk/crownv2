/**
 * Single entry point for the "Other Assets" domain — prospective buildings
 * backed by exported JSON in `lib/real-properties/other-assets/data`.
 *
 * Synthetic market listings (`mkt-…` ids) remain available for property search
 * and benchmarks, but the Other Assets UI only surfaces JSON-backed buildings.
 */

import { getAssetById, type Asset } from "@/lib/assets"
import type { parseAssetGroupOverrideSnapshot } from "@/lib/asset-group-overrides"
import { getOtherRealAssetById } from "@/lib/real-properties/other-assets"

export {
  /** Default number of synthetic market listings generated for the demo. */
  MARKET_SEARCH_LISTING_COUNT,
  /** Generates the base set of Other Asset (market listing) records. */
  marketSearchDemoPinsBase,
  /** True when an id belongs to an Other Asset (`mkt-…`) rather than a portfolio asset. */
  isMarketListingPinId,
  /** Resolves a single Other Asset by id, or null if the id isn't a market listing. */
  getMarketListingPinById,
} from "@/lib/market-search-demo-listings"

export {
  getOtherRealAssetById,
  isOtherRealAssetId,
  otherRealAssetList,
  OTHER_REAL_ASSET_IDS,
} from "@/lib/real-properties/other-assets"

export {
  otherRealAssetPortfolioRows,
  scopedOtherRealAssets,
} from "@/lib/real-properties/other-assets/portfolio-rows"

export {
  /** Adapts an Other Asset record into the shared PortfolioAssetRow display shape. */
  portfolioAssetRowForMarketPin,
} from "@/lib/market-listing-portfolio-row"

export type { PortfolioMapboxPin } from "@/components/portfolio-mapbox"
/** Readable alias for the Other Asset record type (currently `PortfolioMapboxPin`). */
export type { PortfolioMapboxPin as OtherAsset } from "@/components/portfolio-mapbox"

type AssetGroupSnapshot = ReturnType<typeof parseAssetGroupOverrideSnapshot>

/** Owned portfolio asset or JSON-backed Other Asset, when either applies. */
export function resolveAssetById(
  id: string,
  options?: AssetGroupSnapshot
): Asset | undefined {
  return getAssetById(id, options) ?? getOtherRealAssetById(id)
}
