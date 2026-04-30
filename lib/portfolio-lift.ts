import { cn } from "@/lib/utils"

export function normalizedLiftStrength(
  liftPercent: number,
  min: number,
  max: number
): number {
  if (max <= min) return 1
  return (liftPercent - min) / (max - min)
}

export function liftPillClassFromStrength(t: number) {
  if (t >= 0.85) {
    return cn(
      "bg-violet-600 text-white shadow-sm ring-2 ring-violet-400/90",
      "dark:bg-violet-500 dark:ring-violet-300/75"
    )
  }
  if (t >= 0.55) {
    return cn(
      "bg-violet-500 text-violet-50 ring-1 ring-violet-500/60",
      "dark:bg-violet-600 dark:text-white dark:ring-violet-400/45"
    )
  }
  if (t >= 0.3) {
    return cn(
      "bg-violet-500/25 text-violet-900 ring-1 ring-violet-500/35",
      "dark:bg-violet-500/35 dark:text-violet-100 dark:ring-violet-400/30"
    )
  }
  return cn(
    "bg-violet-500/[0.09] text-violet-700/70 ring-1 ring-violet-400/22",
    "dark:bg-violet-500/[0.14] dark:text-violet-300/60 dark:ring-violet-500/18"
  )
}

export function mapPinClassFromStrength(t: number) {
  if (t >= 0.85) {
    return "bg-violet-600 ring-2 ring-white shadow-md dark:bg-violet-500"
  }
  if (t >= 0.55) {
    return "bg-violet-500 ring-2 ring-white shadow-sm dark:bg-violet-400"
  }
  if (t >= 0.3) {
    return "bg-violet-400/90 ring-2 ring-white/95 dark:bg-violet-400/75"
  }
  return "bg-violet-300/50 ring-2 ring-white/90 dark:bg-violet-500/35"
}

/** Map pins for broader-market listings (e.g. /search), distinct from portfolio violet. */
export function mapPinClassMarket() {
  return cn(
    "bg-zinc-800 ring-2 ring-white/95 shadow-sm",
    "dark:bg-zinc-500 dark:ring-white/75"
  )
}

/** Lift pill styling for market listings (neutral grays vs portfolio violet). */
export function marketLiftPillClassFromStrength(t: number) {
  if (t >= 0.85) {
    return cn(
      "bg-zinc-700 text-white ring-1 ring-zinc-500/60",
      "dark:bg-zinc-600 dark:ring-zinc-400/45"
    )
  }
  if (t >= 0.55) {
    return cn(
      "bg-zinc-500/30 text-zinc-900 ring-1 ring-zinc-500/35",
      "dark:bg-zinc-500/40 dark:text-zinc-50 dark:ring-zinc-400/30"
    )
  }
  if (t >= 0.3) {
    return cn(
      "bg-zinc-500/15 text-zinc-800 ring-1 ring-zinc-400/25",
      "dark:bg-zinc-500/22 dark:text-zinc-200 dark:ring-zinc-500/20"
    )
  }
  return cn(
    "bg-zinc-500/[0.08] text-zinc-700/80 ring-1 ring-zinc-400/20",
    "dark:bg-zinc-500/15 dark:text-zinc-300/70 dark:ring-zinc-500/15"
  )
}
