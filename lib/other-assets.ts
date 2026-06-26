/**
 * Single entry point for the "Other Assets" domain — the non-portfolio
 * (competitive-set / market-listing) buildings shown alongside owned assets.
 *
 * This is a consolidation (barrel) module: it gives Other Assets one import
 * surface and a readable vocabulary without changing any underlying data or
 * behavior. The records still come from the demo listing source, and the
 * dual-lookup branching against portfolio assets (getAssetById ??
 * getMarketListingPinById) is intentionally left in place.
 *
 * When Other Assets is wired to a real data source, this module is the
 * natural seam to repoint — callers that import from here won't need to change.
 */

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
  /** Adapts an Other Asset record into the shared PortfolioAssetRow display shape. */
  portfolioAssetRowForMarketPin,
} from "@/lib/market-listing-portfolio-row"

export type { PortfolioMapboxPin } from "@/components/portfolio-mapbox"
/** Readable alias for the Other Asset record type (currently `PortfolioMapboxPin`). */
export type { PortfolioMapboxPin as OtherAsset } from "@/components/portfolio-mapbox"
