import type { AssetGroupId } from "@/lib/assets"

export type PortfolioAssetRow = {
  id: string
  groupId: AssetGroupId
  building: string
  location: string
  /** Display label for the Ownership column (e.g. badge text). */
  ownership: string
  typeLabel: string
  rsf: string
  occPct: string
  pricePerSf: string
  noi: string
  value: string
  capRate: string
  wale: string
  status: string
  lift: string
  liftPercent: number
  recommendation: string
}
