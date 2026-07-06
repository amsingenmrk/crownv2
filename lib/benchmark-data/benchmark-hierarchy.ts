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
import { enrichGeoBenchmarkAreaForMap } from "./geo-area-map"

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

/** Navigation tiers for breadcrumb drill-down (largest → smallest). */
const NAV_TIER_DATA_LEVELS: readonly (readonly string[])[] = [
  ["national"],
  ["regional_hub"],
  ["state", "cbsa", "submarket"],
  ["county"],
  ["zip"],
] as const

const NAV_TIER_BENCHMARK_LEVEL: readonly BenchmarkAreaLevel[] = [
  "country",
  "regionalHub",
  "submarket",
  "county",
  "zip",
] as const

const DATA_LEVEL_TO_NAV_TIER: Record<string, number> = {}
for (let tier = 0; tier < NAV_TIER_DATA_LEVELS.length; tier += 1) {
  for (const dataLevel of NAV_TIER_DATA_LEVELS[tier]!) {
    DATA_LEVEL_TO_NAV_TIER[dataLevel] = tier
  }
}

const LEVEL_LABEL: Record<string, string> = {
  national: "U.S.",
  regional_hub: "Region",
  state: "Submarket",
  cbsa: "Submarket",
  submarket: "Submarket",
  county: "County",
  zip: "ZIP",
}

const NODE_ID = (dataLevel: string, key: string) => `${dataLevel}:${key}`
const AREA_ID = (dataLevel: string, key: string) => `geo:${dataLevel}:${key}`

function navTierForDataLevel(dataLevel: string): number {
  return DATA_LEVEL_TO_NAV_TIER[dataLevel] ?? -1
}

function navTierForNodeId(nodeId: string): number {
  return navTierForDataLevel(DATA.nodes[nodeId]?.level ?? "")
}

function navTierForArea(area: BenchmarkArea): number {
  const nodeId = nodeIdFromAreaId(area.id)
  if (nodeId == null) return -1
  return navTierForNodeId(nodeId)
}

function benchmarkLevelForNavTier(tier: number): BenchmarkAreaLevel | undefined {
  return NAV_TIER_BENCHMARK_LEVEL[tier]
}

function hasDescendantsAtNavTier(rootNodeId: string, targetTier: number): boolean {
  const rootTier = navTierForNodeId(rootNodeId)
  if (rootTier < 0 || targetTier <= rootTier) return false

  let found = false
  function walk(nodeId: string): void {
    if (found) return
    const childMap = DATA.children[nodeId]
    if (childMap == null) return

    for (const [childLevel, keys] of Object.entries(childMap)) {
      const childTier = navTierForDataLevel(childLevel)
      for (const key of keys) {
        const childId = NODE_ID(childLevel, key)
        if (childTier === targetTier) {
          found = true
          return
        }
        if (childTier >= 0 && childTier < targetTier) {
          walk(childId)
        }
      }
    }
  }

  walk(rootNodeId)
  return found
}

const NEXT_NAV_TIER_CACHE = new Map<string, number | undefined>()

function nextNavTierWithChildren(nodeId: string): number | undefined {
  if (NEXT_NAV_TIER_CACHE.has(nodeId)) {
    return NEXT_NAV_TIER_CACHE.get(nodeId)
  }

  const currentTier = navTierForNodeId(nodeId)
  if (currentTier < 0) {
    NEXT_NAV_TIER_CACHE.set(nodeId, undefined)
    return undefined
  }

  for (let tier = currentTier + 1; tier < NAV_TIER_DATA_LEVELS.length; tier += 1) {
    if (hasDescendantsAtNavTier(nodeId, tier)) {
      NEXT_NAV_TIER_CACHE.set(nodeId, tier)
      return tier
    }
  }

  NEXT_NAV_TIER_CACHE.set(nodeId, undefined)
  return undefined
}

function collectDescendantsAtNavTier(
  rootNodeId: string,
  targetTier: number
): BenchmarkArea[] {
  const rootTier = navTierForNodeId(rootNodeId)
  if (rootTier < 0 || targetTier <= rootTier) return []

  const out: BenchmarkArea[] = []
  const seenNodeIds = new Set<string>()

  function walk(nodeId: string): void {
    const childMap = DATA.children[nodeId]
    if (childMap == null) return

    for (const [childLevel, keys] of Object.entries(childMap)) {
      const childTier = navTierForDataLevel(childLevel)
      for (const key of keys) {
        const childId = NODE_ID(childLevel, key)
        if (childTier === targetTier) {
          if (!seenNodeIds.has(childId)) {
            seenNodeIds.add(childId)
            const area = areaFromNodeId(childId)
            if (area != null) out.push(area)
          }
          walk(childId)
          continue
        }
        if (childTier >= 0 && childTier < targetTier) {
          walk(childId)
        }
      }
    }
  }

  walk(rootNodeId)
  return out.sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { sensitivity: "base" })
  )
}

function compressPathToNavTiers(pathRootToLeaf: BenchmarkArea[]): BenchmarkArea[] {
  const byTier = new Map<number, BenchmarkArea>()
  for (let index = pathRootToLeaf.length - 1; index >= 0; index -= 1) {
    const area = pathRootToLeaf[index]!
    const tier = navTierForArea(area)
    if (tier >= 0 && !byTier.has(tier)) {
      byTier.set(tier, area)
    }
  }
  return [...byTier.entries()]
    .sort(([leftTier], [rightTier]) => leftTier - rightTier)
    .map(([, area]) => area)
}

/** Parse an area id back to its node id (`<dataLevel>:<key>`), or null. */
function nodeIdFromAreaId(areaId: string): string | null {
  if (!areaId.startsWith("geo:")) return null
  return areaId.slice(4)
}

/** parentNodeIds for each child nodeId (multi-parent DAG from export). */
const PARENTS_OF: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {}
  for (const [parentId, byLevel] of Object.entries(DATA.children)) {
    for (const [childLevel, keys] of Object.entries(byLevel)) {
      for (const key of keys) {
        const childId = NODE_ID(childLevel, key)
        const list = out[childId] ?? []
        if (!list.includes(parentId)) list.push(parentId)
        out[childId] = list
      }
    }
  }
  return out
})()

function pickPreferredParentNodeId(
  childNodeId: string,
  parentNodeIds: readonly string[],
  preferAncestorIds?: ReadonlySet<string>
): string | null {
  if (parentNodeIds.length === 0) return null
  if (parentNodeIds.length === 1) return parentNodeIds[0]!

  if (preferAncestorIds != null) {
    const matchByGeo = parentNodeIds.find((parentId) =>
      preferAncestorIds.has(`geo:${parentId}`)
    )
    if (matchByGeo) return matchByGeo
  }

  const childNode = DATA.nodes[childNodeId]
  if (childNode?.level === "state") {
    const stateLabel = childNode.label.trim().toLowerCase()
    const nameMatch = parentNodeIds.find((parentId) => {
      const parent = DATA.nodes[parentId]
      return (
        parent?.level === "regional_hub" &&
        parent.label.trim().toLowerCase() === stateLabel
      )
    })
    if (nameMatch) return nameMatch
  }

  return [...parentNodeIds].sort((left, right) =>
    (DATA.nodes[left]?.label ?? left).localeCompare(
      DATA.nodes[right]?.label ?? right,
      undefined,
      { sensitivity: "base" }
    )
  )[0]!
}

function areaFromNodeId(nodeId: string): BenchmarkArea | null {
  const node = DATA.nodes[nodeId]
  if (node == null) return null
  const dataLevel = node.level
  const navTier = navTierForDataLevel(dataLevel)
  const nextTier = nextNavTierWithChildren(nodeId)
  const parentNodeId = pickPreferredParentNodeId(nodeId, PARENTS_OF[nodeId] ?? [])
  return enrichGeoBenchmarkAreaForMap({
    id: AREA_ID(dataLevel, node.key),
    label: node.label,
    bounds: US_BOUNDS,
    level: benchmarkLevelForNavTier(navTier) ?? "submarket",
    childLevel:
      nextTier != null ? benchmarkLevelForNavTier(nextTier) : undefined,
    parentId: parentNodeId != null ? `geo:${parentNodeId}` : undefined,
    geocodeQuery: node.label,
    isCurated: false,
    aliases: [node.label, node.key],
  })
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
  const nextTier = nextNavTierWithChildren(nodeId)
  if (nextTier == null) return []
  return collectDescendantsAtNavTier(nodeId, nextTier)
}

export function hierarchyAreaParent(
  area: BenchmarkArea,
  options?: { preferAncestorIds?: ReadonlySet<string> }
): BenchmarkArea | null {
  const nodeId = nodeIdFromAreaId(area.id)
  if (nodeId == null) return null
  const parentNodeId = pickPreferredParentNodeId(
    nodeId,
    PARENTS_OF[nodeId] ?? [],
    options?.preferAncestorIds
  )
  return parentNodeId != null ? areaFromNodeId(parentNodeId) : null
}

export function hierarchyAreaPath(
  area: BenchmarkArea,
  options?: { preferAncestorIds?: ReadonlySet<string> }
): BenchmarkArea[] {
  const path: BenchmarkArea[] = []
  let cursor: BenchmarkArea | null = area
  const guard = new Set<string>()
  const preferAncestorIds = options?.preferAncestorIds
  while (cursor != null && !guard.has(cursor.id)) {
    guard.add(cursor.id)
    path.unshift(cursor)
    cursor = hierarchyAreaParent(cursor, { preferAncestorIds })
  }
  return compressPathToNavTiers(path)
}

export function hierarchyLevelLabel(level: BenchmarkAreaLevel): string {
  if (level === "country") return LEVEL_LABEL.national!
  if (level === "regionalHub") return LEVEL_LABEL.regional_hub!
  if (level === "submarket" || level === "state" || level === "market") {
    return LEVEL_LABEL.submarket!
  }
  if (level === "county") return LEVEL_LABEL.county!
  if (level === "zip") return LEVEL_LABEL.zip!
  return level
}

/** Search hierarchy nodes by label/key (broad → specific), capped. */
export function searchHierarchyAreas(
  query: string,
  limit = 8
): BenchmarkArea[] {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return []
  const levelRank = (dataLevel: string) => navTierForDataLevel(dataLevel)
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
