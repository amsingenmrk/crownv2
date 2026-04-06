"use client"

import * as React from "react"
import Link from "next/link"
import { Image as LandscapeImageIcon } from "lucide-react"

import "@/lib/configure-mapbox-gl-worker"
import "mapbox-gl/dist/mapbox-gl.css"
import Map, {
  Marker,
  NavigationControl,
  Popup,
  type MapRef,
} from "react-map-gl/mapbox"
import { useTheme } from "next-themes"

import { resolveMapboxMapStyle } from "@/lib/mapbox-map-style"
import {
  liftPillClassFromStrength,
  mapPinClassFromStrength,
} from "@/lib/portfolio-lift"
import {
  listingPreviewBodyClassName,
  listingPreviewCardInnerLayoutClassName,
  listingPreviewCardMaxWidthClass,
  listingPreviewThumbClassName,
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
  if (v === "—") return "Potential lift —"
  return `Potential lift ${v}`
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
        <div className={listingPreviewThumbClassName}>
          {pin.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pin.imageUrl}
              alt={pin.building}
              className="size-full object-cover"
            />
          ) : (
            <div
              className="flex size-full items-center justify-center text-muted-foreground"
              aria-hidden
            >
              <LandscapeImageIcon
                className="size-6 opacity-50"
                strokeWidth={1.25}
              />
            </div>
          )}
        </div>
        <div className={listingPreviewBodyClassName}>
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
              "inline-flex w-fit max-w-full rounded-full px-2.5 py-0.5 text-xs font-semibold leading-3",
              liftPillClassFromStrength(pin.liftStrength)
            )}
            aria-label={
              liftText === "—"
                ? "Potential lift, not available"
                : `Potential lift ${liftText}`
            }
          >
            <span className="truncate">{liftBadgeText}</span>
          </span>
        </div>
      </Link>
    </div>
  )
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
  const [openPinId, setOpenPinId] = React.useState<string | null>(null)

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

  const openPin = openPinId
    ? pins.find((p) => p.id === openPinId) ?? null
    : null

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
        onClick={() => setOpenPinId(null)}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {pins.map((p) => {
          const hasCard = Boolean(p.assetDetailHref)
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
                  p.lift
                    ? `${p.building}, potential lift ${p.lift}`
                    : p.building
                }
                aria-expanded={hasCard ? openPinId === p.id : undefined}
                className={cn(
                  "relative block size-3 rounded-full border border-background/80 shadow-sm outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring",
                  mapPinClassFromStrength(p.liftStrength),
                  hasCard && "cursor-pointer hover:scale-125"
                )}
                title={
                  p.lift
                    ? `${p.building} · Potential lift ${p.lift}`
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
        {openPin?.assetDetailHref ? (
          <Popup
            longitude={openPin.longitude}
            latitude={openPin.latitude}
            anchor="bottom"
            offset={16}
            closeButton={false}
            closeOnClick={false}
            closeOnMove={false}
            maxWidth="min(100vw, 380px)"
            className="portfolio-map-pin-popup"
            onClose={() => setOpenPinId(null)}
          >
            <PortfolioMapPinSummaryCard pin={openPin} />
          </Popup>
        ) : null}
      </Map>
    </div>
  )
}
