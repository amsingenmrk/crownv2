#!/usr/bin/env node
/**
 * Converts lib/benchmark-data/asset-percentiles.csv into asset-percentiles.json.
 *
 * Expected CSV columns (from the per-asset percentile export):
 *   building_id, property_id, city, state, zip_code, geo_level, geo_id,
 *   cbsa_code, cbsa_title, office_submarket_name, county,
 *   {metric}_value, {metric}_percentile, {metric}_is_usable, {metric}_peer_count_bucket
 *
 * Optional:
 *   asset_slug — overrides the building_id → app slug lookup
 *
 * Usage:
 *   node scripts/generate-asset-percentiles.mjs
 *   node scripts/generate-asset-percentiles.mjs --input path/to/export.csv --output path/to/out.json
 */

import fs from "node:fs"
import path from "node:path"
import { readCsvFile } from "./lib/csv-utils.mjs"
import {
  compareGeoLevel,
  geoIdForRow,
  geoLabelForRow,
  parseNullableBoolean,
  parseNullableNumber,
  statsKeyForRow,
} from "./lib/benchmark-geo.mjs"
import { loadBuildingSlugMap } from "./lib/building-slug-map.mjs"

const ROOT = process.cwd()
const DEFAULT_INPUT = path.join(ROOT, "lib/benchmark-data/asset-percentiles.csv")
const DEFAULT_OUTPUT = path.join(ROOT, "lib/benchmark-data/asset-percentiles.json")

const KPI_METRICS = [
  "occupancy",
  "intrinsic_cap_rate",
  "value",
  "asking_rent",
  "in_place_rent",
  "intrinsic_rent",
  "sun_score",
  "view_score",
  "amenity_quality_score",
  "accessibility_score",
]

function parseArgs(argv) {
  /** @type {{ input: string; output: string }} */
  const args = { input: DEFAULT_INPUT, output: DEFAULT_OUTPUT }
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === "--input") args.input = path.resolve(argv[++index] ?? "")
    else if (token === "--output") args.output = path.resolve(argv[++index] ?? "")
    else if (token === "--help" || token === "-h") {
      console.log(`Usage: node scripts/generate-asset-percentiles.mjs [--input csv] [--output json]`)
      process.exit(0)
    }
  }
  return args
}

function nullableString(value) {
  if (value == null || value === "" || value === "null") return null
  return value
}

function kpisFromRow(row) {
  /** @type {Record<string, unknown>} */
  const kpis = {}
  for (const metric of KPI_METRICS) {
    kpis[metric] = {
      value: parseNullableNumber(row[`${metric}_value`]),
      percentile: parseNullableNumber(row[`${metric}_percentile`]),
      isUsable: parseNullableBoolean(row[`${metric}_is_usable`]) ?? false,
      peerBucket: nullableString(row[`${metric}_peer_count_bucket`]),
    }
  }
  return kpis
}

function levelFromRow(row) {
  return {
    geoLevel: row.geo_level?.trim() ?? "",
    geoId: geoIdForRow(row),
    geoLabel: geoLabelForRow(row),
    statsKey: statsKeyForRow(row),
    kpis: kpisFromRow(row),
  }
}

export function buildAssetPercentilesJson(rows, slugByBuildingId) {
  /** @type {Record<string, { buildingId: string; propertyId: string; levels: unknown[] }>} */
  const output = {}
  const unknownBuildingIds = new Set()

  for (const row of rows) {
    const buildingId = row.building_id?.trim()
    if (!buildingId) continue

    const slug =
      row.asset_slug?.trim() ||
      slugByBuildingId[buildingId] ||
      buildingId

    if (!row.asset_slug?.trim() && !slugByBuildingId[buildingId]) {
      unknownBuildingIds.add(buildingId)
    }

    if (output[slug] == null) {
      output[slug] = {
        buildingId,
        propertyId: row.property_id?.trim() ?? "",
        levels: [],
      }
    }

    output[slug].levels.push(levelFromRow(row))
  }

  for (const entry of Object.values(output)) {
    entry.levels.sort((a, b) => compareGeoLevel(a.geoLevel, b.geoLevel))
  }

  return { output, unknownBuildingIds: [...unknownBuildingIds] }
}

function main() {
  const { input, output } = parseArgs(process.argv.slice(2))
  if (!fs.existsSync(input)) {
    console.error(`Input CSV not found: ${input}`)
    process.exit(1)
  }

  const rows = readCsvFile(input)
  const slugByBuildingId = loadBuildingSlugMap(ROOT)
  const { output: json, unknownBuildingIds } = buildAssetPercentilesJson(
    rows,
    slugByBuildingId
  )

  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, `${JSON.stringify(json)}\n`)

  const assetCount = Object.keys(json).length
  const levelCount = Object.values(json).reduce(
    (sum, entry) => sum + entry.levels.length,
    0
  )
  console.log(
    `Wrote ${assetCount} assets (${levelCount} geo levels) to ${path.relative(ROOT, output)}`
  )

  if (unknownBuildingIds.length > 0) {
    console.warn(
      `Warning: ${unknownBuildingIds.length} building_id(s) had no app slug mapping. ` +
        `Used building_id as key. Add asset_slug column or update scripts/lib/building-slug-map.mjs:\n` +
        unknownBuildingIds.map((id) => `  - ${id}`).join("\n")
    )
  }
}

main()
