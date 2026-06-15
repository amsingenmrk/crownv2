#!/usr/bin/env node
/**
 * Builds stored boundary polygons for curated benchmark markets from US Census
 * cartographic GeoJSON (CBSA metros + state outlines).
 *
 * Usage: node scripts/generate-benchmark-market-boundaries.mjs
 */

import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const OUTPUT = path.join(ROOT, "lib/benchmark-market-boundaries.generated.json")

const MSA_URL =
  "https://raw.githubusercontent.com/loganpowell/census-geojson/master/GeoJSON/20m/2018/metropolitan-statistical-area!micropolitan-statistical-area.json"
const STATE_URL =
  "https://raw.githubusercontent.com/loganpowell/census-geojson/master/GeoJSON/20m/2018/state.json"

/**
 * @type {Array<
 *   | { id: string; source: "msa"; name: string }
 *   | { id: string; source: "state"; stusps: string }
 * >}
 */
const PRESET_SOURCES = [
  {
    id: "market-los-angeles",
    source: "msa",
    name: "Los Angeles-Long Beach-Anaheim, CA",
  },
  {
    id: "market-dc",
    source: "msa",
    name: "Washington-Arlington-Alexandria, DC-VA-MD-WV",
  },
  { id: "market-phoenix", source: "msa", name: "Phoenix-Mesa-Scottsdale, AZ" },
  {
    id: "market-seattle",
    source: "msa",
    name: "Seattle-Tacoma-Bellevue, WA",
  },
  {
    id: "market-philadelphia",
    source: "msa",
    name: "Philadelphia-Camden-Wilmington, PA-NJ-DE-MD",
  },
  { id: "market-new-jersey", source: "state", stusps: "NJ" },
  {
    id: "market-minneapolis-st-paul",
    source: "msa",
    name: "Minneapolis-St. Paul-Bloomington, MN-WI",
  },
  {
    id: "market-chicago",
    source: "msa",
    name: "Chicago-Naperville-Elgin, IL-IN-WI",
  },
  {
    id: "market-houston",
    source: "msa",
    name: "Houston-The Woodlands-Sugar Land, TX",
  },
  { id: "market-san-diego", source: "msa", name: "San Diego-Carlsbad, CA" },
  { id: "market-utah", source: "state", stusps: "UT" },
  {
    id: "market-portland",
    source: "msa",
    name: "Portland-Vancouver-Hillsboro, OR-WA",
  },
  {
    id: "market-fort-lauderdale",
    source: "msa",
    name: "Miami-Fort Lauderdale-West Palm Beach, FL",
  },
  { id: "market-cincinnati", source: "msa", name: "Cincinnati, OH-KY-IN" },
  {
    id: "market-tampa-bay",
    source: "msa",
    name: "Tampa-St. Petersburg-Clearwater, FL",
  },
  {
    id: "market-miami",
    source: "msa",
    name: "Miami-Fort Lauderdale-West Palm Beach, FL",
  },
  {
    id: "market-sacramento",
    source: "msa",
    name: "Sacramento--Roseville--Arden-Arcade, CA",
  },
  {
    id: "market-charlotte",
    source: "msa",
    name: "Charlotte-Concord-Gastonia, NC-SC",
  },
  {
    id: "market-san-jose",
    source: "msa",
    name: "San Jose-Sunnyvale-Santa Clara, CA",
  },
  { id: "market-pittsburgh", source: "msa", name: "Pittsburgh, PA" },
  { id: "market-cleveland", source: "msa", name: "Cleveland-Elyria, OH" },
  { id: "market-columbus", source: "msa", name: "Columbus, OH" },
  {
    id: "market-new-york",
    source: "msa",
    name: "New York-Newark-Jersey City, NY-NJ-PA",
  },
]

function boundsFromGeometry(geometry) {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  const visit = (coords) => {
    if (typeof coords[0] === "number") {
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
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ]
}

async function loadFeatureCollections() {
  const [msaRes, stateRes] = await Promise.all([
    fetch(MSA_URL),
    fetch(STATE_URL),
  ])

  if (!msaRes.ok) {
    throw new Error(`Failed to download MSA GeoJSON: HTTP ${msaRes.status}`)
  }
  if (!stateRes.ok) {
    throw new Error(`Failed to download state GeoJSON: HTTP ${stateRes.status}`)
  }

  const msaCollection = await msaRes.json()
  const stateCollection = await stateRes.json()
  return { msaCollection, stateCollection }
}

function featureFromMsa(msaCollection, name) {
  const feature = msaCollection.features.find(
    (item) => item.properties?.NAME === name
  )
  if (!feature) throw new Error(`MSA not found: ${name}`)
  return feature
}

function featureFromState(stateCollection, stusps) {
  const feature = stateCollection.features.find(
    (item) => item.properties?.STUSPS === stusps
  )
  if (!feature) throw new Error(`State not found: ${stusps}`)
  return feature
}

const LOWER_48_EXCLUDED = new Set(["AK", "HI", "PR"])

function lower48Geometry(stateCollection) {
  /** @type {number[][][][]} */
  const coordinates = []

  for (const feature of stateCollection.features) {
    const stusps = feature.properties?.STUSPS
    if (!stusps || LOWER_48_EXCLUDED.has(stusps)) continue

    const geometry = feature.geometry
    if (!geometry) continue
    if (geometry.type === "Polygon") {
      coordinates.push(geometry.coordinates)
    } else if (geometry.type === "MultiPolygon") {
      coordinates.push(...geometry.coordinates)
    }
  }

  if (coordinates.length === 0) {
    throw new Error("No lower-48 state geometries found")
  }

  return { type: "MultiPolygon", coordinates }
}

async function main() {
  const { msaCollection, stateCollection } = await loadFeatureCollections()
  /** @type {Record<string, unknown>} */
  const output = {}
  const failures = []

  try {
    const lower48 = lower48Geometry(stateCollection)
    output["us-national"] = {
      id: "us-national",
      bounds: boundsFromGeometry(lower48),
      geometry: {
        type: "Feature",
        properties: {
          source: "state-lower48",
          censusName: "United States (lower 48)",
        },
        geometry: lower48,
      },
    }
    console.log("✓ us-national")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push({ id: "us-national", error: message })
    console.error(`✗ us-national: ${message}`)
  }

  for (const preset of PRESET_SOURCES) {
    try {
      const sourceFeature =
        preset.source === "msa"
          ? featureFromMsa(msaCollection, preset.name)
          : featureFromState(stateCollection, preset.stusps)

      const geometry = sourceFeature.geometry
      if (
        !geometry ||
        (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")
      ) {
        throw new Error(`Unsupported geometry for ${preset.id}`)
      }

      output[preset.id] = {
        id: preset.id,
        bounds: boundsFromGeometry(geometry),
        geometry: {
          type: "Feature",
          properties: {
            source: preset.source,
            ...(preset.source === "msa"
              ? { cbsaName: preset.name }
              : { stusps: preset.stusps }),
            censusName: sourceFeature.properties?.NAME,
          },
          geometry,
        },
      }
      console.log(`✓ ${preset.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push({ id: preset.id, error: message })
      console.error(`✗ ${preset.id}: ${message}`)
    }
  }

  fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`)

  console.log(
    `\nWrote ${Object.keys(output).length} boundaries to ${path.relative(ROOT, OUTPUT)}`
  )
  if (failures.length > 0) process.exitCode = 1
}

main()
