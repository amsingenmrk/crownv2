"use client"

import * as React from "react"
import Link from "next/link"

import "@/lib/configure-mapbox-gl-worker"
import "mapbox-gl/dist/mapbox-gl.css"
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/mapbox"
import { useTheme } from "next-themes"

import { resolveMapboxMapStyle } from "@/lib/mapbox-map-style"
import {
  liftPillClassFromStrength,
  mapPinClassFromStrength,
  mapPinClassMarket,
} from "@/lib/portfolio-lift"
import {
  listingPreviewBodyClassName,
  listingPreviewCardInnerLayoutClassName,
  listingPreviewCardMaxWidthClass,
} from "@/lib/listing-preview-card-layout"
import { cn } from "@/lib/utils"

export type PortfolioMapboxPin = {
  id: string
  longitude: number
  latitude: number
  building: string
  lift: string
  liftPercent: number
  liftStrength: number
  /**
   * `portfolio` (default): violet pins, your assets.
   * `market`: dark pins for broader market inventory (e.g. /search).
   */
  listingScope?: "portfolio" | "market"
  /** When set, pin opens a summary card and the card links to this path. */
  assetDetailHref?: string
  imageUrl?: string
  location?: string
  value?: string
  occPct?: string
  noi?: string
  capRate?: string
  wale?: string
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

function liftLabel(pin: PortfolioMapboxPin): string {
  if (pin.lift.trim() !== "") return pin.lift
  if (pin.liftPercent > 0) return `+${pin.liftPercent}%`
  return "—"
}

function potentialLiftBadgeText(pin: PortfolioMapboxPin): string {
  const v = liftLabel(pin)
  if (v === "—") return "Potential —"
  return `Potential ${v}`
}

function PortfolioMapPinSummaryCard({ pin }: { pin: PortfolioMapboxPin }) {
  if (!pin.assetDetailHref) return null

  const liftBadgeText = potentialLiftBadgeText(pin)
  const liftText = liftLabel(pin)

  return (
    <div className={cn("relative w-full", listingPreviewCardMaxWidthClass)}>
      <Link
        href={pin.assetDetailHref}
        className={cn(
          listingPreviewCardInnerLayoutClassName,
          "text-left text-card-foreground outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(listingPreviewBodyClassName, "py-0")}>
          <p className="line-clamp-2 text-sm font-semibold leading-4 text-foreground">
            {pin.building}
          </p>
          {pin.location ? (
            <p className="line-clamp-2 text-xs leading-3 text-muted-foreground">
              {pin.location}
            </p>
          ) : null}
          <span
            className={cn(
              "inline-flex w-fit max-w-full items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              liftPillClassFromStrength(pin.liftStrength)
            )}
            aria-label={
              liftText === "—"
                ? "Potential, not available"
                : `Potential ${liftText}`
            }
          >
            <span className="truncate">{liftBadgeText}</span>
          </span>
        </div>
      </Link>
    </div>
  )
}

const NO_MAP_VIEW_PADDING = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
} as const

export function PortfolioMapbox({
  pins,
  className,
  edgeToEdge = false,
}: {
  pins: PortfolioMapboxPin[]
  className?: string
  /** When true, clears Mapbox viewport padding so the canvas fills the container edge-to-edge. */
  edgeToEdge?: boolean
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim()
  const { resolvedTheme } = useTheme()
  const mapRef = React.useRef<MapRef>(null)
  const mapContainerRef = React.useRef<HTMLDivElement>(null)
  const [openPinId, setOpenPinId] = React.useState<string | null>(null)
  /** Screen position for the open-pin card; avoids react-map-gl Popup + React 19 DOM teardown races. */
  const [openPinScreenPos, setOpenPinScreenPos] = React.useState<{
    x: number
    y: number
  } | null>(null)

  const mapStyle = resolveMapboxMapStyle(resolvedTheme)

  const bounds = React.useMemo(() => boundsFromPins(pins), [pins])

  const fitToPins = React.useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map?.loaded() || !bounds || pins.length === 0) return
    map.fitBounds(bounds, { padding: 52, maxZoom: 11, duration: 450 })
  }, [bounds, pins.length])

  const openPin = openPinId
    ? pins.find((p) => p.id === openPinId) ?? null
    : null

  const syncOpenPinScreenPos = React.useCallback(() => {
    if (!openPin) {
      setOpenPinScreenPos(null)
      return
    }
    const map = mapRef.current?.getMap()
    if (!map?.loaded()) return
    const p = map.project([openPin.longitude, openPin.latitude])
    setOpenPinScreenPos({ x: p.x, y: p.y })
  }, [openPin])

  const [mapLoadGeneration, setMapLoadGeneration] = React.useState(0)
  const postLoadResizeTimeoutsRef = React.useRef<number[]>([])

  const handleMapLoad = React.useCallback(() => {
    if (edgeToEdge) {
      mapRef.current?.getMap()?.setPadding({ ...NO_MAP_VIEW_PADDING })
    }
    const map = mapRef.current?.getMap()
    const bumpAndResize = () => {
      map?.resize()
      fitToPins()
      syncOpenPinScreenPos()
      setMapLoadGeneration((g) => g + 1)
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(bumpAndResize)
    })
    if (edgeToEdge) {
      requestAnimationFrame(() => {
        mapRef.current?.getMap()?.setPadding({ ...NO_MAP_VIEW_PADDING })
      })
    }
    /**
     * Flex parents often settle height after first paint; without this, the GL canvas
     * can stay 0×0 until something forces a resize (e.g. opening DevTools).
     */
    for (const id of postLoadResizeTimeoutsRef.current) {
      window.clearTimeout(id)
    }
    postLoadResizeTimeoutsRef.current = [0, 32, 100, 250, 500].map((ms) =>
      window.setTimeout(() => {
        mapRef.current?.getMap()?.resize()
        fitToPins()
        syncOpenPinScreenPos()
      }, ms)
    )
  }, [edgeToEdge, fitToPins, syncOpenPinScreenPos])

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
    fitToPins()
    if (!edgeToEdge) return
    const id = requestAnimationFrame(() => {
      mapRef.current?.getMap()?.setPadding({ ...NO_MAP_VIEW_PADDING })
    })
    return () => cancelAnimationFrame(id)
  }, [edgeToEdge, fitToPins])

  React.useEffect(() => {
    if (!openPin) {
      setOpenPinScreenPos(null)
      return
    }
    const map = mapRef.current?.getMap()
    if (!map) return

    const onViewportChange = () => {
      syncOpenPinScreenPos()
    }

    onViewportChange()
    if (!map.loaded()) {
      map.once("load", onViewportChange)
    }
    map.on("move", onViewportChange)
    map.on("zoom", onViewportChange)
    map.on("rotate", onViewportChange)
    map.on("pitch", onViewportChange)
    map.on("resize", onViewportChange)

    return () => {
      map.off("load", onViewportChange)
      map.off("move", onViewportChange)
      map.off("zoom", onViewportChange)
      map.off("rotate", onViewportChange)
      map.off("pitch", onViewportChange)
      map.off("resize", onViewportChange)
    }
  }, [openPin, syncOpenPinScreenPos, mapLoadGeneration])

  const pinsForMap = React.useMemo(() => {
    const rank = (p: PortfolioMapboxPin) =>
      p.listingScope === "market" ? 0 : 1
    return [...pins].sort((a, b) => rank(a) - rank(b))
  }, [pins])

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
        initialViewState={
          bounds && pins.length > 0
            ? {
                bounds,
                fitBoundsOptions: { padding: 52, maxZoom: 11 },
                ...(edgeToEdge ? { padding: { ...NO_MAP_VIEW_PADDING } } : {}),
              }
            : {
                longitude: -98,
                latitude: 39,
                zoom: 3,
                ...(edgeToEdge ? { padding: { ...NO_MAP_VIEW_PADDING } } : {}),
              }
        }
        onLoad={handleMapLoad}
        onClick={() => setOpenPinId(null)}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {pinsForMap.map((p) => {
          const hasCard = Boolean(p.assetDetailHref)
          const isMarket = p.listingScope === "market"
          const pinColorClass = isMarket
            ? mapPinClassMarket()
            : mapPinClassFromStrength(p.liftStrength)
          return (
            <Marker
              key={p.id}
              longitude={p.longitude}
              latitude={p.latitude}
              anchor="center"
            >
              <button
                type="button"
                aria-label={
                  isMarket
                    ? `Market listing: ${p.building}`
                    : p.lift
                      ? `${p.building}, potential lift ${p.lift}`
                      : p.building
                }
                aria-expanded={hasCard ? openPinId === p.id : undefined}
                className={cn(
                  "relative block size-3 rounded-full border border-background/80 shadow-sm outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring",
                  pinColorClass,
                  hasCard && "cursor-pointer hover:scale-125",
                  isMarket && "cursor-default"
                )}
                title={
                  isMarket
                    ? `${p.building} · Market listing`
                    : p.lift
                      ? `${p.building} · Potential ${p.lift}`
                      : p.building
                }
                onClick={(e) => {
                  e.stopPropagation()
                  if (!hasCard) return
                  setOpenPinId((id) => (id === p.id ? null : p.id))
                }}
              />
            </Marker>
          )
        })}
      </Map>
      {openPin?.assetDetailHref && openPinScreenPos ? (
        <div className="pointer-events-none absolute inset-0 z-20 min-h-0 min-w-0">
          <div
            className="pointer-events-auto absolute max-w-[min(100vw,380px)] rounded-lg border border-border bg-card p-3 shadow-sm"
            style={{
              left: openPinScreenPos.x,
              top: openPinScreenPos.y,
              transform: "translate(-50%, calc(-100% - 16px))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <PortfolioMapPinSummaryCard pin={openPin} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
