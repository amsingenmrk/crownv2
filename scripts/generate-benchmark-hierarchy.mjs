#!/usr/bin/env node
/**
 * Builds lib/benchmark-data/benchmark-hierarchy.json from benchmarks.csv.
 *
 * The compact benchmarks.json only stores per-geo metric values; it carries no
 * parent/child links. This index derives the geo hierarchy
 * (national → regional hub → state → CBSA → county → submarket → ZIP) so the
 * benchmark-area breadcrumb can source its options from the benchmark data.
 *
 * Ancestry is read from ZIP rows (which carry every ancestor column). Levels
 * that are null for a given ZIP are skipped, so a parent links to the next
 * populated level. Node keys match benchmarks.json (statsKeyForRow) so the
 * breadcrumb areas resolve their stats directly.
 *
 * Usage: node scripts/generate-benchmark-hierarchy.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { readCsvFile } from "./lib/csv-utils.mjs"
import {
  GEO_LEVEL_ORDER,
  geoLabelForRow,
  norm,
  stateAbbrFromRow,
  stateNameFromAbbr,
  statsKeyForRow,
} from "./lib/benchmark-geo.mjs"

const ROOT = process.cwd()
const INPUT = path.join(ROOT, "lib/benchmark-data/benchmarks.csv")
const OUTPUT = path.join(ROOT, "lib/benchmark-data/benchmark-hierarchy.json")

const nodeId = (level, key) => `${level}:${key}`

/** Ordered ancestor chain (level, key, label) present for a ZIP row. */
function chainForZipRow(row) {
  const stateAbbr = stateAbbrFromRow(row)
  const county = row.county?.trim()
  const cbsaCode = row.cbsa_code?.trim()
  const submarket = row.office_submarket_name?.trim()
  const hub = row.office_regional_hub?.trim()
  const zip = row.zip_code?.trim()

  const chain = [{ level: "national", key: "national", label: "United States" }]
  if (hub && hub !== "null")
    chain.push({ level: "regional_hub", key: norm(hub), label: hub })
  if (stateAbbr)
    chain.push({
      level: "state",
      key: stateAbbr.toUpperCase(),
      label: stateNameFromAbbr(stateAbbr) ?? stateAbbr,
    })
  if (cbsaCode && cbsaCode !== "null")
    chain.push({
      level: "cbsa",
      key: cbsaCode,
      label: row.cbsa_title?.trim() || cbsaCode,
    })
  if (county && county !== "null" && stateAbbr)
    chain.push({
      level: "county",
      key: `${norm(county)}|${stateAbbr.toUpperCase()}`,
      label: `${county} County, ${stateAbbr.toUpperCase()}`,
    })
  if (submarket && submarket !== "null" && submarket !== "Outside Metro Area")
    chain.push({
      level: "submarket",
      key: norm(submarket),
      label: submarket,
    })
  if (zip)
    chain.push({ level: "zip", key: zip, label: geoLabelForRow(row) })

  return chain
}

const rows = readCsvFile(INPUT)

/** All nodes that have benchmark data (from every row, for accurate labels). */
const nodes = {}
for (const row of rows) {
  const level = row.geo_level?.trim()
  if (!level || level === "national") continue
  const key = statsKeyForRow(row)
  const id = nodeId(level, key)
  if (!nodes[id]) nodes[id] = { level, key, label: geoLabelForRow(row) }
}
nodes[nodeId("national", "national")] = {
  level: "national",
  key: "national",
  label: "United States",
}

/** children[parentId][childLevel] = Set of child keys */
const children = {}
const addChild = (parent, child) => {
  const pid = nodeId(parent.level, parent.key)
  children[pid] ??= {}
  children[pid][child.level] ??= new Set()
  children[pid][child.level].add(child.key)
}

for (const row of rows) {
  if (row.geo_level?.trim() !== "zip") continue
  const chain = chainForZipRow(row)
  for (let i = 0; i < chain.length - 1; i += 1) {
    addChild(chain[i], chain[i + 1])
    // register any node discovered only via a chain
    const cid = nodeId(chain[i].level, chain[i].key)
    if (!nodes[cid]) nodes[cid] = { ...chain[i] }
  }
  const last = chain[chain.length - 1]
  const lid = nodeId(last.level, last.key)
  if (!nodes[lid]) nodes[lid] = { ...last }
}

/** Serialize children sets → sorted arrays. */
const childrenOut = {}
for (const [pid, byLevel] of Object.entries(children)) {
  childrenOut[pid] = {}
  for (const [childLevel, keySet] of Object.entries(byLevel)) {
    childrenOut[pid][childLevel] = [...keySet].sort((a, b) => {
      const la = nodes[nodeId(childLevel, a)]?.label ?? a
      const lb = nodes[nodeId(childLevel, b)]?.label ?? b
      return la.localeCompare(lb, undefined, { sensitivity: "base" })
    })
  }
}

const out = {
  levelOrder: GEO_LEVEL_ORDER,
  nodes,
  children: childrenOut,
}
fs.writeFileSync(OUTPUT, JSON.stringify(out))
const nodeCount = Object.keys(nodes).length
const byLevel = {}
for (const n of Object.values(nodes)) byLevel[n.level] = (byLevel[n.level] ?? 0) + 1
console.log(`wrote ${OUTPUT}`)
console.log(`nodes: ${nodeCount}`, byLevel)
console.log(
  `national children levels:`,
  Object.keys(childrenOut[nodeId("national", "national")] ?? {})
)
