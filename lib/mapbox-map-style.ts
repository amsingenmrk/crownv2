/**
 * Mapbox GL style URLs. Override with NEXT_PUBLIC_MAPBOX_STYLE_URL (your Mapbox Studio style).
 *
 * Presets (no Studio required):
 * - mapbox://styles/mapbox/streets-v12
 * - mapbox://styles/mapbox/light-v11
 * - mapbox://styles/mapbox/dark-v11
 * - mapbox://styles/mapbox/outdoors-v12
 * - mapbox://styles/mapbox/satellite-streets-v12
 *
 * @see https://docs.mapbox.com/api/maps/styles/
 * @see https://studio.mapbox.com/
 */
export const MAPBOX_STYLE_LIGHT = "mapbox://styles/mapbox/light-v11"
export const MAPBOX_STYLE_DARK = "mapbox://styles/mapbox/dark-v11"

export function resolveMapboxMapStyle(
  resolvedTheme: string | undefined
): string {
  const custom = process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL?.trim()
  if (custom) return custom
  return resolvedTheme === "dark" ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT
}
