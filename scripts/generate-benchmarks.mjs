#!/usr/bin/env node
/**
 * Converts lib/benchmark-data/benchmarks.csv into benchmarks.json.
 *
 * Expected CSV columns (from the area-level benchmark export):
 *   geo_level, geo_id, state, cbsa_code, cbsa_title, county,
 *   office_submarket_name, zip_code, city, peer_count,
 *   {metric}_value, {metric}_p5, {metric}_p95, {metric}_is_usable
 *
 * Supported metric prefixes (snake_case):
 *   asking_rent, in_place_rent, occupancy, intrinsic_rent,
 *   observed_cap_rate, intrinsic_cap_rate, sun_score, view_score,
 *   amenity_quality_score, accessibility_score
 *
 * Aliases accepted for ranges: _lo/_hi instead of _p5/_p95; _avg instead of _value.
 *
 * Export current JSON back to CSV (reference template):
 *   node scripts/generate-benchmarks.mjs --export-csv
 *
 * Usage:
 *   node scripts/generate-benchmarks.mjs
 *   node scripts/generate-benchmarks.mjs --input path/to/export.csv --output path/to/out.json
 */

import fs from "node:fs"
import path from "node:path"
import { readCsvFile, writeCsvFile } from "./lib/csv-utils.mjs"
import {
  norm,
  parseNullableBoolean,
  parseNullableNumber,
  statsKeyForRow,
} from "./lib/benchmark-geo.mjs"

const ROOT = process.cwd()
const DEFAULT_INPUT = path.join(ROOT, "lib/benchmark-data/benchmarks.csv")
const DEFAULT_OUTPUT = path.join(ROOT, "lib/benchmark-data/benchmarks.json")
const DEFAULT_JSON = path.join(ROOT, "lib/benchmark-data/benchmarks.json")

const BENCHMARK_METRICS = [
  { snake: "asking_rent", camel: "askingRentPsf" },
  { snake: "in_place_rent", camel: "inPlaceRentPsf" },
  { snake: "occupancy", camel: "occupancyPct" },
  { snake: "intrinsic_rent", camel: "intrinsicRentPsf" },
  { snake: "observed_cap_rate", camel: "observedCapRatePct" },
  { snake: "intrinsic_cap_rate", camel: "intrinsicCapRatePct" },
  { snake: "sun_score", camel: "sunScore" },
  { snake: "view_score", camel: "viewScore" },
  { snake: "amenity_quality_score", camel: "amenityQuality" },
  { snake: "accessibility_score", camel: "accessibilityScore" },
]

const CSV_HEADERS = [
  "geo_level",
  "geo_id",
  "state",
  "cbsa_code",
  "cbsa_title",
  "county",
  "office_submarket_name",
  "zip_code",
  "city",
  "peer_count",
  ...BENCHMARK_METRICS.flatMap(({ snake }) => [
    `${snake}_value`,
    `${snake}_p5`,
    `${snake}_p95`,
    `${snake}_is_usable`,
  ]),
]

function parseArgs(argv) {
  /** @type {{ input: string; output: string; exportCsv: boolean; exportOutput: string }} */
  const args = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    exportCsv: false,
    exportOutput: DEFAULT_INPUT,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === "--input") args.input = path.resolve(argv[++index] ?? "")
    else if (token === "--output") args.output = path.resolve(argv[++index] ?? "")
    else if (token === "--export-csv") args.exportCsv = true
    else if (token === "--export-output") {
      args.exportOutput = path.resolve(argv[++index] ?? "")
    } else if (token === "--help" || token === "-h") {
      console.log(
        `Usage: node scripts/generate-benchmarks.mjs [--input csv] [--output json]\n` +
          `       node scripts/generate-benchmarks.mjs --export-csv [--export-output csv]`
      )
      process.exit(0)
    }
  }

  return args
}

function metricCellFromRow(row, snake) {
  const value = parseNullableNumber(
    row[`${snake}_value`] ?? row[`${snake}_avg`] ?? row[`${snake}_mean`]
  )
  if (value == null) return null

  /** @type {{ v: number; lo?: number; hi?: number; u?: boolean }} */
  const cell = { v: value }
  const lo = parseNullableNumber(row[`${snake}_p5`] ?? row[`${snake}_lo`])
  const hi = parseNullableNumber(row[`${snake}_p95`] ?? row[`${snake}_hi`])
  const usable = parseNullableBoolean(row[`${snake}_is_usable`])

  if (lo != null) cell.lo = lo
  if (hi != null) cell.hi = hi
  if (usable != null) cell.u = usable
  return cell
}

function benchmarkRowFromCsvRow(row) {
  /** @type {Record<string, unknown>} */
  const benchmarkRow = {}
  for (const { snake, camel } of BENCHMARK_METRICS) {
    const cell = metricCellFromRow(row, snake)
    if (cell != null) benchmarkRow[camel] = cell
  }

  const peerCount = parseNullableNumber(row.peer_count ?? row._count)
  if (peerCount != null) benchmarkRow._count = peerCount
  return benchmarkRow
}

export function buildBenchmarksJson(rows) {
  /** @type {{
    national: Record<string, unknown> | null
    state: Record<string, Record<string, unknown>>
    zip: Record<string, Record<string, unknown>>
    county: Record<string, Record<string, unknown>>
    cbsa: Record<string, Record<string, unknown>>
    cbsaTitle: Record<string, Record<string, unknown>>
    submarket: Record<string, Record<string, unknown>>
    regionalHub: Record<string, Record<string, unknown>>
  }} */
  const output = {
    national: null,
    state: {},
    zip: {},
    county: {},
    cbsa: {},
    cbsaTitle: {},
    submarket: {},
    regionalHub: {},
  }

  for (const row of rows) {
    const geoLevel = row.geo_level?.trim()
    if (!geoLevel) continue

    const benchmarkRow = benchmarkRowFromCsvRow(row)
    const statsKey = statsKeyForRow(row)

    switch (geoLevel) {
      case "national":
        output.national = benchmarkRow
        break
      case "state":
        output.state[statsKey.toUpperCase()] = benchmarkRow
        break
      case "zip":
        output.zip[statsKey] = benchmarkRow
        break
      case "county":
        output.county[statsKey] = benchmarkRow
        break
      case "cbsa": {
        output.cbsa[statsKey] = benchmarkRow
        const title = row.cbsa_title?.trim()
        if (title) output.cbsaTitle[norm(title)] = benchmarkRow
        break
      }
      case "submarket":
        output.submarket[statsKey] = benchmarkRow
        break
      case "regional_hub":
        output.regionalHub[statsKey] = benchmarkRow
        break
      default:
        console.warn(`Skipping unknown geo_level "${geoLevel}"`)
    }
  }

  return output
}

function cbsaTitleByCode(json) {
  /** @type {Map<string, string[]>} */
  const titlesBySignature = new Map()
  for (const [title, row] of Object.entries(json.cbsaTitle ?? {})) {
    const signature = JSON.stringify(row)
    const bucket = titlesBySignature.get(signature) ?? []
    bucket.push(title)
    titlesBySignature.set(signature, bucket)
  }

  /** @type {Record<string, string>} */
  const titleByCode = {}
  for (const [code, row] of Object.entries(json.cbsa ?? {})) {
    const signature = JSON.stringify(row)
    const titles = titlesBySignature.get(signature) ?? []
    titleByCode[code] = titles.shift() ?? ""
  }
  return titleByCode
}

function csvRowFromBenchmarkJson(geoLevel, geoId, benchmarkRow, context = {}) {
  /** @type {Record<string, string>} */
  const row = {
    geo_level: geoLevel,
    geo_id: geoId,
    state: context.state ?? "",
    cbsa_code: context.cbsaCode ?? "",
    cbsa_title: context.cbsaTitle ?? "",
    county: context.county ?? "",
    office_submarket_name: context.submarket ?? "",
    zip_code: context.zip ?? "",
    city: context.city ?? "",
    peer_count:
      benchmarkRow._count == null ? "" : String(benchmarkRow._count),
  }

  for (const { snake, camel } of BENCHMARK_METRICS) {
    const cell = benchmarkRow[camel]
    if (cell == null || typeof cell !== "object") {
      row[`${snake}_value`] = ""
      row[`${snake}_p5`] = ""
      row[`${snake}_p95`] = ""
      row[`${snake}_is_usable`] = ""
      continue
    }

    row[`${snake}_value`] = cell.v == null ? "" : String(cell.v)
    row[`${snake}_p5`] = cell.lo == null ? "" : String(cell.lo)
    row[`${snake}_p95`] = cell.hi == null ? "" : String(cell.hi)
    row[`${snake}_is_usable`] =
      cell.u == null ? "" : cell.u ? "true" : "false"
  }

  return row
}

export function benchmarksJsonToCsvRows(json) {
  /** @type {Record<string, string>[]} */
  const rows = []
  const cbsaTitles = cbsaTitleByCode(json)

  if (json.national != null) {
    rows.push(
      csvRowFromBenchmarkJson("national", "united_states", json.national)
    )
  }

  for (const [stateCode, benchmarkRow] of Object.entries(json.state ?? {})) {
    rows.push(
      csvRowFromBenchmarkJson("state", stateCode, benchmarkRow, {
        state: stateCode,
      })
    )
  }

  for (const [zip, benchmarkRow] of Object.entries(json.zip ?? {})) {
    rows.push(csvRowFromBenchmarkJson("zip", zip, benchmarkRow, { zip }))
  }

  for (const [countyKey, benchmarkRow] of Object.entries(json.county ?? {})) {
    const [countyName, stateCode] = countyKey.split("|")
    rows.push(
      csvRowFromBenchmarkJson("county", countyKey, benchmarkRow, {
        county: countyName ?? countyKey,
        state: stateCode ?? "",
      })
    )
  }

  for (const [cbsaCode, benchmarkRow] of Object.entries(json.cbsa ?? {})) {
    rows.push(
      csvRowFromBenchmarkJson("cbsa", cbsaCode, benchmarkRow, {
        cbsaCode,
        cbsaTitle: cbsaTitles[cbsaCode] ?? "",
      })
    )
  }

  for (const [submarket, benchmarkRow] of Object.entries(json.submarket ?? {})) {
    rows.push(
      csvRowFromBenchmarkJson("submarket", submarket, benchmarkRow, {
        submarket,
      })
    )
  }

  for (const [hub, benchmarkRow] of Object.entries(json.regionalHub ?? {})) {
    rows.push(
      csvRowFromBenchmarkJson("regional_hub", hub, benchmarkRow, {
        submarket: hub,
      })
    )
  }

  return rows
}

function exportCsvFromJson(jsonPath, csvPath) {
  const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"))
  const rows = benchmarksJsonToCsvRows(json)
  fs.mkdirSync(path.dirname(csvPath), { recursive: true })
  writeCsvFile(csvPath, CSV_HEADERS, rows)
  console.log(
    `Exported ${rows.length} rows from ${path.relative(ROOT, jsonPath)} to ${path.relative(ROOT, csvPath)}`
  )
}

function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.exportCsv) {
    exportCsvFromJson(DEFAULT_JSON, args.exportOutput)
    return
  }

  if (!fs.existsSync(args.input)) {
    console.error(`Input CSV not found: ${args.input}`)
    console.error(
      `Run "npm run generate:benchmarks:export-csv" to create a template from the current benchmarks.json.`
    )
    process.exit(1)
  }

  const rows = readCsvFile(args.input)
  const json = buildBenchmarksJson(rows)

  fs.mkdirSync(path.dirname(args.output), { recursive: true })
  fs.writeFileSync(args.output, `${JSON.stringify(json)}\n`)

  const counts = {
    national: json.national ? 1 : 0,
    state: Object.keys(json.state).length,
    zip: Object.keys(json.zip).length,
    county: Object.keys(json.county).length,
    cbsa: Object.keys(json.cbsa).length,
    cbsaTitle: Object.keys(json.cbsaTitle).length,
    submarket: Object.keys(json.submarket).length,
    regionalHub: Object.keys(json.regionalHub).length,
  }

  console.log(`Wrote ${path.relative(ROOT, args.output)}`)
  console.log(counts)
}

main()
