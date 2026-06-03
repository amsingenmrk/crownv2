import {
  normalizeModificationOptionValue,
  type ModValues,
} from "@/lib/building-modifications"

export type ModificationUnderwritingUplift = {
  rentLiftPct: number
  occupancyLiftPct: number
  renewalLiftPct: number
  timeToLeaseDeltaMonths: number
  annualOpexDeltaUsd: number
  exitCapRateDeltaPct: number
  upfrontCapexUsd: number
}

const MOD_OPTION_UPLIFTS: Record<
  keyof ModValues,
  Record<string, ModificationUnderwritingUplift>
> = {
  gym: {
    "general-fitness": {
      rentLiftPct: 0.0125,
      occupancyLiftPct: 0.9,
      renewalLiftPct: 1.2,
      timeToLeaseDeltaMonths: -0.75,
      annualOpexDeltaUsd: 115_000,
      exitCapRateDeltaPct: -0.04,
      upfrontCapexUsd: 1_600_000,
    },
    "mind-body-studio": {
      rentLiftPct: 0.009,
      occupancyLiftPct: 0.6,
      renewalLiftPct: 0.8,
      timeToLeaseDeltaMonths: -0.5,
      annualOpexDeltaUsd: 82_000,
      exitCapRateDeltaPct: -0.02,
      upfrontCapexUsd: 900_000,
    },
    "specialty-fitness": {
      rentLiftPct: 0.018,
      occupancyLiftPct: 1.4,
      renewalLiftPct: 1.8,
      timeToLeaseDeltaMonths: -1.25,
      annualOpexDeltaUsd: 185_000,
      exitCapRateDeltaPct: -0.07,
      upfrontCapexUsd: 2_600_000,
    },
  },
  bar: {
    "wine-spirits-bar": {
      rentLiftPct: 0.008,
      occupancyLiftPct: 0.5,
      renewalLiftPct: 0.7,
      timeToLeaseDeltaMonths: -0.35,
      annualOpexDeltaUsd: 96_000,
      exitCapRateDeltaPct: -0.02,
      upfrontCapexUsd: 1_150_000,
    },
    "beer-bar-pub": {
      rentLiftPct: 0.0045,
      occupancyLiftPct: 0.35,
      renewalLiftPct: 0.4,
      timeToLeaseDeltaMonths: -0.25,
      annualOpexDeltaUsd: 76_000,
      exitCapRateDeltaPct: -0.01,
      upfrontCapexUsd: 850_000,
    },
    "lounge-bar": {
      rentLiftPct: 0.006,
      occupancyLiftPct: 0.4,
      renewalLiftPct: 0.6,
      timeToLeaseDeltaMonths: -0.25,
      annualOpexDeltaUsd: 88_000,
      exitCapRateDeltaPct: -0.01,
      upfrontCapexUsd: 950_000,
    },
  },
  cafe: {
    "coffee-cafe": {
      rentLiftPct: 0.007,
      occupancyLiftPct: 0.55,
      renewalLiftPct: 0.65,
      timeToLeaseDeltaMonths: -0.45,
      annualOpexDeltaUsd: 58_000,
      exitCapRateDeltaPct: -0.02,
      upfrontCapexUsd: 750_000,
    },
    "tea-cafe": {
      rentLiftPct: 0.0045,
      occupancyLiftPct: 0.4,
      renewalLiftPct: 0.45,
      timeToLeaseDeltaMonths: -0.3,
      annualOpexDeltaUsd: 46_000,
      exitCapRateDeltaPct: -0.015,
      upfrontCapexUsd: 550_000,
    },
    "bakery-cafe": {
      rentLiftPct: 0.0035,
      occupancyLiftPct: 0.3,
      renewalLiftPct: 0.35,
      timeToLeaseDeltaMonths: -0.25,
      annualOpexDeltaUsd: 42_000,
      exitCapRateDeltaPct: -0.01,
      upfrontCapexUsd: 450_000,
    },
  },
  restaurant: {
    "white-cloth": {
      rentLiftPct: 0.0115,
      occupancyLiftPct: 0.75,
      renewalLiftPct: 0.95,
      timeToLeaseDeltaMonths: -0.5,
      annualOpexDeltaUsd: 135_000,
      exitCapRateDeltaPct: -0.03,
      upfrontCapexUsd: 1_800_000,
    },
    "full-service-restaurant": {
      rentLiftPct: 0.0075,
      occupancyLiftPct: 0.5,
      renewalLiftPct: 0.6,
      timeToLeaseDeltaMonths: -0.35,
      annualOpexDeltaUsd: 74_000,
      exitCapRateDeltaPct: -0.02,
      upfrontCapexUsd: 1_000_000,
    },
    "fast-casual-quick-service": {
      rentLiftPct: 0.0065,
      occupancyLiftPct: 0.45,
      renewalLiftPct: 0.55,
      timeToLeaseDeltaMonths: -0.3,
      annualOpexDeltaUsd: 62_000,
      exitCapRateDeltaPct: -0.015,
      upfrontCapexUsd: 850_000,
    },
    "specialty-dietary-dining": {
      rentLiftPct: 0.004,
      occupancyLiftPct: 0.3,
      renewalLiftPct: 0.35,
      timeToLeaseDeltaMonths: -0.25,
      annualOpexDeltaUsd: 48_000,
      exitCapRateDeltaPct: -0.01,
      upfrontCapexUsd: 550_000,
    },
  },
  leed: {
    "leed-certified": {
      rentLiftPct: 0.0045,
      occupancyLiftPct: 0.25,
      renewalLiftPct: 0.55,
      timeToLeaseDeltaMonths: -0.25,
      annualOpexDeltaUsd: -18_000,
      exitCapRateDeltaPct: -0.02,
      upfrontCapexUsd: 900_000,
    },
    "leed-silver": {
      rentLiftPct: 0.007,
      occupancyLiftPct: 0.4,
      renewalLiftPct: 0.8,
      timeToLeaseDeltaMonths: -0.4,
      annualOpexDeltaUsd: -35_000,
      exitCapRateDeltaPct: -0.04,
      upfrontCapexUsd: 1_400_000,
    },
    "leed-gold": {
      rentLiftPct: 0.0095,
      occupancyLiftPct: 0.55,
      renewalLiftPct: 1.1,
      timeToLeaseDeltaMonths: -0.6,
      annualOpexDeltaUsd: -55_000,
      exitCapRateDeltaPct: -0.06,
      upfrontCapexUsd: 2_000_000,
    },
    "leed-platinum": {
      rentLiftPct: 0.0125,
      occupancyLiftPct: 0.7,
      renewalLiftPct: 1.4,
      timeToLeaseDeltaMonths: -0.75,
      annualOpexDeltaUsd: -80_000,
      exitCapRateDeltaPct: -0.08,
      upfrontCapexUsd: 2_800_000,
    },
  },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/**
 * Explicit synthetic underwriting levers for scenario modifications.
 * The outputs are additive portfolio assumptions, not opaque multipliers.
 */
export function upliftFromModValues(values: ModValues): ModificationUnderwritingUplift {
  const total: ModificationUnderwritingUplift = {
    rentLiftPct: 0,
    occupancyLiftPct: 0,
    renewalLiftPct: 0,
    timeToLeaseDeltaMonths: 0,
    annualOpexDeltaUsd: 0,
    exitCapRateDeltaPct: 0,
    upfrontCapexUsd: 0,
  }

  for (const [modId, optionValue] of Object.entries(values) as Array<
    [keyof ModValues, string]
  >) {
    if (optionValue == null || optionValue === "") continue
    const normalizedOptionValue = normalizeModificationOptionValue(
      modId,
      optionValue
    )
    const uplift = MOD_OPTION_UPLIFTS[modId]?.[normalizedOptionValue]
    if (uplift == null) continue

    total.rentLiftPct += uplift.rentLiftPct
    total.occupancyLiftPct += uplift.occupancyLiftPct
    total.renewalLiftPct += uplift.renewalLiftPct
    total.timeToLeaseDeltaMonths += uplift.timeToLeaseDeltaMonths
    total.annualOpexDeltaUsd += uplift.annualOpexDeltaUsd
    total.exitCapRateDeltaPct += uplift.exitCapRateDeltaPct
    total.upfrontCapexUsd += uplift.upfrontCapexUsd
  }

  return {
    rentLiftPct: clamp(total.rentLiftPct, 0, 0.08),
    occupancyLiftPct: clamp(total.occupancyLiftPct, 0, 6),
    renewalLiftPct: clamp(total.renewalLiftPct, 0, 12),
    timeToLeaseDeltaMonths: clamp(total.timeToLeaseDeltaMonths, -6, 0),
    annualOpexDeltaUsd: total.annualOpexDeltaUsd,
    exitCapRateDeltaPct: clamp(total.exitCapRateDeltaPct, -0.25, 0.05),
    upfrontCapexUsd: total.upfrontCapexUsd,
  }
}
