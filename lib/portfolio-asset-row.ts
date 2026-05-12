import type { ModificationRecommendation } from "@/lib/modification-recommendations"

export type PortfolioAssetRow = {
  id: string
  groupId: string
  building: string
  location: string
  /** Owned vs market listing label (e.g. dashboard export). */
  ownership: string
  typeLabel: string
  classLabel: string
  rsf: string
  occPct: string
  pricePerSf: string
  revenue: string
  opex: string
  noi: string
  value: string
  capRate: string
  wale: string
  status: string
  lift: string
  liftPercent: number
  recommendedModification: ModificationRecommendation | null
}
