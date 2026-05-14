/**
 * Rent-impact visualization for modifications stacking: emerald for positive
 * $/SF lift, rose for negative, slate when no modifications are selected or
 * |deltaPct| is below {@link RENT_LIFT_NEUTRAL_PCT_EPSILON} (percentage points).
 * Magnitude maps to alpha (saturation proxy); alphas are kept moderate so
 * simplified-row rent lift labels stay readable over the fill.
 */

/**
 * Rent-change margin for “no impact” (neutral slate tint, third legend row).
 * **Units:** percentage points, same as `ModificationImpactSpace.deltaPct`
 * (`(deltaPsf / baselineRentPsf) * 100`, so `0.25` means 0.25%, not a 0.25 ratio).
 */
export const RENT_LIFT_NEUTRAL_PCT_EPSILON = 0.25

const RGB = {
  /** Slightly cooler / higher-chroma green than emerald-700 so positives read apart from rose on tinted fills. */
  emerald: { r: 5, g: 150, b: 105 }, // ~tailwind emerald-600
  /** Slightly brighter magenta-rose than rose-700 so negatives separate from emerald at equal alpha. */
  rose: { r: 225, g: 29, b: 72 }, // ~tailwind rose-600
  /** Cool slate so “no impact” stays hueless vs green/red signed tints at similar alpha. */
  slate: { r: 96, g: 110, b: 132 },
} as const

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function rgba(rgb: { readonly r: number; readonly g: number; readonly b: number }, a: number) {
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`
}

/** Weak … strong signed rent-impact fill alpha (same range as legend gradient endpoints). */
export const RENT_LIFT_SIGNED_FILL_ALPHA_MIN = 0.17
export const RENT_LIFT_SIGNED_FILL_ALPHA_MAX = 0.58

/** Legend / docs: matches {@link rentLiftSpaceBackgroundColor} signed endpoints. */
export const RENT_LIFT_POSITIVE_LEGEND_GRADIENT = `linear-gradient(90deg, ${rgba(
  RGB.emerald,
  RENT_LIFT_SIGNED_FILL_ALPHA_MIN
)}, ${rgba(RGB.emerald, RENT_LIFT_SIGNED_FILL_ALPHA_MAX)})`

export const RENT_LIFT_NEGATIVE_LEGEND_GRADIENT = `linear-gradient(90deg, ${rgba(RGB.rose, RENT_LIFT_SIGNED_FILL_ALPHA_MIN)}, ${rgba(
  RGB.rose,
  RENT_LIFT_SIGNED_FILL_ALPHA_MAX
)})`

/** Solid fill for spaces with |deltaPct| below {@link RENT_LIFT_NEUTRAL_PCT_EPSILON}; legend swatch. */
export const RENT_LIFT_NEUTRAL_SPACE_FILL = rgba(RGB.slate, 0.24)

export function isRentLiftNeutralDeltaPct(deltaPct: number): boolean {
  return Math.abs(deltaPct) < RENT_LIFT_NEUTRAL_PCT_EPSILON
}

export type RentLiftExtents = {
  /** Largest positive delta $/SF among spaces that are not “no impact” by % (min 1e-4). */
  posExtentPsf: number
  /** Largest |negative delta| among those spaces (min 1e-4). */
  negExtentPsf: number
}

export function computeRentLiftExtents(
  spaces: readonly { deltaPsf: number; deltaPct: number; isVacant: boolean }[]
): RentLiftExtents {
  let pos = 0
  let neg = 0
  for (const s of spaces) {
    if (isRentLiftNeutralDeltaPct(s.deltaPct)) continue
    if (s.deltaPsf > pos) pos = s.deltaPsf
    if (s.deltaPsf < 0) neg = Math.max(neg, Math.abs(s.deltaPsf))
  }
  return {
    posExtentPsf: Math.max(pos, 1e-4),
    negExtentPsf: Math.max(neg, 1e-4),
  }
}

/**
 * Background fill for a space (stacking segment). When `noActiveModifications`,
 * returns neutral slate for all spaces. When modifications are active, vacant and
 * occupied use emerald / rose from signed `deltaPsf` magnitude, or
 * {@link RENT_LIFT_NEUTRAL_SPACE_FILL} when `deltaPct` is within
 * ±{@link RENT_LIFT_NEUTRAL_PCT_EPSILON} percentage points (see legend).
 */
export function rentLiftSpaceBackgroundColor(args: {
  deltaPsf: number
  deltaPct: number
  isVacant: boolean
  noActiveModifications: boolean
  extents: RentLiftExtents
}): string {
  const { deltaPsf, deltaPct, noActiveModifications, extents } = args
  if (noActiveModifications) {
    return rgba(RGB.slate, 0.78)
  }
  if (isRentLiftNeutralDeltaPct(deltaPct)) {
    return RENT_LIFT_NEUTRAL_SPACE_FILL
  }
  if (deltaPsf > 0) {
    const t = clamp01(deltaPsf / extents.posExtentPsf)
    const alpha = lerp(RENT_LIFT_SIGNED_FILL_ALPHA_MIN, RENT_LIFT_SIGNED_FILL_ALPHA_MAX, Math.pow(t, 0.46))
    return rgba(RGB.emerald, alpha)
  }
  const t = clamp01(Math.abs(deltaPsf) / extents.negExtentPsf)
  const alpha = lerp(RENT_LIFT_SIGNED_FILL_ALPHA_MIN, RENT_LIFT_SIGNED_FILL_ALPHA_MAX, Math.pow(t, 0.46))
  return rgba(RGB.rose, alpha)
}
