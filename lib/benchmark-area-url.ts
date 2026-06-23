export const BENCHMARK_AREA_QUERY_PARAM = "area"

export function benchmarksPageHref(areaId: string): string {
  const params = new URLSearchParams()
  params.set(BENCHMARK_AREA_QUERY_PARAM, areaId)
  return `/benchmarks?${params.toString()}`
}

export function assetBenchmarksPageHref(assetId: string, areaId?: string): string {
  const href = `/properties/${encodeURIComponent(assetId)}/benchmarks`
  if (!areaId) return href
  const params = new URLSearchParams()
  params.set(BENCHMARK_AREA_QUERY_PARAM, areaId)
  return `${href}?${params.toString()}`
}
