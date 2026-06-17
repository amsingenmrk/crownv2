"use client"

import * as React from "react"
import type { Map as MapboxMap } from "mapbox-gl"

import "@/lib/configure-mapbox-gl-worker"
import "mapbox-gl/dist/mapbox-gl.css"
import Map, { Layer, NavigationControl, Source, type MapRef } from "react-map-gl/mapbox"
import { useTheme } from "@/components/theme-provider"

import {
  benchmarkAreaFitBounds,
  benchmarkAreaPolygon,
  maxZoomForBenchmarkArea,
  type BenchmarkArea,
} from "@/lib/benchmark-area-search"
import { resolveMapboxMapStyle } from "@/lib/mapbox-map-style"
import { cn } from "@/lib/utils"

const BOUNDARY_SOURCE_ID = "benchmark-boundary"
const BOUNDARY_FILL_LAYER_ID = "benchmark-boundary-fill"
const BOUNDARY_LINE_LAYER_ID = "benchmark-boundary-line"

function firstSymbolLayerId(map: MapboxMap): string | undefined {
  return map.getStyle()?.layers?.find((layer) => layer.type === "symbol")?.id
}

function fitPaddingForBenchmarkMap(compactMode: boolean) {
  if (compactMode) {
    return { top: 56, bottom: 20, left: 16, right: 16 }
  }
  return { top: 56, bottom: 32, left: 40, right: 40 }
}

export function BenchmarkMapbox({
  area,
  className,
  compactMode = false,
}: {
  area: BenchmarkArea
  className?: string
  compactMode?: boolean
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim()
  const { resolvedTheme } = useTheme()
  const mapRef = React.useRef<MapRef>(null)
  const mapContainerRef = React.useRef<HTMLDivElement>(null)
  const fitTimeoutsRef = React.useRef<number[]>([])
  const [labelLayerId, setLabelLayerId] = React.useState<string | undefined>()

  const mapStyle = resolveMapboxMapStyle(resolvedTheme)
  const areaFeature = React.useMemo(
    () => area.boundaryGeometry ?? benchmarkAreaPolygon(area.bounds),
    [area.boundaryGeometry, area.bounds]
  )
  const fitBounds = React.useMemo(
    () => benchmarkAreaFitBounds(area),
    [area.id, area.bounds, area.boundaryGeometry]
  )

  const highlightFill = resolvedTheme === "dark" ? "#60a5fa" : "#2563eb"
  const highlightLine = resolvedTheme === "dark" ? "#93c5fd" : "#1d4ed8"
  const layerInsert = labelLayerId ? { beforeId: labelLayerId } : {}

  const fitToArea = React.useCallback(
    (animate: boolean) => {
      const map = mapRef.current?.getMap()
      if (!map?.loaded()) return
      map.resize()
      map.fitBounds(fitBounds, {
        padding: fitPaddingForBenchmarkMap(compactMode),
        maxZoom: maxZoomForBenchmarkArea(area),
        duration: animate ? 700 : 0,
      })
    },
    [area, compactMode, fitBounds]
  )

  const scheduleFitToArea = React.useCallback(
    (animate: boolean) => {
      for (const id of fitTimeoutsRef.current) {
        window.clearTimeout(id)
      }
      fitTimeoutsRef.current = []

      const run = () => fitToArea(animate)
      requestAnimationFrame(() => {
        requestAnimationFrame(run)
      })

      fitTimeoutsRef.current = [32, 100, 250, 500].map((ms) =>
        window.setTimeout(() => fitToArea(false), ms)
      )
    },
    [fitToArea]
  )

  const syncLabelLayer = React.useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    setLabelLayerId(firstSymbolLayerId(map))
  }, [])

  const handleMapLoad = React.useCallback(() => {
    syncLabelLayer()
    scheduleFitToArea(false)
  }, [scheduleFitToArea, syncLabelLayer])

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
    window.addEventListener("resize", handleResize)
    handleResize()
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  React.useEffect(() => {
    scheduleFitToArea(true)
  }, [area.id, compactMode, scheduleFitToArea])

  React.useEffect(
    () => () => {
      for (const id of fitTimeoutsRef.current) {
        window.clearTimeout(id)
      }
      fitTimeoutsRef.current = []
    },
    []
  )

  if (!token) {
    return null
  }

  return (
    <div
      ref={mapContainerRef}
      className={cn("absolute inset-0 min-h-0 min-w-0 size-full", className)}
    >
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%", minHeight: "100%" }}
        initialViewState={{
          longitude: -98,
          latitude: 39,
          zoom: 3,
        }}
        onLoad={handleMapLoad}
        onStyleData={syncLabelLayer}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <Source id={BOUNDARY_SOURCE_ID} type="geojson" data={areaFeature}>
          <Layer
            id={BOUNDARY_FILL_LAYER_ID}
            type="fill"
            {...layerInsert}
            paint={{
              "fill-color": highlightFill,
              "fill-opacity": 0.18,
            }}
          />
          <Layer
            id={BOUNDARY_LINE_LAYER_ID}
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
      </Map>
    </div>
  )
}
