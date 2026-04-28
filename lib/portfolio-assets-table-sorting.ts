import type { SortingState } from "@tanstack/react-table"

import type { PortfolioAssetRow } from "@/lib/portfolio-asset-row"

export type PortfolioAssetsTableSortVariant = "portfolio" | "scenarios"

const PORTFOLIO_ASSETS_TABLE_SORTING_STORAGE_PREFIX =
  "glassbox:portfolio-assets-table-sorting:"
const PORTFOLIO_ASSETS_TABLE_VISIBLE_ORDER_STORAGE_PREFIX =
  "glassbox:portfolio-assets-table-visible-order:"

const DEFAULT_PORTFOLIO_ASSETS_TABLE_SORTING: Record<
  PortfolioAssetsTableSortVariant,
  SortingState
> = {
  portfolio: [{ id: "lift", desc: true }],
  scenarios: [{ id: "building", desc: false }],
}

function cloneSortingState(sorting: SortingState): SortingState {
  return sorting.map((entry) => ({ id: entry.id, desc: entry.desc }))
}

export function defaultPortfolioAssetsTableSorting(
  variant: PortfolioAssetsTableSortVariant
): SortingState {
  return cloneSortingState(DEFAULT_PORTFOLIO_ASSETS_TABLE_SORTING[variant])
}

function portfolioAssetsTableSortingStorageKey(pathname: string) {
  return `${PORTFOLIO_ASSETS_TABLE_SORTING_STORAGE_PREFIX}${pathname}`
}

function portfolioAssetsTableVisibleOrderStorageKey(pathname: string) {
  return `${PORTFOLIO_ASSETS_TABLE_VISIBLE_ORDER_STORAGE_PREFIX}${pathname}`
}

function normalizeSortingState(value: unknown): SortingState | null {
  if (!Array.isArray(value)) return null

  const next: SortingState = []
  for (const entry of value) {
    if (
      typeof entry === "object" &&
      entry != null &&
      typeof entry.id === "string" &&
      typeof entry.desc === "boolean"
    ) {
      next.push({ id: entry.id, desc: entry.desc })
    }
  }

  return next
}

function normalizeVisibleOrder(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null

  const next = value.filter((entry): entry is string => typeof entry === "string")
  return next
}

export function readPortfolioAssetsTableSorting(
  pathname: string,
  variant: PortfolioAssetsTableSortVariant
): SortingState {
  const fallback = defaultPortfolioAssetsTableSorting(variant)
  if (typeof localStorage === "undefined") return fallback

  try {
    const raw = localStorage.getItem(portfolioAssetsTableSortingStorageKey(pathname))
    if (raw == null || raw === "") return fallback
    const parsed = normalizeSortingState(JSON.parse(raw))
    return parsed != null && parsed.length > 0 ? parsed : fallback
  } catch {
    return fallback
  }
}

export function writePortfolioAssetsTableSorting(
  pathname: string,
  sorting: SortingState
) {
  if (typeof localStorage === "undefined") return

  try {
    localStorage.setItem(
      portfolioAssetsTableSortingStorageKey(pathname),
      JSON.stringify(cloneSortingState(sorting))
    )
  } catch {
    /* ignore storage write failures */
  }
}

export function readPortfolioAssetsTableVisibleOrder(pathname: string): string[] {
  if (typeof localStorage === "undefined") return []

  try {
    const raw = localStorage.getItem(portfolioAssetsTableVisibleOrderStorageKey(pathname))
    if (raw == null || raw === "") return []
    const parsed = normalizeVisibleOrder(JSON.parse(raw))
    return parsed ?? []
  } catch {
    return []
  }
}

export function writePortfolioAssetsTableVisibleOrder(
  pathname: string,
  assetIds: readonly string[]
) {
  if (typeof localStorage === "undefined") return

  try {
    localStorage.setItem(
      portfolioAssetsTableVisibleOrderStorageKey(pathname),
      JSON.stringify([...assetIds])
    )
  } catch {
    /* ignore storage write failures */
  }
}

function localeCompareText(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: "base" })
}

function localeCompareNumericText(left: string, right: string) {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

function parseFloatValue(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^\d.-]/g, ""))
  return Number.isNaN(parsed) ? 0 : parsed
}

function parseIntegerValue(value: string) {
  const parsed = Number.parseInt(value.replace(/\D/g, ""), 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

function comparePortfolioAssetRowsByColumn(
  left: PortfolioAssetRow,
  right: PortfolioAssetRow,
  columnId: string
) {
  switch (columnId) {
    case "building":
      return localeCompareText(left.building, right.building)
    case "typeLabel":
      return localeCompareText(left.typeLabel, right.typeLabel)
    case "classLabel":
      return localeCompareText(left.classLabel, right.classLabel)
    case "rsf":
      return localeCompareNumericText(left.rsf, right.rsf)
    case "occPct":
      return parseFloatValue(left.occPct) - parseFloatValue(right.occPct)
    case "pricePerSf":
      return parseIntegerValue(left.pricePerSf) - parseIntegerValue(right.pricePerSf)
    case "noi":
      return localeCompareNumericText(left.noi, right.noi)
    case "value":
      return localeCompareNumericText(left.value, right.value)
    case "capRate":
      return parseFloatValue(left.capRate) - parseFloatValue(right.capRate)
    case "wale":
      return parseFloatValue(left.wale) - parseFloatValue(right.wale)
    case "lift":
      return left.liftPercent - right.liftPercent
    default:
      return 0
  }
}

export function sortPortfolioAssetRows(
  rows: readonly PortfolioAssetRow[],
  sorting: SortingState
): PortfolioAssetRow[] {
  if (sorting.length === 0) return [...rows]

  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      for (const sortEntry of sorting) {
        const result = comparePortfolioAssetRowsByColumn(
          left.row,
          right.row,
          sortEntry.id
        )
        if (result !== 0) {
          return sortEntry.desc ? -result : result
        }
      }

      return left.index - right.index
    })
    .map(({ row }) => row)
}

export function sortPortfolioAssetRowsByVisibleOrder(
  rows: readonly PortfolioAssetRow[],
  orderedAssetIds: readonly string[]
): PortfolioAssetRow[] {
  if (orderedAssetIds.length === 0) return [...rows]

  const orderIndex = new Map(orderedAssetIds.map((assetId, index) => [assetId, index]))

  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const leftOrder = orderIndex.get(left.row.id)
      const rightOrder = orderIndex.get(right.row.id)

      if (leftOrder != null && rightOrder != null) {
        return leftOrder - rightOrder
      }
      if (leftOrder != null) return -1
      if (rightOrder != null) return 1

      return left.index - right.index
    })
    .map(({ row }) => row)
}
