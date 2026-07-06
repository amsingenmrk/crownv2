import type { BenchmarkArea, BenchmarkAreaBounds } from "@/lib/benchmark-area-types"
import { applyStoredBoundary } from "@/lib/benchmark-market-boundaries"

type StateBenchmarkSeed = {
  code: string
  label: string
  bounds: BenchmarkAreaBounds
}

const STATE_BENCHMARK_SEEDS: readonly StateBenchmarkSeed[] = [
  { code: "CA", label: "California", bounds: [[-124.5, 32.4], [-114.1, 42.1]] },
  { code: "CO", label: "Colorado", bounds: [[-109.1, 36.9], [-102.0, 41.1]] },
  { code: "CT", label: "Connecticut", bounds: [[-73.7, 40.9], [-71.8, 42.1]] },
  { code: "FL", label: "Florida", bounds: [[-87.7, 24.4], [-80.0, 31.1]] },
  { code: "GA", label: "Georgia", bounds: [[-85.7, 30.3], [-80.8, 35.1]] },
  { code: "IL", label: "Illinois", bounds: [[-91.6, 36.9], [-87.4, 42.6]] },
  { code: "MA", label: "Massachusetts", bounds: [[-73.6, 41.2], [-69.9, 42.9]] },
  { code: "NC", label: "North Carolina", bounds: [[-84.4, 33.8], [-75.4, 36.7]] },
  { code: "NJ", label: "New Jersey", bounds: [[-75.6, 38.9], [-73.9, 41.4]] },
  { code: "NY", label: "New York", bounds: [[-79.8, 40.4], [-71.8, 45.1]] },
  { code: "TN", label: "Tennessee", bounds: [[-90.4, 34.9], [-81.6, 36.8]] },
  { code: "TX", label: "Texas", bounds: [[-106.7, 25.8], [-93.5, 36.6]] },
  { code: "WA", label: "Washington", bounds: [[-124.9, 45.5], [-116.8, 49.1]] },
] as const

function boundsCenter(bounds: BenchmarkAreaBounds): [number, number] {
  const [[west, south], [east, north]] = bounds
  return [(west + east) / 2, (south + north) / 2]
}

function normalizedStateCode(value: string | null | undefined): string | null {
  const code = value?.trim().toUpperCase()
  return code && /^[A-Z]{2}$/.test(code) ? code : null
}

export function stateCodeFromAddressLike(
  value: string | null | undefined
): string | null {
  if (!value) return null
  const match =
    value.match(/,\s*([A-Z]{2})\s+\d{5}(?:-\d{4})?\b/) ??
    value.match(/,\s*([A-Z]{2})\b/)
  return normalizedStateCode(match?.[1])
}

export function stateBenchmarkAreaForCode(
  stateCode: string | null | undefined
): BenchmarkArea | null {
  const code = normalizedStateCode(stateCode)
  if (!code) return null
  const seed = STATE_BENCHMARK_SEEDS.find((item) => item.code === code)
  if (!seed) return null

  return applyStoredBoundary({
    id: `state-${seed.code.toLowerCase()}`,
    label: seed.label,
    bounds: seed.bounds,
    level: "msaState",
    parentId: "us-national",
    isCurated: false,
    geocodeQuery: seed.label,
    geocodeHint: {
      placeTypes: ["region"],
      regionName: seed.label,
      regionShortCode: seed.code,
      countryShortCode: "us",
      center: boundsCenter(seed.bounds),
    },
    aliases: [seed.label, seed.code],
  })
}

export function stateBenchmarkAreaById(areaId: string): BenchmarkArea | null {
  const match = /^state-([a-z]{2})$/.exec(areaId.trim().toLowerCase())
  if (!match) return null
  return stateBenchmarkAreaForCode(match[1])
}

/** Map a regional-hub label/key to a state outline when they match 1:1. */
export function stateBenchmarkAreaForRegionalHub(
  statsKey: string,
  label: string
): BenchmarkArea | null {
  const candidates = [statsKey, label]
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0)

  for (const seed of STATE_BENCHMARK_SEEDS) {
    const seedLabel = seed.label.toLowerCase()
    const seedCode = seed.code.toLowerCase()
    if (candidates.some((value) => value === seedLabel || value === seedCode)) {
      return stateBenchmarkAreaForCode(seed.code)
    }
  }

  return null
}
