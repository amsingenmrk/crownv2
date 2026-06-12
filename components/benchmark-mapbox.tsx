"use client"

import * as React from "react"
import type { ErrorEvent, Map as MapboxMap } from "mapbox-gl"

import "@/lib/configure-mapbox-gl-worker"
import "mapbox-gl/dist/mapbox-gl.css"
import Map, { Layer, NavigationControl, Source, type MapRef } from "react-map-gl/mapbox"
import { useTheme } from "@/components/theme-provider"

import {
  benchmarkAreaPolygon,
  maxZoomForBenchmarkArea,
  type BenchmarkArea,
} from "@/lib/benchmark-area-search"
import { resolveMapboxMapStyle } from "@/lib/mapbox-map-style"
import { cn } from "@/lib/utils"

const NO_MAP_VIEW_PADDING = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
} as const

const VECTOR_SOURCE_ID = "benchmark-boundary-vector"
const GEOJSON_SOURCE_ID = "benchmark-boundary-geojson"
const AREA_FILL_LAYER_ID = "benchmark-area-fill"
const AREA_LINE_LAYER_ID = "benchmark-area-line"

function firstSymbolLayerId(map: MapboxMap): string | undefined {
  return map.getStyle()?.layers?.find((layer) => layer.type === "symbol")?.id
}

function boundsKey(bounds: BenchmarkArea["bounds"]): string {
  const [[west, south], [east, north]] = bounds
  return `${west},${south},${east},${north}`
}

function mapErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message
  if (typeof error === "string" && error.trim()) return error
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message
    }
    if (typeof record.status === "number") {
      return `HTTP ${record.status}`
    }
    try {
      const serialized = JSON.stringify(error)
      if (serialized && serialized !== "{}") return serialized
    } catch {
      // ignore circular structures
    }
  }
  return "Unknown map error"
}

export function BenchmarkMapbox({
  area,
  className,
}: {
  area: BenchmarkArea
  className?: string
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim()
  const { resolvedTheme } = useTheme()
  const mapRef = React.useRef<MapRef>(null)
  const mapContainerRef = React.useRef<HTMLDivElement>(null)
  const postLoadResizeTimeoutsRef = React.useRef<number[]>([])
  const [labelLayerId, setLabelLayerId] = React.useState<string | undefined>()
  const [vectorUnavailable, setVectorUnavailable] = React.useState(false)

  const mapStyle = resolveMapboxMapStyle(resolvedTheme)
  const areaBoundsKey = boundsKey(area.bounds)
  const boundaryGeometry = area.boundaryGeometry
  const boundary = area.boundary
  const useStoredGeometry = Boolean(boundaryGeometry)
  const useVectorBoundary =
    Boolean(boundary) && !vectorUnavailable && !useStoredGeometry
  const mapInstanceKey = useStoredGeometry
    ? `${area.id}-stored`
    : useVectorBoundary
      ? `${area.id}-vector`
      : `${area.id}-geojson`

  const areaFeature = React.useMemo(
    () => boundaryGeometry ?? benchmarkAreaPolygon(area.bounds),
    [area.id, areaBoundsKey, boundaryGeometry]
  )

  const highlightFill =
    resolvedTheme === "dark" ? "#a78bfa" : "#7c3aed"
  const highlightLine =
    resolvedTheme === "dark" ? "#ddd6fe" : "#5b21b6"

  const layerInsert = labelLayerId ? { beforeId: labelLayerId } : {}

  const areaBoundaryModeKey = useStoredGeometry
    ? `${area.id}:stored`
    : `${area.id}:${boundary?.tilesetUrl ?? "none"}`

  React.useEffect(() => {
    setVectorUnavailable(false)
  }, [areaBoundaryModeKey])

  const handleMapError = React.useCallback(
    (event: ErrorEvent) => {
      const message = mapErrorMessage(event.error)
      if (useVectorBoundary) {
        setVectorUnavailable(true)
        return
      }
      console.warn(`Benchmark map: ${message}`)
    },
    [useVectorBoundary]
  )

  const fitToArea = React.useCallback(
    (animate: boolean) => {
      const map = mapRef.current?.getMap()
      if (!map) return
      map.fitBounds(area.bounds, {
        padding: { top: 72, bottom: 40, left: 48, right: 48 },
        maxZoom: maxZoomForBenchmarkArea(area),
        duration: animate ? 700 : 0,
      })
    },
    [area.id, areaBoundsKey, area.bounds]
  )

  const handleMapLoad = React.useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    map.setPadding({ ...NO_MAP_VIEW_PADDING })
    setLabelLayerId(firstSymbolLayerId(map))

    const resizeAndFit = () => {
      map.resize()
      fitToArea(false)
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(resizeAndFit)
    })

    for (const id of postLoadResizeTimeoutsRef.current) {
      window.clearTimeout(id)
    }
    postLoadResizeTimeoutsRef.current = [32, 100, 250].map((ms) =>
      window.setTimeout(resizeAndFit, ms)
    )
  }, [fitToArea])

  React.useEffect(
    () => () => {
      for (const id of postLoadResizeTimeoutsRef.current) {
        window.clearTimeout(id)
      }
      postLoadResizeTimeoutsRef.current = []
    },
    []
  )

  React.useLayoutEffect(() => {
    const el = mapContainerRef.current
    if (!el || typeof ResizeObserver === "undefined") return

    const resizeMap = () => {
      mapRef.current?.getMap()?.resize()
    }

    const ro = new ResizeObserver(resizeMap)
    ro.observe(el)
    window.addEventListener("resize", resizeMap)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", resizeMap)
    }
  }, [])

  React.useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map?.loaded()) return
    fitToArea(true)
  }, [area.id, areaBoundsKey, fitToArea, mapInstanceKey])

  if (!token) {
    return null
  }

  return (
    <div
      ref={mapContainerRef}
      className={cn("absolute inset-0 min-h-0 min-w-0 size-full", className)}
    >
      <Map
        key={mapInstanceKey}
        ref={mapRef}
        mapboxAccessToken={token}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%", minHeight: "100%" }}
        initialViewState={{
          longitude: -98,
          latitude: 39,
          zoom: 3,
          padding: { ...NO_MAP_VIEW_PADDING },
        }}
        onLoad={handleMapLoad}
        onError={handleMapError}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {useVectorBoundary && boundary ? (
          <Source
            id={VECTOR_SOURCE_ID}
            type="vector"
            url={boundary.tilesetUrl}
          >
            <Layer
              id={AREA_FILL_LAYER_ID}
              type="fill"
              source-layer={boundary.sourceLayer}
              filter={boundary.filter}
              {...layerInsert}
              paint={{
                "fill-color": highlightFill,
                "fill-opacity": 0.18,
              }}
            />
            <Layer
              id={AREA_LINE_LAYER_ID}
              type="line"
              source-layer={boundary.sourceLayer}
              filter={boundary.filter}
              {...layerInsert}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
              paint={{
                "line-color": highlightLine,
                "line-width": 3,
                "line-opacity": 1,
              }}
            />
          </Source>
        ) : (
          <Source id={GEOJSON_SOURCE_ID} type="geojson" data={areaFeature}>
            <Layer
              id={AREA_FILL_LAYER_ID}
              type="fill"
              {...layerInsert}
              paint={{
                "fill-color": highlightFill,
                "fill-opacity": 0.18,
              }}
            />
            <Layer
              id={AREA_LINE_LAYER_ID}
              type="line"
              {...layerInsert}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
              paint={{
                "line-color": highlightLine,
                "line-width": 3,
                "line-opacity": 1,
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  )
}
