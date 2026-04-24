import type HighchartsNS from "highcharts"
import HighchartsCore from "highcharts/es-modules/masters/highcharts.src.js"
import "highcharts/es-modules/Series/AreaRange/AreaRangeSeries.js"

import type { AssetForecastModel, ForecastStatementRow } from "@/lib/forecast-data"
import { getSampleStackingPlanData } from "@/lib/stacking-plan-data"

/** Same instance passed to `highcharts-react-official` in {@link AssetForecastCharts}. */
export const Highcharts = HighchartsCore as unknown as typeof HighchartsNS

const TOOLTIP_FONT = "var(--font-sans), system-ui, sans-serif"

type LeaseRow = {
  tenantName: string
  sqft: number
  expirationDate: Date
}

export type ForecastChartPalette = {
  text: string
  mutedText: string
  grid: string
  border: string
  primary: string
  secondary: string
  tertiary: string
  quaternary: string
  accent: string
  neutral: string
  tooltipBackground: string
}

export type ForecastChartTab =
  | "grossRevenue"
  | "opex"
  | "noi"
  | "salePrice"
  | "capRate"

type ForecastStatementChartMeta = {
  title: string
  description: string
  yAxisTitle: string
}

const FORECAST_STATEMENT_CHART_META: Record<ForecastChartTab, ForecastStatementChartMeta> = {
  grossRevenue: {
    title: "Gross Revenue Projection",
    description: "Quarterly gross revenue compared across the selected outlooks.",
    yAxisTitle: "$M",
  },
  opex: {
    title: "OpEx Projection",
    description: "Quarterly operating expenses compared across the selected outlooks.",
    yAxisTitle: "$M",
  },
  noi: {
    title: "NOI Projection",
    description: "Quarterly net operating income compared across the selected outlooks.",
    yAxisTitle: "$M",
  },
  salePrice: {
    title: "Asset Value Projection",
    description: "Quarterly asset value implied by each selected outlook.",
    yAxisTitle: "$M",
  },
  capRate: {
    title: "Cap Rate Projection",
    description: "Quarterly exit cap rate compared across the selected outlooks.",
    yAxisTitle: "%",
  },
}

function toMillions(value: number) {
  return Number((value / 1_000_000).toFixed(2))
}

function toThousandSqft(value: number) {
  return Number((value / 1000).toFixed(1))
}

function parseDate(dateValue?: string) {
  if (dateValue == null || dateValue === "") return null
  const parsed = new Date(dateValue)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getLeaseRows(assetId: string): LeaseRow[] {
  const dataset = getSampleStackingPlanData(assetId)

  return dataset.floors.flatMap((floor) =>
    floor.tenants.flatMap((tenant) => {
      if (tenant.isVacant) return []
      const expirationDate = parseDate(tenant.leaseExpirationDate)
      if (expirationDate == null) return []

      return [
        {
          tenantName: tenant.name,
          sqft: tenant.sqft,
          expirationDate,
        },
      ]
    })
  )
}

function buildLeaseYearCategories(leaseRows: LeaseRow[]) {
  if (leaseRows.length === 0) {
    return [String(new Date().getFullYear())]
  }

  const years = leaseRows.map((row) => row.expirationDate.getUTCFullYear())
  const startYear = Math.min(...years)
  const endYear = Math.max(...years)

  return Array.from({ length: endYear - startYear + 1 }, (_, index) => String(startYear + index))
}

function computeWaltYears(leaseRows: LeaseRow[], asOfDate: Date) {
  let weightedSum = 0
  let totalSqft = 0

  for (const row of leaseRows) {
    if (row.expirationDate.getTime() <= asOfDate.getTime()) continue

    const yearsRemaining =
      (row.expirationDate.getTime() - asOfDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)

    weightedSum += row.sqft * yearsRemaining
    totalSqft += row.sqft
  }

  if (totalSqft === 0) return 0
  return Number((weightedSum / totalSqft).toFixed(1))
}

export function getForecastLeaseWaltYears(assetId: string) {
  return computeWaltYears(getLeaseRows(assetId), new Date())
}

export function getForecastStatementChartMeta(rowId: ForecastChartTab) {
  return FORECAST_STATEMENT_CHART_META[rowId]
}

function buildCurrencyStatementSeries(row: ForecastStatementRow) {
  return row.values.map((value) => toMillions(Math.abs(value)))
}

function buildStatementChartValues(row: ForecastStatementRow, isPercent: boolean) {
  return isPercent
    ? row.values.map((value) => Number(value.toFixed(2)))
    : buildCurrencyStatementSeries(row)
}

function buildStatementUncertaintyBand(
  row: ForecastStatementRow,
  isPercent: boolean
) {
  const band = row.uncertaintyBand
  if (band == null) {
    return null
  }

  return {
    lowerValues: isPercent
      ? band.lowerValues.map((value) => Number(value.toFixed(2)))
      : band.lowerValues.map((value) => toMillions(Math.abs(value))),
    upperValues: isPercent
      ? band.upperValues.map((value) => Number(value.toFixed(2)))
      : band.upperValues.map((value) => toMillions(Math.abs(value))),
    label: band.label,
  }
}

function gradientFillForColor(color: string): Highcharts.GradientColorObject {
  return {
    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
    stops: [
      [0, Highcharts.color(color).setOpacity(0.18).get() as string],
      [1, Highcharts.color(color).setOpacity(0.03).get() as string],
    ],
  }
}

const SCOPED_PORTFOLIO_EXPECTED_SCENARIO_ID = "scoped-portfolio-expected"
const SCOPED_PORTFOLIO_FAN_OUTLOOK_IDS = [
  "scoped-portfolio-baseline",
  "scoped-portfolio-optimistic",
  "scoped-portfolio-pessimistic",
] as const

function isScopedPortfolioFanChartModels(models: AssetForecastModel[]): boolean {
  if (models.length !== 4) return false
  if (models[0]?.scenario.id !== SCOPED_PORTFOLIO_EXPECTED_SCENARIO_ID) return false
  const restIds = models.slice(1).map((m) => m.scenario.id).sort()
  const expected = [...SCOPED_PORTFOLIO_FAN_OUTLOOK_IDS].sort()
  return restIds.length === 3 && restIds.every((id, index) => id === expected[index])
}

function buildScopedPortfolioFanForecastStatementConfig(
  models: AssetForecastModel[],
  rowId: ForecastChartTab,
  palette: ForecastChartPalette
): Highcharts.Options {
  const expectedModel = models[0]!
  const baselineModel = models.find((m) => m.scenario.id === "scoped-portfolio-baseline")!
  const optimisticModel = models.find((m) => m.scenario.id === "scoped-portfolio-optimistic")!
  const pessimisticModel = models.find((m) => m.scenario.id === "scoped-portfolio-pessimistic")!

  const categories = expectedModel.periods.map((period) => period.label)
  const baseRow =
    expectedModel.statementRows.find((statementRow) => statementRow.id === rowId) ??
    expectedModel.statementRows[0]
  const resolvedRowId = (baseRow?.id as ForecastChartTab | undefined) ?? "grossRevenue"
  const meta = getForecastStatementChartMeta(resolvedRowId)
  const isPercent = baseRow?.kind === "percent"

  const rowFor = (model: AssetForecastModel): ForecastStatementRow =>
    model.statementRows.find((r) => r.id === resolvedRowId) ??
    model.statementRows[0] ?? {
      id: resolvedRowId,
      label: meta.title,
      kind: "currency" as const,
      values: Array(categories.length).fill(0),
    }

  const pessimisticValues = buildStatementChartValues(rowFor(pessimisticModel), isPercent)
  const optimisticValues = buildStatementChartValues(rowFor(optimisticModel), isPercent)
  const baselineValues = buildStatementChartValues(rowFor(baselineModel), isPercent)
  const weightedValues = buildStatementChartValues(rowFor(expectedModel), isPercent)

  const rangeData: [number, number][] = categories.map((_, index) => {
    const low = pessimisticValues[index] ?? 0
    const high = optimisticValues[index] ?? 0
    return [Math.min(low, high), Math.max(low, high)]
  })

  const rangeColor = palette.primary
  const baselineColor = palette.accent
  const weightedColor = palette.secondary

  const formatY = (value: number) =>
    isPercent ? `${Number(value).toFixed(2)}%` : `$${Number(value).toFixed(2)}M`

  const series: Highcharts.SeriesOptionsType[] = [
    {
      type: "arearange",
      name: "Pessimistic–optimistic",
      data: rangeData,
      color: rangeColor,
      fillColor: Highcharts.color(rangeColor).setOpacity(0.22).get() as string,
      fillOpacity: 1,
      lineWidth: 0,
      marker: { enabled: false },
      zIndex: 0,
    },
    {
      type: "line",
      name: "Baseline",
      data: baselineValues,
      color: baselineColor,
      lineWidth: 2.5,
      zIndex: 2,
      marker: { enabled: false },
    },
    {
      type: "line",
      name: expectedModel.scenario.name,
      data: weightedValues,
      color: weightedColor,
      lineWidth: 2,
      dashStyle: "ShortDot",
      zIndex: 3,
      marker: { enabled: false },
    },
  ]

  return {
    chart: {
      type: "line",
      backgroundColor: "transparent",
      plotBackgroundColor: "transparent",
      style: { fontFamily: TOOLTIP_FONT },
      spacing: [8, 8, 8, 8],
    },
    title: { text: undefined },
    xAxis: {
      categories,
      title: {
        text: "Quarter",
        style: {
          color: palette.mutedText,
          fontSize: "11px",
          fontWeight: "500",
        },
      },
      lineColor: palette.border,
      lineWidth: 1,
      tickColor: palette.border,
      tickLength: 6,
      tickWidth: 1,
      labels: {
        style: {
          color: palette.mutedText,
          fontSize: "11px",
        },
      },
    },
    yAxis: {
      title: {
        text: meta.yAxisTitle,
        style: {
          color: palette.mutedText,
          fontSize: "11px",
          fontWeight: "500",
        },
      },
      gridLineColor: palette.grid,
      lineWidth: 0,
      tickWidth: 0,
      labels: {
        formatter: function () {
          if (isPercent) {
            return `${Number(this.value).toFixed(1)}%`
          }
          return `$${Number(this.value).toFixed(1)}M`
        },
        style: {
          color: palette.mutedText,
          fontSize: "11px",
        },
      },
    },
    legend: {
      enabled: true,
      align: "center",
      verticalAlign: "bottom",
      margin: 12,
      itemStyle: {
        color: palette.text,
        fontSize: "11px",
        fontWeight: "500",
      },
    },
    plotOptions: {
      arearange: {
        lineWidth: 0,
        marker: { enabled: false },
      },
      series: {
        animation: false,
      },
      line: {
        lineWidth: 2.5,
        marker: {
          enabled: false,
        },
      },
    },
    series,
    credits: { enabled: false },
    tooltip: {
      shared: true,
      outside: false,
      backgroundColor: palette.tooltipBackground,
      borderColor: palette.border,
      borderRadius: 10,
      style: {
        color: palette.text,
        fontSize: "12px",
        fontFamily: TOOLTIP_FONT,
      },
      formatter: function () {
        const points = this.points ?? []
        if (points.length === 0) return false

        const rawX = this.x
        const index = typeof rawX === "number" && Number.isFinite(rawX) ? Math.round(rawX) : NaN
        const fromCategories =
          !Number.isNaN(index) && index >= 0 && index < categories.length ? categories[index] : null
        const fromPoint = points[0]?.category
        const xLabel =
          (typeof fromPoint === "string" && fromPoint !== "" ? fromPoint : null) ??
          fromCategories ??
          (typeof rawX === "string" ? rawX : null) ??
          String(rawX ?? "")

        const lines = [`<b>${xLabel}</b>`]
        for (const point of points) {
          if (point.series.type === "arearange") {
            const rangePoint = point as Highcharts.Point & { low?: number; high?: number }
            const low = rangePoint.low
            const high = rangePoint.high
            if (low == null || high == null) continue
            lines.push(
              `<span style="color:${point.color}">\u25cf</span> <b>${point.series.name}:</b> ${formatY(low)} – ${formatY(high)}`
            )
          } else if (point.y != null) {
            lines.push(
              `<span style="color:${point.color}">\u25cf</span> <b>${point.series.name}:</b> ${formatY(Number(point.y))}`
            )
          }
        }
        lines.push(
          `<span style="color:${palette.mutedText};font-size:11px;">Shaded band spans pessimistic to optimistic by quarter.</span>`
        )
        return lines.join("<br/>")
      },
    },
  }
}

export function buildForecastStatementHighchartsConfig(
  models: AssetForecastModel[],
  rowId: ForecastChartTab,
  palette: ForecastChartPalette
): Highcharts.Options {
  if (isScopedPortfolioFanChartModels(models)) {
    return buildScopedPortfolioFanForecastStatementConfig(models, rowId, palette)
  }

  const baseModel = models[0]
  const baseRow =
    baseModel?.statementRows.find((statementRow) => statementRow.id === rowId) ??
    baseModel?.statementRows[0]
  const categories = baseModel?.periods.map((period) => period.label) ?? []
  const resolvedRowId = (baseRow?.id as ForecastChartTab | undefined) ?? "grossRevenue"
  const meta = getForecastStatementChartMeta(resolvedRowId)
  const isPercent = baseRow?.kind === "percent"
  const colors = [
    palette.primary,
    palette.secondary,
    palette.tertiary,
    palette.quaternary,
    palette.accent,
    palette.neutral,
  ]
  const series: Highcharts.SeriesOptionsType[] = models.flatMap((model, index) => {
    const row =
      model.statementRows.find((statementRow) => statementRow.id === resolvedRowId) ??
      model.statementRows[0] ?? {
        id: resolvedRowId,
        label: meta.title,
        kind: "currency" as const,
        values: Array(categories.length).fill(0),
      }
    const color = colors[index % colors.length]
    const data = buildStatementChartValues(row, isPercent)
    const uncertaintyBand = buildStatementUncertaintyBand(row, isPercent)
    const uncertaintyStack = `uncertainty-${index}`

    const envelopeSeries: Highcharts.SeriesOptionsType[] =
      uncertaintyBand == null
        ? []
        : [
            {
              type: "area",
              name: `${model.scenario.name} lower bound filler`,
              data: uncertaintyBand.lowerValues,
              stack: uncertaintyStack,
              showInLegend: false,
              enableMouseTracking: false,
              color: Highcharts.color(color).setOpacity(0).get() as string,
              fillOpacity: 0,
              lineWidth: 0,
              marker: { enabled: false },
              states: {
                hover: { enabled: false },
                inactive: { opacity: 1 },
              },
            },
            {
              type: "area",
              name: `${model.scenario.name} estimated uncertainty`,
              data: uncertaintyBand.upperValues.map((value, pointIndex) =>
                Number(
                  (
                    value - (uncertaintyBand.lowerValues[pointIndex] ?? value)
                  ).toFixed(2)
                )
              ),
              stack: uncertaintyStack,
              showInLegend: false,
              enableMouseTracking: false,
              color,
              fillColor: gradientFillForColor(color),
              lineWidth: 0,
              marker: { enabled: false },
              states: {
                hover: { enabled: false },
                inactive: { opacity: 1 },
              },
            },
          ]

    return [
      ...envelopeSeries,
      {
        type: "line",
        name: model.scenario.name,
        data,
        color,
        zIndex: 2,
        custom: {
          uncertaintyLabel: uncertaintyBand?.label,
        },
      } satisfies Highcharts.SeriesLineOptions,
    ]
  })

  return {
    chart: {
      type: "line",
      backgroundColor: "transparent",
      plotBackgroundColor: "transparent",
      style: { fontFamily: TOOLTIP_FONT },
      spacing: [8, 8, 8, 8],
    },
    title: { text: undefined },
    xAxis: {
      categories,
      title: {
        text: "Quarter",
        style: {
          color: palette.mutedText,
          fontSize: "11px",
          fontWeight: "500",
        },
      },
      lineColor: palette.border,
      lineWidth: 1,
      tickColor: palette.border,
      tickLength: 6,
      tickWidth: 1,
      labels: {
        style: {
          color: palette.mutedText,
          fontSize: "11px",
        },
      },
    },
    yAxis: {
      title: {
        text: meta.yAxisTitle,
        style: {
          color: palette.mutedText,
          fontSize: "11px",
          fontWeight: "500",
        },
      },
      gridLineColor: palette.grid,
      lineWidth: 0,
      tickWidth: 0,
      labels: {
        formatter: function () {
          if (isPercent) {
            return `${Number(this.value).toFixed(1)}%`
          }
          return `$${Number(this.value).toFixed(1)}M`
        },
        style: {
          color: palette.mutedText,
          fontSize: "11px",
        },
      },
    },
    legend: {
      enabled: true,
      align: "center",
      verticalAlign: "bottom",
      margin: 12,
      itemStyle: {
        color: palette.text,
        fontSize: "11px",
        fontWeight: "500",
      },
    },
    plotOptions: {
      area: {
        stacking: "normal",
        lineWidth: 0,
        marker: {
          enabled: false,
        },
      },
      series: {
        animation: false,
      },
      line: {
        lineWidth: 2.5,
        marker: {
          enabled: false,
        },
      },
    },
    series,
    credits: { enabled: false },
    tooltip: {
      shared: true,
      outside: false,
      backgroundColor: palette.tooltipBackground,
      borderColor: palette.border,
      borderRadius: 10,
      style: {
        color: palette.text,
        fontSize: "12px",
        fontFamily: TOOLTIP_FONT,
      },
      formatter: function () {
        const points = (this.points ?? []).filter((point) => point.y != null)
        if (points.length === 0) return false

        // Shared tooltip: `this.x` is often the category *index* (0, 1, 2…), not the label.
        const rawX = this.x
        const index = typeof rawX === "number" && Number.isFinite(rawX) ? Math.round(rawX) : NaN
        const fromCategories =
          !Number.isNaN(index) && index >= 0 && index < categories.length ? categories[index] : null
        const fromPoint = points[0]?.category
        const xLabel =
          (typeof fromPoint === "string" && fromPoint !== "" ? fromPoint : null) ??
          fromCategories ??
          (typeof rawX === "string" ? rawX : null) ??
          String(rawX ?? "")

        return [
          `<b>${xLabel}</b>`,
          ...points.map(
            (point) =>
              `<span style="color:${point.color}">\u25cf</span> <b>${point.series.name}:</b> ${
                isPercent ? `${Number(point.y).toFixed(2)}%` : `$${Number(point.y).toFixed(2)}M`
              }`
          ),
          ...points
            .flatMap((point) => {
              const userOptions = point.series.userOptions as Highcharts.SeriesLineOptions & {
                custom?: { uncertaintyLabel?: string }
              }
              const uncertaintyLabel = userOptions.custom?.uncertaintyLabel
              return uncertaintyLabel == null
                ? []
                : [
                    `<span style="color:${palette.mutedText};font-size:11px;">${uncertaintyLabel}. Shading is heuristic and not a calibrated confidence interval.</span>`,
                  ]
            })
            .slice(0, 1),
        ].join("<br/>")
      },
    },
  }
}

export function buildForecastLeaseHighchartsConfig(
  assetId: string,
  palette: ForecastChartPalette
): Highcharts.Options {
  const leaseRows = getLeaseRows(assetId)
  const years = buildLeaseYearCategories(leaseRows)

  const sqftByTenant = new Map<string, number>()
  for (const row of leaseRows) {
    sqftByTenant.set(row.tenantName, (sqftByTenant.get(row.tenantName) ?? 0) + row.sqft)
  }

  const topTenants = [...sqftByTenant.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([tenantName]) => tenantName)

  const colors = [
    palette.primary,
    palette.secondary,
    palette.tertiary,
    palette.quaternary,
  ]

  const series: Highcharts.SeriesColumnOptions[] = topTenants.map((tenantName, index) => ({
    type: "column",
    name: tenantName,
    color: colors[index] ?? palette.primary,
    data: years.map((year) =>
      toThousandSqft(
        leaseRows
          .filter(
            (row) =>
              row.tenantName === tenantName &&
              String(row.expirationDate.getUTCFullYear()) === year
          )
          .reduce((sum, row) => sum + row.sqft, 0)
      )
    ),
  }))

  const otherTenants = leaseRows.filter((row) => !topTenants.includes(row.tenantName))
  const otherData = years.map((year) =>
    toThousandSqft(
      otherTenants
        .filter((row) => String(row.expirationDate.getUTCFullYear()) === year)
        .reduce((sum, row) => sum + row.sqft, 0)
    )
  )

  if (otherData.some((value) => value > 0)) {
    series.push({
      type: "column",
      name: "Other Tenants",
      color: palette.neutral,
      data: otherData,
    })
  }

  return {
    chart: {
      type: "column",
      backgroundColor: "transparent",
      plotBackgroundColor: "transparent",
      style: { fontFamily: TOOLTIP_FONT },
      spacing: [8, 8, 8, 8],
    },
    title: { text: undefined },
    xAxis: {
      categories: years,
      lineWidth: 0,
      tickWidth: 0,
      labels: {
        style: {
          color: palette.mutedText,
          fontSize: "11px",
        },
      },
    },
    yAxis: {
      title: {
        text: "Expiring (k SF)",
        style: {
          color: palette.mutedText,
          fontSize: "11px",
          fontWeight: "500",
        },
      },
      gridLineColor: palette.grid,
      lineWidth: 0,
      tickWidth: 0,
      labels: {
        formatter: function () {
          return `${Number(this.value).toFixed(0)}`
        },
        style: {
          color: palette.mutedText,
          fontSize: "11px",
        },
      },
    },
    legend: {
      align: "center",
      verticalAlign: "bottom",
      margin: 12,
      itemStyle: {
        color: palette.text,
        fontSize: "11px",
        fontWeight: "500",
      },
    },
    plotOptions: {
      column: {
        stacking: "normal",
        borderWidth: 0,
        pointPadding: 0.06,
        groupPadding: 0.14,
      },
      series: {
        animation: false,
      },
    },
    series,
    credits: { enabled: false },
    tooltip: {
      shared: true,
      outside: false,
      backgroundColor: palette.tooltipBackground,
      borderColor: palette.border,
      borderRadius: 10,
      style: {
        color: palette.text,
        fontSize: "12px",
        fontFamily: TOOLTIP_FONT,
      },
      formatter: function () {
        const points = (this.points ?? []).filter((point) => point.y != null && point.y > 0)
        if (points.length === 0) return false

        const rawX = this.x
        const index = typeof rawX === "number" && Number.isFinite(rawX) ? Math.round(rawX) : NaN
        const fromCategories =
          !Number.isNaN(index) && index >= 0 && index < years.length ? years[index] : null
        const fromPoint = points[0]?.category
        const xLabel =
          (typeof fromPoint === "string" && fromPoint !== "" ? fromPoint : null) ??
          fromCategories ??
          (typeof rawX === "string" ? rawX : null) ??
          String(rawX ?? "")

        return [
          `<b>${xLabel}</b>`,
          ...points.map(
            (point) =>
              `<span style="color:${point.color}">\u25cf</span> <b>${point.series.name}:</b> ${Number(point.y).toFixed(1)}k SF`
          ),
        ].join("<br/>")
      },
    },
  }
}

export function buildForecastWaltHighchartsConfig(
  assetId: string,
  palette: ForecastChartPalette
): Highcharts.Options {
  const leaseRows = getLeaseRows(assetId)
  const currentYear = new Date().getUTCFullYear()
  const finalExpirationYear = leaseRows.reduce(
    (maxYear, row) => Math.max(maxYear, row.expirationDate.getUTCFullYear()),
    currentYear + 1
  )
  const years = Array.from(
    { length: Math.max(2, finalExpirationYear - currentYear + 1) },
    (_, index) => String(currentYear + index)
  )
  const values = years.map((year) =>
    computeWaltYears(leaseRows, new Date(Date.UTC(Number(year), 0, 1)))
  )

  return {
    chart: {
      type: "line",
      backgroundColor: "transparent",
      plotBackgroundColor: "transparent",
      style: { fontFamily: TOOLTIP_FONT },
      spacing: [8, 8, 8, 8],
    },
    title: { text: undefined },
    xAxis: {
      categories: years,
      lineWidth: 0,
      tickWidth: 0,
      labels: {
        style: {
          color: palette.mutedText,
          fontSize: "11px",
        },
      },
    },
    yAxis: {
      title: {
        text: "WALT (yrs)",
        style: {
          color: palette.mutedText,
          fontSize: "11px",
          fontWeight: "500",
        },
      },
      min: 0,
      gridLineColor: palette.grid,
      lineWidth: 0,
      tickWidth: 0,
      labels: {
        formatter: function () {
          return `${Number(this.value).toFixed(1)}`
        },
        style: {
          color: palette.mutedText,
          fontSize: "11px",
        },
      },
    },
    legend: { enabled: false },
    plotOptions: {
      series: {
        animation: false,
      },
      line: {
        lineWidth: 2.5,
        marker: {
          enabled: true,
          radius: 3.5,
        },
      },
    },
    series: [
      {
        type: "line",
        name: "WALT",
        data: values,
        color: palette.primary,
      },
    ],
    credits: { enabled: false },
    tooltip: {
      outside: false,
      backgroundColor: palette.tooltipBackground,
      borderColor: palette.border,
      borderRadius: 10,
      style: {
        color: palette.text,
        fontSize: "12px",
        fontFamily: TOOLTIP_FONT,
      },
      pointFormatter: function () {
        return `<span style="color:${this.color}">\u25cf</span> <b>${this.series.name}:</b> ${Number(this.y).toFixed(1)} yrs`
      },
    },
  }
}
