import { NextResponse } from "next/server"
import { unstable_cache } from "next/cache"

import {
  geocodePortfolioAssets,
  mapboxTokenForGeocoding,
} from "@/lib/mapbox-geocode"

const getCachedPortfolioCoordinates = unstable_cache(
  async () => {
    const token = mapboxTokenForGeocoding()
    if (!token) {
      throw new Error("Missing Mapbox access token for geocoding")
    }
    return geocodePortfolioAssets(token)
  },
  ["portfolio-asset-coordinates-geocode"],
  { revalidate: 86_400 }
)

export async function GET() {
  if (!mapboxTokenForGeocoding()) {
    return NextResponse.json(
      {
        error:
          "Missing Mapbox token. Set MAPBOX_ACCESS_TOKEN or NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN.",
      },
      { status: 503 }
    )
  }

  try {
    const coordinates = await getCachedPortfolioCoordinates()
    return NextResponse.json({ coordinates })
  } catch {
    return NextResponse.json(
      { error: "Geocoding failed. Check the token and Mapbox API status." },
      { status: 502 }
    )
  }
}
