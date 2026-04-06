/**
 * Mapbox often returns the same (or ~identical) coordinates for different addresses
 * in one metro, which stacks Markers on one dot. Buckets by 3-decimal lat/lng (~100m)
 * and offsets colliding pins in a small ring so each asset stays visible.
 */
export function spreadPortfolioMapPinsForDisplay<
  T extends { id: string; longitude: number; latitude: number },
>(pins: T[]): T[] {
  if (pins.length === 0) return pins

  const bucketKey = (lng: number, lat: number) =>
    `${lng.toFixed(3)},${lat.toFixed(3)}`

  const buckets = new Map<string, T[]>()
  for (const p of pins) {
    const k = bucketKey(p.longitude, p.latitude)
    const b = buckets.get(k) ?? []
    b.push(p)
    buckets.set(k, b)
  }

  const byId = new Map<string, { lng: number; lat: number }>()

  for (const group of buckets.values()) {
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id))
    if (sorted.length === 1) {
      const p = sorted[0]!
      byId.set(p.id, { lng: p.longitude, lat: p.latitude })
      continue
    }
    const n = sorted.length
    const baseRadiusDeg = 0.00035
    for (let i = 0; i < n; i++) {
      const p = sorted[i]!
      const angle = (2 * Math.PI * i) / n
      const r = baseRadiusDeg * (1 + (i % 4) * 0.1)
      byId.set(p.id, {
        lng: p.longitude + r * Math.cos(angle),
        lat: p.latitude + r * Math.sin(angle),
      })
    }
  }

  return pins.map((p) => {
    const c = byId.get(p.id)
    if (!c) return p
    return { ...p, longitude: c.lng, latitude: c.lat }
  })
}
