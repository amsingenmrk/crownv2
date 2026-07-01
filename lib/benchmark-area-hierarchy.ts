import {
  applyStoredBoundary,
  US_NATIONAL_BENCHMARK_AREA,
} from "@/lib/benchmark-market-boundaries"
import {
  curatedCountyAssignmentsForSubmarketId,
  curatedZipAssignmentsForCountyId,
} from "@/lib/benchmark-submarket-assignments"
import {
  curatedSubmarketSeedsForMarketId,
  hasCuratedSubmarketsForMarketId,
} from "@/lib/benchmark-submarket-catalog"
import type {
  BenchmarkArea,
  BenchmarkAreaBounds,
  BenchmarkAreaLevel,
} from "@/lib/benchmark-area-types"

type BenchmarkMarketPreset = BenchmarkArea & {
  geocodeQuery: string
}

const REGISTERED_AREAS = new Map<string, BenchmarkArea>()
const CHILDREN_CACHE = new Map<string, readonly BenchmarkArea[]>()

const BENCHMARK_AREA_LEVEL_ORDER: readonly BenchmarkAreaLevel[] = [
  "country",
  "market",
  "submarket",
  "msaState",
  "county",
  "zip",
]

const BENCHMARK_AREA_LEVEL_LABELS: Record<BenchmarkAreaLevel, string> = {
  country: "U.S.",
  regionalHub: "Region",
  state: "State",
  market: "Market",
  submarket: "Submarket",
  msaState: "MSA / State",
  county: "County",
  zip: "ZIP",
}

function registerArea(area: BenchmarkArea): BenchmarkArea {
  REGISTERED_AREAS.set(area.id, area)
  return area
}

function normalizeAliases(...values: Array<string | undefined>): string[] {
  return values
    .flatMap((value) => (value ? [value] : []))
    .map((value) => value.trim())
    .filter((value, index, array) => value.length > 0 && array.indexOf(value) === index)
}

export const BENCHMARK_ROOT_AREA: BenchmarkArea = registerArea({
  ...US_NATIONAL_BENCHMARK_AREA,
  level: "country",
  childLevel: "market",
  isCurated: true,
  aliases: ["us", "usa", "united states", "national", "country"],
})

const CURATED_MARKET_PRESETS: readonly BenchmarkMarketPreset[] = [
  {
    id: "market-los-angeles",
    label: "Los Angeles",
    geocodeQuery: "Los Angeles, CA",
    bounds: [
      [-118.95, 33.65],
      [-117.65, 34.35],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
    aliases: ["la"],
  },
  {
    id: "market-dc",
    label: "D.C.",
    geocodeQuery: "Washington, DC",
    bounds: [
      [-77.5, 38.75],
      [-76.8, 39.15],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
    aliases: ["dc", "washington dc", "washington d.c."],
  },
  {
    id: "market-phoenix",
    label: "Phoenix",
    geocodeQuery: "Phoenix, AZ",
    bounds: [
      [-112.45, 33.2],
      [-111.55, 33.85],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-seattle",
    label: "Seattle",
    geocodeQuery: "Seattle, WA",
    bounds: [
      [-122.55, 47.35],
      [-122.05, 47.85],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-philadelphia",
    label: "Philadelphia",
    geocodeQuery: "Philadelphia, PA",
    bounds: [
      [-75.45, 39.8],
      [-74.9, 40.2],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
    aliases: ["philly"],
  },
  {
    id: "market-new-jersey",
    label: "New Jersey",
    geocodeQuery: "New Jersey",
    bounds: [
      [-75.6, 38.9],
      [-73.9, 41.4],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
    aliases: ["nj"],
  },
  {
    id: "market-minneapolis-st-paul",
    label: "Minneapolis/St. Paul",
    geocodeQuery: "Minneapolis, MN",
    bounds: [
      [-93.55, 44.7],
      [-92.9, 45.25],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
    aliases: ["minneapolis", "st paul", "twin cities"],
  },
  {
    id: "market-chicago",
    label: "Chicago",
    geocodeQuery: "Chicago, IL",
    bounds: [
      [-88.15, 41.55],
      [-87.35, 42.15],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-houston",
    label: "Houston",
    geocodeQuery: "Houston, TX",
    bounds: [
      [-95.85, 29.45],
      [-95.0, 30.15],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-san-diego",
    label: "San Diego",
    geocodeQuery: "San Diego, CA",
    bounds: [
      [-117.35, 32.5],
      [-116.9, 33.15],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-utah",
    label: "Utah",
    geocodeQuery: "Utah",
    bounds: [
      [-114.2, 36.9],
      [-109.0, 42.1],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-portland",
    label: "Portland",
    geocodeQuery: "Portland, OR",
    bounds: [
      [-123.0, 45.3],
      [-122.4, 45.65],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-fort-lauderdale",
    label: "Fort Lauderdale",
    geocodeQuery: "Fort Lauderdale, FL",
    bounds: [
      [-80.4, 26.0],
      [-80.0, 26.35],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
    aliases: ["ft lauderdale"],
  },
  {
    id: "market-cincinnati",
    label: "Cincinnati",
    geocodeQuery: "Cincinnati, OH",
    bounds: [
      [-84.75, 39.0],
      [-84.35, 39.35],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-tampa-bay",
    label: "Tampa Bay",
    geocodeQuery: "Tampa, FL",
    bounds: [
      [-82.85, 27.7],
      [-82.2, 28.25],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
    aliases: ["tampa"],
  },
  {
    id: "market-miami",
    label: "Miami",
    geocodeQuery: "Miami, FL",
    bounds: [
      [-80.45, 25.55],
      [-80.05, 26.05],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-sacramento",
    label: "Sacramento",
    geocodeQuery: "Sacramento, CA",
    bounds: [
      [-121.65, 38.4],
      [-121.2, 38.75],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-charlotte",
    label: "Charlotte",
    geocodeQuery: "Charlotte, NC",
    bounds: [
      [-81.05, 35.05],
      [-80.6, 35.45],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-atlanta",
    label: "Atlanta",
    geocodeQuery: "Atlanta, GA",
    bounds: [
      [-84.65, 33.55],
      [-84.2, 33.95],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-dallas",
    label: "Dallas",
    geocodeQuery: "Dallas, TX",
    bounds: [
      [-97.05, 32.6],
      [-96.55, 33.05],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-austin",
    label: "Austin",
    geocodeQuery: "Austin, TX",
    bounds: [
      [-97.95, 30.05],
      [-97.55, 30.45],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-denver",
    label: "Denver",
    geocodeQuery: "Denver, CO",
    bounds: [
      [-105.2, 39.6],
      [-104.75, 39.9],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-nashville",
    label: "Nashville",
    geocodeQuery: "Nashville, TN",
    bounds: [
      [-86.95, 36.0],
      [-86.55, 36.3],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-san-francisco",
    label: "San Francisco",
    geocodeQuery: "San Francisco, CA",
    bounds: [
      [-122.55, 37.68],
      [-122.33, 37.84],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
    aliases: ["sf"],
  },
  {
    id: "market-san-jose",
    label: "San Jose",
    geocodeQuery: "San Jose, CA",
    bounds: [
      [-122.15, 37.2],
      [-121.7, 37.55],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-pittsburgh",
    label: "Pittsburgh",
    geocodeQuery: "Pittsburgh, PA",
    bounds: [
      [-80.25, 40.3],
      [-79.75, 40.65],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-cleveland",
    label: "Cleveland",
    geocodeQuery: "Cleveland, OH",
    bounds: [
      [-81.95, 41.3],
      [-81.45, 41.65],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-columbus",
    label: "Columbus",
    geocodeQuery: "Columbus, OH",
    bounds: [
      [-83.2, 39.85],
      [-82.8, 40.2],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
  },
  {
    id: "market-boston",
    label: "Boston",
    geocodeQuery: "Boston, MA",
    bounds: [
      [-71.2, 42.2],
      [-70.95, 42.45],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
    aliases: ["greater boston"],
  },
  {
    id: "market-new-york",
    label: "New York",
    geocodeQuery: "New York, NY",
    bounds: [
      [-74.45, 40.35],
      [-73.45, 41.05],
    ],
    level: "market",
    parentId: BENCHMARK_ROOT_AREA.id,
    isCurated: true,
    aliases: ["nyc", "new york city"],
  },
] as const

export const CURATED_BENCHMARK_MARKETS: readonly BenchmarkArea[] =
  CURATED_MARKET_PRESETS.map((preset) =>
    registerArea(
      applyStoredBoundary({
        ...preset,
        childLevel: hasCuratedSubmarketsForMarketId(preset.id)
          ? "submarket"
          : undefined,
        aliases: normalizeAliases(preset.label, ...(preset.aliases ?? [])),
      })
    )
  )

function boundsCenter(bounds: BenchmarkAreaBounds): [number, number] {
  const [[west, south], [east, north]] = bounds
  return [(west + east) / 2, (south + north) / 2]
}

function pointInBounds(
  point: readonly [number, number],
  bounds: BenchmarkAreaBounds
): boolean {
  const [[west, south], [east, north]] = bounds
  return (
    point[0] >= west &&
    point[0] <= east &&
    point[1] >= south &&
    point[1] <= north
  )
}

function distanceSquared(
  point: readonly [number, number],
  target: readonly [number, number]
): number {
  const dx = point[0] - target[0]
  const dy = point[1] - target[1]
  return dx * dx + dy * dy
}

function bestContainingAreaForPoint(
  areas: readonly BenchmarkArea[],
  point: readonly [number, number]
): BenchmarkArea | null {
  const containing = areas.filter((area) => pointInBounds(point, area.bounds))
  if (containing.length === 0) return null

  let best = containing[0]!
  let bestDistance = distanceSquared(point, boundsCenter(best.bounds))
  for (let index = 1; index < containing.length; index += 1) {
    const candidate = containing[index]!
    const distance = distanceSquared(point, boundsCenter(candidate.bounds))
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }
  return best
}

function marketById(marketId: string): BenchmarkArea | null {
  return CURATED_BENCHMARK_MARKETS.find((market) => market.id === marketId) ?? null
}

function registerSubmarketArea(seed: {
  id: string
  marketId: string
  label: string
  geocodeQuery: string
  aliases?: string[]
}): BenchmarkArea {
  const market = marketById(seed.marketId)
  const hasCountyChildren = curatedCountyAssignmentsForSubmarketId(seed.id).length > 0
  return registerArea(
    applyStoredBoundary({
      id: seed.id,
      label: seed.label,
      bounds: market?.bounds ?? BENCHMARK_ROOT_AREA.bounds,
      level: "submarket",
      geocodeQuery: seed.geocodeQuery,
      parentId: seed.marketId,
      childLevel: hasCountyChildren ? "county" : undefined,
      isCurated: true,
      geocodeHint: {
        placeTypes: ["place"],
      },
      aliases: normalizeAliases(seed.label, ...(seed.aliases ?? [])),
    })
  )
}

function registerCountyArea(seed: {
  id: string
  label: string
  stateCode: string
  countyName: string
  submarketId: string
  geocodeQuery: string
  aliases?: string[]
}): BenchmarkArea {
  const submarket = getBenchmarkAreaById(seed.submarketId)
  const hasZipChildren = curatedZipAssignmentsForCountyId(seed.id).length > 0
  return registerArea(
    applyStoredBoundary({
      id: seed.id,
      label: seed.label,
      bounds: submarket?.bounds ?? BENCHMARK_ROOT_AREA.bounds,
      level: "county",
      geocodeQuery: seed.geocodeQuery,
      parentId: seed.submarketId,
      childLevel: hasZipChildren ? "zip" : undefined,
      isCurated: true,
      geocodeHint: {
        placeTypes: ["district"],
        regionShortCode: seed.stateCode,
        districtName: seed.countyName,
      },
      aliases: normalizeAliases(seed.label, ...(seed.aliases ?? [])),
    })
  )
}

function registerZipArea(seed: {
  id: string
  label: string
  zipCode: string
  submarketId: string
  countyId?: string
  geocodeQuery: string
  aliases?: string[]
}): BenchmarkArea {
  const parentArea =
    (seed.countyId ? getBenchmarkAreaById(seed.countyId) : null) ??
    getBenchmarkAreaById(seed.submarketId)
  return registerArea(
    applyStoredBoundary({
      id: seed.id,
      label: seed.label,
      bounds: parentArea?.bounds ?? BENCHMARK_ROOT_AREA.bounds,
      level: "zip",
      geocodeQuery: seed.geocodeQuery,
      parentId: seed.countyId ?? seed.submarketId,
      isCurated: true,
      geocodeHint: {
        placeTypes: ["postcode"],
      },
      aliases: normalizeAliases(seed.label, seed.zipCode, ...(seed.aliases ?? [])),
    })
  )
}

const CURATED_BENCHMARK_SUBMARKETS_BY_MARKET_ID = Object.freeze(
  Object.fromEntries(
    CURATED_BENCHMARK_MARKETS.map((market) => [
      market.id,
      curatedSubmarketSeedsForMarketId(market.id).map((seed) =>
        registerSubmarketArea(seed)
      ),
    ])
  ) as Record<string, BenchmarkArea[]>
)

const CURATED_BENCHMARK_COUNTIES_BY_SUBMARKET_ID = Object.freeze(
  Object.fromEntries(
    Object.values(CURATED_BENCHMARK_SUBMARKETS_BY_MARKET_ID)
      .flat()
      .map((submarket) => [
        submarket.id,
        curatedCountyAssignmentsForSubmarketId(submarket.id).map((seed) =>
          registerCountyArea(seed)
        ),
      ])
  ) as Record<string, BenchmarkArea[]>
)

const CURATED_BENCHMARK_ZIPS_BY_COUNTY_ID = Object.freeze(
  Object.fromEntries(
    Object.values(CURATED_BENCHMARK_COUNTIES_BY_SUBMARKET_ID)
      .flat()
      .map((county) => [
        county.id,
        curatedZipAssignmentsForCountyId(county.id).map((seed) =>
          registerZipArea(seed)
        ),
      ])
  ) as Record<string, BenchmarkArea[]>
)

function nextBenchmarkAreaLevel(
  level: BenchmarkAreaLevel
): BenchmarkAreaLevel | undefined {
  const index = BENCHMARK_AREA_LEVEL_ORDER.indexOf(level)
  return index >= 0 ? BENCHMARK_AREA_LEVEL_ORDER[index + 1] : undefined
}

function parentBenchmarkAreaLevel(
  level: BenchmarkAreaLevel
): BenchmarkAreaLevel | undefined {
  const index = BENCHMARK_AREA_LEVEL_ORDER.indexOf(level)
  return index > 0 ? BENCHMARK_AREA_LEVEL_ORDER[index - 1] : undefined
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function getBenchmarkAreaById(areaId: string): BenchmarkArea | null {
  if (REGISTERED_AREAS.has(areaId)) {
    return REGISTERED_AREAS.get(areaId) ?? null
  }
  return null
}

export function getBenchmarkAreaLevelLabel(level: BenchmarkAreaLevel): string {
  return BENCHMARK_AREA_LEVEL_LABELS[level]
}

export function listBenchmarkAreaChildren(area: BenchmarkArea): readonly BenchmarkArea[] {
  if (area.id === BENCHMARK_ROOT_AREA.id) return CURATED_BENCHMARK_MARKETS
  const cached = CHILDREN_CACHE.get(area.id)
  if (cached) return cached

  const children =
    area.level === "market"
      ? CURATED_BENCHMARK_SUBMARKETS_BY_MARKET_ID[area.id] ?? []
      : area.level === "submarket"
        ? CURATED_BENCHMARK_COUNTIES_BY_SUBMARKET_ID[area.id] ?? []
        : area.level === "county"
          ? CURATED_BENCHMARK_ZIPS_BY_COUNTY_ID[area.id] ?? []
        : []

  CHILDREN_CACHE.set(area.id, children)
  return children
}

export function getBenchmarkAreaParent(area: BenchmarkArea): BenchmarkArea | null {
  if (!area.parentId) return null
  return getBenchmarkAreaById(area.parentId)
}

export function getBenchmarkAreaPath(area: BenchmarkArea): BenchmarkArea[] {
  const path: BenchmarkArea[] = []
  let cursor: BenchmarkArea | null = area
  while (cursor) {
    path.unshift(cursor)
    cursor = getBenchmarkAreaParent(cursor)
  }
  return path
}

function collectDescendants(area: BenchmarkArea): BenchmarkArea[] {
  const children = [...listBenchmarkAreaChildren(area)]
  return children.flatMap((child) => [child, ...collectDescendants(child)])
}

const BENCHMARK_AREA_SEARCH_INDEX: readonly BenchmarkArea[] = [
  BENCHMARK_ROOT_AREA,
  ...collectDescendants(BENCHMARK_ROOT_AREA),
]

function matchesQuery(area: BenchmarkArea, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (area.label.toLowerCase().includes(q)) return true
  return (area.aliases ?? []).some((alias) => alias.toLowerCase().includes(q))
}

export function searchBenchmarkHierarchyAreas(
  query: string,
  currentArea?: BenchmarkArea
): BenchmarkArea[] {
  const trimmed = query.trim()
  if (!trimmed) {
    return [...listBenchmarkAreaChildren(currentArea ?? BENCHMARK_ROOT_AREA)]
  }

  const currentPathIds = new Set(
    currentArea ? getBenchmarkAreaPath(currentArea).map((area) => area.id) : []
  )

  return [...BENCHMARK_AREA_SEARCH_INDEX]
    .filter((area) => area.id !== BENCHMARK_ROOT_AREA.id)
    .filter((area) => matchesQuery(area, trimmed))
    .sort((left, right) => {
      const leftExact =
        left.label.toLowerCase() === trimmed.toLowerCase() ||
        (left.aliases ?? []).some((alias) => alias.toLowerCase() === trimmed.toLowerCase())
      const rightExact =
        right.label.toLowerCase() === trimmed.toLowerCase() ||
        (right.aliases ?? []).some((alias) => alias.toLowerCase() === trimmed.toLowerCase())

      if (leftExact !== rightExact) {
        return leftExact ? -1 : 1
      }

      const leftInCurrentPath = currentPathIds.has(left.id)
      const rightInCurrentPath = currentPathIds.has(right.id)
      if (leftInCurrentPath !== rightInCurrentPath) {
        return leftInCurrentPath ? -1 : 1
      }

      const levelDelta =
        BENCHMARK_AREA_LEVEL_ORDER.indexOf(left.level) -
        BENCHMARK_AREA_LEVEL_ORDER.indexOf(right.level)
      if (levelDelta !== 0) return levelDelta

      return left.label.localeCompare(right.label)
    })
    .slice(0, 8)
}

function closestChildForPoint(
  parent: BenchmarkArea,
  point: readonly [number, number]
): BenchmarkArea | null {
  const children = listBenchmarkAreaChildren(parent)
  if (children.length === 0) return null

  const containing = bestContainingAreaForPoint(children, point)
  if (containing) return containing

  let closest: BenchmarkArea | null = null
  let closestDistance = Number.POSITIVE_INFINITY
  for (const child of children) {
    const distance = distanceSquared(point, boundsCenter(child.bounds))
    if (distance < closestDistance) {
      closest = child
      closestDistance = distance
    }
  }
  return closest
}

export function getBenchmarkAreaPathForPoint(
  point: readonly [number, number],
  targetLevel: BenchmarkAreaLevel
): BenchmarkArea[] {
  const path = [BENCHMARK_ROOT_AREA]
  let cursor = BENCHMARK_ROOT_AREA

  while (cursor.level !== targetLevel) {
    const child = closestChildForPoint(cursor, point)
    if (!child) break
    path.push(child)
    cursor = child
  }

  return path
}

export function isCuratedBenchmarkMarket(area: BenchmarkArea): boolean {
  return area.level === "market" && area.isCurated === true
}

export function benchmarkAreaCenter(area: BenchmarkArea): [number, number] {
  return boundsCenter(area.bounds)
}

export function benchmarkAreaContainsPoint(
  area: BenchmarkArea,
  point: readonly [number, number]
): boolean {
  return pointInBounds(point, area.bounds)
}

export function bestBenchmarkAreaForPoint(
  areas: readonly BenchmarkArea[],
  point: readonly [number, number]
): BenchmarkArea | null {
  if (areas.length === 0) return null
  const containing = bestContainingAreaForPoint(areas, point)
  if (containing) return containing

  let best: BenchmarkArea | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const area of areas) {
    const distance = distanceSquared(point, benchmarkAreaCenter(area))
    if (distance < bestDistance) {
      best = area
      bestDistance = distance
    }
  }
  return best
}

export function bestBenchmarkMarketForPoint(
  point: readonly [number, number]
): BenchmarkArea | null {
  return bestBenchmarkAreaForPoint(CURATED_BENCHMARK_MARKETS, point)
}

export function benchmarkAreaSearchIndex(): readonly BenchmarkArea[] {
  return BENCHMARK_AREA_SEARCH_INDEX
}
