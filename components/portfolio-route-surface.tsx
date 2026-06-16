"use client"

import * as React from "react"
import { useParams, usePathname } from "next/navigation"

import { PortfolioDashboard } from "@/components/portfolio-dashboard"
import { ScopedForecastsWorkspace } from "@/components/scoped-forecasts-workspace"
import { portfolioScopeIdFromRouteParam } from "@/lib/assets"

type LoadedSurfaceState = {
  overview: boolean
  forecasts: boolean
}

function logPortfolioSurfaceEvent(label: string) {
  if (
    typeof window === "undefined" ||
    process.env.NODE_ENV === "production"
  ) {
    return
  }

  console.info(`[forecast-perf] ${label}`)
}

const KeptAlivePortfolioOverviewSurface = React.memo(function KeptAlivePortfolioOverviewSurface({
  portfolioScopeId,
  overviewPathname,
  scopeKey,
}: {
  portfolioScopeId?: string
  overviewPathname: string
  scopeKey: string
}) {
  React.useEffect(() => {
    logPortfolioSurfaceEvent(`portfolio-overview-render ${scopeKey}`)
  }, [scopeKey])

  return (
    <PortfolioDashboard
      assetsTableVariant="portfolio"
      portfolioScopeId={portfolioScopeId}
      pathnameOverride={overviewPathname}
    />
  )
})

const KeptAlivePortfolioForecastSurface = React.memo(function KeptAlivePortfolioForecastSurface({
  portfolioScopeId,
  scopeKey,
}: {
  portfolioScopeId?: string
  scopeKey: string
}) {
  const forecastScope = React.useMemo(
    () => ({ kind: "portfolio" as const, portfolioScopeId }),
    [portfolioScopeId]
  )

  React.useEffect(() => {
    logPortfolioSurfaceEvent(`portfolio-forecast-render ${scopeKey}`)
  }, [scopeKey])

  return <ScopedForecastsWorkspace scope={forecastScope} />
})

function stableScopeKey(scopeId: string | undefined) {
  return scopeId ?? "__portfolio__"
}

function stableOverviewPath(scopeParam: string | null) {
  return scopeParam == null
    ? "/portfolio"
    : `/portfolio/scopes/${encodeURIComponent(scopeParam)}`
}

function PortfolioRouteSurfaceInner() {
  const pathname = usePathname()
  const params = useParams()
  const scopeParam = typeof params?.scopeId === "string" ? params.scopeId : null
  const portfolioScopeId = React.useMemo(
    () => (scopeParam == null ? undefined : portfolioScopeIdFromRouteParam(scopeParam)),
    [scopeParam]
  )
  const overviewPathname = React.useMemo(
    () => stableOverviewPath(scopeParam),
    [scopeParam]
  )
  const activeSurface = pathname?.endsWith("/forecasts") ? "forecasts" : "overview"
  const scopeKey = stableScopeKey(portfolioScopeId)
  const [loadedByScope, setLoadedByScope] = React.useState<
    Record<string, LoadedSurfaceState>
  >(() => ({
    [scopeKey]: {
      overview: activeSurface === "overview",
      forecasts: activeSurface === "forecasts",
    },
  }))

  const loadedSurfaces = loadedByScope[scopeKey] ?? {
    overview: activeSurface === "overview",
    forecasts: activeSurface === "forecasts",
  }

  React.useEffect(() => {
    logPortfolioSurfaceEvent(
      `portfolio-tab-visible ${scopeKey} ${activeSurface}`
    )
  }, [activeSurface, scopeKey])

  React.useEffect(() => {
    setLoadedByScope((current) => {
      const previous = current[scopeKey]
      const next = {
        overview:
          previous?.overview === true || activeSurface === "overview",
        forecasts:
          previous?.forecasts === true || activeSurface === "forecasts",
      }

      if (
        previous?.overview === next.overview &&
        previous?.forecasts === next.forecasts
      ) {
        return current
      }

      return {
        ...current,
        [scopeKey]: next,
      }
    })
  }, [activeSurface, scopeKey])

  React.useEffect(() => {
    const counterpart =
      activeSurface === "overview" ? "forecasts" : "overview"
    if (loadedSurfaces[counterpart]) return
    if (typeof window === "undefined") return

    const mountCounterpart = () => {
      logPortfolioSurfaceEvent(
        `portfolio-tab-prewarm ${scopeKey} ${counterpart}`
      )
      setLoadedByScope((current) => {
        const previous = current[scopeKey]
        if (previous?.[counterpart]) return current
        return {
          ...current,
          [scopeKey]: {
            overview:
              counterpart === "overview" || previous?.overview === true,
            forecasts:
              counterpart === "forecasts" || previous?.forecasts === true,
          },
        }
      })
    }

    if (activeSurface === "overview" && counterpart === "forecasts") {
      if (scopeKey === "__portfolio__") {
        logPortfolioSurfaceEvent(
          `portfolio-tab-prewarm-scheduled ${scopeKey} ${counterpart} fast`
        )
        const timeoutId = globalThis.setTimeout(mountCounterpart, 120)
        return () => globalThis.clearTimeout(timeoutId)
      }

      logPortfolioSurfaceEvent(
        `portfolio-tab-prewarm-scheduled ${scopeKey} ${counterpart} settle`
      )
      const timeoutId = globalThis.setTimeout(mountCounterpart, 900)
      return () => globalThis.clearTimeout(timeoutId)
    }

    if ("requestIdleCallback" in window) {
      logPortfolioSurfaceEvent(
        `portfolio-tab-prewarm-scheduled ${scopeKey} ${counterpart} idle`
      )
      const idleId = window.requestIdleCallback(mountCounterpart, {
        timeout: 1500,
      })
      return () => window.cancelIdleCallback(idleId)
    }

    logPortfolioSurfaceEvent(
      `portfolio-tab-prewarm-scheduled ${scopeKey} ${counterpart} timeout`
    )
    const timeoutId = globalThis.setTimeout(mountCounterpart, 0)
    return () => globalThis.clearTimeout(timeoutId)
  }, [activeSurface, loadedSurfaces, scopeKey])

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      {loadedSurfaces.overview ? (
        <div hidden={activeSurface !== "overview"} aria-hidden={activeSurface !== "overview"}>
          <KeptAlivePortfolioOverviewSurface
            portfolioScopeId={portfolioScopeId}
            overviewPathname={overviewPathname}
            scopeKey={scopeKey}
          />
        </div>
      ) : null}

      {loadedSurfaces.forecasts ? (
        <div hidden={activeSurface !== "forecasts"} aria-hidden={activeSurface !== "forecasts"}>
          <KeptAlivePortfolioForecastSurface
            portfolioScopeId={portfolioScopeId}
            scopeKey={scopeKey}
          />
        </div>
      ) : null}
    </div>
  )
}

export function PortfolioRouteSurface() {
  return <PortfolioRouteSurfaceInner />
}
