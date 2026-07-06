/**
 * Other Assets (prospective) buildings loaded from exported baseline + modification JSON.
 *
 * Drop paired `*.baseline.json` and `*.modifications.json` files into `./data/`, then
 * register each building in `registry.ts`.
 */
import type { Asset } from "@/lib/assets"
import type { RealPropertyDef } from "@/lib/real-properties/property-def"

import {
  OTHER_REAL_ASSET_IDS,
  OTHER_REAL_PROPERTY_DEFS,
  type OtherRealPropertyDef,
} from "./registry"

export type { OtherRealPropertyDef } from "./registry"
export { OTHER_REAL_ASSET_IDS, OTHER_REAL_PROPERTY_DEFS }

const COMPETITIVE_GROUP_LABELS: Record<string, string> = {
  "comp-fund-i": "Gateway Core Peers",
  "comp-fund-ii": "Growth Value-Add Peers",
  "comp-fund-iii": "Opportunistic Lease-Up Peers",
}

const OTHER_BUILDING_IMAGES = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1582407947304-fd86fe028716?w=400&h=300&fit=crop",
] as const

const DEFAULT_COMPETITIVE_GROUP_IDS = [
  "comp-fund-i",
  "comp-fund-ii",
  "comp-fund-iii",
] as const

const OTHER_DEFS_BY_ID = new Map(
  OTHER_REAL_PROPERTY_DEFS.map((def) => [def.id, def])
)

export function isOtherRealAssetId(assetId: string): boolean {
  return OTHER_DEFS_BY_ID.has(assetId)
}

export function getOtherRealAssetById(assetId: string): Asset | undefined {
  const def = OTHER_DEFS_BY_ID.get(assetId)
  if (def == null) return undefined
  return otherRealAssetFromDef(def)
}

export function otherRealAssetList(): Asset[] {
  return OTHER_REAL_PROPERTY_DEFS.map(otherRealAssetFromDef)
}

/** Property defs for stacking plan / financial loaders (without competitive metadata). */
export function otherRealPropertyDefs(): RealPropertyDef[] {
  return OTHER_REAL_PROPERTY_DEFS
}

function otherRealAssetFromDef(def: OtherRealPropertyDef): Asset {
  return {
    id: def.id,
    name: def.name,
    groupId: def.competitiveGroupId,
    groupIds: [def.competitiveGroupId],
    groupLabel:
      COMPETITIVE_GROUP_LABELS[def.competitiveGroupId] ?? def.competitiveGroupId,
    address: def.address,
    imageUrl: def.imageUrl,
    occupiedPercent: Math.round(def.baseline.metrics?.occupied_pct ?? 100),
  }
}

export { DEFAULT_COMPETITIVE_GROUP_IDS, OTHER_BUILDING_IMAGES }
