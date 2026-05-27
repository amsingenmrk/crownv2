/** Match portfolio dashboard display ($1.24B / $74.2M style). */
export function formatUsdPortfolioCompact(usd: number): string {
  const mills = usd / 1_000_000
  if (mills >= 1000) {
    return `$${(mills / 1000).toFixed(2)}B`
  }
  return `$${mills.toFixed(1)}M`
}

export function formatUsdDeltaCompact(deltaUsd: number): string {
  if (deltaUsd === 0) return "$0.0M"
  const sign = deltaUsd > 0 ? "+" : "−"
  return `${sign}${formatUsdPortfolioCompact(Math.abs(deltaUsd))}`
}

export function formatPctChange(from: number, to: number): string {
  if (from === 0) return "—"
  const pct = ((to - from) / from) * 100
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : ""
  return `${sign}${Math.abs(pct).toFixed(2)}%`
}

export function formatCapRatePts(deltaPts: number): string {
  const sign = deltaPts > 0 ? "+" : deltaPts < 0 ? "−" : ""
  return `${sign}${Math.abs(deltaPts).toFixed(2)} pts`
}

export function formatUsdPerSf(usd: number, sqft: number): string {
  if (sqft <= 0) return "—"
  const v = usd / sqft
  return `$${Math.round(v).toLocaleString()} / SF`
}

/** Signed change in $/SF between two portfolio-level USD totals over the same RSF. */
export function scenarioDeltaDirection(d: number): "up" | "down" | "neutral" {
  if (d > 1e-6) return "up"
  if (d < -1e-6) return "down"
  return "neutral"
}

export function scenarioDeltaTone(
  d: number,
  direction: "normal" | "inverse" = "normal"
): "up" | "down" | "neutral" {
  if (Math.abs(d) <= 1e-6) {
    return "neutral"
  }

  if (direction === "inverse") {
    return d > 0 ? "down" : "up"
  }

  return scenarioDeltaDirection(d)
}

export function formatUsdPerSfDelta(
  baseUsd: number,
  scenarioUsd: number,
  sqft: number
): string {
  if (sqft <= 0) return ""
  const d = (scenarioUsd - baseUsd) / sqft
  const rounded = Math.round(Math.abs(d))
  if (d === 0) return "$0 / SF"
  const sign = d > 0 ? "+" : "−"
  return `${sign}$${rounded.toLocaleString()} / SF`
}
