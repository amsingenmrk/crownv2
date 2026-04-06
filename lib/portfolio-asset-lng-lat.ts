import type { AssetGroupId } from "@/lib/assets"

/** Regional centers for synthetic coordinates when geocoding misses an asset. */
const FALLBACK_REGION_CENTER: Record<AssetGroupId, readonly [number, number]> =
  {
    office: [-73.985_7, 40.748_4],
    industrial: [-87.629_8, 41.878_1],
    retail: [-118.243_7, 34.052_2],
  }

function fnv1a32(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x0100_0193)
  }
  return h >>> 0
}

/**
 * Stable lat/lng near the asset’s group region when Mapbox geocoding has no result.
 * Keeps one pin per portfolio row without stacking every missing asset on one point.
 */
export function fallbackLngLatForPortfolioAsset(
  assetId: string,
  groupId: AssetGroupId
): [number, number] {
  const [lng0, lat0] = FALLBACK_REGION_CENTER[groupId]
  const h = fnv1a32(assetId)
  const u1 = h / 0xffff_ffff
  const u2 = fnv1a32(`${assetId}:lat`) / 0xffff_ffff
  const angle = u1 * Math.PI * 2
  const radiusDeg = 0.006 + u2 * 0.055
  return [
    lng0 + radiusDeg * Math.cos(angle) * 1.15,
    lat0 + radiusDeg * Math.sin(angle) * 0.9,
  ]
}

export function lngLatForPortfolioAsset(
  assetId: string,
  groupId: AssetGroupId,
  geocoded: Record<string, readonly [number, number]>
): [number, number] {
  const g = geocoded[assetId]
  if (
    g &&
    typeof g[0] === "number" &&
    typeof g[1] === "number" &&
    Number.isFinite(g[0]) &&
    Number.isFinite(g[1])
  ) {
    return [g[0], g[1]]
  }
  return fallbackLngLatForPortfolioAsset(assetId, groupId)
}
