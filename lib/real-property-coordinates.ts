/**
 * Verified lng/lat for real portfolio and other-assets buildings.
 * Used when Mapbox geocoding is unavailable or has not returned a result yet.
 */
export const REAL_PROPERTY_COORDINATES: Record<
  string,
  readonly [number, number]
> = {
  "340-mt-kemble": [-74.492_532_6, 40.785_565_4],
  "1700-east-putnam": [-73.568_556_6, 41.046_037_7],
  "mack-centre-iv": [-74.086_838_6, 40.922_553_7],
  "1-deforest-avenue": [-74.357_117, 40.719_273],
  "25-deforest-avenue": [-74.358_075, 40.719_286],
  "200-greenwich-avenue": [-73.626_524, 41.027_401],
}

export function realPropertyLngLat(
  assetId: string
): readonly [number, number] | undefined {
  return REAL_PROPERTY_COORDINATES[assetId]
}
