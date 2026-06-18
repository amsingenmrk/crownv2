export type CuratedBenchmarkSubmarketSeed = {
  id: string
  marketId: string
  label: string
  geocodeQuery: string
  aliases?: string[]
  notes?: string
}

function submarketSeed(
  seed: CuratedBenchmarkSubmarketSeed
): CuratedBenchmarkSubmarketSeed {
  return seed
}

export const CURATED_BENCHMARK_SUBMARKET_SEEDS: readonly CuratedBenchmarkSubmarketSeed[] = [
  submarketSeed({
    id: "submarket-los-angeles-hollywood-west-hollywood",
    marketId: "market-los-angeles",
    label: "Hollywood / West Hollywood",
    geocodeQuery: "West Hollywood, CA",
    aliases: ["hollywood", "west hollywood"],
    notes: "Seeded from internal research CSV and normalized to a geocodable place.",
  }),
  submarketSeed({
    id: "submarket-los-angeles-west-los-angeles",
    marketId: "market-los-angeles",
    label: "West Los Angeles",
    geocodeQuery: "West Los Angeles, Los Angeles, CA",
    aliases: ["west la"],
  }),
  submarketSeed({
    id: "submarket-los-angeles-el-segundo-south-bay",
    marketId: "market-los-angeles",
    label: "El Segundo / South Bay",
    geocodeQuery: "El Segundo, CA",
    aliases: ["south bay", "el segundo"],
  }),
  submarketSeed({
    id: "submarket-los-angeles-culver-city",
    marketId: "market-los-angeles",
    label: "Culver City",
    geocodeQuery: "Culver City, CA",
  }),
  submarketSeed({
    id: "submarket-los-angeles-long-beach",
    marketId: "market-los-angeles",
    label: "Long Beach",
    geocodeQuery: "Long Beach, CA",
  }),
  submarketSeed({
    id: "submarket-dc-downtown-east-end",
    marketId: "market-dc",
    label: "Downtown / East End",
    geocodeQuery: "Downtown Washington, DC",
    aliases: ["dc cbd", "east end"],
  }),
  submarketSeed({
    id: "submarket-dc-capitol-riverfront",
    marketId: "market-dc",
    label: "Capitol Riverfront / Navy Yard",
    geocodeQuery: "Navy Yard, Washington, DC",
    aliases: ["capitol riverfront", "navy yard"],
  }),
  submarketSeed({
    id: "submarket-dc-rosslyn-ballston",
    marketId: "market-dc",
    label: "Rosslyn / Ballston",
    geocodeQuery: "Rosslyn, Arlington, VA",
    aliases: ["ballston"],
  }),
  submarketSeed({
    id: "submarket-dc-bethesda",
    marketId: "market-dc",
    label: "Bethesda",
    geocodeQuery: "Bethesda, MD",
  }),
  submarketSeed({
    id: "submarket-dc-tysons",
    marketId: "market-dc",
    label: "Tysons",
    geocodeQuery: "Tysons, VA",
  }),
  submarketSeed({
    id: "submarket-phoenix-downtown",
    marketId: "market-phoenix",
    label: "Downtown Phoenix",
    geocodeQuery: "Downtown Phoenix, Phoenix, AZ",
  }),
  submarketSeed({
    id: "submarket-phoenix-camelback-corridor",
    marketId: "market-phoenix",
    label: "Camelback Corridor",
    geocodeQuery: "Camelback East Village, Phoenix, AZ",
    aliases: ["biltmore", "camelback east"],
  }),
  submarketSeed({
    id: "submarket-phoenix-scottsdale",
    marketId: "market-phoenix",
    label: "Scottsdale",
    geocodeQuery: "Scottsdale, AZ",
  }),
  submarketSeed({
    id: "submarket-phoenix-tempe",
    marketId: "market-phoenix",
    label: "Tempe",
    geocodeQuery: "Tempe, AZ",
  }),
  submarketSeed({
    id: "submarket-seattle-south-lake-union",
    marketId: "market-seattle",
    label: "South Lake Union / Denny Regrade",
    geocodeQuery: "South Lake Union, Seattle, WA",
    aliases: ["denny regrade", "lake union"],
    notes: "Seeded from internal research CSV.",
  }),
  submarketSeed({
    id: "submarket-seattle-downtown",
    marketId: "market-seattle",
    label: "Downtown Seattle",
    geocodeQuery: "Downtown Seattle, Seattle, WA",
  }),
  submarketSeed({
    id: "submarket-seattle-bellevue",
    marketId: "market-seattle",
    label: "Bellevue",
    geocodeQuery: "Bellevue, WA",
    notes: "Seeded from internal research CSV.",
  }),
  submarketSeed({
    id: "submarket-seattle-redmond-eastside",
    marketId: "market-seattle",
    label: "Redmond / Eastside",
    geocodeQuery: "Redmond, WA",
    aliases: ["eastside"],
  }),
  submarketSeed({
    id: "submarket-philadelphia-center-city",
    marketId: "market-philadelphia",
    label: "Center City",
    geocodeQuery: "Center City, Philadelphia, PA",
  }),
  submarketSeed({
    id: "submarket-philadelphia-university-city",
    marketId: "market-philadelphia",
    label: "University City",
    geocodeQuery: "University City, Philadelphia, PA",
  }),
  submarketSeed({
    id: "submarket-philadelphia-king-of-prussia",
    marketId: "market-philadelphia",
    label: "King of Prussia",
    geocodeQuery: "King of Prussia, PA",
  }),
  submarketSeed({
    id: "submarket-new-jersey-jersey-city-hoboken",
    marketId: "market-new-jersey",
    label: "Jersey City / Hoboken",
    geocodeQuery: "Jersey City, NJ",
    aliases: ["hoboken"],
  }),
  submarketSeed({
    id: "submarket-new-jersey-newark-meadowlands",
    marketId: "market-new-jersey",
    label: "Newark / Meadowlands",
    geocodeQuery: "Newark, NJ",
    aliases: ["meadowlands"],
  }),
  submarketSeed({
    id: "submarket-new-jersey-metropark-woodbridge",
    marketId: "market-new-jersey",
    label: "Metropark / Woodbridge",
    geocodeQuery: "Edison, NJ",
    aliases: ["metropark", "woodbridge"],
  }),
  submarketSeed({
    id: "submarket-new-jersey-princeton-route-1",
    marketId: "market-new-jersey",
    label: "Princeton / Route 1",
    geocodeQuery: "Princeton, NJ",
    aliases: ["route 1"],
  }),
  submarketSeed({
    id: "submarket-minneapolis-minneapolis-cbd",
    marketId: "market-minneapolis-st-paul",
    label: "Downtown Minneapolis",
    geocodeQuery: "Downtown West, Minneapolis, MN",
    aliases: ["minneapolis cbd"],
  }),
  submarketSeed({
    id: "submarket-minneapolis-st-paul-cbd",
    marketId: "market-minneapolis-st-paul",
    label: "Downtown St. Paul",
    geocodeQuery: "Downtown, Saint Paul, MN",
    aliases: ["st paul cbd"],
  }),
  submarketSeed({
    id: "submarket-minneapolis-bloomington",
    marketId: "market-minneapolis-st-paul",
    label: "Bloomington / I-494",
    geocodeQuery: "Bloomington, MN",
    aliases: ["i-494"],
  }),
  submarketSeed({
    id: "submarket-chicago-loop",
    marketId: "market-chicago",
    label: "The Loop",
    geocodeQuery: "The Loop, Chicago, IL",
  }),
  submarketSeed({
    id: "submarket-chicago-west-loop",
    marketId: "market-chicago",
    label: "West Loop / Fulton Market",
    geocodeQuery: "West Loop, Chicago, IL",
    aliases: ["fulton market"],
  }),
  submarketSeed({
    id: "submarket-chicago-river-north",
    marketId: "market-chicago",
    label: "River North",
    geocodeQuery: "River North, Chicago, IL",
  }),
  submarketSeed({
    id: "submarket-chicago-ohare-rosemont",
    marketId: "market-chicago",
    label: "O'Hare / Rosemont",
    geocodeQuery: "Rosemont, IL",
    aliases: ["ohare"],
  }),
  submarketSeed({
    id: "submarket-houston-downtown",
    marketId: "market-houston",
    label: "Downtown Houston",
    geocodeQuery: "Downtown Houston, Houston, TX",
  }),
  submarketSeed({
    id: "submarket-houston-uptown-galleria",
    marketId: "market-houston",
    label: "Uptown / Galleria",
    geocodeQuery: "Uptown, Houston, TX",
    aliases: ["galleria"],
  }),
  submarketSeed({
    id: "submarket-houston-energy-corridor",
    marketId: "market-houston",
    label: "Energy Corridor",
    geocodeQuery: "Energy Corridor, Houston, TX",
  }),
  submarketSeed({
    id: "submarket-houston-the-woodlands",
    marketId: "market-houston",
    label: "The Woodlands",
    geocodeQuery: "The Woodlands, TX",
  }),
  submarketSeed({
    id: "submarket-san-diego-del-mar",
    marketId: "market-san-diego",
    label: "Del Mar",
    geocodeQuery: "Del Mar, CA",
    notes: "Seeded from internal research CSV.",
  }),
  submarketSeed({
    id: "submarket-san-diego-utc",
    marketId: "market-san-diego",
    label: "University Towne Center",
    geocodeQuery: "University City, San Diego, CA",
    aliases: ["utc", "university city"],
    notes: "Seeded from internal research CSV.",
  }),
  submarketSeed({
    id: "submarket-san-diego-little-italy-point-loma",
    marketId: "market-san-diego",
    label: "Little Italy / Point Loma",
    geocodeQuery: "Little Italy, San Diego, CA",
    aliases: ["point loma"],
    notes: "Seeded from internal research CSV.",
  }),
  submarketSeed({
    id: "submarket-san-diego-sorrento-i15",
    marketId: "market-san-diego",
    label: "Sorrento Valley / I-15 Corridor",
    geocodeQuery: "Sorrento Valley, San Diego, CA",
    aliases: ["i-15 corridor", "sorrento valley"],
    notes: "Seeded from internal research CSV and normalized to a geocodable area.",
  }),
  submarketSeed({
    id: "submarket-utah-salt-lake-city-cbd",
    marketId: "market-utah",
    label: "Salt Lake City CBD",
    geocodeQuery: "Downtown Salt Lake City, Salt Lake City, UT",
    aliases: ["salt lake city"],
  }),
  submarketSeed({
    id: "submarket-utah-lehi-thanksgiving-point",
    marketId: "market-utah",
    label: "Lehi / Thanksgiving Point",
    geocodeQuery: "Lehi, UT",
    aliases: ["thanksgiving point"],
  }),
  submarketSeed({
    id: "submarket-utah-provo-orem",
    marketId: "market-utah",
    label: "Provo / Orem",
    geocodeQuery: "Orem, UT",
    aliases: ["provo"],
  }),
  submarketSeed({
    id: "submarket-portland-downtown",
    marketId: "market-portland",
    label: "Downtown Portland",
    geocodeQuery: "Downtown Portland, Portland, OR",
  }),
  submarketSeed({
    id: "submarket-portland-westside",
    marketId: "market-portland",
    label: "Beaverton / Hillsboro",
    geocodeQuery: "Beaverton, OR",
    aliases: ["hillsboro"],
  }),
  submarketSeed({
    id: "submarket-portland-vancouver",
    marketId: "market-portland",
    label: "Vancouver",
    geocodeQuery: "Vancouver, WA",
  }),
  submarketSeed({
    id: "submarket-fort-lauderdale-downtown",
    marketId: "market-fort-lauderdale",
    label: "Downtown Fort Lauderdale",
    geocodeQuery: "Downtown Fort Lauderdale, Fort Lauderdale, FL",
  }),
  submarketSeed({
    id: "submarket-fort-lauderdale-plantation-sunrise",
    marketId: "market-fort-lauderdale",
    label: "Plantation / Sunrise",
    geocodeQuery: "Plantation, FL",
    aliases: ["sunrise"],
  }),
  submarketSeed({
    id: "submarket-fort-lauderdale-boca-raton",
    marketId: "market-fort-lauderdale",
    label: "Boca Raton",
    geocodeQuery: "Boca Raton, FL",
  }),
  submarketSeed({
    id: "submarket-cincinnati-cbd-riverfront",
    marketId: "market-cincinnati",
    label: "CBD / Riverfront",
    geocodeQuery: "Downtown Cincinnati, Cincinnati, OH",
    aliases: ["riverfront"],
  }),
  submarketSeed({
    id: "submarket-cincinnati-blue-ash-kenwood",
    marketId: "market-cincinnati",
    label: "Blue Ash / Kenwood",
    geocodeQuery: "Blue Ash, OH",
    aliases: ["kenwood"],
  }),
  submarketSeed({
    id: "submarket-cincinnati-northern-kentucky",
    marketId: "market-cincinnati",
    label: "Northern Kentucky",
    geocodeQuery: "Covington, KY",
    aliases: ["covington", "newport"],
  }),
  submarketSeed({
    id: "submarket-tampa-bay-downtown-tampa",
    marketId: "market-tampa-bay",
    label: "Downtown Tampa",
    geocodeQuery: "Downtown Tampa, Tampa, FL",
  }),
  submarketSeed({
    id: "submarket-tampa-bay-westshore",
    marketId: "market-tampa-bay",
    label: "Westshore",
    geocodeQuery: "Westshore, Tampa, FL",
  }),
  submarketSeed({
    id: "submarket-tampa-bay-st-petersburg",
    marketId: "market-tampa-bay",
    label: "St. Petersburg",
    geocodeQuery: "St. Petersburg, FL",
  }),
  submarketSeed({
    id: "submarket-tampa-bay-clearwater",
    marketId: "market-tampa-bay",
    label: "Clearwater",
    geocodeQuery: "Clearwater, FL",
  }),
  submarketSeed({
    id: "submarket-miami-brickell-downtown",
    marketId: "market-miami",
    label: "Brickell / Downtown",
    geocodeQuery: "Brickell, Miami, FL",
    aliases: ["downtown miami"],
  }),
  submarketSeed({
    id: "submarket-miami-coral-gables",
    marketId: "market-miami",
    label: "Coral Gables",
    geocodeQuery: "Coral Gables, FL",
  }),
  submarketSeed({
    id: "submarket-miami-doral",
    marketId: "market-miami",
    label: "Doral",
    geocodeQuery: "Doral, FL",
  }),
  submarketSeed({
    id: "submarket-miami-miami-beach",
    marketId: "market-miami",
    label: "Miami Beach",
    geocodeQuery: "Miami Beach, FL",
  }),
  submarketSeed({
    id: "submarket-sacramento-downtown",
    marketId: "market-sacramento",
    label: "Downtown Sacramento",
    geocodeQuery: "Downtown Sacramento, Sacramento, CA",
  }),
  submarketSeed({
    id: "submarket-sacramento-roseville",
    marketId: "market-sacramento",
    label: "Roseville",
    geocodeQuery: "Roseville, CA",
  }),
  submarketSeed({
    id: "submarket-sacramento-folsom-rancho-cordova",
    marketId: "market-sacramento",
    label: "Folsom / Rancho Cordova",
    geocodeQuery: "Rancho Cordova, CA",
    aliases: ["folsom"],
  }),
  submarketSeed({
    id: "submarket-charlotte-uptown",
    marketId: "market-charlotte",
    label: "Uptown Charlotte",
    geocodeQuery: "Uptown, Charlotte, NC",
  }),
  submarketSeed({
    id: "submarket-charlotte-south-end",
    marketId: "market-charlotte",
    label: "South End",
    geocodeQuery: "South End, Charlotte, NC",
  }),
  submarketSeed({
    id: "submarket-charlotte-ballantyne",
    marketId: "market-charlotte",
    label: "Ballantyne",
    geocodeQuery: "Ballantyne, Charlotte, NC",
  }),
  submarketSeed({
    id: "submarket-san-jose-downtown",
    marketId: "market-san-jose",
    label: "Downtown San Jose",
    geocodeQuery: "Downtown San Jose, San Jose, CA",
  }),
  submarketSeed({
    id: "submarket-san-jose-north-san-jose",
    marketId: "market-san-jose",
    label: "North San Jose",
    geocodeQuery: "North San Jose, San Jose, CA",
  }),
  submarketSeed({
    id: "submarket-san-jose-santa-clara",
    marketId: "market-san-jose",
    label: "Santa Clara",
    geocodeQuery: "Santa Clara, CA",
  }),
  submarketSeed({
    id: "submarket-san-jose-sunnyvale-mountain-view",
    marketId: "market-san-jose",
    label: "Sunnyvale / Mountain View",
    geocodeQuery: "Sunnyvale, CA",
    aliases: ["mountain view"],
  }),
  submarketSeed({
    id: "submarket-pittsburgh-downtown",
    marketId: "market-pittsburgh",
    label: "Downtown Pittsburgh",
    geocodeQuery: "Downtown, Pittsburgh, PA",
  }),
  submarketSeed({
    id: "submarket-pittsburgh-oakland-east-end",
    marketId: "market-pittsburgh",
    label: "Oakland / East End",
    geocodeQuery: "Oakland, Pittsburgh, PA",
    aliases: ["east end"],
  }),
  submarketSeed({
    id: "submarket-pittsburgh-north-shore",
    marketId: "market-pittsburgh",
    label: "North Shore",
    geocodeQuery: "North Shore, Pittsburgh, PA",
  }),
  submarketSeed({
    id: "submarket-cleveland-downtown",
    marketId: "market-cleveland",
    label: "Downtown Cleveland",
    geocodeQuery: "Downtown, Cleveland, OH",
  }),
  submarketSeed({
    id: "submarket-cleveland-beachwood-chagrin",
    marketId: "market-cleveland",
    label: "Beachwood / Chagrin",
    geocodeQuery: "Beachwood, OH",
    aliases: ["chagrin"],
  }),
  submarketSeed({
    id: "submarket-cleveland-westlake",
    marketId: "market-cleveland",
    label: "Westlake",
    geocodeQuery: "Westlake, OH",
  }),
  submarketSeed({
    id: "submarket-columbus-downtown",
    marketId: "market-columbus",
    label: "Downtown Columbus",
    geocodeQuery: "Downtown Columbus, Columbus, OH",
  }),
  submarketSeed({
    id: "submarket-columbus-dublin",
    marketId: "market-columbus",
    label: "Dublin",
    geocodeQuery: "Dublin, OH",
  }),
  submarketSeed({
    id: "submarket-columbus-easton",
    marketId: "market-columbus",
    label: "Easton",
    geocodeQuery: "Easton, Columbus, OH",
  }),
  submarketSeed({
    id: "submarket-new-york-midtown-manhattan",
    marketId: "market-new-york",
    label: "Midtown Manhattan",
    geocodeQuery: "Midtown Manhattan, New York, NY",
    aliases: ["midtown"],
  }),
  submarketSeed({
    id: "submarket-new-york-downtown-manhattan",
    marketId: "market-new-york",
    label: "Downtown Manhattan",
    geocodeQuery: "Financial District, Manhattan, NY",
    aliases: ["financial district", "downtown"],
  }),
  submarketSeed({
    id: "submarket-new-york-long-island-city",
    marketId: "market-new-york",
    label: "Long Island City",
    geocodeQuery: "Long Island City, Queens, NY",
    aliases: ["lic"],
  }),
  submarketSeed({
    id: "submarket-new-york-brooklyn",
    marketId: "market-new-york",
    label: "Downtown Brooklyn",
    geocodeQuery: "Downtown Brooklyn, Brooklyn, NY",
    aliases: ["brooklyn"],
  }),
  submarketSeed({
    id: "submarket-new-york-jersey-city-hoboken",
    marketId: "market-new-york",
    label: "Jersey City / Hoboken",
    geocodeQuery: "Jersey City, NJ",
    aliases: ["hoboken", "new jersey waterfront"],
  }),
] as const

export const CURATED_BENCHMARK_SUBMARKET_SEEDS_BY_MARKET_ID = Object.freeze(
  CURATED_BENCHMARK_SUBMARKET_SEEDS.reduce<
    Record<string, CuratedBenchmarkSubmarketSeed[]>
  >((acc, seed) => {
    const current = acc[seed.marketId] ?? []
    current.push(seed)
    acc[seed.marketId] = current
    return acc
  }, {})
)

export function curatedSubmarketSeedsForMarketId(
  marketId: string
): readonly CuratedBenchmarkSubmarketSeed[] {
  return CURATED_BENCHMARK_SUBMARKET_SEEDS_BY_MARKET_ID[marketId] ?? []
}

export function hasCuratedSubmarketsForMarketId(marketId: string): boolean {
  return curatedSubmarketSeedsForMarketId(marketId).length > 0
}
