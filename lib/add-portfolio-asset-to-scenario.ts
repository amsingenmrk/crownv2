import { includeAssetsInScenarioBySlug } from "@/lib/scenario-excluded-assets-storage"
import { addAssetsToScenarioIncludedBySlug } from "@/lib/scenario-included-assets-storage"
import { BUILTIN_SCENARIO } from "@/lib/user-scenarios"

/**
 * Adds portfolio assets to a scenario from ad-hoc UI.
 * Built-in scenario: clears exclusions first, then merges into the inclusion overlay.
 */
export function addPortfolioAssetsToScenarioBySlug(
  slug: string,
  assetIds: readonly string[]
): void {
  if (assetIds.length === 0) return
  if (slug === BUILTIN_SCENARIO.slug) {
    includeAssetsInScenarioBySlug(slug, assetIds)
  }
  addAssetsToScenarioIncludedBySlug(slug, assetIds)
}

/**
 * Adds a portfolio asset to a scenario from ad-hoc UI (e.g. search cards).
 * Built-in scenario: clears exclusion if present, then merges into inclusion overlay.
 */
export function addPortfolioAssetToScenarioBySlug(
  slug: string,
  assetId: string
): void {
  addPortfolioAssetsToScenarioBySlug(slug, [assetId])
}
