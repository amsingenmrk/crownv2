import "server-only"

import { ASSETS } from "@/lib/assets"

type GeocodeFeature = {
  center?: [number, number]
}

type GeocodeResponse = {
  features?: GeocodeFeature[]
}

/**
 * Forward-geocode a single address via Mapbox Geocoding API.
 * @see https://docs.mapbox.com/api/search/geocoding/
 */
export async function geocodeAddress(
  address: string,
  accessToken: string
): Promise<[number, number] | null> {
  const path = encodeURIComponent(address.trim())
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${path}.json`
  )
  url.searchParams.set("access_token", accessToken)
  url.searchParams.set("limit", "1")

  let res: Response
  try {
    res = await fetch(url.toString(), { cache: "no-store" })
  } catch {
    return null
  }
  if (!res.ok) return null

  let data: GeocodeResponse
  try {
    data = (await res.json()) as GeocodeResponse
  } catch {
    return null
  }
  const c = data.features?.[0]?.center
  if (!c || typeof c[0] !== "number" || typeof c[1] !== "number") return null
  return [c[0], c[1]]
}

/**
 * Geocode every portfolio asset by address. Runs sequentially to stay under light rate limits.
 */
export async function geocodePortfolioAssets(
  accessToken: string
): Promise<Record<string, [number, number]>> {
  const out: Record<string, [number, number]> = {}
  for (const asset of ASSETS) {
    const ll = await geocodeAddress(asset.address, accessToken)
    if (ll) out[asset.id] = ll
    await new Promise((r) => setTimeout(r, 75))
  }
  return out
}

export function mapboxTokenForGeocoding(): string | undefined {
  return (
    process.env.MAPBOX_ACCESS_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ||
    undefined
  )
}
