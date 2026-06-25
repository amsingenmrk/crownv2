"use client"

import * as React from "react"
import type { Map as MapboxMap } from "mapbox-gl"

import "@/lib/configure-mapbox-gl-worker"
import "mapbox-gl/dist/mapbox-gl.css"
import Map, {
  Layer,
  type MapMouseEvent,
  NavigationControl,
  Source,
  type MapRef,
} from "react-map-gl/mapbox"
import { useTheme } from "@/components/theme-provider"

import {
  benchmarkAreaFitBounds,
  benchmarkAreaPolygon,
  maxZoomForBenchmarkArea,
  type BenchmarkArea,
} from "@/lib/benchmark-area-search"
import { resolveMapboxMapStyle } from "@/lib/mapbox-map-style"
import { cn } from "@/lib/utils"

const CURRENT_BOUNDARY_SOURCE_ID = "benchmark-current-boundary"
const CURRENT_BOUNDARY_FILL_LAYER_ID = "benchmark-current-boundary-fill"
const CURRENT_BOUNDARY_LINE_LAYER_ID = "benchmark-current-boundary-line"

function sanitizeAreaLayerId(areaId: string): string {
  return areaId.replace(/[^a-zA-Z0-9-_]/g, "-")
}

function childSourceId(areaId: string): string {
  return `benchmark-child-source-${sanitizeAreaLayerId(areaId)}`
}

function childFillLayerId(areaId: string): string {
  return `benchmark-child-fill-${sanitizeAreaLayerId(areaId)}`
}

function childLineLayerId(areaId: string): string {
  return `benchmark-child-line-${sanitizeAreaLayerId(areaId)}`
}

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
  visibleAreas = [],
  activeAreaId,
  onAreaSelect,
  className,
  compactMode = false,
}: {
  area: BenchmarkArea
  visibleAreas?: readonly BenchmarkArea[]
  activeAreaId?: string
  onAreaSelect?: (area: BenchmarkArea) => void
  className?: string
  compactMode?: boolean
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim()
  const { resolvedTheme } = useTheme()
  const mapRef = React.useRef<MapRef>(null)
  const mapContainerRef = React.useRef<HTMLDivElement>(null)
  const fitTimeoutsRef = React.useRef<number[]>([])
  const [labelLayerId, setLabelLayerId] = React.useState<string | undefined>()
  const [hoveredAreaId, setHoveredAreaId] = React.useState<string | undefined>()

  const mapStyle = resolveMapboxMapStyle(resolvedTheme)
  const fitBounds = React.useMemo(() => benchmarkAreaFitBounds(area), [area])

  const highlightFill = resolvedTheme === "dark" ? "#60a5fa" : "#2563eb"
  const highlightLine = resolvedTheme === "dark" ? "#93c5fd" : "#1d4ed8"
  const childFill = resolvedTheme === "dark" ? "#38bdf8" : "#3b82f6"
  const childHoverFill = resolvedTheme === "dark" ? "#7dd3fc" : "#60a5fa"
  const childLine = resolvedTheme === "dark" ? "#bae6fd" : "#2563eb"
  const layerInsert = labelLayerId ? { beforeId: labelLayerId } : {}
  const childLayerIdsByAreaId = React.useMemo(() => {
    return new globalThis.Map(
      visibleAreas.map((childArea) => [
        childArea.id,
        {
          sourceId: childSourceId(childArea.id),
          fillLayerId: childFillLayerId(childArea.id),
          lineLayerId: childLineLayerId(childArea.id),
        },
      ])
    )
  }, [visibleAreas])
  const interactiveLayerIdToAreaId = React.useMemo(() => {
    const mapping = new globalThis.Map<string, string>()
    for (const childArea of visibleAreas) {
      const ids = childLayerIdsByAreaId.get(childArea.id)
      if (!ids) continue
      mapping.set(ids.fillLayerId, childArea.id)
      mapping.set(ids.lineLayerId, childArea.id)
    }
    return mapping
  }, [childLayerIdsByAreaId, visibleAreas])

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

  React.useEffect(() => {
    setHoveredAreaId(undefined)
  }, [area.id])

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

  const interactiveLayerIds =
    visibleAreas.length > 0
      ? visibleAreas.flatMap((childArea) => {
          const ids = childLayerIdsByAreaId.get(childArea.id)
          return ids ? [ids.fillLayerId, ids.lineLayerId] : []
        })
      : undefined

  const areaIdFromFeature = (feature: {
    properties?: Record<string, unknown> | null
    layer?: { id?: string }
  }): string | undefined => {
    const propAreaId = feature.properties?.areaId
    if (typeof propAreaId === "string" && propAreaId.length > 0) {
      return propAreaId
    }
    const layerId = feature.layer?.id
    if (typeof layerId === "string") {
      return interactiveLayerIdToAreaId.get(layerId)
    }
    return undefined
  }

  const handleChildHover = (event: MapMouseEvent) => {
    const hoveredId = event.features
      ?.map((feature) => areaIdFromFeature(feature))
      .find((areaId): areaId is string => typeof areaId === "string")

    const map = mapRef.current?.getMap()
    if (map) {
      map.getCanvas().style.cursor =
        typeof hoveredId === "string" ? "pointer" : ""
    }
    setHoveredAreaId(typeof hoveredId === "string" ? hoveredId : undefined)
  }

  const handleChildLeave = () => {
    const map = mapRef.current?.getMap()
    if (map) {
      map.getCanvas().style.cursor = ""
    }
    setHoveredAreaId(undefined)
  }

  const handleChildClick = (event: MapMouseEvent) => {
    const selectedId = event.features
      ?.map((feature) => areaIdFromFeature(feature))
      .find((areaId): areaId is string => typeof areaId === "string")

    if (typeof selectedId !== "string") return
    const nextArea = visibleAreas.find((childArea) => childArea.id === selectedId)
    if (nextArea) {
      onAreaSelect?.(nextArea)
    }
  }

  const renderBoundaryArea = (
    targetArea: BenchmarkArea,
    ids: { sourceId: string; fillLayerId: string; lineLayerId: string },
    options: {
      fillColor: string
      fillOpacity: number
      lineColor: string
      lineWidth: number
      interactive?: boolean
    }
  ) => {
    if (targetArea.boundary && targetArea.boundaryGeometry == null) {
      const fillLayer: React.ComponentProps<typeof Layer> = {
        id: ids.fillLayerId,
        type: "fill",
        paint: {
          "fill-color": options.fillColor,
          "fill-opacity": options.fillOpacity,
        },
        "source-layer": targetArea.boundary.sourceLayer,
        filter: targetArea.boundary.filter,
        ...layerInsert,
      }

      const lineLayer: React.ComponentProps<typeof Layer> = {
        id: ids.lineLayerId,
        type: "line",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": options.lineColor,
          "line-width": options.lineWidth,
          "line-opacity": 0.95,
        },
        "source-layer": targetArea.boundary.sourceLayer,
        filter: targetArea.boundary.filter,
        ...layerInsert,
      }

      return (
        <Source
          key={ids.sourceId}
          id={ids.sourceId}
          type="vector"
          url={targetArea.boundary.tilesetUrl}
        >
          <Layer {...fillLayer} />
          <Layer {...lineLayer} />
        </Source>
      )
    }

    const feature = targetArea.boundaryGeometry ?? benchmarkAreaPolygon(targetArea.bounds)
    const data = options.interactive
      ? {
          ...feature,
          properties: {
            ...(feature.properties ?? {}),
            areaId: targetArea.id,
            label: targetArea.label,
          },
        }
      : feature

    return (
      <Source key={ids.sourceId} id={ids.sourceId} type="geojson" data={data}>
        <Layer
          id={ids.fillLayerId}
          type="fill"
          {...layerInsert}
          paint={{
            "fill-color": options.fillColor,
            "fill-opacity": options.fillOpacity,
          }}
        />
        <Layer
          id={ids.lineLayerId}
          type="line"
          {...layerInsert}
          layout={{
            "line-cap": "round",
            "line-join": "round",
          }}
          paint={{
            "line-color": options.lineColor,
            "line-width": options.lineWidth,
            "line-opacity": 0.95,
          }}
        />
      </Source>
    )
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
        interactiveLayerIds={interactiveLayerIds}
        onMouseMove={interactiveLayerIds ? handleChildHover : undefined}
        onMouseLeave={interactiveLayerIds ? handleChildLeave : undefined}
        onClick={interactiveLayerIds ? handleChildClick : undefined}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {renderBoundaryArea(
          area,
          {
            sourceId: CURRENT_BOUNDARY_SOURCE_ID,
            fillLayerId: CURRENT_BOUNDARY_FILL_LAYER_ID,
            lineLayerId: CURRENT_BOUNDARY_LINE_LAYER_ID,
          },
          {
            fillColor: highlightFill,
            fillOpacity: visibleAreas.length > 0 ? 0.08 : 0.18,
            lineColor: highlightLine,
            lineWidth: 3,
          }
        )}
        {visibleAreas.map((childArea) => {
          const ids = childLayerIdsByAreaId.get(childArea.id)
          if (!ids) return null

          return renderBoundaryArea(childArea, ids, {
            fillColor:
              childArea.id === activeAreaId
                ? highlightFill
                : childArea.id === hoveredAreaId
                  ? childHoverFill
                  : childFill,
            fillOpacity:
              childArea.id === activeAreaId
                ? 0.24
                : childArea.id === hoveredAreaId
                  ? 0.2
                  : 0.13,
            lineColor:
              childArea.id === activeAreaId
                ? highlightLine
                : childArea.id === hoveredAreaId
                  ? childHoverFill
                  : childLine,
            lineWidth:
              childArea.id === activeAreaId
                ? 3
                : childArea.id === hoveredAreaId
                  ? 2.5
                  : 2,
            interactive: true,
          })
        })}
      </Map>
    </div>
  )
}
