import { includeAssetsInScenarioBySlug } from "@/lib/scenario-excluded-assets-storage"
import { addAssetsToScenarioIncludedBySlug } from "@/lib/scenario-included-assets-storage"
import { BUILTIN_SCENARIO } from "@/lib/user-scenarios"

/**
 * Adds a portfolio asset to a scenario from ad-hoc UI (e.g. search cards).
 * Built-in scenario: clears exclusion if present, then merges into inclusion overlay (same as toolbar intent).
 */
export function addPortfolioAssetToScenarioBySlug(
  slug: string,
  assetId: string
): void {
  if (slug === BUILTIN_SCENARIO.slug) {
    includeAssetsInScenarioBySlug(slug, [assetId])
  }
  addAssetsToScenarioIncludedBySlug(slug, [assetId])
}
