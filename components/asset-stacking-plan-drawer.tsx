"use client"

import * as React from "react"
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  CircleDot,
  MapPin,
} from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  formatLongDate,
  type StackingPlanTenant,
} from "@/lib/stacking-plan-data"

type AssetStackingPlanDrawerProps = {
  open: boolean
  tenant: StackingPlanTenant | null
  onOpenChange: (open: boolean) => void
}

type DetailRow = {
  label: string
  value: string
  valueClassName?: string
  subValue?: string
  subValueClassName?: string
}

export function AssetStackingPlanDrawer({
  open,
  tenant,
  onOpenChange,
}: AssetStackingPlanDrawerProps) {
  if (tenant == null) return null

  const isVacant = tenant.isVacant
  const headerTitle =
    tenant.name && !tenant.isVacant
      ? `${tenant.name} / ${tenant.space}`
      : tenant.space

  const metrics = isVacant
    ? [
        { label: "Space", value: tenant.space },
        { label: "Size", value: tenant.sqftLabel },
        { label: "Status", value: tenant.availabilityStatus },
      ]
    : [
        { label: "Contract Rate", value: tenant.contractRate ?? "N/A" },
        {
          label: "Predicted Rent",
          value: tenant.predictedRent ?? "N/A",
          subValue: tenant.rentPremium ?? undefined,
          subValueClassName: "text-primary",
        },
        { label: "Expires", value: tenant.expiration },
      ]

  const detailRows: DetailRow[] = isVacant
    ? [
        { label: "Space", value: tenant.space },
        { label: "Floor", value: tenant.floorLabel },
        { label: "Buildout", value: tenant.buildout },
        { label: "Size", value: tenant.sqftLabel },
        { label: "Availability", value: tenant.availabilityStatus },
        {
          label: "Verification",
          value: tenant.verificationStatus,
          valueClassName: "text-emerald-700",
        },
        { label: "Owner", value: tenant.owner },
      ]
    : [
        { label: "Tenant", value: tenant.name },
        { label: "Suite", value: tenant.space },
        { label: "Floor", value: tenant.floorLabel },
        { label: "Lease type", value: tenant.leaseType ?? "N/A" },
        { label: "Buildout", value: tenant.buildout },
        {
          label: "Commencement",
          value: formatLongDate(tenant.leaseCommencementDate),
        },
        {
          label: "Expiration",
          value: formatLongDate(tenant.leaseExpirationDate),
        },
        { label: "Annual rent", value: tenant.annualRent ?? "N/A" },
        {
          label: "Contract rate",
          value: tenant.contractRate ?? tenant.rentPerSf ?? "N/A",
        },
        {
          label: "Predicted rent",
          value: tenant.predictedRent ?? "N/A",
          subValue: tenant.rentPremium ?? undefined,
          subValueClassName: "text-primary",
        },
        {
          label: "Verification",
          value: tenant.verificationStatus,
          valueClassName: "text-emerald-700",
        },
      ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(460px,100vw)] max-w-[460px] border-l border-border bg-background p-0 shadow-xl"
      >
        <div className="flex h-full flex-col bg-background">
          <div className="border-b border-border bg-background px-6 py-4">
            <div className="min-w-0 space-y-1 pr-10">
              <SheetTitle className="truncate text-[1.35rem] font-semibold tracking-tight text-foreground">
                {headerTitle}
              </SheetTitle>
              <SheetDescription className="text-sm leading-5 text-muted-foreground">
                Last updated {formatLongDate(tenant.lastUpdatedDate)}
              </SheetDescription>
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto bg-background px-6 py-6">
            <SectionCard
              title={isVacant ? "Space Summary" : "Lease Summary"}
              description={
                isVacant
                  ? "Core vacancy context for this suite."
                  : "Core suite context for this lease."
              }
            >
              <div className="grid grid-cols-2 rounded-lg border border-border bg-muted/20">
                <SummaryCell
                  label={isVacant ? "Space" : "Suite"}
                  value={tenant.space}
                  icon={MapPin}
                />
                <SummaryCell
                  label="Buildout"
                  value={tenant.buildout}
                  icon={Building2}
                  withLeadingBorder
                />
                <SummaryCell
                  label="Size"
                  value={tenant.sqftLabel}
                  icon={CircleDot}
                  withTopBorder
                />
                <SummaryCell
                  label={isVacant ? "Owner" : "Lease type"}
                  value={isVacant ? tenant.owner : (tenant.leaseType ?? "N/A")}
                  icon={isVacant ? BadgeCheck : CalendarClock}
                  withLeadingBorder
                  withTopBorder
                />
              </div>

              {tenant.note ? (
                <div className="mt-4 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-foreground">
                  {tenant.note}
                </div>
              ) : null}
            </SectionCard>

            <MetricGrid items={metrics} />

            <SectionCard
              title={isVacant ? "Space Overview" : "Lease Overview"}
              description={
                isVacant
                  ? "Read-only vacancy context aligned with the asset workspace."
                  : "Read-only lease context aligned with the asset workspace."
              }
            >
              <DetailList rows={detailRows} />
            </SectionCard>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function MetricGrid({
  items,
}: {
  items: Array<{
    label: string
    value: string
    subValue?: string
    subValueClassName?: string
  }>
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border bg-card px-4 py-3"
        >
          <div className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {item.label}
          </div>
          <div className="mt-1 text-base font-semibold tracking-tight text-foreground tabular-nums">
            {item.value}
          </div>
          {item.subValue ? (
            <div
              className={`mt-1 text-xs font-medium text-muted-foreground tabular-nums ${
                item.subValueClassName ?? ""
              }`}
            >
              {item.subValue}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3.5">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {description ? (
          <div className="mt-1 text-xs text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function DetailList({ rows }: { rows: DetailRow[] }) {
  return (
    <div className="space-y-0">
      {rows.map((row, index) => (
        <div
          key={`${row.label}-${index}`}
          className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3 ${
            index > 0 ? "border-t border-border" : ""
          }`}
        >
          <div className="text-sm text-muted-foreground">{row.label}</div>
          <div
            className={`text-right text-sm font-medium text-foreground ${
              row.valueClassName ?? ""
            }`}
          >
            <div>{row.value}</div>
            {row.subValue ? (
              <div
                className={`mt-1 text-xs font-medium text-muted-foreground tabular-nums ${
                  row.subValueClassName ?? ""
                }`}
              >
                {row.subValue}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

function SummaryCell({
  label,
  value,
  icon: Icon,
  withLeadingBorder = false,
  withTopBorder = false,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  withLeadingBorder?: boolean
  withTopBorder?: boolean
}) {
  return (
    <div
      className={`min-w-0 px-4 py-3.5 ${withLeadingBorder ? "border-l border-border" : ""} ${
        withTopBorder ? "border-t border-border" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">
        {value}
      </div>
    </div>
  )
}
