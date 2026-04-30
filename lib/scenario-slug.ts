/** URL-safe slug from a scenario display name. */
export function slugifyScenarioName(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return s.length > 0 ? s : "untitled-scenario"
}

/** Title case from a URL slug (e.g. `2026-capital-planning`). */
export function humanizeScenarioSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((segment) => segment[0]!.toUpperCase() + segment.slice(1))
    .join(" ")
}

export function uniqueScenarioSlug(base: string, existing: Set<string>): string {
  let s = base
  let n = 2
  while (existing.has(s)) {
    s = `${base}-${n}`
    n += 1
  }
  return s
}
