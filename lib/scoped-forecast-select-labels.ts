import {
  SCOPED_FORECAST_BASELINE_BUILDING_VERSION_ID,
  SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID,
  type ScopedForecastBuildingVersionOption,
  type ScopedForecastOutlookSetOption,
} from "@/lib/scoped-forecast"

/** Single-asset {@link AssetForecastsWorkspace} baseline modification id (matches that module). */
export const ASSET_FORECAST_BASELINE_BUILDING_VERSION_ID =
  "__baseline_building_version__" as const

const BASELINE_MODIFICATION_LABEL = "None"
const BASELINE_OUTLOOK_LABEL = "Baseline"

export function isBaselineModificationId(id: string): boolean {
  return (
    id === SCOPED_FORECAST_BASELINE_BUILDING_VERSION_ID ||
    id === ASSET_FORECAST_BASELINE_BUILDING_VERSION_ID
  )
}

/** Short label for modification / building-version dropdowns. */
export function modificationSelectLabel(id: string, storedName: string): string {
  if (isBaselineModificationId(id)) return BASELINE_MODIFICATION_LABEL
  return storedName
}

export function modificationSelectLabelFromOption(
  option: ScopedForecastBuildingVersionOption
): string {
  return modificationSelectLabel(option.id, option.name)
}

/** Short label for economic outlook set dropdowns. */
/** Normalize stored outlook **set** titles for UI (saved sets, sidebar, etc.). */
export function outlookSetStoredNameDisplay(storedName: string): string {
  if (storedName.trim() === "Baseline outlook") {
    return BASELINE_OUTLOOK_LABEL
  }
  return storedName
}

export function outlookSetSelectLabel(option: ScopedForecastOutlookSetOption): string {
  if (option.id === SCOPED_FORECAST_BASELINE_OUTLOOK_SET_ID) {
    return BASELINE_OUTLOOK_LABEL
  }
  return outlookSetStoredNameDisplay(option.name)
}

export function outlookSetSelectPlaceholder(): string {
  return BASELINE_OUTLOOK_LABEL
}

export function modificationSelectPlaceholder(): string {
  return BASELINE_MODIFICATION_LABEL
}

export function modificationItemsRecord(
  options: readonly ScopedForecastBuildingVersionOption[]
): Record<string, string> {
  return Object.fromEntries(
    options.map((option) => [option.id, modificationSelectLabelFromOption(option)])
  ) as Record<string, string>
}

export function outlookSetItemsRecord(
  options: readonly ScopedForecastOutlookSetOption[]
): Record<string, string> {
  return Object.fromEntries(
    options.map((option) => [option.id, outlookSetSelectLabel(option)])
  ) as Record<string, string>
}
