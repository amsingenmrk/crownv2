/** `/scenarios/:slug` — same storage path for overview, forecasts, and scenario subroutes. */
export function scenarioStoragePathname(pathname: string | null): string | null {
  if (pathname == null || !pathname.startsWith("/scenarios/")) return null
  const afterPrefix = pathname.slice("/scenarios/".length)
  if (afterPrefix.length === 0) return null
  const slash = afterPrefix.indexOf("/")
  const slug = slash === -1 ? afterPrefix : afterPrefix.slice(0, slash)
  return slug.length === 0 ? null : `/scenarios/${slug}`
}
