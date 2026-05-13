/**
 * Rent-impact visualization for modifications stacking: emerald for positive
 * $/SF lift, rose for negative, slate when no modifications are selected or lift
 * is effectively zero. Magnitude maps to alpha (saturation proxy), aligned with KPI strip tones.
 */

const RGB = {
  emerald: { r: 4, g: 120, b: 87 }, // ~tailwind emerald-700
  rose: { r: 190, g: 18, b: 60 }, // ~tailwind rose-700
  slate: { r: 100, g: 116, b: 139 },
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

export type RentLiftExtents = {
  /** Largest positive delta $/SF among spaces (min epsilon). */
  posExtentPsf: number
  /** Largest |negative delta| among spaces (min epsilon). */
  negExtentPsf: number
}

export function computeRentLiftExtents(
  spaces: readonly { deltaPsf: number; isVacant: boolean }[]
): RentLiftExtents {
  let pos = 0
  let neg = 0
  for (const s of spaces) {
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
 * occupied use the same emerald / rose / faint-slate rules from `deltaPsf`.
 */
export function rentLiftSpaceBackgroundColor(args: {
  deltaPsf: number
  isVacant: boolean
  noActiveModifications: boolean
  extents: RentLiftExtents
}): string {
  const { deltaPsf, noActiveModifications, extents } = args
  if (noActiveModifications) {
    return rgba(RGB.slate, 0.78)
  }
  const eps = 0.005
  if (Math.abs(deltaPsf) < eps) {
    return rgba(RGB.slate, 0.22)
  }
  if (deltaPsf > 0) {
    const t = clamp01(deltaPsf / extents.posExtentPsf)
    const alpha = lerp(0.12, 0.5, Math.sqrt(t))
    return rgba(RGB.emerald, alpha)
  }
  const t = clamp01(Math.abs(deltaPsf) / extents.negExtentPsf)
  const alpha = lerp(0.12, 0.5, Math.sqrt(t))
  return rgba(RGB.rose, alpha)
}
