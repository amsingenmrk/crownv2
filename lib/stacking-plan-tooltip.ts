import {
  LEASE_TYPE_OPTIONS,
  type AssetLeasingAssumptionsState,
} from "@/lib/asset-leasing-assumptions"
import { resolveSpaceAssumptionsForEditor } from "@/lib/space-leasing-assumption-editor"
import type { StackingPlanTenant } from "@/lib/stacking-plan-data"

const LEASE_TYPE_LABELS = Object.fromEntries(
  LEASE_TYPE_OPTIONS.map((option) => [option.value, option.label])
) as Record<string, string>

function stripSuitePrefix(space: string) {
  return space.replace(/^ste\s+/i, "")
}

function formatTooltipLine(label: string, value?: string | null) {
  const normalized = value?.trim()
  if (normalized == null || normalized.length === 0) {
    return null
  }
  return `${label}: ${normalized}`
}

function formatRateInputValue(value?: number) {
  if (value == null || Number.isNaN(value)) {
    return "N/A"
  }
  return value.toFixed(2)
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`
}

function formatMonths(value: number) {
  return `${Math.round(value)} mo`
}

function formatYears(value: number) {
  return `${Math.round(value)} yrs`
}

function buildSpaceAssumptionDraftFromTenant(tenant: StackingPlanTenant) {
  return {
    timeToLeaseMonths:
      tenant.timeToLeaseMonths != null ? String(tenant.timeToLeaseMonths) : "",
    occupancyTargetPct:
      tenant.occupancyTargetPct != null ? String(tenant.occupancyTargetPct) : "",
    renewalProbabilityPct:
      tenant.renewalProbabilityPct != null
        ? String(tenant.renewalProbabilityPct)
        : "",
    assumptionLeaseType: tenant.assumptionLeaseType ?? "",
    leaseTermYears:
      tenant.leaseTermYears != null ? String(tenant.leaseTermYears) : "",
  }
}

export function buildStackingPlanSuiteEditorTooltipText({
  tenant,
  buildingLeasingAssumptions,
}: {
  tenant: StackingPlanTenant
  buildingLeasingAssumptions: AssetLeasingAssumptionsState
}) {
  const suite = stripSuitePrefix(tenant.space)
  const resolvedSpaceAssumptions = resolveSpaceAssumptionsForEditor(
    buildSpaceAssumptionDraftFromTenant(tenant),
    buildingLeasingAssumptions
  )

  return [
    tenant.isVacant ? `Vacant • ${suite}` : `${tenant.name} • ${suite}`,
    !tenant.isVacant ? formatTooltipLine("Tenant", tenant.name) : null,
    formatTooltipLine("Suite", suite),
    formatTooltipLine("SF", tenant.sqft.toLocaleString()),
    formatTooltipLine("Buildout", tenant.buildout),
    tenant.isVacant
      ? formatTooltipLine("Availability", tenant.availabilityStatus)
      : formatTooltipLine("Lease Type", tenant.leaseType ?? "N/A"),
    !tenant.isVacant
      ? formatTooltipLine("Commencement", tenant.leaseCommencementDate ?? "N/A")
      : null,
    !tenant.isVacant
      ? formatTooltipLine("Expiration", tenant.leaseExpirationDate ?? "N/A")
      : null,
    !tenant.isVacant
      ? formatTooltipLine(
          "Contract Rate",
          formatRateInputValue(tenant.contractRatePsfValue)
        )
      : null,
    formatTooltipLine(
      "Predicted Rate",
      formatRateInputValue(tenant.predictedRentPsfValue)
    ),
    "Space assumptions",
    formatTooltipLine(
      "Time to lease",
      formatMonths(resolvedSpaceAssumptions.timeToLeaseMonths)
    ),
    formatTooltipLine(
      "Occupancy target",
      formatPercent(resolvedSpaceAssumptions.occupancyTargetPct)
    ),
    !tenant.isVacant
      ? formatTooltipLine(
          "Renewal probability",
          formatPercent(resolvedSpaceAssumptions.defaultRenewalProbabilityPct)
        )
      : null,
    formatTooltipLine(
      "Lease type",
      LEASE_TYPE_LABELS[resolvedSpaceAssumptions.leaseType] ??
        resolvedSpaceAssumptions.leaseType
    ),
    formatTooltipLine(
      "Lease term",
      formatYears(resolvedSpaceAssumptions.leaseTermYears)
    ),
  ].filter((line): line is string => line != null).join("\n")
}
