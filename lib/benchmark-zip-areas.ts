import type { BenchmarkArea } from "@/lib/benchmark-area-types"
import { applyStoredBoundary } from "@/lib/benchmark-market-boundaries"

function normalizedZipCode(value: string | null | undefined): string | null {
  const match = value?.match(/\b\d{5}(?:-\d{4})?\b/)
  return match?.[0]?.slice(0, 5) ?? null
}

export function zipCodeFromAddressLike(
  value: string | null | undefined
): string | null {
  return normalizedZipCode(value)
}

export function zipBenchmarkAreaForCode(
  zipCode: string | null | undefined
): BenchmarkArea | null {
  const zip = normalizedZipCode(zipCode)
  if (!zip) return null

  return applyStoredBoundary({
    id: `zip-${zip}`,
    label: zip,
    bounds: [
      [-125, 24],
      [-66, 50],
    ],
    level: "zip",
    parentId: "us-national",
    isCurated: false,
    geocodeQuery: zip,
    geocodeHint: {
      placeTypes: ["postcode"],
    },
    aliases: [zip, `ZIP ${zip}`],
  })
}

export function zipBenchmarkAreaById(areaId: string): BenchmarkArea | null {
  const match = /^zip-(\d{5})$/.exec(areaId.trim().toLowerCase())
  if (!match) return null
  return zipBenchmarkAreaForCode(match[1])
}
