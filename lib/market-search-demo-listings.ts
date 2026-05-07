/**
 * Synthetic market listings for /search (broader market vs portfolio).
 * Coordinates are deterministic demo data, not live inventory.
 */

import type { PortfolioMapboxPin } from "@/components/portfolio-mapbox"
import { normalizedLiftStrength } from "@/lib/portfolio-lift"

const DEMO_BUILDING_IMAGES = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1516344301847-92e6c9ff876f?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1594230381576-0a45731e0e2e?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1576723658630-86ee5118f257?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop",
] as const

const METROS = [
  { lng: -73.985_7, lat: 40.748_4, span: 0.085 },
  { lng: -87.629_8, lat: 41.878_1, span: 0.1 },
  { lng: -118.243_7, lat: 34.052_2, span: 0.12 },
  { lng: -104.990_3, lat: 39.739_2, span: 0.095 },
  { lng: -122.332_1, lat: 47.606_2, span: 0.075 },
  { lng: -96.797, lat: 32.776_7, span: 0.11 },
  { lng: -84.388, lat: 33.749, span: 0.1 },
  { lng: -80.191_8, lat: 25.761_7, span: 0.09 },
  { lng: -122.419_4, lat: 37.774_9, span: 0.08 },
  { lng: -71.058_9, lat: 42.360_1, span: 0.07 },
] as const

const MARKET_BUILDINGS: readonly string[] = [
  "Hudson Yards Tower D",
  "River North Commerce Center",
  "Arts District Creative Lofts",
  "LoDo Class A Office",
  "South Lake Union Tech Hub",
  "Deep Ellum Mixed-Use",
  "Midtown Financial Center",
  "Brickell Bay Plaza",
  "Mission Bay Lab Campus",
  "Seaport Innovation Hall",
  "Chelsea Market Annex",
  "Loop East Tower",
  "Santa Monica Boulevard Plaza",
  "Cherry Creek Medical Office",
  "Bellevue 405 Corridor",
  "Plano Legacy West",
  "Buckhead Office Park",
  "Wynwood Warehouse Row",
  "SOMA Transit Plaza",
  "Cambridge Kendall Square",
  "Tribeca Residential Tower",
  "West Loop Logistics Hub",
  "Pasadena Colorado Blvd Retail",
  "Denver Tech Center East",
  "Redmond Overlake Campus",
  "Frisco Star District",
  "Perimeter Center South",
  "Coral Gables Miracle Mile",
  "Potrero Hill Studios",
  "Back Bay Retail Podium",
  "Financial District Annex",
  "Lincoln Park Infill",
  "Burbank Media Campus",
  "Golden Triangle Medical",
  "Capitol Hill Creative Office",
  "Uptown Dallas Tower",
  "Alpharetta Northwinds",
  "Doral Commerce Park",
  "Dogpatch Light Industrial",
  "Fort Point Lab Conversion",
  "Murray Hill Office Condo",
  "Fulton Market Cold Storage",
  "Long Beach Harbor Lofts",
  "Boulder Flatiron Campus",
  "Tacoma Dome District",
  "Richardson Telecom Corridor",
  "Sandy Springs Office",
  "Aventura Corporate Center",
  "Hayes Valley Boutique Office",
  "Waterfront Innovation Pier",
  "Williamsburg North Tower",
  "Oak Brook Corporate Woods",
  "Glendale Central Avenue",
  "Fort Collins Harmony",
  "Everett Industrial Way",
  "Las Colinas Urban Center",
  "Brookhaven Peachtree Row",
  "Downtown West Palm Hub",
]

/** Stable hash for demo data (exported for market listing table rows / scenario aggregates). */
export function marketSearchDemoHash32(s: string): number {
  let h = 2_166_136_261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16_777_619)
  }
  return h >>> 0
}

function u01(seed: string): number {
  return marketSearchDemoHash32(seed) / 0xffff_ffff
}

/** Default synthetic market listings on /search (map + sidebar use the same count). */
export const MARKET_SEARCH_LISTING_COUNT = 56

export function marketSearchDemoPinsBase(
  count: number = MARKET_SEARCH_LISTING_COUNT
): PortfolioMapboxPin[] {
  const n = Math.max(0, Math.floor(count))
  if (n === 0) return []

  const liftPcts = Array.from({ length: n }, (_, i) => {
    return 2 + (marketSearchDemoHash32(`mkt-lift:${i}`) % 17)
  })
  const minLift = Math.min(...liftPcts)
  const maxLift = Math.max(...liftPcts)

  return Array.from({ length: n }, (_, i) => {
    const metro = METROS[i % METROS.length]!
    const uLng = u01(`mkt:${i}:lng`)
    const uLat = u01(`mkt:${i}:lat`)
    const longitude =
      metro.lng + (uLng - 0.5) * metro.span * 2 * 1.1
    const latitude =
      metro.lat + (uLat - 0.5) * metro.span * 2 * 0.95

    const liftPct = liftPcts[i]!
    const liftStrength = normalizedLiftStrength(liftPct, minLift, maxLift)

    const name =
      MARKET_BUILDINGS[i] ?? `Market opportunity ${i + 1}`
    const cityLine = [
      "New York, NY",
      "Chicago, IL",
      "Los Angeles, CA",
      "Denver, CO",
      "Seattle, WA",
      "Dallas, TX",
      "Atlanta, GA",
      "Miami, FL",
      "San Francisco, CA",
      "Boston, MA",
    ][i % 10]!

    return {
      id: `mkt-${i}`,
      longitude,
      latitude,
      building: name,
      lift: `+${liftPct}%`,
      liftPercent: liftPct,
      liftStrength,
      listingScope: "market",
      assetDetailHref: `/assets/${encodeURIComponent(`mkt-${i}`)}/stacking-plan`,
      imageUrl: DEMO_BUILDING_IMAGES[i % DEMO_BUILDING_IMAGES.length],
      location: `${Math.floor(100 + u01(`mkt:${i}:addr`) * 900)} Main St · ${cityLine}`,
    }
  })
}

const MKT_ID_RE = /^mkt-(\d+)$/

/** True when `id` matches synthetic market listing pins from {@link marketSearchDemoPinsBase}. */
export function isMarketListingPinId(id: string): boolean {
  return MKT_ID_RE.test(id)
}

/** Resolves a market listing pin by id, or `null` if unknown / out of range. */
export function getMarketListingPinById(id: string): PortfolioMapboxPin | null {
  const m = MKT_ID_RE.exec(id)
  if (!m) return null
  const i = Number(m[1])
  if (!Number.isInteger(i) || i < 0) return null
  const pins = marketSearchDemoPinsBase(MARKET_SEARCH_LISTING_COUNT)
  return pins[i] ?? null
}
