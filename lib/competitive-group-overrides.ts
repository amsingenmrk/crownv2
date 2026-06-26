import {
  MARKET_SEARCH_LISTING_COUNT,
  marketSearchDemoHash32,
  marketSearchDemoPinsBase,
} from "@/lib/market-search-demo-listings"

const COMPETITIVE_CUSTOM_GROUPS_KEY = "glassbox:competitive-custom-groups"
const COMPETITIVE_CUSTOM_GROUP_DESCRIPTIONS_KEY =
  "glassbox:competitive-custom-group-descriptions"
const COMPETITIVE_MEMBERSHIP_KEY = "glassbox:competitive-group-membership"
const COMPETITIVE_SEEDED_LABEL_OVERRIDES_KEY =
  "glassbox:competitive-seeded-label-overrides"
const COMPETITIVE_SEEDED_DESCRIPTION_OVERRIDES_KEY =
  "glassbox:competitive-seeded-description-overrides"
const COMPETITIVE_REMOVED_SEEDED_GROUP_IDS_KEY =
  "glassbox:competitive-removed-seeded-group-ids"
const COMPETITIVE_REMOVED_ASSET_IDS_KEY = "glassbox:competitive-removed-asset-ids"
const COMPETITIVE_SEED_VERSION_KEY = "glassbox:competitive-group-seed-version"
const COMPETITIVE_SEED_VERSION = "1"

const COMPETITIVE_CHANGED = "glassbox:competitive-groups-changed"

export const COMPETITIVE_SEEDED_GROUPS = [
  { id: "comp-fund-i", label: "Gateway Core Peers" },
  { id: "comp-fund-ii", label: "Growth Value-Add Peers" },
  { id: "comp-fund-iii", label: "Opportunistic Lease-Up Peers" },
] as const

export const COMPETITIVE_SEEDED_GROUP_DESCRIPTIONS: Record<string, string> = {
  "comp-fund-i":
    "Stabilized, institutional-quality comps in core gateway office submarkets.",
  "comp-fund-ii":
    "Value-add peers with mark-to-market upside and near-term leasing catalysts.",
  "comp-fund-iii":
    "Higher-beta lease-up and repositioning peers with execution-driven growth.",
}

const SEEDED_COMPETITIVE_GROUP_IDS: ReadonlySet<string> = new Set(
  COMPETITIVE_SEEDED_GROUPS.map((group) => group.id)
)

const RESERVED_COMPETITIVE_GROUP_IDS = new Set([
  ...SEEDED_COMPETITIVE_GROUP_IDS,
  "all",
  "",
])

type CompetitiveCustomGroups = Record<string, string>
type CompetitiveMembershipOverrides = Record<string, string[]>
type CompetitiveGroupDescriptions = Record<string, string>
type CompetitiveSeededLabelOverrides = Record<string, string>
type CompetitiveSeededDescriptionOverrides = Record<string, string>

function parseCompetitiveSeededLabelOverrides(
  raw: string
): CompetitiveSeededLabelOverrides {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const out: CompetitiveSeededLabelOverrides = {}
    for (const [groupId, label] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        SEEDED_COMPETITIVE_GROUP_IDS.has(groupId) &&
        typeof label === "string" &&
        label.trim().length > 0 &&
        label.length < 200
      ) {
        out[groupId] = label.trim()
      }
    }
    return out
  } catch {
    return {}
  }
}

function parseCompetitiveSeededDescriptionOverrides(
  raw: string
): CompetitiveSeededDescriptionOverrides {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const out: CompetitiveSeededDescriptionOverrides = {}
    for (const [groupId, description] of Object.entries(
      parsed as Record<string, unknown>
    )) {
      if (
        SEEDED_COMPETITIVE_GROUP_IDS.has(groupId) &&
        typeof description === "string" &&
        description.trim().length > 0 &&
        description.length <= 600
      ) {
        out[groupId] = description.trim()
      }
    }
    return out
  } catch {
    return {}
  }
}

function parseRemovedCompetitiveSeededGroupIds(raw: string): ReadonlySet<string> {
  if (raw === "") return new Set()
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    const out = new Set<string>()
    for (const maybeId of parsed) {
      if (typeof maybeId === "string" && SEEDED_COMPETITIVE_GROUP_IDS.has(maybeId)) {
        out.add(maybeId)
      }
    }
    return out
  } catch {
    return new Set()
  }
}

function parseRemovedCompetitiveAssetIds(raw: string): ReadonlySet<string> {
  if (raw === "") return new Set()
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    const out = new Set<string>()
    for (const maybeId of parsed) {
      if (typeof maybeId === "string" && maybeId.length > 0 && maybeId.length < 200) {
        out.add(maybeId)
      }
    }
    return out
  } catch {
    return new Set()
  }
}

function parseCompetitiveCustomGroups(raw: string): CompetitiveCustomGroups {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const out: CompetitiveCustomGroups = {}
    for (const [id, label] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        typeof id === "string" &&
        id.length > 0 &&
        id.length < 128 &&
        typeof label === "string" &&
        label.trim().length > 0 &&
        label.length < 200
      ) {
        out[id] = label.trim()
      }
    }
    return out
  } catch {
    return {}
  }
}

function parseCompetitiveGroupDescriptions(raw: string): CompetitiveGroupDescriptions {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const out: CompetitiveGroupDescriptions = {}
    for (const [id, description] of Object.entries(
      parsed as Record<string, unknown>
    )) {
      if (
        typeof id === "string" &&
        id.length > 0 &&
        id.length < 128 &&
        typeof description === "string" &&
        description.trim().length > 0 &&
        description.length <= 600
      ) {
        out[id] = description.trim()
      }
    }
    return out
  } catch {
    return {}
  }
}

function parseCompetitiveMembership(raw: string): CompetitiveMembershipOverrides {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const out: CompetitiveMembershipOverrides = {}
    for (const [assetId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof assetId !== "string" || assetId.length === 0 || assetId.length >= 200) {
        continue
      }
      if (!Array.isArray(value)) continue
      const groupIds: string[] = []
      for (const maybeId of value) {
        if (
          typeof maybeId === "string" &&
          maybeId.length > 0 &&
          maybeId.length < 128 &&
          !groupIds.includes(maybeId)
        ) {
          groupIds.push(maybeId)
        }
      }
      if (groupIds.length > 0) out[assetId] = groupIds
    }
    return out
  } catch {
    return {}
  }
}

function seedGroupIdForIndex(index: number): string {
  return COMPETITIVE_SEEDED_GROUPS[index % COMPETITIVE_SEEDED_GROUPS.length]!.id
}

function activeCompetitiveSeededGroupIds(
  removedSeededGroupIds: ReadonlySet<string>
): string[] {
  return COMPETITIVE_SEEDED_GROUPS.map((group) => group.id).filter(
    (groupId) => !removedSeededGroupIds.has(groupId)
  )
}

function firstActiveCompetitiveSeededGroupId(
  removedSeededGroupIds: ReadonlySet<string>
): string {
  return activeCompetitiveSeededGroupIds(removedSeededGroupIds)[0] ?? seedGroupIdForIndex(0)
}

export function defaultCompetitiveSeededGroupIdForAsset(
  assetId: string,
  removedSeededGroupIds: ReadonlySet<string> = new Set()
): string {
  const match = /^mkt-(\d+)$/.exec(assetId)
  const activeSeededIds = activeCompetitiveSeededGroupIds(removedSeededGroupIds)
  if (activeSeededIds.length === 0) return seedGroupIdForIndex(0)
  const fallbackSeededGroupId = firstActiveCompetitiveSeededGroupId(
    removedSeededGroupIds
  )
  if (match?.[1] != null) {
    const index = Number(match[1])
    if (Number.isInteger(index) && index >= 0) {
      const preferredGroupId = seedGroupIdForIndex(index)
      if (!removedSeededGroupIds.has(preferredGroupId)) return preferredGroupId
      return fallbackSeededGroupId
    }
  }
  const preferredGroupId = seedGroupIdForIndex(marketSearchDemoHash32(assetId))
  if (!removedSeededGroupIds.has(preferredGroupId)) return preferredGroupId
  return fallbackSeededGroupId
}

function dispatchCompetitiveChangedEvent(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(COMPETITIVE_CHANGED))
}

export function ensureCompetitiveMembershipSeeded(): void {
  if (typeof window === "undefined") return
  if (
    localStorage.getItem(COMPETITIVE_SEED_VERSION_KEY) === COMPETITIVE_SEED_VERSION
  ) {
    return
  }

  const currentMembership = parseCompetitiveMembership(
    localStorage.getItem(COMPETITIVE_MEMBERSHIP_KEY) ?? ""
  )

  if (Object.keys(currentMembership).length === 0) {
    const seededMembership: CompetitiveMembershipOverrides = {}
    const marketAssets = marketSearchDemoPinsBase(MARKET_SEARCH_LISTING_COUNT)
    for (let index = 0; index < marketAssets.length; index += 1) {
      const asset = marketAssets[index]
      if (!asset) continue
      seededMembership[asset.id] = [seedGroupIdForIndex(index)]
    }
    localStorage.setItem(COMPETITIVE_MEMBERSHIP_KEY, JSON.stringify(seededMembership))
    dispatchCompetitiveChangedEvent()
  }

  localStorage.setItem(COMPETITIVE_SEED_VERSION_KEY, COMPETITIVE_SEED_VERSION)
}

function readCompetitiveCustomGroups(): CompetitiveCustomGroups {
  if (typeof window === "undefined") return {}
  const raw = localStorage.getItem(COMPETITIVE_CUSTOM_GROUPS_KEY)
  if (!raw) return {}
  return parseCompetitiveCustomGroups(raw)
}

function writeCompetitiveCustomGroups(next: CompetitiveCustomGroups): void {
  if (typeof window === "undefined") return
  localStorage.setItem(COMPETITIVE_CUSTOM_GROUPS_KEY, JSON.stringify(next))
  dispatchCompetitiveChangedEvent()
}

function readCompetitiveGroupDescriptions(): CompetitiveGroupDescriptions {
  if (typeof window === "undefined") return {}
  const raw = localStorage.getItem(COMPETITIVE_CUSTOM_GROUP_DESCRIPTIONS_KEY)
  if (!raw) return {}
  return parseCompetitiveGroupDescriptions(raw)
}

function writeCompetitiveGroupDescriptions(next: CompetitiveGroupDescriptions): void {
  if (typeof window === "undefined") return
  if (Object.keys(next).length === 0) {
    localStorage.removeItem(COMPETITIVE_CUSTOM_GROUP_DESCRIPTIONS_KEY)
  } else {
    localStorage.setItem(
      COMPETITIVE_CUSTOM_GROUP_DESCRIPTIONS_KEY,
      JSON.stringify(next)
    )
  }
  dispatchCompetitiveChangedEvent()
}

function readCompetitiveSeededLabelOverrides(): CompetitiveSeededLabelOverrides {
  if (typeof window === "undefined") return {}
  const raw = localStorage.getItem(COMPETITIVE_SEEDED_LABEL_OVERRIDES_KEY)
  if (!raw) return {}
  return parseCompetitiveSeededLabelOverrides(raw)
}

function writeCompetitiveSeededLabelOverrides(
  next: CompetitiveSeededLabelOverrides
): void {
  if (typeof window === "undefined") return
  if (Object.keys(next).length === 0) {
    localStorage.removeItem(COMPETITIVE_SEEDED_LABEL_OVERRIDES_KEY)
  } else {
    localStorage.setItem(
      COMPETITIVE_SEEDED_LABEL_OVERRIDES_KEY,
      JSON.stringify(next)
    )
  }
  dispatchCompetitiveChangedEvent()
}

function readCompetitiveSeededDescriptionOverrides(): CompetitiveSeededDescriptionOverrides {
  if (typeof window === "undefined") return {}
  const raw = localStorage.getItem(COMPETITIVE_SEEDED_DESCRIPTION_OVERRIDES_KEY)
  if (!raw) return {}
  return parseCompetitiveSeededDescriptionOverrides(raw)
}

function writeCompetitiveSeededDescriptionOverrides(
  next: CompetitiveSeededDescriptionOverrides
): void {
  if (typeof window === "undefined") return
  if (Object.keys(next).length === 0) {
    localStorage.removeItem(COMPETITIVE_SEEDED_DESCRIPTION_OVERRIDES_KEY)
  } else {
    localStorage.setItem(
      COMPETITIVE_SEEDED_DESCRIPTION_OVERRIDES_KEY,
      JSON.stringify(next)
    )
  }
  dispatchCompetitiveChangedEvent()
}

function readRemovedCompetitiveSeededGroupIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  return new Set(
    parseRemovedCompetitiveSeededGroupIds(
      localStorage.getItem(COMPETITIVE_REMOVED_SEEDED_GROUP_IDS_KEY) ?? ""
    )
  )
}

function writeRemovedCompetitiveSeededGroupIds(ids: Set<string>): void {
  if (typeof window === "undefined") return
  if (ids.size === 0) {
    localStorage.removeItem(COMPETITIVE_REMOVED_SEEDED_GROUP_IDS_KEY)
  } else {
    localStorage.setItem(
      COMPETITIVE_REMOVED_SEEDED_GROUP_IDS_KEY,
      JSON.stringify([...ids])
    )
  }
  dispatchCompetitiveChangedEvent()
}

function readRemovedCompetitiveAssetIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  return new Set(
    parseRemovedCompetitiveAssetIds(
      localStorage.getItem(COMPETITIVE_REMOVED_ASSET_IDS_KEY) ?? ""
    )
  )
}

function writeRemovedCompetitiveAssetIds(ids: Set<string>): void {
  if (typeof window === "undefined") return
  if (ids.size === 0) {
    localStorage.removeItem(COMPETITIVE_REMOVED_ASSET_IDS_KEY)
  } else {
    localStorage.setItem(
      COMPETITIVE_REMOVED_ASSET_IDS_KEY,
      JSON.stringify([...ids])
    )
  }
  dispatchCompetitiveChangedEvent()
}

export function readCompetitiveMembershipOverrides(): CompetitiveMembershipOverrides {
  if (typeof window === "undefined") return {}
  ensureCompetitiveMembershipSeeded()
  const raw = localStorage.getItem(COMPETITIVE_MEMBERSHIP_KEY)
  if (!raw) return {}
  return parseCompetitiveMembership(raw)
}

function writeCompetitiveMembershipOverrides(next: CompetitiveMembershipOverrides): void {
  if (typeof window === "undefined") return
  localStorage.setItem(COMPETITIVE_MEMBERSHIP_KEY, JSON.stringify(next))
  dispatchCompetitiveChangedEvent()
}

function slugifyForCompetitiveGroupId(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
  return slug.length > 0 ? slug.slice(0, 48) : "group"
}

export function addCustomCompetitiveGroup(
  displayName: string,
  description?: string
): { id: string; label: string } | null {
  if (typeof window === "undefined") return null
  const trimmed = displayName.trim()
  if (!trimmed) return null

  const current = readCompetitiveCustomGroups()
  const baseId = `cgrp-${slugifyForCompetitiveGroupId(trimmed)}`
  let id = baseId
  let suffix = 0
  while (current[id] != null || RESERVED_COMPETITIVE_GROUP_IDS.has(id)) {
    suffix += 1
    id = `${baseId}-${suffix}`
  }

  writeCompetitiveCustomGroups({ ...current, [id]: trimmed })
  const descriptionTrimmed = description?.trim()
  if (descriptionTrimmed) {
    const descriptions = readCompetitiveGroupDescriptions()
    writeCompetitiveGroupDescriptions({
      ...descriptions,
      [id]: descriptionTrimmed.slice(0, 600),
    })
  }

  return { id, label: trimmed }
}

export function updateCustomCompetitiveGroupById(
  groupId: string,
  updates: { name: string; description?: string }
): boolean {
  if (typeof window === "undefined") return false
  const trimmedName = updates.name.trim()
  if (!trimmedName) return false
  const current = readCompetitiveCustomGroups()
  if (!Object.hasOwn(current, groupId)) return false

  if (current[groupId] !== trimmedName) {
    writeCompetitiveCustomGroups({ ...current, [groupId]: trimmedName })
  }

  if (Object.hasOwn(updates, "description")) {
    const nextDescription = (updates.description ?? "").trim().slice(0, 600)
    const descriptions = readCompetitiveGroupDescriptions()
    if (nextDescription.length === 0) {
      if (Object.hasOwn(descriptions, groupId)) {
        const { [groupId]: removedGroupId, ...rest } = descriptions
        void removedGroupId
        writeCompetitiveGroupDescriptions(rest)
      }
    } else if (descriptions[groupId] !== nextDescription) {
      writeCompetitiveGroupDescriptions({
        ...descriptions,
        [groupId]: nextDescription,
      })
    }
  }

  return true
}

export function removeCustomCompetitiveGroupById(groupId: string): boolean {
  if (typeof window === "undefined") return false
  const current = readCompetitiveCustomGroups()
  if (!Object.hasOwn(current, groupId)) return false

  const { [groupId]: removedGroupId, ...rest } = current
  void removedGroupId
  writeCompetitiveCustomGroups(rest)

  const descriptions = readCompetitiveGroupDescriptions()
  if (Object.hasOwn(descriptions, groupId)) {
    const { [groupId]: removedDescription, ...descRest } = descriptions
    void removedDescription
    writeCompetitiveGroupDescriptions(descRest)
  }

  const membership = readCompetitiveMembershipOverrides()
  const nextMembership: CompetitiveMembershipOverrides = {}
  for (const [assetId, groupIds] of Object.entries(membership)) {
    const filtered = groupIds.filter((id) => id !== groupId)
    if (filtered.length > 0) nextMembership[assetId] = filtered
  }
  writeCompetitiveMembershipOverrides(nextMembership)
  return true
}

export function updateSeededCompetitiveGroupById(
  groupId: string,
  updates: { name: string; description?: string }
): boolean {
  if (typeof window === "undefined") return false
  if (!SEEDED_COMPETITIVE_GROUP_IDS.has(groupId)) return false
  const trimmedName = updates.name.trim()
  if (!trimmedName) return false

  let changed = false
  const removedSeededGroupIds = readRemovedCompetitiveSeededGroupIds()
  if (removedSeededGroupIds.delete(groupId)) {
    writeRemovedCompetitiveSeededGroupIds(removedSeededGroupIds)
    changed = true
  }

  const labelOverrides = readCompetitiveSeededLabelOverrides()
  if (labelOverrides[groupId] !== trimmedName) {
    writeCompetitiveSeededLabelOverrides({
      ...labelOverrides,
      [groupId]: trimmedName,
    })
    changed = true
  }

  if (Object.hasOwn(updates, "description")) {
    const nextDescription = (updates.description ?? "").trim().slice(0, 600)
    const descriptionOverrides = readCompetitiveSeededDescriptionOverrides()
    if (nextDescription.length === 0) {
      if (Object.hasOwn(descriptionOverrides, groupId)) {
        const { [groupId]: removedDescription, ...rest } = descriptionOverrides
        void removedDescription
        writeCompetitiveSeededDescriptionOverrides(rest)
        changed = true
      }
    } else if (descriptionOverrides[groupId] !== nextDescription) {
      writeCompetitiveSeededDescriptionOverrides({
        ...descriptionOverrides,
        [groupId]: nextDescription,
      })
      changed = true
    }
  }

  return changed
}

export function removeSeededCompetitiveGroupById(groupId: string): boolean {
  if (typeof window === "undefined") return false
  if (!SEEDED_COMPETITIVE_GROUP_IDS.has(groupId)) return false

  let changed = false
  const removedSeededGroupIds = readRemovedCompetitiveSeededGroupIds()
  if (!removedSeededGroupIds.has(groupId)) {
    removedSeededGroupIds.add(groupId)
    writeRemovedCompetitiveSeededGroupIds(removedSeededGroupIds)
    changed = true
  }

  const labelOverrides = readCompetitiveSeededLabelOverrides()
  if (Object.hasOwn(labelOverrides, groupId)) {
    const { [groupId]: removedLabel, ...rest } = labelOverrides
    void removedLabel
    writeCompetitiveSeededLabelOverrides(rest)
    changed = true
  }

  const descriptionOverrides = readCompetitiveSeededDescriptionOverrides()
  if (Object.hasOwn(descriptionOverrides, groupId)) {
    const { [groupId]: removedDescription, ...rest } = descriptionOverrides
    void removedDescription
    writeCompetitiveSeededDescriptionOverrides(rest)
    changed = true
  }

  const membership = readCompetitiveMembershipOverrides()
  const nextMembership: CompetitiveMembershipOverrides = {}
  let membershipChanged = false
  for (const [assetId, groupIds] of Object.entries(membership)) {
    const filtered = groupIds.filter((id) => id !== groupId)
    if (filtered.length !== groupIds.length) membershipChanged = true
    if (filtered.length > 0) nextMembership[assetId] = filtered
  }
  if (membershipChanged) {
    writeCompetitiveMembershipOverrides(nextMembership)
    changed = true
  }

  return changed
}

export function updateCompetitiveGroupById(
  groupId: string,
  updates: { name: string; description?: string }
): boolean {
  if (SEEDED_COMPETITIVE_GROUP_IDS.has(groupId)) {
    return updateSeededCompetitiveGroupById(groupId, updates)
  }
  return updateCustomCompetitiveGroupById(groupId, updates)
}

export function removeCompetitiveGroupById(groupId: string): boolean {
  if (SEEDED_COMPETITIVE_GROUP_IDS.has(groupId)) {
    return removeSeededCompetitiveGroupById(groupId)
  }
  return removeCustomCompetitiveGroupById(groupId)
}

function restoreRemovedSeededCompetitiveGroup(groupId: string): boolean {
  if (!SEEDED_COMPETITIVE_GROUP_IDS.has(groupId)) return false
  const removedSeededGroupIds = readRemovedCompetitiveSeededGroupIds()
  if (!removedSeededGroupIds.delete(groupId)) return false
  writeRemovedCompetitiveSeededGroupIds(removedSeededGroupIds)
  return true
}

function activeCompetitiveAllowedGroupIds(
  customGroups: CompetitiveCustomGroups,
  removedSeededGroupIds: ReadonlySet<string>
): Set<string> {
  return new Set<string>([
    ...activeCompetitiveSeededGroupIds(removedSeededGroupIds),
    ...Object.keys(customGroups),
  ])
}

function clearRemovedCompetitiveAsset(assetId: string): boolean {
  const removedAssetIds = readRemovedCompetitiveAssetIds()
  if (!removedAssetIds.delete(assetId)) return false
  writeRemovedCompetitiveAssetIds(removedAssetIds)
  return true
}

export function removeCompetitiveAssetFromOtherAssets(assetId: string): boolean {
  if (typeof window === "undefined") return false
  const membershipOverrides = readCompetitiveMembershipOverrides()
  let changed = false
  if (Object.hasOwn(membershipOverrides, assetId)) {
    delete membershipOverrides[assetId]
    writeCompetitiveMembershipOverrides(membershipOverrides)
    changed = true
  }
  const removedAssetIds = readRemovedCompetitiveAssetIds()
  if (!removedAssetIds.has(assetId)) {
    removedAssetIds.add(assetId)
    writeRemovedCompetitiveAssetIds(removedAssetIds)
    changed = true
  }
  return changed
}

export function removeCompetitiveAssetsFromOtherAssets(
  assetIds: readonly string[]
): number {
  if (typeof window === "undefined" || assetIds.length === 0) return 0
  const membershipOverrides = readCompetitiveMembershipOverrides()
  const removedAssetIds = readRemovedCompetitiveAssetIds()
  let membershipChanged = false
  let removedChanged = false
  let changedCount = 0

  for (const assetId of new Set(assetIds)) {
    let changed = false
    if (Object.hasOwn(membershipOverrides, assetId)) {
      delete membershipOverrides[assetId]
      membershipChanged = true
      changed = true
    }
    if (!removedAssetIds.has(assetId)) {
      removedAssetIds.add(assetId)
      removedChanged = true
      changed = true
    }
    if (changed) changedCount += 1
  }

  if (membershipChanged) writeCompetitiveMembershipOverrides(membershipOverrides)
  if (removedChanged) writeRemovedCompetitiveAssetIds(removedAssetIds)
  return changedCount
}

export function addCompetitiveAssetToGroup(assetId: string, groupId: string): boolean {
  if (typeof window === "undefined") return false
  restoreRemovedSeededCompetitiveGroup(groupId)
  const removedRestored = clearRemovedCompetitiveAsset(assetId)
  const customGroups = readCompetitiveCustomGroups()
  const removedSeededGroupIds = readRemovedCompetitiveSeededGroupIds()
  const removedAssetIds = readRemovedCompetitiveAssetIds()
  const allowedGroupIds = activeCompetitiveAllowedGroupIds(
    customGroups,
    removedSeededGroupIds
  )
  if (!allowedGroupIds.has(groupId)) return false

  const membershipOverrides = readCompetitiveMembershipOverrides()
  const currentGroupIds = resolveCompetitiveGroupIdsForAsset(
    assetId,
    membershipOverrides,
    { customGroups, removedSeededGroupIds, removedAssetIds }
  )
  if (currentGroupIds.includes(groupId)) return removedRestored
  writeCompetitiveMembershipOverrides({
    ...membershipOverrides,
    [assetId]: [...currentGroupIds, groupId],
  })
  return true
}

export function removeCompetitiveAssetFromGroup(
  assetId: string,
  groupId: string
): boolean {
  if (typeof window === "undefined") return false
  const customGroups = readCompetitiveCustomGroups()
  const removedSeededGroupIds = readRemovedCompetitiveSeededGroupIds()
  const removedAssetIds = readRemovedCompetitiveAssetIds()
  const membershipOverrides = readCompetitiveMembershipOverrides()
  const currentGroupIds = resolveCompetitiveGroupIdsForAsset(
    assetId,
    membershipOverrides,
    { customGroups, removedSeededGroupIds, removedAssetIds }
  )
  if (!currentGroupIds.includes(groupId)) return false
  const filteredGroupIds = currentGroupIds.filter((id) => id !== groupId)
  if (filteredGroupIds.length === 0) {
    delete membershipOverrides[assetId]
  } else {
    membershipOverrides[assetId] = filteredGroupIds
  }
  writeCompetitiveMembershipOverrides(membershipOverrides)
  return true
}

export function toggleCompetitiveAssetGroupMembership(
  assetId: string,
  groupId: string
): boolean {
  if (typeof window === "undefined") return false
  const customGroups = readCompetitiveCustomGroups()
  const removedSeededGroupIds = readRemovedCompetitiveSeededGroupIds()
  const removedAssetIds = readRemovedCompetitiveAssetIds()
  const membershipOverrides = readCompetitiveMembershipOverrides()
  const currentGroupIds = resolveCompetitiveGroupIdsForAsset(
    assetId,
    membershipOverrides,
    { customGroups, removedSeededGroupIds, removedAssetIds }
  )
  if (currentGroupIds.includes(groupId)) {
    return removeCompetitiveAssetFromGroup(assetId, groupId)
  }
  return addCompetitiveAssetToGroup(assetId, groupId)
}

export function addCompetitiveAssetsToGroup(
  assetIds: readonly string[],
  groupId: string
): number {
  if (typeof window === "undefined" || assetIds.length === 0) return 0
  restoreRemovedSeededCompetitiveGroup(groupId)
  const customGroups = readCompetitiveCustomGroups()
  const removedSeededGroupIds = readRemovedCompetitiveSeededGroupIds()
  const removedAssetIds = readRemovedCompetitiveAssetIds()
  const allowedGroupIds = activeCompetitiveAllowedGroupIds(
    customGroups,
    removedSeededGroupIds
  )
  if (!allowedGroupIds.has(groupId)) return 0

  const membershipOverrides = readCompetitiveMembershipOverrides()
  const uniqueAssetIds = [...new Set(assetIds)]
  let membershipChanged = false
  let removedChanged = false
  let added = 0
  for (const assetId of uniqueAssetIds) {
    const removedRestored = removedAssetIds.delete(assetId)
    if (removedRestored) {
      removedChanged = true
    }
    const currentGroupIds = resolveCompetitiveGroupIdsForAsset(
      assetId,
      membershipOverrides,
      { customGroups, removedSeededGroupIds, removedAssetIds }
    )
    if (currentGroupIds.includes(groupId)) {
      if (removedRestored) added += 1
      continue
    }
    membershipOverrides[assetId] = [...currentGroupIds, groupId]
    membershipChanged = true
    added += 1
  }
  if (membershipChanged) writeCompetitiveMembershipOverrides(membershipOverrides)
  if (removedChanged) writeRemovedCompetitiveAssetIds(removedAssetIds)
  return added
}

export function setCompetitiveAssetGroupMembership(
  assetId: string,
  groupIds: readonly string[]
): void {
  if (typeof window === "undefined") return
  const removedSeededGroupIds = readRemovedCompetitiveSeededGroupIds()
  const customGroups = readCompetitiveCustomGroups()
  const allowed = new Set<string>([
    ...activeCompetitiveSeededGroupIds(removedSeededGroupIds),
    ...Object.keys(customGroups),
  ])
  const normalized: string[] = []
  for (const groupId of groupIds) {
    if (!allowed.has(groupId) || normalized.includes(groupId)) continue
    normalized.push(groupId)
  }

  const next = readCompetitiveMembershipOverrides()
  if (normalized.length === 0) {
    delete next[assetId]
  } else {
    clearRemovedCompetitiveAsset(assetId)
    next[assetId] = normalized
  }
  writeCompetitiveMembershipOverrides(next)
}

export function resolveCompetitiveGroupIdsForAsset(
  assetId: string,
  membershipOverrides: CompetitiveMembershipOverrides,
  {
    customGroups = {},
    removedSeededGroupIds = new Set<string>(),
    removedAssetIds = new Set<string>(),
  }: {
    customGroups?: CompetitiveCustomGroups
    removedSeededGroupIds?: ReadonlySet<string>
    removedAssetIds?: ReadonlySet<string>
  } = {}
): string[] {
  if (removedAssetIds.has(assetId)) return []
  const stored = membershipOverrides[assetId]
  if (stored != null && stored.length > 0) {
    const resolved: string[] = []
    for (const groupId of stored) {
      const isSeededActive =
        SEEDED_COMPETITIVE_GROUP_IDS.has(groupId) &&
        !removedSeededGroupIds.has(groupId)
      const isCustom = Object.hasOwn(customGroups, groupId)
      if ((isSeededActive || isCustom) && !resolved.includes(groupId)) {
        resolved.push(groupId)
      }
    }
    if (resolved.length > 0) return resolved
  }
  return [defaultCompetitiveSeededGroupIdForAsset(assetId, removedSeededGroupIds)]
}

export function parseCompetitiveGroupSnapshot(snapshot: string): {
  customGroups: CompetitiveCustomGroups
  customGroupDescriptions: CompetitiveGroupDescriptions
  seededLabelOverrides: CompetitiveSeededLabelOverrides
  seededDescriptionOverrides: CompetitiveSeededDescriptionOverrides
  removedSeededGroupIds: ReadonlySet<string>
  removedAssetIds: ReadonlySet<string>
  groupLabels: Record<string, string>
  groupDescriptions: Record<string, string>
  membershipOverrides: CompetitiveMembershipOverrides
} {
  const parts = snapshot.split("\0")
  const customGroupsRaw = parts[0] ?? ""
  const descriptionsRaw = parts[1] ?? ""
  const seededLabelOverridesRaw = parts[2] ?? ""
  const seededDescriptionOverridesRaw = parts[3] ?? ""
  const removedSeededGroupsRaw = parts[4] ?? ""
  const hasRemovedAssetSegment = parts.length >= 7
  const removedAssetIdsRaw = hasRemovedAssetSegment ? (parts[5] ?? "") : ""
  const membershipRaw = hasRemovedAssetSegment ? (parts[6] ?? "") : (parts[5] ?? "")
  const customGroups = customGroupsRaw
    ? parseCompetitiveCustomGroups(customGroupsRaw)
    : {}
  const customGroupDescriptions = descriptionsRaw
    ? parseCompetitiveGroupDescriptions(descriptionsRaw)
    : {}
  const seededLabelOverrides = seededLabelOverridesRaw
    ? parseCompetitiveSeededLabelOverrides(seededLabelOverridesRaw)
    : {}
  const seededDescriptionOverrides = seededDescriptionOverridesRaw
    ? parseCompetitiveSeededDescriptionOverrides(seededDescriptionOverridesRaw)
    : {}
  const removedSeededGroupIds = removedSeededGroupsRaw
    ? parseRemovedCompetitiveSeededGroupIds(removedSeededGroupsRaw)
    : new Set<string>()
  const removedAssetIds = removedAssetIdsRaw
    ? parseRemovedCompetitiveAssetIds(removedAssetIdsRaw)
    : new Set<string>()
  const groupLabels: Record<string, string> = {}
  for (const group of COMPETITIVE_SEEDED_GROUPS) {
    if (removedSeededGroupIds.has(group.id)) continue
    groupLabels[group.id] = seededLabelOverrides[group.id] ?? group.label
  }
  for (const [groupId, label] of Object.entries(customGroups)) {
    groupLabels[groupId] = label
  }

  const groupDescriptions: Record<string, string> = {}
  for (const group of COMPETITIVE_SEEDED_GROUPS) {
    if (removedSeededGroupIds.has(group.id)) continue
    const defaultDescription = COMPETITIVE_SEEDED_GROUP_DESCRIPTIONS[group.id]
    if (typeof defaultDescription === "string" && defaultDescription.trim() !== "") {
      groupDescriptions[group.id] = defaultDescription
    }
  }
  for (const [groupId, description] of Object.entries(seededDescriptionOverrides)) {
    if (removedSeededGroupIds.has(groupId)) continue
    groupDescriptions[groupId] = description
  }
  for (const [groupId, description] of Object.entries(customGroupDescriptions)) {
    groupDescriptions[groupId] = description
  }

  return {
    customGroups,
    customGroupDescriptions,
    seededLabelOverrides,
    seededDescriptionOverrides,
    removedSeededGroupIds,
    removedAssetIds,
    groupLabels,
    groupDescriptions,
    membershipOverrides: membershipRaw ? parseCompetitiveMembership(membershipRaw) : {},
  }
}

export function getCompetitiveGroupSnapshot(): string {
  if (typeof window === "undefined") return ""
  return `${localStorage.getItem(COMPETITIVE_CUSTOM_GROUPS_KEY) ?? ""}\0${localStorage.getItem(COMPETITIVE_CUSTOM_GROUP_DESCRIPTIONS_KEY) ?? ""}\0${localStorage.getItem(COMPETITIVE_SEEDED_LABEL_OVERRIDES_KEY) ?? ""}\0${localStorage.getItem(COMPETITIVE_SEEDED_DESCRIPTION_OVERRIDES_KEY) ?? ""}\0${localStorage.getItem(COMPETITIVE_REMOVED_SEEDED_GROUP_IDS_KEY) ?? ""}\0${localStorage.getItem(COMPETITIVE_REMOVED_ASSET_IDS_KEY) ?? ""}\0${localStorage.getItem(COMPETITIVE_MEMBERSHIP_KEY) ?? ""}`
}

export function subscribeCompetitiveGroups(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  const run = () => onStoreChange()
  window.addEventListener(COMPETITIVE_CHANGED, run)
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === COMPETITIVE_CUSTOM_GROUPS_KEY ||
      event.key === COMPETITIVE_CUSTOM_GROUP_DESCRIPTIONS_KEY ||
      event.key === COMPETITIVE_SEEDED_LABEL_OVERRIDES_KEY ||
      event.key === COMPETITIVE_SEEDED_DESCRIPTION_OVERRIDES_KEY ||
      event.key === COMPETITIVE_REMOVED_SEEDED_GROUP_IDS_KEY ||
      event.key === COMPETITIVE_REMOVED_ASSET_IDS_KEY ||
      event.key === COMPETITIVE_MEMBERSHIP_KEY ||
      event.key === COMPETITIVE_SEED_VERSION_KEY
    ) {
      run()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(COMPETITIVE_CHANGED, run)
    window.removeEventListener("storage", onStorage)
  }
}
