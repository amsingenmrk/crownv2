#!/usr/bin/env node
/**
 * Builds lib/benchmark-data/benchmark-hierarchy.json from benchmarks.csv.
 *
 * The compact benchmarks.json only stores per-geo metric values; it carries no
 * parent/child links. This index derives the geo hierarchy so the
 * benchmark-area breadcrumb can source its options from the benchmark data.
 *
 * Navigation (largest → smallest):
 *   national → regional hub → (state | CBSA | office submarket) → county → ZIP
 *
 * State, CBSA, and office submarket are peer "submarket-tier" nodes under a
 * regional hub — they are not 1:1 with each other. Counties hang off whichever
 * peer is selected; ZIPs hang off counties.
 *
 * Ancestry is read from ZIP rows (which carry every ancestor column). Node keys
 * match benchmarks.json (statsKeyForRow) so breadcrumb areas resolve stats
 * directly.
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

/**
 * Nodes present on a ZIP row, used to wire the peer-based ancestry graph:
 * national → hub → {state, cbsa, submarket} → county → zip
 */
function nodesForZipRow(row) {
  const stateAbbr = stateAbbrFromRow(row)
  const countyName = row.county?.trim()
  const cbsaCode = row.cbsa_code?.trim()
  const submarketName = row.office_submarket_name?.trim()
  const hubName = row.office_regional_hub?.trim()
  const zip = row.zip_code?.trim()

  const national = {
    level: "national",
    key: "national",
    label: "United States",
  }
  const hub =
    hubName && hubName !== "null"
      ? { level: "regional_hub", key: norm(hubName), label: hubName }
      : null
  const state = stateAbbr
    ? {
        level: "state",
        key: stateAbbr.toUpperCase(),
        label: stateNameFromAbbr(stateAbbr) ?? stateAbbr,
      }
    : null
  const cbsa =
    cbsaCode && cbsaCode !== "null"
      ? {
          level: "cbsa",
          key: cbsaCode,
          label: row.cbsa_title?.trim() || cbsaCode,
        }
      : null
  const county =
    countyName && countyName !== "null" && stateAbbr
      ? {
          level: "county",
          key: `${norm(countyName)}|${stateAbbr.toUpperCase()}`,
          label: `${countyName} County, ${stateAbbr.toUpperCase()}`,
        }
      : null
  const submarket =
    submarketName &&
    submarketName !== "null" &&
    submarketName !== "Outside Metro Area"
      ? {
          level: "submarket",
          key: norm(submarketName),
          label: submarketName,
        }
      : null
  const zipNode = zip
    ? { level: "zip", key: zip, label: geoLabelForRow(row) }
    : null

  return { national, hub, state, cbsa, county, submarket, zip: zipNode }
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
  if (parent == null || child == null) return
  const pid = nodeId(parent.level, parent.key)
  children[pid] ??= {}
  children[pid][child.level] ??= new Set()
  children[pid][child.level].add(child.key)
}

const ensureNode = (node) => {
  if (node == null) return
  const id = nodeId(node.level, node.key)
  if (!nodes[id]) nodes[id] = { ...node }
}

for (const row of rows) {
  if (row.geo_level?.trim() !== "zip") continue
  const { national, hub, state, cbsa, county, submarket, zip } =
    nodesForZipRow(row)

  for (const node of [national, hub, state, cbsa, county, submarket, zip]) {
    ensureNode(node)
  }

  // US → regional hub (fall back to state when hub is missing).
  if (hub) addChild(national, hub)
  else if (state) addChild(national, state)

  // Hub → peer submarket-tier nodes (state, CBSA, office submarket).
  if (hub) {
    addChild(hub, state)
    addChild(hub, cbsa)
    addChild(hub, submarket)
  } else if (state) {
    // No hub: keep peers reachable from state as a stand-in parent.
    addChild(state, cbsa)
    addChild(state, submarket)
  }

  // Each selected peer → county (so drill-down works from any peer).
  addChild(state, county)
  addChild(cbsa, county)
  addChild(submarket, county)

  // County → ZIP (skip office submarket so ZIP is the leaf nav tier).
  if (county) addChild(county, zip)
  else if (submarket) addChild(submarket, zip)
  else if (cbsa) addChild(cbsa, zip)
  else if (state) addChild(state, zip)
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
console.log(
  `NJ hub children levels:`,
  Object.keys(childrenOut[nodeId("regional_hub", "new jersey")] ?? {})
)
