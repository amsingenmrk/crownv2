"use client"

import * as React from "react"

import "@/lib/configure-mapbox-gl-worker"
import "mapbox-gl/dist/mapbox-gl.css"
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/mapbox"
import { useTheme } from "next-themes"

import { resolveMapboxMapStyle } from "@/lib/mapbox-map-style"
import { mapPinClassFromStrength } from "@/lib/portfolio-lift"
import { cn } from "@/lib/utils"

export type PortfolioMapboxPin = {
  id: string
  longitude: number
  latitude: number
  building: string
  lift: string
  liftPercent: number
  liftStrength: number
}

function boundsFromPins(
  pins: PortfolioMapboxPin[]
): [[number, number], [number, number]] | null {
  if (pins.length === 0) return null
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  for (const p of pins) {
    minLng = Math.min(minLng, p.longitude)
    maxLng = Math.max(maxLng, p.longitude)
    minLat = Math.min(minLat, p.latitude)
    maxLat = Math.max(maxLat, p.latitude)
  }
  if (minLng === maxLng && minLat === maxLat) {
    const d = 0.04
    return [
      [minLng - d, minLat - d],
      [maxLng + d, maxLat + d],
    ]
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ]
}

export function PortfolioMapbox({
  pins,
  className,
}: {
  pins: PortfolioMapboxPin[]
  className?: string
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim()
  const { resolvedTheme } = useTheme()
  const mapRef = React.useRef<MapRef>(null)

  const mapStyle = resolveMapboxMapStyle(resolvedTheme)

  const bounds = React.useMemo(() => boundsFromPins(pins), [pins])

  const fitToPins = React.useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map?.loaded() || !bounds || pins.length === 0) return
    map.fitBounds(bounds, { padding: 52, maxZoom: 11, duration: 450 })
  }, [bounds, pins.length])

  React.useEffect(() => {
    fitToPins()
  }, [fitToPins])

  if (!token) {
    return null
  }

  return (
    <div className={cn("absolute inset-0 min-h-[200px] w-full", className)}>
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%", minHeight: "100%" }}
        initialViewState={
          bounds && pins.length > 0
            ? {
                bounds,
                fitBoundsOptions: { padding: 52, maxZoom: 11 },
              }
            : { longitude: -98, latitude: 39, zoom: 3 }
        }
        onLoad={fitToPins}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {pins.map((p) => (
          <Marker
            key={p.id}
            longitude={p.longitude}
            latitude={p.latitude}
            anchor="center"
          >
            <span
              className={cn(
                "block size-3 cursor-default rounded-full",
                mapPinClassFromStrength(p.liftStrength)
              )}
              title={
                p.lift
                  ? `${p.building} · Potential lift ${p.lift}`
                  : p.building
              }
            />
          </Marker>
        ))}
      </Map>
    </div>
  )
}
