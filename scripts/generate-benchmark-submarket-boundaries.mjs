#!/usr/bin/env node
/**
 * Builds stored boundary polygons for curated benchmark submarkets from
 * Nominatim/OSM polygon GeoJSON results.
 *
 * Usage: node scripts/generate-benchmark-submarket-boundaries.mjs
 */

import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"

const ROOT = process.cwd()
const CATALOG = path.join(ROOT, "lib/benchmark-submarket-catalog.ts")
const OUTPUT = path.join(ROOT, "lib/benchmark-submarket-boundaries.generated.json")
const USER_AGENT = "glassbox-benchmark-boundary-generator/1.0"
const REQUEST_DELAY_MS = 1000

const BOUNDARY_QUERY_OVERRIDES = {
  "submarket-dc-downtown-east-end": ["Downtown, Washington, DC"],
  "submarket-phoenix-downtown": ["Central City, Phoenix, AZ"],
  "submarket-phoenix-camelback-corridor": ["Camelback East, Phoenix, AZ"],
  "submarket-philadelphia-university-city": ["West Philadelphia, Philadelphia, PA"],
  "submarket-chicago-west-loop": ["Near West Side, Chicago, IL"],
  "submarket-pittsburgh-oakland-east-end": ["Central Oakland, Pittsburgh, PA"],
  "submarket-new-york-midtown-manhattan": ["Manhattan Community Board 5, New York, NY"],
}

const POSITIVE_CATEGORY_TYPE_SCORES = new Map([
  ["boundary:administrative", 120],
  ["boundary:neighborhood", 110],
  ["boundary:statistical", 95],
  ["boundary:census", 90],
  ["place:neighbourhood", 100],
  ["place:suburb", 95],
  ["place:quarter", 90],
  ["place:locality", 80],
])

const NEGATIVE_CATEGORY_TYPE_SCORES = new Map([
  ["tourism:hotel", -200],
  ["tourism:motel", -200],
  ["amenity:school", -200],
  ["amenity:hospital", -200],
  ["amenity:cinema", -200],
  ["shop:mall", -200],
  ["building:yes", -200],
  ["aeroway:aerodrome", -200],
  ["aeroway:heliport", -200],
  ["railway:platform", -200],
  ["leisure:park", -200],
  ["landuse:religious", -200],
])

const NEGATIVE_CATEGORIES = new Set([
  "amenity",
  "aeroway",
  "building",
  "highway",
  "historic",
  "leisure",
  "man_made",
  "office",
  "railway",
  "shop",
  "tourism",
])

const NEGATIVE_TYPES = new Set([
  "apartments",
  "aerodrome",
  "cinema",
  "heliport",
  "hospital",
  "hotel",
  "mall",
  "motel",
  "park",
  "pier",
  "platform",
  "school",
  "yes",
])

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readCatalogSource() {
  return fs.readFileSync(CATALOG, "utf8")
}

function extractField(block, field) {
  const match = block.match(new RegExp(`${field}:\\s*"([^"]+)"`))
  return match?.[1] ?? null
}

function extractAliases(block) {
  const aliasesMatch = block.match(/aliases:\s*\[([^\]]*)\]/)
  if (!aliasesMatch) return []
  return [...aliasesMatch[1].matchAll(/"([^"]+)"/g)].map((match) => match[1])
}

function parseSubmarketSeeds(source) {
  return [...source.matchAll(/submarketSeed\(\{([\s\S]*?)\n\s*\}\)/g)].map(
    (match) => {
      const block = match[1]
      const id = extractField(block, "id")
      const marketId = extractField(block, "marketId")
      const label = extractField(block, "label")
      const geocodeQuery = extractField(block, "geocodeQuery")
      if (!id || !marketId || !label || !geocodeQuery) {
        throw new Error(`Failed to parse submarket seed block: ${block}`)
      }
      return {
        id,
        marketId,
        label,
        geocodeQuery,
        aliases: extractAliases(block),
      }
    }
  )
}

function curlJson(url) {
  const stdout = execFileSync(
    "curl",
    ["-fsSL", "-A", USER_AGENT, url],
    {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    }
  )
  return JSON.parse(stdout)
}

function nominatimUrl(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search")
  url.searchParams.set("format", "geojson")
  url.searchParams.set("polygon_geojson", "1")
  url.searchParams.set("limit", "5")
  url.searchParams.set("countrycodes", "us")
  url.searchParams.set("q", query)
  return url.toString()
}

function candidateQueriesForSeed(seed) {
  const override = BOUNDARY_QUERY_OVERRIDES[seed.id] ?? []
  return [...new Set([...override, seed.geocodeQuery])]
}

function boundsFromGeometry(geometry) {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  const visit = (coords) => {
    if (!Array.isArray(coords)) return
    if (
      coords.length >= 2 &&
      typeof coords[0] === "number" &&
      typeof coords[1] === "number"
    ) {
      const [lng, lat] = coords
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
      return
    }

    for (const part of coords) visit(part)
  }

  visit(geometry.coordinates)
  if (!Number.isFinite(minLng)) {
    throw new Error("Unable to compute bounds from geometry")
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ]
}

function normalizeString(value) {
  return value.trim().toLowerCase()
}

function scoreFeature(feature, seed) {
  const props = feature.properties ?? {}
  const displayName = normalizeString(props.display_name ?? "")
  const name = normalizeString(props.name ?? "")
  const query = normalizeString(seed.geocodeQuery)
  const label = normalizeString(seed.label)
  const aliases = seed.aliases.map(normalizeString)

  let score = 0
  const category = props.category ?? ""
  const type = props.type ?? ""
  const categoryTypeKey = `${category}:${type}`

  score += POSITIVE_CATEGORY_TYPE_SCORES.get(categoryTypeKey) ?? 0
  score += NEGATIVE_CATEGORY_TYPE_SCORES.get(categoryTypeKey) ?? 0
  if (NEGATIVE_CATEGORIES.has(category)) score -= 120
  if (NEGATIVE_TYPES.has(type)) score -= 120

  if (name === label) score += 15
  if (name === query) score += 15
  if (displayName.includes(query)) score += 12
  if (displayName.includes(label)) score += 10
  for (const alias of aliases) {
    if (displayName.includes(alias)) score += 4
  }

  if (type === "administrative") score += 8
  if (type === "suburb" || type === "neighbourhood" || type === "quarter") score += 10
  if (type === "commercial" || type === "quarter") score += 6
  if (category === "boundary" || category === "place") score += 5

  const geometryType = feature.geometry?.type
  if (geometryType === "Polygon" || geometryType === "MultiPolygon") score += 20

  return score
}

function pickBestFeature(features, seed) {
  const scored = [...features]
    .filter((feature) => {
      const geometryType = feature.geometry?.type
      return geometryType === "Polygon" || geometryType === "MultiPolygon"
    })
    .map((feature) => ({ feature, score: scoreFeature(feature, seed) }))
    .sort((left, right) => right.score - left.score)

  const best = scored[0]
  return best && best.score >= 50 ? best.feature : null
}

async function main() {
  const source = readCatalogSource()
  const seeds = parseSubmarketSeeds(source)
  /** @type {Record<string, unknown>} */
  const output = {}
  const failures = []

  console.log(`Generating stored submarket boundaries for ${seeds.length} curated submarkets`)

  for (const [index, seed] of seeds.entries()) {
    try {
      let bestFeature = null
      let matchedQuery = null

      for (const query of candidateQueriesForSeed(seed)) {
        const data = curlJson(nominatimUrl(query))
        const features = data.features ?? []
        bestFeature = pickBestFeature(features, seed)
        if (bestFeature?.geometry) {
          matchedQuery = query
          break
        }
        await sleep(REQUEST_DELAY_MS)
      }

      if (!bestFeature?.geometry) {
        throw new Error(`No polygon feature found for "${seed.geocodeQuery}"`)
      }

      output[seed.id] = {
        id: seed.id,
        bounds: boundsFromGeometry(bestFeature.geometry),
        geometry: {
          type: "Feature",
          properties: {
            source: "nominatim",
            query: matchedQuery ?? seed.geocodeQuery,
            label: seed.label,
            marketId: seed.marketId,
            osmType: bestFeature.properties?.osm_type,
            osmId: bestFeature.properties?.osm_id,
            category: bestFeature.properties?.category,
            type: bestFeature.properties?.type,
            displayName: bestFeature.properties?.display_name,
          },
          geometry: bestFeature.geometry,
        },
      }

      console.log(
        `✓ [${index + 1}/${seeds.length}] ${seed.id} -> ${bestFeature.properties?.display_name ?? seed.geocodeQuery}`
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push({ id: seed.id, query: seed.geocodeQuery, error: message })
      console.error(`✗ [${index + 1}/${seeds.length}] ${seed.id}: ${message}`)
    }

    if (index < seeds.length - 1) {
      await sleep(REQUEST_DELAY_MS)
    }
  }

  fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`)
  console.log(
    `\nWrote ${Object.keys(output).length} stored submarket boundaries to ${path.relative(ROOT, OUTPUT)}`
  )

  if (failures.length > 0) {
    console.error(`Encountered ${failures.length} failures while generating boundaries:`)
    for (const failure of failures) {
      console.error(` - ${failure.id}: ${failure.error}`)
    }
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
