/**
 * Shared real-property registry shape for owned and Other Assets exports.
 */

export type RawSpaceMetrics = {
  rsf?: number
  occupancy_status?: string
  contract_rate_psf?: number
  annual_rent?: number
  lease_type?: string
  expiration_date?: string
  commencement_date?: string
  lease_end_date?: string
  predicted_rent_psf?: number
  renewal_prob?: number | null
  suite?: string | number
  tenant_name?: string
}

export type RawExplainability = {
  positive?: Record<string, number | null>
  negative?: Record<string, number | null>
  other?: Record<string, number | null>
}

export type RawSpace = {
  lease_id?: string
  metrics?: RawSpaceMetrics
  ml_output?: {
    predictions?: Array<{
      outputs?: { predicted_rent_per_sqft?: number }
      explainability?: RawExplainability
    }>
  }
}

export type RawFloorMetrics = {
  floor_number?: number
  floor_label?: string
  occupancy_pct?: number
  vacancy_pct?: number
  predicted_rent_psf?: number
  contract_rent_psf?: number
  sun_score?: number
  view_score?: number
}

export type RawFloor = {
  metrics?: RawFloorMetrics
  spaces?: Record<string, RawSpace>
}

export type RawAssetBlock = {
  building_rsf?: number
  as_is_value?: number
  as_is_value_per_sqft?: number
  as_is_revenue?: number
  as_is_expense?: number
  as_is_noi?: number
  as_is_cap_rate?: number
  mark_to_market_value?: number
  mark_to_market_revenue?: number
  mark_to_market_expense?: number
  mark_to_market_noi?: number
  mark_to_market_cap_rate?: number
  gross_potential_value?: number
  gross_potential_revenue?: number
  gross_potential_expense?: number
  gross_potential_noi?: number
  gross_potential_cap_rate?: number
}

export type RawMetrics = {
  building_name?: string
  address?: string
  rsf_total?: number
  occupied_pct?: number
  vacant_pct?: number
  wale?: number
  predicted_rent_psf?: number
  market_rent?: number
  property_class?: string | null
  sector?: string | null
  spaces_count?: number
  highest_potential_lift_rent_name?: string
  highest_potential_lift_rent?: number
  highest_potential_lift_rent_pct?: number
}

export type RawBaseline = {
  building_id: string
  property_id: string
  metrics?: RawMetrics
  asset?: RawAssetBlock
  floors?: Record<string, RawFloor>
}

export type RawScenarioSpace = {
  lease_id?: string | null
  predicted_rent?: number
}

export type RawScenarioFloor = {
  spaces?: Record<string, RawScenarioSpace>
}

export type RawScenario = {
  scenario: string
  asset?: RawAssetBlock
  floors?: Record<string, RawScenarioFloor>
}

export type RawModifications = {
  property_id: string
  scenarios?: RawScenario[]
}

export type RealPropertyDef = {
  id: string
  name: string
  address: string
  imageUrl: string
  baseline: RawBaseline
  modifications: RawModifications
}
