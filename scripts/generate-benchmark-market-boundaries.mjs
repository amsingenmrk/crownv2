#!/usr/bin/env node
/**
 * Builds stored boundary polygons for curated benchmark markets from US Census
 * cartographic GeoJSON (CBSA metros + state outlines).
 *
 * Usage: node scripts/generate-benchmark-market-boundaries.mjs
 */

import fs from "node:fs"
import path from "node:path"
import union from "@turf/union"
import flatten from "@turf/flatten"
import { featureCollection } from "@turf/helpers"

const ROOT = process.cwd()
const OUTPUT = path.join(ROOT, "lib/benchmark-market-boundaries.generated.json")
const ASSETS_SOURCE = path.join(ROOT, "lib/assets.ts")

const MSA_URL =
  "https://raw.githubusercontent.com/loganpowell/census-geojson/master/GeoJSON/20m/2018/metropolitan-statistical-area!micropolitan-statistical-area.json"
const STATE_URL =
  "https://raw.githubusercontent.com/loganpowell/census-geojson/master/GeoJSON/20m/2018/state.json"
const ZCTA_URL =
  "https://raw.githubusercontent.com/loganpowell/census-geojson/master/GeoJSON/500k/2018/zip-code-tabulation-area.json"
const USER_AGENT = "glassbox-benchmark-boundary-generator/1.0"

/**
 * @type {Array<
 *   | { id: string; source: "msa"; name: string }
 *   | { id: string; source: "state"; stusps: string }
 * >}
 */
const PRESET_SOURCES = [
  { id: "state-ca", source: "state", stusps: "CA" },
  { id: "state-co", source: "state", stusps: "CO" },
  { id: "state-fl", source: "state", stusps: "FL" },
  { id: "state-ga", source: "state", stusps: "GA" },
  { id: "state-il", source: "state", stusps: "IL" },
  { id: "state-ma", source: "state", stusps: "MA" },
  { id: "state-nc", source: "state", stusps: "NC" },
  { id: "state-nj", source: "state", stusps: "NJ" },
  { id: "state-ct", source: "state", stusps: "CT" },
  { id: "state-ny", source: "state", stusps: "NY" },
  { id: "state-tn", source: "state", stusps: "TN" },
  { id: "state-tx", source: "state", stusps: "TX" },
  { id: "state-wa", source: "state", stusps: "WA" },
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
  const [msaRes, stateRes, zctaRes] = await Promise.all([
    fetch(MSA_URL),
    fetch(STATE_URL),
    fetch(ZCTA_URL),
  ])

  if (!msaRes.ok) {
    throw new Error(`Failed to download MSA GeoJSON: HTTP ${msaRes.status}`)
  }
  if (!stateRes.ok) {
    throw new Error(`Failed to download state GeoJSON: HTTP ${stateRes.status}`)
  }
  if (!zctaRes.ok) {
    throw new Error(`Failed to download ZCTA GeoJSON: HTTP ${zctaRes.status}`)
  }

  const msaCollection = await msaRes.json()
  const stateCollection = await stateRes.json()
  const zctaCollection = await zctaRes.json()
  return { msaCollection, stateCollection, zctaCollection }
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

function featureFromZip(zctaCollection, zipCode) {
  const feature = zctaCollection.features.find(
    (item) => item.properties?.ZCTA5CE10 === zipCode
  )
  if (!feature) throw new Error(`ZCTA not found: ${zipCode}`)
  return feature
}

async function fetchZipPointFallback(zipCode) {
  const url = new URL("https://nominatim.openstreetmap.org/search")
  url.searchParams.set("format", "geojson")
  url.searchParams.set("polygon_geojson", "1")
  url.searchParams.set("limit", "1")
  url.searchParams.set("countrycodes", "us")
  url.searchParams.set("q", zipCode)

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.features?.[0] ?? null
}

function rectangleGeometryAroundPoint([lng, lat]) {
  const spanLng = 0.018
  const spanLat = 0.014
  return {
    type: "Polygon",
    coordinates: [
      [
        [lng - spanLng, lat - spanLat],
        [lng + spanLng, lat - spanLat],
        [lng + spanLng, lat + spanLat],
        [lng - spanLng, lat + spanLat],
        [lng - spanLng, lat - spanLat],
      ],
    ],
  }
}

async function geometryForZip(zctaCollection, zipCode) {
  const zctaFeature = zctaCollection.features.find(
    (item) => item.properties?.ZCTA5CE10 === zipCode
  )
  if (zctaFeature?.geometry) {
    return {
      geometry: zctaFeature.geometry,
      source: "zcta",
    }
  }

  const fallbackFeature = await fetchZipPointFallback(zipCode)
  if (fallbackFeature?.geometry?.type === "Point") {
    return {
      geometry: rectangleGeometryAroundPoint(fallbackFeature.geometry.coordinates),
      source: "postcode-point-fallback",
    }
  }

  throw new Error(`ZCTA not found: ${zipCode}`)
}

function assetZipCodes() {
  const source = fs.readFileSync(ASSETS_SOURCE, "utf8")
  const zips = [...source.matchAll(/address:\s*"[^"]*,\s*[A-Z]{2}\s+(\d{5})(?:-\d{4})?"/g)]
    .map((match) => match[1])
    .filter(Boolean)
  return [...new Set(zips)].sort()
}

const LOWER_48_EXCLUDED = new Set(["AK", "HI", "PR"])

function usNationalOutlineGeometry(stateCollection) {
  const lower48States = stateCollection.features.filter((feature) => {
    const stusps = feature.properties?.STUSPS
    return stusps && !LOWER_48_EXCLUDED.has(stusps)
  })

  if (lower48States.length === 0) {
    throw new Error("No lower-48 state geometries found")
  }

  const merged = union(flatten(featureCollection(lower48States)))
  if (!merged?.geometry) {
    throw new Error("Failed to merge lower-48 state geometries")
  }

  return merged.geometry
}

async function main() {
  const { msaCollection, stateCollection, zctaCollection } =
    await loadFeatureCollections()
  /** @type {Record<string, unknown>} */
  const output = {}
  const failures = []

  try {
    const outline = usNationalOutlineGeometry(stateCollection)
    output["us-national"] = {
      id: "us-national",
      bounds: boundsFromGeometry(outline),
      geometry: {
        type: "Feature",
        properties: {
          source: "state-lower48-union",
          censusName: "United States (lower 48)",
        },
        geometry: outline,
      },
    }
    console.log("✓ us-national")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push({ id: "us-national", error: message })
    console.error(`✗ us-national: ${message}`)
  }

  for (const zipCode of assetZipCodes()) {
    const id = `zip-${zipCode}`
    try {
      const { geometry, source } = await geometryForZip(zctaCollection, zipCode)
      if (
        !geometry ||
        (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")
      ) {
        throw new Error(`Unsupported geometry for ${id}`)
      }

      output[id] = {
        id,
        bounds: boundsFromGeometry(geometry),
        geometry: {
          type: "Feature",
          properties: {
            source,
            zcta: zipCode,
          },
          geometry,
        },
      }
      console.log(`✓ ${id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push({ id, error: message })
      console.error(`✗ ${id}: ${message}`)
    }
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
