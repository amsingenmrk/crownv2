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
 * (`(deltaPsf / baselineRentPsf) * 100`, so `1` means 1%, not a 0.01 ratio).
 */
export const RENT_LIFT_NEUTRAL_PCT_EPSILON = 1

const RGB = {
  /** Deeper emerald so positives read farther from rose at the same alpha ramp. */
  emerald: { r: 4, g: 120, b: 87 }, // ~tailwind emerald-700
  /** Slightly ruby-shifted rose so negatives don’t muddy toward the green side. */
  rose: { r: 218, g: 27, b: 78 }, // between rose-600 / rose-700
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
export const RENT_LIFT_SIGNED_FILL_ALPHA_MIN = 0.22
export const RENT_LIFT_SIGNED_FILL_ALPHA_MAX = 0.68

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

/**
 * Hue-neutral bar fill when rent-impact filters exclude a space (no emerald/rose tint).
 */
export const RENT_LIFT_FILTER_EXCLUDED_SPACE_FILL = "rgba(118, 118, 120, 0.26)"

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
    const alpha = lerp(RENT_LIFT_SIGNED_FILL_ALPHA_MIN, RENT_LIFT_SIGNED_FILL_ALPHA_MAX, Math.pow(t, 0.4))
    return rgba(RGB.emerald, alpha)
  }
  const t = clamp01(Math.abs(deltaPsf) / extents.negExtentPsf)
  const alpha = lerp(RENT_LIFT_SIGNED_FILL_ALPHA_MIN, RENT_LIFT_SIGNED_FILL_ALPHA_MAX, Math.pow(t, 0.4))
  return rgba(RGB.rose, alpha)
}
