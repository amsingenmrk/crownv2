"use client"

import * as React from "react"
import Link from "next/link"
import { X } from "lucide-react"

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
import { Button } from "@/components/ui/button"
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

function PortfolioMapPinSummaryCard({
  pin,
  onClose,
}: {
  pin: PortfolioMapboxPin
  onClose: () => void
}) {
  if (!pin.assetDetailHref) return null

  const liftText = liftLabel(pin)

  return (
    <div
      className={cn(
        "relative w-[min(100vw-2rem,320px)] overflow-hidden rounded-lg bg-card text-card-foreground shadow-sm ring-1 ring-border"
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="absolute top-1.5 right-1.5 z-10 size-7 rounded-full text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        aria-label="Close"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onClose()
        }}
      >
        <X className="size-3.5" aria-hidden />
      </Button>
      <Link
        href={pin.assetDetailHref}
        className="flex min-h-[112px] w-full cursor-pointer text-left text-card-foreground outline-none transition-colors hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-[104px] shrink-0 self-stretch bg-muted">
          {pin.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pin.imageUrl}
              alt={pin.building}
              className="absolute inset-0 size-full object-cover"
            />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 py-3 pl-3 pr-10">
          <div className="min-w-0 space-y-1.5">
            <p className="truncate text-sm font-semibold text-foreground">
              {pin.building}
            </p>
            {pin.location ? (
              <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                {pin.location}
              </p>
            ) : null}
            <span
              className={cn(
                "inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
                liftPillClassFromStrength(pin.liftStrength)
              )}
              aria-label={
                liftText === "—"
                  ? "Potential lift, not available"
                  : `Potential lift ${liftText}`
              }
            >
              {liftText}
            </span>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-border/60 pt-2 text-xs">
            <dt className="text-muted-foreground">Value</dt>
            <dd className="text-right font-medium tabular-nums text-foreground">
              {pin.value ?? "—"}
            </dd>
            <dt className="text-muted-foreground">Occupancy</dt>
            <dd className="text-right font-medium tabular-nums text-foreground">
              {pin.occPct ?? "—"}
            </dd>
            <dt className="text-muted-foreground">NOI</dt>
            <dd className="text-right font-medium tabular-nums text-foreground">
              {pin.noi ?? "—"}
            </dd>
            <dt className="text-muted-foreground">Cap rate</dt>
            <dd className="text-right font-medium tabular-nums text-foreground">
              {pin.capRate ?? "—"}
            </dd>
            <dt className="text-muted-foreground">WALE / WALT</dt>
            <dd className="text-right font-medium tabular-nums text-foreground">
              {pin.wale ?? "—"}
            </dd>
          </dl>
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
            maxWidth="340px"
            className="portfolio-map-pin-popup"
            onClose={() => setOpenPinId(null)}
          >
            <PortfolioMapPinSummaryCard
              pin={openPin}
              onClose={() => setOpenPinId(null)}
            />
          </Popup>
        ) : null}
      </Map>
    </div>
  )
}
