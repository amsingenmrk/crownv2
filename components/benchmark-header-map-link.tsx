"use client"

import * as React from "react"
import type { Map as MapboxMap } from "mapbox-gl"
import Link from "next/link"
import Map, { Layer, Marker, Source, type MapRef } from "react-map-gl/mapbox"

import "@/lib/configure-mapbox-gl-worker"
import "mapbox-gl/dist/mapbox-gl.css"
import { useTheme } from "@/components/theme-provider"
import {
  benchmarkAreaFitBounds,
  benchmarkAreaPolygon,
  maxZoomForBenchmarkArea,
  type BenchmarkArea,
} from "@/lib/benchmark-area-search"
import { resolveMapboxMapStyle } from "@/lib/mapbox-map-style"
import { cn } from "@/lib/utils"

const HEADER_MAP_PADDING = { top: 6, bottom: 6, left: 6, right: 6 }
const HEADER_MAP_FRAME_CLASS =
  "relative h-[12.75rem] w-full rounded-md border border-border/80 bg-muted/25"

function firstSymbolLayerId(map: MapboxMap): string | undefined {
  return map.getStyle()?.layers?.find((layer) => layer.type === "symbol")?.id
}

function BenchmarkHeaderMap({
  area,
  pin,
  className,
}: {
  area?: BenchmarkArea
  pin?: { longitude: number; latitude: number }
  className?: string
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim()
  const { resolvedTheme } = useTheme()
  const mapRef = React.useRef<MapRef>(null)
  const mapContainerRef = React.useRef<HTMLDivElement>(null)
  const instanceId = React.useId().replace(/:/g, "")
  const [labelLayerId, setLabelLayerId] = React.useState<string | undefined>()

  const boundarySourceId = `benchmark-header-boundary-${instanceId}`
  const boundaryFillLayerId = `benchmark-header-boundary-fill-${instanceId}`
  const boundaryLineLayerId = `benchmark-header-boundary-line-${instanceId}`

  const mapStyle = resolveMapboxMapStyle(resolvedTheme)
  const areaFeature = React.useMemo(
    () =>
      area
        ? area.boundaryGeometry ?? benchmarkAreaPolygon(area.bounds)
        : null,
    [area]
  )
  const fitBounds = React.useMemo(
    () => (area ? benchmarkAreaFitBounds(area) : null),
    [area]
  )

  const highlightFill = resolvedTheme === "dark" ? "#60a5fa" : "#2563eb"
  const highlightLine = resolvedTheme === "dark" ? "#93c5fd" : "#1d4ed8"
  const layerInsert = labelLayerId ? { beforeId: labelLayerId } : {}

  const syncViewport = React.useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map?.loaded()) return
    map.resize()

    if (pin && !area) {
      map.jumpTo({
        center: [pin.longitude, pin.latitude],
        zoom: 11,
      })
      return
    }

    if (fitBounds && area) {
      map.fitBounds(fitBounds, {
        padding: HEADER_MAP_PADDING,
        maxZoom: maxZoomForBenchmarkArea(area),
        duration: 0,
      })
    }
  }, [area, fitBounds, pin])

  const syncLabelLayer = React.useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    setLabelLayerId(firstSymbolLayerId(map))
  }, [])

  const handleMapLoad = React.useCallback(() => {
    syncLabelLayer()
    syncViewport()
  }, [syncLabelLayer, syncViewport])

  React.useLayoutEffect(() => {
    const el = mapContainerRef.current
    if (!el || typeof ResizeObserver === "undefined") return

    const handleResize = () => {
      requestAnimationFrame(() => {
        mapRef.current?.getMap()?.resize()
      })
    }

    const ro = new ResizeObserver(handleResize)
    ro.observe(el)
    handleResize()
    return () => ro.disconnect()
  }, [])

  React.useEffect(() => {
    syncViewport()
  }, [syncViewport])

  if (!token) {
    return (
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-muted/50 via-muted/20 to-muted/40",
          className
        )}
        aria-hidden
      />
    )
  }

  return (
    <div
      ref={mapContainerRef}
      className={cn("pointer-events-none absolute inset-0 min-h-0 min-w-0", className)}
      aria-hidden
    >
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%" }}
        initialViewState={{
          longitude: pin?.longitude ?? -98,
          latitude: pin?.latitude ?? 39,
          zoom: pin ? 11 : 3,
        }}
        attributionControl={false}
        dragPan={false}
        dragRotate={false}
        scrollZoom={false}
        doubleClickZoom={false}
        touchZoomRotate={false}
        keyboard={false}
        onLoad={handleMapLoad}
        onStyleData={syncLabelLayer}
      >
        {areaFeature ? (
          <Source id={boundarySourceId} type="geojson" data={areaFeature}>
            <Layer
              id={boundaryFillLayerId}
              type="fill"
              {...layerInsert}
              paint={{
                "fill-color": highlightFill,
                "fill-opacity": 0.2,
              }}
            />
            <Layer
              id={boundaryLineLayerId}
              type="line"
              {...layerInsert}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
              paint={{
                "line-color": highlightLine,
                "line-width": 2,
                "line-opacity": 1,
              }}
            />
          </Source>
        ) : null}
        {pin ? (
          <Marker
            longitude={pin.longitude}
            latitude={pin.latitude}
            anchor="center"
          >
            <span
              className="block size-2.5 rounded-full border border-background/80 bg-blue-600 shadow-sm ring-2 ring-white dark:bg-blue-400"
              aria-hidden
            />
          </Marker>
        ) : null}
      </Map>
    </div>
  )
}

export function BenchmarkHeaderMapLink({
  href,
  label,
  area,
  pin,
  showLabel = true,
  className,
}: {
  href: string
  label: string
  area?: BenchmarkArea
  pin?: { longitude: number; latitude: number }
  showLabel?: boolean
  className?: string
}) {
  const mapKey = `${area?.id ?? "pin-only"}:${pin ? `${pin.longitude},${pin.latitude}` : "no-pin"}`

  return (
    <Link
      href={href}
      className={cn(
        "group flex min-w-0 flex-col gap-1.5 rounded-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      aria-label={`View ${label} benchmarks`}
    >
      <div className={cn(HEADER_MAP_FRAME_CLASS, "transition-colors group-hover:border-primary/45 group-hover:bg-muted/35")}>
        <div className="absolute inset-px overflow-hidden rounded-[calc(theme(borderRadius.md)-1px)]">
          <BenchmarkHeaderMap key={mapKey} area={area} pin={pin} />
        </div>
      </div>
      {showLabel ? (
        <span className="line-clamp-2 font-medium text-foreground transition-colors group-hover:text-primary">
          {label}
        </span>
      ) : null}
    </Link>
  )
}

export function BenchmarkHeaderMapPreview({
  label,
  area,
  pin,
  showLabel = true,
  className,
}: {
  label: string
  area?: BenchmarkArea
  pin?: { longitude: number; latitude: number }
  showLabel?: boolean
  className?: string
}) {
  const mapKey = `${area?.id ?? "pin-only"}:${pin ? `${pin.longitude},${pin.latitude}` : "no-pin"}`

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5 rounded-sm", className)}>
      <div className={HEADER_MAP_FRAME_CLASS}>
        <div className="absolute inset-px overflow-hidden rounded-[calc(theme(borderRadius.md)-1px)]">
          <BenchmarkHeaderMap key={mapKey} area={area} pin={pin} />
        </div>
      </div>
      {showLabel ? (
        <span className="line-clamp-2 font-medium text-foreground">{label}</span>
      ) : null}
    </div>
  )
}
