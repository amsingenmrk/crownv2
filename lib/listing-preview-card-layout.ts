/**
 * Shared layout for listing-style cards (e.g. /search sidebar skeleton, map pin popup).
 * Keep in sync when changing either surface.
 */
export const listingPreviewCardClassName =
  "flex gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"

/** Flex row for map popup link only (no padding; Mapbox popup chrome supplies spacing). */
export const listingPreviewCardInnerLayoutClassName = "flex gap-3"

export const listingPreviewThumbClassName =
  "size-16 shrink-0 overflow-hidden rounded-md bg-muted"

export const listingPreviewBodyClassName =
  "flex min-w-0 flex-1 flex-col justify-center gap-2 py-0.5"

/** Typical max width inside search aside (380px) minus horizontal padding (md:p-5). */
export const listingPreviewCardMaxWidthClass = "max-w-[min(100vw-2rem,340px)]"
