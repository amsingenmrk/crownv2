export const BENCHMARK_AREA_QUERY_PARAM = "area"
export const BENCHMARK_COMPARE_QUERY_PARAM = "compare"

export function benchmarksPageHref(
  areaId: string,
  compareAssetId?: string
): string {
  const params = new URLSearchParams()
  params.set(BENCHMARK_AREA_QUERY_PARAM, areaId)
  if (compareAssetId) {
    params.set(BENCHMARK_COMPARE_QUERY_PARAM, compareAssetId)
  }
  return `/benchmarks?${params.toString()}`
}

export function assetBenchmarksPageHref(assetId: string, areaId?: string): string {
  const href = `/properties/${encodeURIComponent(assetId)}/benchmarks`
  if (!areaId) return href
  const params = new URLSearchParams()
  params.set(BENCHMARK_AREA_QUERY_PARAM, areaId)
  return `${href}?${params.toString()}`
}
