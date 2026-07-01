/**
 * Benchmark-area hierarchy sourced from the benchmark export
 * (benchmark-hierarchy.json, generated from benchmarks.csv). This drives the
 * benchmark-page breadcrumb / area picker so its options come from the actual
 * benchmark data rather than a curated preset list.
 *
 * Each area's id is `geo:<dataLevel>:<statsKey>` so it resolves its stats
 * directly (see real-benchmarks.ts) and its geo key for asset comparison (see
 * asset-percentiles.ts). `area.level` carries the display level.
 */
import type {
  BenchmarkArea,
  BenchmarkAreaBounds,
  BenchmarkAreaLevel,
} from "@/lib/benchmark-area-types"

import hierarchy from "./benchmark-hierarchy.json"

type HierarchyNode = { level: string; key: string; label: string }
type HierarchyData = {
  levelOrder: string[]
  nodes: Record<string, HierarchyNode>
  children: Record<string, Record<string, string[]>>
}

const DATA = hierarchy as unknown as HierarchyData

const US_BOUNDS: BenchmarkAreaBounds = [
  [-125, 24],
  [-66, 50],
]

/** Data (CSV) level → display level used by the UI. */
const DISPLAY_LEVEL: Record<string, BenchmarkAreaLevel> = {
  national: "country",
  regional_hub: "regionalHub",
  state: "state",
  cbsa: "market",
  county: "county",
  submarket: "submarket",
  zip: "zip",
}

const LEVEL_LABEL: Record<string, string> = {
  national: "U.S.",
  regional_hub: "Region",
  state: "State",
  cbsa: "Metro",
  county: "County",
  submarket: "Submarket",
  zip: "ZIP",
}

const NODE_ID = (dataLevel: string, key: string) => `${dataLevel}:${key}`
const AREA_ID = (dataLevel: string, key: string) => `geo:${dataLevel}:${key}`

/** Parse an area id back to its node id (`<dataLevel>:<key>`), or null. */
function nodeIdFromAreaId(areaId: string): string | null {
  if (!areaId.startsWith("geo:")) return null
  return areaId.slice(4)
}

/** parentNodeId for each child nodeId (single-parent tree). */
const PARENT_OF: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  for (const [parentId, byLevel] of Object.entries(DATA.children)) {
    for (const [childLevel, keys] of Object.entries(byLevel)) {
      for (const key of keys) {
        const childId = NODE_ID(childLevel, key)
        if (out[childId] == null) out[childId] = parentId
      }
    }
  }
  return out
})()

function areaFromNodeId(nodeId: string): BenchmarkArea | null {
  const node = DATA.nodes[nodeId]
  if (node == null) return null
  const dataLevel = node.level
  const childMap = DATA.children[nodeId]
  const childDataLevel = childMap ? Object.keys(childMap)[0] : undefined
  const parentNodeId = PARENT_OF[nodeId]
  return {
    id: AREA_ID(dataLevel, node.key),
    label: node.label,
    bounds: US_BOUNDS,
    level: DISPLAY_LEVEL[dataLevel] ?? "market",
    childLevel:
      childDataLevel != null ? DISPLAY_LEVEL[childDataLevel] : undefined,
    parentId: parentNodeId != null ? `geo:${parentNodeId}` : undefined,
    geocodeQuery: node.label,
    isCurated: false,
    aliases: [node.label, node.key],
  }
}

export const HIERARCHY_ROOT_AREA: BenchmarkArea = areaFromNodeId(
  NODE_ID("national", "national")
)!

export function hierarchyAreaById(areaId: string): BenchmarkArea | null {
  const nodeId = nodeIdFromAreaId(areaId)
  if (nodeId == null) return null
  return areaFromNodeId(nodeId)
}

export function hierarchyChildren(area: BenchmarkArea): BenchmarkArea[] {
  const nodeId = nodeIdFromAreaId(area.id)
  if (nodeId == null) return []
  const childMap = DATA.children[nodeId]
  if (childMap == null) return []
  const out: BenchmarkArea[] = []
  for (const [childLevel, keys] of Object.entries(childMap)) {
    for (const key of keys) {
      const child = areaFromNodeId(NODE_ID(childLevel, key))
      if (child != null) out.push(child)
    }
  }
  return out
}

export function hierarchyAreaParent(area: BenchmarkArea): BenchmarkArea | null {
  const nodeId = nodeIdFromAreaId(area.id)
  if (nodeId == null) return null
  const parentNodeId = PARENT_OF[nodeId]
  return parentNodeId != null ? areaFromNodeId(parentNodeId) : null
}

export function hierarchyAreaPath(area: BenchmarkArea): BenchmarkArea[] {
  const path: BenchmarkArea[] = []
  let cursor: BenchmarkArea | null = area
  const guard = new Set<string>()
  while (cursor != null && !guard.has(cursor.id)) {
    guard.add(cursor.id)
    path.unshift(cursor)
    cursor = hierarchyAreaParent(cursor)
  }
  return path
}

export function hierarchyLevelLabel(level: BenchmarkAreaLevel): string {
  const entry = Object.entries(DISPLAY_LEVEL).find(([, v]) => v === level)
  return entry ? LEVEL_LABEL[entry[0]]! : level
}

/** Search hierarchy nodes by label/key (broad → specific), capped. */
export function searchHierarchyAreas(
  query: string,
  limit = 8
): BenchmarkArea[] {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return []
  const levelRank = (dataLevel: string) => DATA.levelOrder.indexOf(dataLevel)
  const scored: Array<{ area: BenchmarkArea; exact: boolean; rank: number }> = []
  for (const [nodeId, node] of Object.entries(DATA.nodes)) {
    const label = node.label.toLowerCase()
    if (!label.includes(q) && !node.key.toLowerCase().includes(q)) continue
    const area = areaFromNodeId(nodeId)
    if (area == null) continue
    scored.push({
      area,
      exact: label === q || label.startsWith(q),
      rank: levelRank(node.level),
    })
  }
  scored.sort((a, b) => {
    if (a.exact !== b.exact) return a.exact ? -1 : 1
    if (a.rank !== b.rank) return a.rank - b.rank
    return a.area.label.localeCompare(b.area.label, undefined, {
      sensitivity: "base",
    })
  })
  return scored.slice(0, limit).map((s) => s.area)
}
