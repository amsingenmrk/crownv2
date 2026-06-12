"use client"

import * as React from "react"

import "@/lib/configure-mapbox-gl-worker"
import "mapbox-gl/dist/mapbox-gl.css"
import Map, { Layer, NavigationControl, Source, type MapRef } from "react-map-gl/mapbox"
import { useTheme } from "@/components/theme-provider"

import {
  benchmarkAreaPolygon,
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

const AREA_FILL_LAYER_ID = "benchmark-area-fill"
const AREA_LINE_LAYER_ID = "benchmark-area-line"

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
  const [mapLoadGeneration, setMapLoadGeneration] = React.useState(0)
  const postLoadResizeTimeoutsRef = React.useRef<number[]>([])

  const mapStyle = resolveMapboxMapStyle(resolvedTheme)

  const areaFeature = React.useMemo(
    () => benchmarkAreaPolygon(area.bounds),
    [area.bounds]
  )

  const fitToArea = React.useCallback(
    (animate: boolean) => {
      const map = mapRef.current?.getMap()
      if (!map) return
      const run = () => {
        map.fitBounds(area.bounds, {
          padding: { top: 72, bottom: 40, left: 48, right: 48 },
          maxZoom: area.id === "us-national" ? 4.5 : 11,
          duration: animate ? 700 : 0,
        })
      }
      if (map.loaded()) {
        run()
      } else {
        map.once("load", run)
      }
    },
    [area.bounds, area.id]
  )

  const handleMapLoad = React.useCallback(() => {
    mapRef.current?.getMap()?.setPadding({ ...NO_MAP_VIEW_PADDING })
    const bumpAndResize = () => {
      mapRef.current?.getMap()?.resize()
      fitToArea(false)
      setMapLoadGeneration((g) => g + 1)
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(bumpAndResize)
    })
    for (const id of postLoadResizeTimeoutsRef.current) {
      window.clearTimeout(id)
    }
    postLoadResizeTimeoutsRef.current = [0, 32, 100, 250, 500].map((ms) =>
      window.setTimeout(() => {
        mapRef.current?.getMap()?.resize()
        fitToArea(false)
      }, ms)
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
      requestAnimationFrame(() => {
        mapRef.current?.getMap()?.resize()
      })
    }

    const ro = new ResizeObserver(resizeMap)
    ro.observe(el)
    window.addEventListener("resize", resizeMap)
    resizeMap()
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", resizeMap)
    }
  }, [mapLoadGeneration])

  React.useEffect(() => {
    fitToArea(true)
  }, [area.id, area.bounds, fitToArea])

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
          padding: { ...NO_MAP_VIEW_PADDING },
        }}
        onLoad={handleMapLoad}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <Source
          id="benchmark-area"
          type="geojson"
          data={areaFeature}
        >
          <Layer
            id={AREA_FILL_LAYER_ID}
            type="fill"
            paint={{
              "fill-color":
                resolvedTheme === "dark" ? "#a78bfa" : "#7c3aed",
              "fill-opacity": 0.18,
            }}
          />
          <Layer
            id={AREA_LINE_LAYER_ID}
            type="line"
            layout={{
              "line-cap": "round",
              "line-join": "round",
            }}
            paint={{
              "line-color":
                resolvedTheme === "dark" ? "#ddd6fe" : "#5b21b6",
              "line-width": 3,
              "line-opacity": 1,
            }}
          />
        </Source>
      </Map>
    </div>
  )
}
