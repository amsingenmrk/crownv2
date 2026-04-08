import { cn } from "@/lib/utils"

/** Outer grid: hairline dividers between cells (matches asset stat strip). */
export const metricStripSectionClassName = cn(
  "overflow-hidden rounded-xl border border-border bg-border shadow-sm",
  "grid gap-px"
)

export function MetricStripCell({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "min-w-0 bg-card px-3 py-3 sm:px-4 sm:py-3.5 xl:px-3.5 xl:py-3",
        className
      )}
    >
      {children}
    </div>
  )
}

export function MetricStripLabel({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <p
      className={cn(
        "text-sm font-medium leading-snug text-muted-foreground",
        className
      )}
    >
      {children}
    </p>
  )
}

/** Primary metric line: `text-lg` + tabular; wrap `value` + optional suffix spans inside. */
export function MetricStripValueRow({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "mt-1 flex flex-wrap items-baseline gap-x-1.5 text-lg font-semibold leading-snug tracking-tight tabular-nums",
        className
      )}
    >
      {children}
    </div>
  )
}

export function MetricStripValueSuffix({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "text-sm font-semibold text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  )
}

/** Top border + vertical stack of sub-rows (e.g. / SF lines). */
export function MetricStripSubStack({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn("mt-2 space-y-2 border-t border-border/70 pt-2", className)}
    >
      {children}
    </div>
  )
}

/** One stacked label / value pair under the primary metric. */
export function MetricStripSubRow({
  label,
  value,
  variant = "default",
}: {
  label: string
  value: string
  variant?: "default" | "violet"
}) {
  const labelCls =
    variant === "violet"
      ? "text-xs font-medium leading-snug text-violet-700 dark:text-violet-300"
      : "text-xs leading-snug text-muted-foreground"
  const valueCls =
    variant === "violet"
      ? "text-sm font-semibold leading-snug tabular-nums text-violet-700 dark:text-violet-300"
      : "text-sm font-medium leading-snug tabular-nums text-foreground"

  return (
    <div>
      <p className={labelCls}>{label}</p>
      <p className={cn("mt-0.5", valueCls)}>{value}</p>
    </div>
  )
}
