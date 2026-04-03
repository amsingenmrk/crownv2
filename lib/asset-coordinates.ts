/**
 * Approximate [longitude, latitude] for demo assets (matches `slugify(asset.name)` ids in `lib/assets.ts`).
 */
export const ASSET_LNG_LAT: Record<string, readonly [number, number]> = {
  "one-vanderbilt": [-73.9787, 40.753],
  "empire-state-building": [-73.9857, 40.7484],
  "425-park-avenue": [-73.972, 40.7614],
  "50-hudson-yards": [-74.0023, 40.7536],
  "metlife-building": [-73.9777, 40.7532],
  "280-park-avenue": [-73.9793, 40.7553],
  "willis-tower": [-87.6354, 41.8789],
  "salesforce-tower": [-122.3965, 37.7899],
  "denver-logistics-center": [-104.9903, 39.7392],
  "phoenix-distribution-park": [-112.074, 33.4484],
  "nashville-cold-storage": [-86.7816, 36.1627],
  "charlotte-last-mile-hub": [-80.8431, 35.2271],
  "3001-3003-washington-blvd": [-76.6122, 39.2645],
  "200-clarendon": [-71.0755, 42.3499],
  "miami-design-district": [-80.1918, 25.813],
  "austin-domain-northside": [-97.7175, 30.4022],
  "seattle-university-village": [-122.32, 47.6614],
  "boston-newbury-street": [-71.0837, 42.3505],
}

export function lngLatForAssetId(id: string): readonly [number, number] | undefined {
  return ASSET_LNG_LAT[id]
}
