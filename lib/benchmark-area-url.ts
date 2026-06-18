export const BENCHMARK_AREA_QUERY_PARAM = "area"

export function benchmarksPageHref(areaId: string): string {
  const params = new URLSearchParams()
  params.set(BENCHMARK_AREA_QUERY_PARAM, areaId)
  return `/benchmarks?${params.toString()}`
}
