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
  const sign = pct >= 0 ? "+" : ""
  return `${sign}${pct.toFixed(2)}%`
}

export function formatCapRatePts(deltaPts: number): string {
  const sign = deltaPts >= 0 ? "+" : ""
  return `${sign}${deltaPts.toFixed(2)} pts`
}

export function formatUsdPerSf(usd: number, sqft: number): string {
  if (sqft <= 0) return "—"
  const v = usd / sqft
  return `$${Math.round(v).toLocaleString()} / SF`
}
