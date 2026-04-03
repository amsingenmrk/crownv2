"use client"

import * as React from "react"

function mapboxPublicTokenConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim())
}

export type PortfolioAssetCoordinatesStatus = "idle" | "loading" | "ok" | "error"

export function usePortfolioAssetCoordinates(): {
  mapboxEnabled: boolean
  status: PortfolioAssetCoordinatesStatus
  coordinates: Record<string, readonly [number, number]>
} {
  const [state, setState] = React.useState<{
    status: PortfolioAssetCoordinatesStatus
    coordinates: Record<string, readonly [number, number]>
  }>(() => ({
    status: mapboxPublicTokenConfigured() ? "loading" : "idle",
    coordinates: {},
  }))

  React.useEffect(() => {
    if (!mapboxPublicTokenConfigured()) return
    let cancelled = false
    fetch("/api/portfolio-asset-coordinates")
      .then(async (res) => {
        if (!res.ok) throw new Error(`geocode ${res.status}`)
        const j = (await res.json()) as {
          coordinates?: Record<string, [number, number]>
        }
        if (cancelled) return
        setState({
          status: "ok",
          coordinates: j.coordinates ?? {},
        })
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "error", coordinates: {} })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return {
    mapboxEnabled: mapboxPublicTokenConfigured(),
    status: state.status,
    coordinates: state.coordinates,
  }
}
