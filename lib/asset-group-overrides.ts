const STORAGE_KEY = "glassbox:asset-group-overrides"
const CUSTOM_GROUPS_KEY = "glassbox:custom-asset-groups"
/** Optional per-custom-scope descriptions (muted subtitles in headers). */
const CUSTOM_GROUP_DESCRIPTIONS_KEY = "glassbox:custom-asset-group-descriptions"
/** Optional display names for the seeded demo funds (`office` / `industrial` / `retail`). */
const FUND_DISPLAY_LABELS_KEY = "glassbox:fund-display-labels"
/** Optional descriptions for seeded demo portfolio groups (override default copy in `lib/assets`). */
const FUND_DESCRIPTION_OVERRIDES_KEY = "glassbox:fund-description-overrides"
const CHANGED = "glassbox:asset-group-overrides-changed"
const CUSTOM_CHANGED = "glassbox:custom-asset-groups-changed"
/** Property IDs shown under Properties / address breadcrumbs after “Remove from portfolio”. */
const STANDALONE_PROPERTY_NAV_KEY = "glassbox:standalone-property-nav"
/** Seeded demo group ids that have been removed from the portfolio UI. */
const REMOVED_PORTFOLIO_GROUP_IDS_KEY = "glassbox:removed-portfolio-group-ids"
/** Prospective / market asset IDs promoted into Your Assets. */
const PROMOTED_PROSPECTIVE_ASSET_IDS_KEY =
  "glassbox:promoted-prospective-asset-ids"
/** Optional display names for individual assets. */
const ASSET_DISPLAY_LABELS_KEY = "glassbox:asset-display-labels"
export const ASSET_GROUP_SNAPSHOT_COOKIE_NAME =
  "glassbox-asset-group-snapshot" as const
const ASSET_GROUP_SNAPSHOT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

const SEEDED_GROUP_IDS = new Set(["office", "industrial", "retail"])

const RESERVED_GROUP_IDS = new Set([
  "office",
  "industrial",
  "retail",
  "all",
  "",
])

function parseOverrides(raw: string): Record<string, string[]> {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const out: Record<string, string[]> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k !== "string" || k.length === 0 || k.length >= 200) continue
      if (typeof v === "string" && v.length > 0 && v.length < 200) {
        out[k] = [v]
        continue
      }
      if (!Array.isArray(v)) continue
      const groups: string[] = []
      for (const item of v) {
        if (
          typeof item === "string" &&
          item.length > 0 &&
          item.length < 200 &&
          !groups.includes(item)
        ) {
          groups.push(item)
        }
      }
      if (groups.length > 0) out[k] = groups
    }
    return out
  } catch {
    return {}
  }
}

/** Effective group membership for an asset (override list or `[baseGroupId]`). */
export function resolveAssetGroupIds(
  assetId: string,
  baseGroupId: string,
  overrides: Record<string, string[]>
): string[] {
  const stored = overrides[assetId]
  if (stored == null || stored.length === 0) return [baseGroupId]
  return stored
}

export function assetBelongsToGroup(
  assetId: string,
  groupId: string,
  baseGroupId: string,
  overrides: Record<string, string[]>
): boolean {
  return resolveAssetGroupIds(assetId, baseGroupId, overrides).includes(groupId)
}

export function parseCustomAssetGroups(raw: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        typeof k === "string" &&
        k.length > 0 &&
        k.length < 128 &&
        typeof v === "string" &&
        v.length > 0 &&
        v.length < 200
      ) {
        out[k] = v
      }
    }
    return out
  } catch {
    return {}
  }
}

function parseCustomGroupDescriptions(raw: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        typeof k === "string" &&
        k.length > 0 &&
        k.length < 128 &&
        typeof v === "string" &&
        v.length > 0 &&
        v.length <= 600
      ) {
        out[k] = v
      }
    }
    return out
  } catch {
    return {}
  }
}

function parseAssetDisplayLabels(raw: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        typeof k === "string" &&
        k.length > 0 &&
        k.length < 200 &&
        typeof v === "string" &&
        v.trim().length > 0 &&
        v.length < 200
      ) {
        out[k] = v.trim()
      }
    }
    return out
  } catch {
    return {}
  }
}

export function readAssetDisplayLabels(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const raw = localStorage.getItem(ASSET_DISPLAY_LABELS_KEY)
  if (raw == null || raw === "") return {}
  return parseAssetDisplayLabels(raw)
}

function writeAssetDisplayLabels(labels: Record<string, string>): void {
  if (typeof window === "undefined") return
  if (Object.keys(labels).length === 0) {
    localStorage.removeItem(ASSET_DISPLAY_LABELS_KEY)
  } else {
    localStorage.setItem(ASSET_DISPLAY_LABELS_KEY, JSON.stringify(labels))
  }
  syncAssetGroupSnapshotCookieFromLocalStorage()
  window.dispatchEvent(new Event(CHANGED))
}

export function updateAssetDisplayNameById(
  assetId: string,
  name: string
): boolean {
  if (typeof window === "undefined") return false
  const trimmed = name.trim()
  if (!assetId || !trimmed) return false
  writeAssetDisplayLabels({ ...readAssetDisplayLabels(), [assetId]: trimmed })
  return true
}

export function removeAssetDisplayNameOverride(assetId: string): boolean {
  if (typeof window === "undefined") return false
  const labels = readAssetDisplayLabels()
  if (!Object.hasOwn(labels, assetId)) return false
  const { [assetId]: _removed, ...rest } = labels
  writeAssetDisplayLabels(rest)
  return true
}

function readCustomGroupDescriptions(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const raw = localStorage.getItem(CUSTOM_GROUP_DESCRIPTIONS_KEY)
  if (raw == null || raw === "") return {}
  return parseCustomGroupDescriptions(raw)
}

function writeCustomGroupDescriptions(next: Record<string, string>): void {
  if (typeof window === "undefined") return
  localStorage.setItem(CUSTOM_GROUP_DESCRIPTIONS_KEY, JSON.stringify(next))
  syncAssetGroupSnapshotCookieFromLocalStorage()
  window.dispatchEvent(new Event(CUSTOM_CHANGED))
  window.dispatchEvent(new Event(CHANGED))
}

export function readAssetGroupOverrides(): Record<string, string[]> {
  if (typeof window === "undefined") return {}
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw == null || raw === "") return {}
  return parseOverrides(raw)
}

export function readCustomAssetGroups(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const raw = localStorage.getItem(CUSTOM_GROUPS_KEY)
  if (raw == null || raw === "") return {}
  return parseCustomAssetGroups(raw)
}

function parseFundDisplayLabels(raw: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        typeof k === "string" &&
        SEEDED_GROUP_IDS.has(k) &&
        typeof v === "string" &&
        v.length > 0 &&
        v.length < 200
      ) {
        out[k] = v
      }
    }
    return out
  } catch {
    return {}
  }
}

export function readFundDisplayLabels(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const raw = localStorage.getItem(FUND_DISPLAY_LABELS_KEY)
  if (raw == null || raw === "") return {}
  return parseFundDisplayLabels(raw)
}

function parseFundDescriptionOverrides(raw: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        typeof k === "string" &&
        SEEDED_GROUP_IDS.has(k) &&
        typeof v === "string" &&
        v.length > 0 &&
        v.length <= 600
      ) {
        out[k] = v
      }
    }
    return out
  } catch {
    return {}
  }
}

export function readFundDescriptionOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const raw = localStorage.getItem(FUND_DESCRIPTION_OVERRIDES_KEY)
  if (raw == null || raw === "") return {}
  return parseFundDescriptionOverrides(raw)
}

/**
 * Updates display name and optionally description for a seeded demo portfolio group
 * (`office` / `industrial` / `retail`). Omit `description` to leave it unchanged.
 * Pass `description: ""` to clear an override (revert to default copy in code).
 */
export function updateFundByGroupId(
  groupId: string,
  updates: { name: string; description?: string }
): boolean {
  if (typeof window === "undefined") return false
  if (!SEEDED_GROUP_IDS.has(groupId)) return false
  const trimmedName = updates.name.trim()
  if (!trimmedName) return false

  const currentLabels = readFundDisplayLabels()
  const nextLabels = { ...currentLabels, [groupId]: trimmedName }
  localStorage.setItem(FUND_DISPLAY_LABELS_KEY, JSON.stringify(nextLabels))

  if (Object.hasOwn(updates, "description")) {
    const descTrim = (updates.description ?? "").trim().slice(0, 600)
    const currentDesc = readFundDescriptionOverrides()
    const nextDesc = { ...currentDesc }
    if (descTrim.length === 0) {
      delete nextDesc[groupId]
    } else {
      nextDesc[groupId] = descTrim
    }
    if (Object.keys(nextDesc).length === 0) {
      localStorage.removeItem(FUND_DESCRIPTION_OVERRIDES_KEY)
    } else {
      localStorage.setItem(
        FUND_DESCRIPTION_OVERRIDES_KEY,
        JSON.stringify(nextDesc)
      )
    }
  }

  syncAssetGroupSnapshotCookieFromLocalStorage()
  window.dispatchEvent(new Event(CHANGED))
  return true
}

/**
 * Sets the displayed name for a seeded demo portfolio group (`office`, `industrial`, `retail`).
 */
export function updateFundDisplayLabelByGroupId(
  groupId: string,
  newName: string
): boolean {
  return updateFundByGroupId(groupId, { name: newName })
}

function parseStandalonePropertyNavIds(raw: string): ReadonlySet<string> {
  if (raw === "") return new Set()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    const out = new Set<string>()
    for (const x of parsed) {
      if (typeof x === "string" && x.length > 0 && x.length < 200) out.add(x)
    }
    return out
  } catch {
    return new Set()
  }
}

function parseRemovedPortfolioGroupIds(raw: string): ReadonlySet<string> {
  if (raw === "") return new Set()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    const out = new Set<string>()
    for (const x of parsed) {
      if (typeof x === "string" && SEEDED_GROUP_IDS.has(x)) out.add(x)
    }
    return out
  } catch {
    return new Set()
  }
}

function parsePromotedProspectiveAssetIds(raw: string): ReadonlySet<string> {
  if (raw === "") return new Set()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    const out = new Set<string>()
    for (const x of parsed) {
      if (typeof x === "string" && x.length > 0 && x.length < 200) out.add(x)
    }
    return out
  } catch {
    return new Set()
  }
}

export function decodeAssetGroupSnapshotCookie(value: string | undefined): string {
  if (!value) return ""
  try {
    return decodeURIComponent(value)
  } catch {
    return ""
  }
}

function readStandalonePropertyNavIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  return new Set(parseStandalonePropertyNavIds(
    localStorage.getItem(STANDALONE_PROPERTY_NAV_KEY) ?? ""
  ))
}

function readPromotedProspectiveAssetIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  return new Set(
    parsePromotedProspectiveAssetIds(
      localStorage.getItem(PROMOTED_PROSPECTIVE_ASSET_IDS_KEY) ?? ""
    )
  )
}

export function readRemovedPortfolioGroupIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  return new Set(parseRemovedPortfolioGroupIds(
    localStorage.getItem(REMOVED_PORTFOLIO_GROUP_IDS_KEY) ?? ""
  ))
}

export function syncAssetGroupSnapshotCookieFromLocalStorage(): void {
  if (typeof document === "undefined") return
  const encoded = encodeURIComponent(getAssetGroupOverridesSnapshot())
  document.cookie = `${ASSET_GROUP_SNAPSHOT_COOKIE_NAME}=${encoded}; path=/; max-age=${ASSET_GROUP_SNAPSHOT_COOKIE_MAX_AGE}; samesite=lax`
}

function writeStandalonePropertyNavIds(ids: Set<string>): void {
  if (typeof window === "undefined") return
  localStorage.setItem(
    STANDALONE_PROPERTY_NAV_KEY,
    JSON.stringify([...ids])
  )
  syncAssetGroupSnapshotCookieFromLocalStorage()
  window.dispatchEvent(new Event(CHANGED))
}

function writePromotedProspectiveAssetIds(ids: Set<string>): void {
  if (typeof window === "undefined") return
  localStorage.setItem(
    PROMOTED_PROSPECTIVE_ASSET_IDS_KEY,
    JSON.stringify([...ids])
  )
  syncAssetGroupSnapshotCookieFromLocalStorage()
  window.dispatchEvent(new Event(CHANGED))
}

export function promoteProspectiveAssetsToPortfolio(
  assetIds: readonly string[]
): number {
  const next = readPromotedProspectiveAssetIds()
  let changed = false
  let added = 0
  for (const assetId of assetIds) {
    if (!assetId || next.has(assetId)) continue
    next.add(assetId)
    changed = true
    added += 1
  }
  if (changed) writePromotedProspectiveAssetIds(next)
  return added
}

export function removePromotedProspectiveAssetsFromPortfolio(
  assetIds: readonly string[]
): boolean {
  const next = readPromotedProspectiveAssetIds()
  let changed = false
  for (const assetId of assetIds) {
    if (!next.delete(assetId)) continue
    changed = true
  }
  if (changed) writePromotedProspectiveAssetIds(next)
  return changed
}

function writeRemovedPortfolioGroupIds(ids: Set<string>): void {
  if (typeof window === "undefined") return
  localStorage.setItem(
    REMOVED_PORTFOLIO_GROUP_IDS_KEY,
    JSON.stringify([...ids])
  )
  syncAssetGroupSnapshotCookieFromLocalStorage()
  window.dispatchEvent(new Event(CHANGED))
}

/** Marks an asset as a standalone property in nav (Properties / address breadcrumbs). */
export function markPropertyStandaloneNav(assetId: string): void {
  const next = readStandalonePropertyNavIds()
  if (next.has(assetId)) return
  next.add(assetId)
  writeStandalonePropertyNavIds(next)
}

export function markPropertiesStandaloneNav(assetIds: readonly string[]): boolean {
  const next = readStandalonePropertyNavIds()
  let changed = false
  for (const assetId of assetIds) {
    if (!assetId || next.has(assetId)) continue
    next.add(assetId)
    changed = true
  }
  if (changed) writeStandalonePropertyNavIds(next)
  return changed
}

function clearStandalonePropertyNav(assetId: string): void {
  const next = readStandalonePropertyNavIds()
  if (!next.delete(assetId)) return
  writeStandalonePropertyNavIds(next)
}

export function clearPropertiesStandaloneNav(assetIds: readonly string[]): boolean {
  const next = readStandalonePropertyNavIds()
  let changed = false
  for (const assetId of assetIds) {
    if (!next.delete(assetId)) continue
    changed = true
  }
  if (changed) writeStandalonePropertyNavIds(next)
  return changed
}

function restoreRemovedPortfolioGroup(groupId: string): void {
  if (!SEEDED_GROUP_IDS.has(groupId)) return
  const next = readRemovedPortfolioGroupIds()
  if (!next.delete(groupId)) return
  writeRemovedPortfolioGroupIds(next)
}

export function removeSeededPortfolioGroupById(groupId: string): boolean {
  if (typeof window === "undefined") return false
  if (!SEEDED_GROUP_IDS.has(groupId)) return false

  let changed = false
  const removed = readRemovedPortfolioGroupIds()
  if (!removed.has(groupId)) {
    removed.add(groupId)
    localStorage.setItem(
      REMOVED_PORTFOLIO_GROUP_IDS_KEY,
      JSON.stringify([...removed])
    )
    changed = true
  }

  const labels = readFundDisplayLabels()
  if (Object.hasOwn(labels, groupId)) {
    delete labels[groupId]
    if (Object.keys(labels).length === 0) {
      localStorage.removeItem(FUND_DISPLAY_LABELS_KEY)
    } else {
      localStorage.setItem(FUND_DISPLAY_LABELS_KEY, JSON.stringify(labels))
    }
    changed = true
  }

  const descriptions = readFundDescriptionOverrides()
  if (Object.hasOwn(descriptions, groupId)) {
    delete descriptions[groupId]
    if (Object.keys(descriptions).length === 0) {
      localStorage.removeItem(FUND_DESCRIPTION_OVERRIDES_KEY)
    } else {
      localStorage.setItem(
        FUND_DESCRIPTION_OVERRIDES_KEY,
        JSON.stringify(descriptions)
      )
    }
    changed = true
  }

  if (changed) {
    syncAssetGroupSnapshotCookieFromLocalStorage()
    window.dispatchEvent(new Event(CHANGED))
  }
  return changed
}

export function parseAssetGroupOverrideSnapshot(snapshot: string): {
  overrides: Record<string, string[]>
  customGroups: Record<string, string>
  fundLabelOverrides: Record<string, string>
  assetLabelOverrides: Record<string, string>
  customGroupDescriptions: Record<string, string>
  fundDescriptionOverrides: Record<string, string>
  standalonePropertyNavIds: ReadonlySet<string>
  removedPortfolioGroupIds: ReadonlySet<string>
  promotedProspectiveAssetIds: ReadonlySet<string>
} {
  const parts = snapshot.split("\0")
  const overridesRaw = parts[0] ?? ""
  const customGroupsRaw = parts[1] ?? ""
  const fundLabelsRaw = parts[2] ?? ""
  const descriptionsRaw = parts[3] ?? ""
  const fundDescriptionsRaw = parts[4] ?? ""
  const standaloneRaw = parts[5] ?? ""
  const removedGroupsRaw = parts[6] ?? ""
  const promotedProspectiveRaw = parts[7] ?? ""
  const assetLabelsRaw = parts[8] ?? ""

  return {
    overrides: overridesRaw ? parseOverrides(overridesRaw) : {},
    customGroups: customGroupsRaw ? parseCustomAssetGroups(customGroupsRaw) : {},
    fundLabelOverrides: fundLabelsRaw ? parseFundDisplayLabels(fundLabelsRaw) : {},
    assetLabelOverrides: assetLabelsRaw
      ? parseAssetDisplayLabels(assetLabelsRaw)
      : {},
    customGroupDescriptions: descriptionsRaw
      ? parseCustomGroupDescriptions(descriptionsRaw)
      : {},
    fundDescriptionOverrides: fundDescriptionsRaw
      ? parseFundDescriptionOverrides(fundDescriptionsRaw)
      : {},
    standalonePropertyNavIds: standaloneRaw
      ? parseStandalonePropertyNavIds(standaloneRaw)
      : new Set(),
    removedPortfolioGroupIds: removedGroupsRaw
      ? parseRemovedPortfolioGroupIds(removedGroupsRaw)
      : new Set(),
    promotedProspectiveAssetIds: promotedProspectiveRaw
      ? parsePromotedProspectiveAssetIds(promotedProspectiveRaw)
      : new Set(),
  }
}

function slugifyForGroupId(text: string): string {
  const s = text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
  return s.length > 0 ? s.slice(0, 48) : "group"
}

/**
 * Creates a new custom asset group and persists its display label.
 * IDs are prefixed with `grp-` so they do not collide with seeded demo groups.
 */
export function addCustomAssetGroup(
  displayName: string,
  description?: string
): { id: string; label: string } | null {
  if (typeof window === "undefined") return null
  const trimmed = displayName.trim()
  if (!trimmed) return null

  const existing = readCustomAssetGroups()
  const base = `grp-${slugifyForGroupId(trimmed)}`
  let id = base
  let n = 0
  while (existing[id] != null || RESERVED_GROUP_IDS.has(id)) {
    n += 1
    id = `${base}-${n}`
  }

  const next = { ...existing, [id]: trimmed }
  localStorage.setItem(CUSTOM_GROUPS_KEY, JSON.stringify(next))
  syncAssetGroupSnapshotCookieFromLocalStorage()
  window.dispatchEvent(new Event(CUSTOM_CHANGED))
  window.dispatchEvent(new Event(CHANGED))

  const descTrimmed = description?.trim()
  if (descTrimmed) {
    const descMap = readCustomGroupDescriptions()
    writeCustomGroupDescriptions({ ...descMap, [id]: descTrimmed.slice(0, 600) })
  }

  return { id, label: trimmed }
}

function isCustomGroupId(
  groupId: string,
  customGroups: Record<string, string>
): boolean {
  return Object.hasOwn(customGroups, groupId)
}

function writeAssetGroupOverrides(overrides: Record<string, string[]>): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  syncAssetGroupSnapshotCookieFromLocalStorage()
  window.dispatchEvent(new Event(CHANGED))
}

/**
 * Updates a custom portfolio scope display name and optionally description.
 * Omit `description` to leave the stored description unchanged. Pass `description: ""` to clear it.
 */
export function updateCustomAssetGroupById(
  groupId: string,
  updates: { name: string; description?: string }
): boolean {
  if (typeof window === "undefined") return false
  const trimmedName = updates.name.trim()
  if (!trimmedName) return false
  const custom = readCustomAssetGroups()
  if (!isCustomGroupId(groupId, custom)) return false

  if (custom[groupId] !== trimmedName) {
    const next = { ...custom, [groupId]: trimmedName }
    localStorage.setItem(CUSTOM_GROUPS_KEY, JSON.stringify(next))
    syncAssetGroupSnapshotCookieFromLocalStorage()
    window.dispatchEvent(new Event(CUSTOM_CHANGED))
    window.dispatchEvent(new Event(CHANGED))
  }

  if (Object.hasOwn(updates, "description")) {
    const d = (updates.description ?? "").trim().slice(0, 600)
    const dm = readCustomGroupDescriptions()
    if (d.length > 0) {
      if ((dm[groupId] ?? "").trim() !== d) {
        writeCustomGroupDescriptions({ ...dm, [groupId]: d })
      }
    } else if (Object.hasOwn(dm, groupId)) {
      const { [groupId]: _rm, ...rest } = dm
      writeCustomGroupDescriptions(rest)
    }
  }

  return true
}

/**
 * Renames a user-defined portfolio scope (custom asset group) in place.
 * @deprecated Prefer {@link updateCustomAssetGroupById} when editing description too.
 */
export function updateCustomAssetGroupNameById(
  groupId: string,
  newName: string
): boolean {
  return updateCustomAssetGroupById(groupId, { name: newName })
}

/**
 * Deletes a custom portfolio scope: removes the label, drops overrides that
 * moved assets into this group (assets revert to their default fund group), and
 * reassigns any overrides pointing at this id away (none remain for the id).
 */
export function removeCustomAssetGroupById(groupId: string): boolean {
  if (typeof window === "undefined") return false
  const custom = readCustomAssetGroups()
  if (!isCustomGroupId(groupId, custom)) return false
  const { [groupId]: _, ...rest } = custom
  localStorage.setItem(CUSTOM_GROUPS_KEY, JSON.stringify(rest))
  window.dispatchEvent(new Event(CUSTOM_CHANGED))
  const descMap = readCustomGroupDescriptions()
  if (Object.hasOwn(descMap, groupId)) {
    const { [groupId]: __rm, ...descRest } = descMap
    writeCustomGroupDescriptions(descRest)
  }
  const overrides = readAssetGroupOverrides()
  const nextOverrides: Record<string, string[]> = {}
  for (const [assetId, groupIds] of Object.entries(overrides)) {
    const filtered = groupIds.filter((gid) => gid !== groupId)
    if (filtered.length > 0) nextOverrides[assetId] = filtered
  }
  writeAssetGroupOverrides(nextOverrides)
  return true
}

/**
 * New custom group with the same member assets as the source (same override
 * edges), suitable for a “Copy of …” portfolio scope. Seeded demo groups cannot
 * be duplicated.
 */
export function duplicateCustomAssetGroupFromId(
  sourceGroupId: string
): { id: string; label: string } | null {
  if (typeof window === "undefined") return null
  const custom = readCustomAssetGroups()
  const sourceLabel = custom[sourceGroupId]
  if (sourceLabel == null) return null
  const duplicateName = `Copy of ${sourceLabel}`
  const created = addCustomAssetGroup(duplicateName)
  if (created == null) return null
  const sourceDesc = readCustomGroupDescriptions()[sourceGroupId]?.trim()
  if (sourceDesc) {
    const dm = readCustomGroupDescriptions()
    writeCustomGroupDescriptions({
      ...dm,
      [created.id]: sourceDesc.slice(0, 600),
    })
  }
  const overrides = readAssetGroupOverrides()
  const nextOverrides = { ...overrides }
  for (const [assetId, groupIds] of Object.entries(overrides)) {
    if (groupIds.includes(sourceGroupId)) {
      nextOverrides[assetId] = [...new Set([...groupIds, created.id])]
    }
  }
  writeAssetGroupOverrides(nextOverrides)
  return created
}

export function addAssetToGroup(
  assetId: string,
  groupId: string,
  baseGroupId: string
): void {
  if (typeof window === "undefined") return
  restoreRemovedPortfolioGroup(groupId)
  clearStandalonePropertyNav(assetId)
  const overrides = readAssetGroupOverrides()
  const current = resolveAssetGroupIds(assetId, baseGroupId, overrides)
  if (current.includes(groupId)) return
  writeAssetGroupOverrides({
    ...overrides,
    [assetId]: [...current, groupId],
  })
}

export type AssetGroupMembershipTarget = {
  assetId: string
  baseGroupId: string
}

/**
 * Adds all provided assets to a portfolio group without toggling off existing membership.
 * Returns the number of assets whose membership changed.
 */
export function addAssetsToGroup(
  targets: readonly AssetGroupMembershipTarget[],
  groupId: string
): number {
  if (typeof window === "undefined" || targets.length === 0) return 0
  restoreRemovedPortfolioGroup(groupId)
  const overrides = readAssetGroupOverrides()
  const nextOverrides = { ...overrides }
  const seenAssetIds = new Set<string>()
  let changed = false
  let addedCount = 0

  for (const target of targets) {
    if (seenAssetIds.has(target.assetId)) continue
    seenAssetIds.add(target.assetId)
    clearStandalonePropertyNav(target.assetId)
    const current = resolveAssetGroupIds(
      target.assetId,
      target.baseGroupId,
      nextOverrides
    )
    if (current.includes(groupId)) continue
    nextOverrides[target.assetId] = [...current, groupId]
    changed = true
    addedCount += 1
  }

  if (changed) {
    writeAssetGroupOverrides(nextOverrides)
  }
  return addedCount
}

export function removeAssetFromGroup(
  assetId: string,
  groupId: string,
  baseGroupId: string
): void {
  if (typeof window === "undefined") return
  const overrides = readAssetGroupOverrides()
  const current = resolveAssetGroupIds(assetId, baseGroupId, overrides)
  const next = current.filter((gid) => gid !== groupId)
  if (next.length === 0) {
    removeAssetGroupOverride(assetId)
    return
  }
  if (next.length === 1 && next[0] === baseGroupId && !(assetId in overrides)) {
    return
  }
  if (next.length === 1 && next[0] === baseGroupId) {
    removeAssetGroupOverride(assetId)
    return
  }
  writeAssetGroupOverrides({ ...overrides, [assetId]: next })
}

export function toggleAssetGroupMembership(
  assetId: string,
  groupId: string,
  baseGroupId: string
): void {
  const overrides = readAssetGroupOverrides()
  const current = resolveAssetGroupIds(assetId, baseGroupId, overrides)
  if (current.includes(groupId)) {
    removeAssetFromGroup(assetId, groupId, baseGroupId)
  } else {
    addAssetToGroup(assetId, groupId, baseGroupId)
  }
}

/** @deprecated Prefer {@link addAssetToGroup} for multi-group membership. */
export function setAssetGroupOverride(
  assetId: string,
  groupId: string,
  baseGroupId?: string
): void {
  if (typeof window === "undefined") return
  if (baseGroupId != null) {
    addAssetToGroup(assetId, groupId, baseGroupId)
    return
  }
  restoreRemovedPortfolioGroup(groupId)
  clearStandalonePropertyNav(assetId)
  writeAssetGroupOverrides({ ...readAssetGroupOverrides(), [assetId]: [groupId] })
}

/** Clears a stored portfolio-group assignment so the asset falls back to seed data. */
export function removeAssetGroupOverride(assetId: string): boolean {
  if (typeof window === "undefined") return false
  const current = readAssetGroupOverrides()
  if (!(assetId in current)) return false
  const { [assetId]: _removed, ...rest } = current
  writeAssetGroupOverrides(rest)
  return true
}

export function clearAssetGroupOverrides(assetIds: readonly string[]): boolean {
  if (typeof window === "undefined") return false
  const current = readAssetGroupOverrides()
  const next = { ...current }
  let changed = false
  for (const assetId of assetIds) {
    if (!Object.hasOwn(next, assetId)) continue
    delete next[assetId]
    changed = true
  }
  if (changed) writeAssetGroupOverrides(next)
  return changed
}

export function subscribeAssetGroupOverrides(
  onStoreChange: () => void
): () => void {
  if (typeof window === "undefined") return () => {}
  const run = () => onStoreChange()
  window.addEventListener(CHANGED, run)
  window.addEventListener(CUSTOM_CHANGED, run)
  const onStorage = (e: StorageEvent) => {
    if (
      e.key === STORAGE_KEY ||
      e.key === CUSTOM_GROUPS_KEY ||
      e.key === FUND_DISPLAY_LABELS_KEY ||
      e.key === FUND_DESCRIPTION_OVERRIDES_KEY ||
      e.key === CUSTOM_GROUP_DESCRIPTIONS_KEY ||
      e.key === STANDALONE_PROPERTY_NAV_KEY ||
      e.key === REMOVED_PORTFOLIO_GROUP_IDS_KEY ||
      e.key === PROMOTED_PROSPECTIVE_ASSET_IDS_KEY
    ) {
      run()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(CHANGED, run)
    window.removeEventListener(CUSTOM_CHANGED, run)
    window.removeEventListener("storage", onStorage)
  }
}

export function getAssetGroupOverridesSnapshot(): string {
  if (typeof window === "undefined") return ""
  return `${localStorage.getItem(STORAGE_KEY) ?? ""}\0${localStorage.getItem(CUSTOM_GROUPS_KEY) ?? ""}\0${localStorage.getItem(FUND_DISPLAY_LABELS_KEY) ?? ""}\0${localStorage.getItem(CUSTOM_GROUP_DESCRIPTIONS_KEY) ?? ""}\0${localStorage.getItem(FUND_DESCRIPTION_OVERRIDES_KEY) ?? ""}\0${localStorage.getItem(STANDALONE_PROPERTY_NAV_KEY) ?? ""}\0${localStorage.getItem(REMOVED_PORTFOLIO_GROUP_IDS_KEY) ?? ""}\0${localStorage.getItem(PROMOTED_PROSPECTIVE_ASSET_IDS_KEY) ?? ""}\0${localStorage.getItem(ASSET_DISPLAY_LABELS_KEY) ?? ""}`
}
