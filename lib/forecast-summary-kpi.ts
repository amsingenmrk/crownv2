/** Row model for `AssetForecastSummaryStrip` and scoped forecast KPI builders. */
export type ForecastSummaryKpi = {
  label: string
  value: string
  valueSuffix?: string
  /** Optional: render base → scenario + delta line (scenario overview treatment). */
  baseFormatted?: string
  scenarioFormatted?: string
  showScenario?: boolean
  deltaLine?: string
  pctLine?: string
  deltaDirection?: "up" | "down" | "neutral"
}
