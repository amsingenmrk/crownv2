/** Tenant / matrix segment: theme-aware Tailwind classes (light + dark). */
export type StackingSegmentToneClasses = {
  /** Background tint (and optional border-r handled by caller). */
  fillClass: string
  textClass: string
  metaClass: string
}

const DEFAULT_TONE: StackingSegmentToneClasses = {
  fillClass: "bg-emerald-500/[0.14] dark:bg-emerald-400/[0.20]",
  textClass: "text-foreground",
  metaClass: "text-muted-foreground",
}

/**
 * Maps legacy hex keys (lease-expiration years, rent bands, occupancy, etc.) to
 * fills. Hues match `STACKING_EXPIRATION_LEGEND` / `expirationColor()` so legend
 * swatches align with stacking segments (ShadCN `chart-*` here are all blue-ish,
 * so we use Tailwind spectral colors for these categorical keys).
 */
const HEX_SEGMENT_TONE: Record<string, StackingSegmentToneClasses> = {
  "#22c55e": {
    fillClass: "bg-emerald-500/[0.14] dark:bg-emerald-400/[0.20]",
    textClass: "text-foreground",
    metaClass: "text-muted-foreground",
  },
  "#a855f7": {
    fillClass: "bg-purple-500/[0.14] dark:bg-purple-400/[0.20]",
    textClass: "text-foreground",
    metaClass: "text-muted-foreground",
  },
  "#3b82f6": {
    fillClass: "bg-blue-500/[0.13] dark:bg-blue-400/[0.18]",
    textClass: "text-foreground",
    metaClass: "text-muted-foreground",
  },
  "#f97316": {
    fillClass: "bg-orange-500/[0.14] dark:bg-orange-400/[0.20]",
    textClass: "text-foreground",
    metaClass: "text-muted-foreground",
  },
  "#ef4444": {
    fillClass: "bg-red-500/[0.12] dark:bg-red-500/[0.18]",
    textClass: "text-foreground",
    metaClass: "text-muted-foreground",
  },
  "#14b8a6": {
    fillClass: "bg-teal-500/[0.13] dark:bg-teal-400/[0.20]",
    textClass: "text-foreground",
    metaClass: "text-muted-foreground",
  },
  "#64748b": {
    fillClass: "bg-muted/55 dark:bg-muted/35",
    textClass: "text-foreground",
    metaClass: "text-muted-foreground",
  },
  "#f59e0b": {
    fillClass: "bg-amber-500/[0.14] dark:bg-amber-400/[0.20]",
    textClass: "text-foreground",
    metaClass: "text-muted-foreground",
  },
}

export function stackingSegmentToneFromHex(hex: string): StackingSegmentToneClasses {
  return HEX_SEGMENT_TONE[hex.toLowerCase()] ?? DEFAULT_TONE
}

export function neutralStackingSegmentTone(
  isVacant: boolean
): StackingSegmentToneClasses {
  if (isVacant) {
    return {
      fillClass: "bg-muted/50 dark:bg-muted/32",
      textClass: "text-foreground",
      metaClass: "text-muted-foreground",
    }
  }
  return {
    fillClass: "bg-secondary/35 dark:bg-secondary/22",
    textClass: "text-foreground",
    metaClass: "text-muted-foreground",
  }
}

/** Legend dot: solid swatch — same hue family as {@link HEX_SEGMENT_TONE}. */
const HEX_SWATCH_CLASS: Record<string, string> = {
  "#22c55e": "bg-emerald-500 dark:bg-emerald-400",
  "#a855f7": "bg-purple-500 dark:bg-purple-400",
  "#3b82f6": "bg-blue-500 dark:bg-blue-400",
  "#f97316": "bg-orange-500 dark:bg-orange-400",
  "#ef4444": "bg-red-500 dark:bg-red-400",
  "#14b8a6": "bg-teal-500 dark:bg-teal-400",
  "#64748b": "bg-muted-foreground/60",
  "#f59e0b": "bg-amber-500 dark:bg-amber-400",
}

export function stackingLegendSwatchClass(item: {
  color: string
  swatchClass?: string
}): string {
  if (item.swatchClass) return item.swatchClass
  return (
    HEX_SWATCH_CLASS[item.color.toLowerCase()] ?? "bg-muted-foreground/40"
  )
}

export function occupancyMetricTextClass(occupancyPercent: number): string {
  if (occupancyPercent >= 80) {
    return "text-chart-2"
  }
  if (occupancyPercent >= 50) {
    return "text-chart-4"
  }
  return "text-destructive"
}

/**
 * Sun / view scores are normalized 0–100. Maps low → high to red → orange →
 * amber (yellow) → lime → emerald so the full range reads as bad → good.
 */
export function qualityScoreValueClass(value: number | null): string {
  if (value == null) return "text-muted-foreground"
  if (value >= 75) return "text-emerald-600 dark:text-emerald-400"
  if (value >= 60) return "text-lime-600 dark:text-lime-400"
  if (value >= 45) return "text-amber-500 dark:text-amber-400"
  if (value >= 30) return "text-orange-600 dark:text-orange-400"
  return "text-red-600 dark:text-red-400"
}
