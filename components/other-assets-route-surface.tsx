"use client"

import * as React from "react"
import { useParams, usePathname } from "next/navigation"

import { PortfolioDashboard } from "@/components/portfolio-dashboard"
import { ScopedForecastsWorkspace } from "@/components/scoped-forecasts-workspace"

type LoadedSurfaceState = {
  overview: boolean
  forecasts: boolean
}

function logOtherAssetsSurfaceEvent(label: string) {
  if (
    typeof window === "undefined" ||
    process.env.NODE_ENV === "production"
  ) {
    return
  }

  console.info(`[other-assets-perf] ${label}`)
}

const KeptAliveOtherAssetsOverviewSurface = React.memo(function KeptAliveOtherAssetsOverviewSurface({
  competitiveGroupId,
  overviewPathname,
  scopeKey,
}: {
  competitiveGroupId?: string
  overviewPathname: string
  scopeKey: string
}) {
  React.useEffect(() => {
    logOtherAssetsSurfaceEvent(`other-assets-overview-render ${scopeKey}`)
  }, [scopeKey])

  return (
    <PortfolioDashboard
      assetsTableVariant="other-assets"
      competitiveGroupId={competitiveGroupId}
      pathnameOverride={overviewPathname}
    />
  )
})

const KeptAliveOtherAssetsForecastSurface = React.memo(function KeptAliveOtherAssetsForecastSurface({
  competitiveGroupId,
  scopeKey,
}: {
  competitiveGroupId?: string
  scopeKey: string
}) {
  const forecastScope = React.useMemo(
    () => ({ kind: "competitive" as const, competitiveGroupId }),
    [competitiveGroupId]
  )

  React.useEffect(() => {
    logOtherAssetsSurfaceEvent(`other-assets-forecast-render ${scopeKey}`)
  }, [scopeKey])

  return <ScopedForecastsWorkspace scope={forecastScope} />
})

function stableScopeKey(groupId: string | undefined) {
  return groupId ?? "__other_assets__"
}

function stableOverviewPath(groupParam: string | null) {
  return groupParam == null
    ? "/other-assets"
    : `/other-assets/groups/${encodeURIComponent(groupParam)}`
}

function OtherAssetsRouteSurfaceInner() {
  const pathname = usePathname()
  const params = useParams()
  const groupParam =
    typeof params?.groupId === "string" ? decodeURIComponent(params.groupId) : null
  const competitiveGroupId = React.useMemo(
    () => (groupParam == null ? undefined : groupParam),
    [groupParam]
  )
  const overviewPathname = React.useMemo(
    () => stableOverviewPath(groupParam),
    [groupParam]
  )
  const activeSurface = pathname?.endsWith("/forecasts") ? "forecasts" : "overview"
  const scopeKey = stableScopeKey(competitiveGroupId)
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
    logOtherAssetsSurfaceEvent(
      `other-assets-tab-visible ${scopeKey} ${activeSurface}`
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
      logOtherAssetsSurfaceEvent(
        `other-assets-tab-prewarm ${scopeKey} ${counterpart}`
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
      if (scopeKey === "__other_assets__") {
        logOtherAssetsSurfaceEvent(
          `other-assets-tab-prewarm-scheduled ${scopeKey} ${counterpart} fast`
        )
        const timeoutId = globalThis.setTimeout(mountCounterpart, 120)
        return () => globalThis.clearTimeout(timeoutId)
      }

      logOtherAssetsSurfaceEvent(
        `other-assets-tab-prewarm-scheduled ${scopeKey} ${counterpart} settle`
      )
      const timeoutId = globalThis.setTimeout(mountCounterpart, 900)
      return () => globalThis.clearTimeout(timeoutId)
    }

    if ("requestIdleCallback" in window) {
      logOtherAssetsSurfaceEvent(
        `other-assets-tab-prewarm-scheduled ${scopeKey} ${counterpart} idle`
      )
      const idleId = window.requestIdleCallback(mountCounterpart, {
        timeout: 1500,
      })
      return () => window.cancelIdleCallback(idleId)
    }

    logOtherAssetsSurfaceEvent(
      `other-assets-tab-prewarm-scheduled ${scopeKey} ${counterpart} timeout`
    )
    const timeoutId = globalThis.setTimeout(mountCounterpart, 0)
    return () => globalThis.clearTimeout(timeoutId)
  }, [activeSurface, loadedSurfaces, scopeKey])

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      {loadedSurfaces.overview ? (
        <div
          hidden={activeSurface !== "overview"}
          aria-hidden={activeSurface !== "overview"}
        >
          <KeptAliveOtherAssetsOverviewSurface
            competitiveGroupId={competitiveGroupId}
            overviewPathname={overviewPathname}
            scopeKey={scopeKey}
          />
        </div>
      ) : null}

      {loadedSurfaces.forecasts ? (
        <div
          hidden={activeSurface !== "forecasts"}
          aria-hidden={activeSurface !== "forecasts"}
        >
          <KeptAliveOtherAssetsForecastSurface
            competitiveGroupId={competitiveGroupId}
            scopeKey={scopeKey}
          />
        </div>
      ) : null}
    </div>
  )
}

export function OtherAssetsRouteSurface() {
  return <OtherAssetsRouteSurfaceInner />
}
