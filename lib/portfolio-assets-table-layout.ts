/**
 * Desktop grid track per column id (lg table). Used with TanStack visible leaf order.
 */
export const PORTFOLIO_ASSETS_COLUMN_GRID_TRACK: Record<string, string> = {
  select: "minmax(2rem, 2rem)",
  building: "minmax(10rem, max-content)",
  scope: "minmax(9rem, max-content)",
  competitiveScope: "minmax(9rem, max-content)",
  occPct: "auto",
  wale: "auto",
  pricePerSf: "auto",
  revenue: "auto",
  opex: "auto",
  noi: "auto",
  value: "auto",
  capRate: "auto",
  lift: "minmax(5.5rem, max-content)",
  modifications: "minmax(9rem, max-content)",
  outlook: "minmax(9rem, max-content)",
  assetListingKind: "minmax(6.75rem, max-content)",
  /** Sticky trash column: scenarios, portfolio, and Other Assets variants */
  scenarioRemove: "minmax(2.75rem, 3rem)",
  portfolioRemove: "minmax(2.75rem, 3rem)",
  competitiveRemove: "minmax(2.75rem, 3rem)",
}
