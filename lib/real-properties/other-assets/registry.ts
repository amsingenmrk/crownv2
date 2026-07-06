import type { RealPropertyDef } from "@/lib/real-properties/property-def"

import deforestBaseline from "./data/1_deforest_avenue_baseline.json"
import deforestScenarios from "./data/1_deforest_avenue_scenarios.json"
import deforest25Baseline from "./data/25_deforest_avenue_baseline.json"
import deforest25Scenarios from "./data/25_deforest_avenue_scenarios.json"
import greenwich200Baseline from "./data/200_greenwich_avenue_baseline.json"
import greenwich200Scenarios from "./data/200_greenwich_avenue_scenarios.json"

/**
 * Register exported buildings here after adding JSON to `./data/`.
 *
 * @example
 * import acmeBaseline from "./data/acme-tower.baseline.json"
 * import acmeModifications from "./data/acme-tower.modifications.json"
 *
 * {
 *   id: "acme-tower",
 *   name: "Acme Tower",
 *   address: "1 Main St, City, ST 00000",
 *   imageUrl: "https://images.unsplash.com/photo-...",
 *   competitiveGroupId: "comp-fund-i",
 *   baseline: acmeBaseline as RealPropertyDef["baseline"],
 *   modifications: acmeModifications as RealPropertyDef["modifications"],
 * },
 */
export type OtherRealPropertyDef = RealPropertyDef & {
  competitiveGroupId: string
}

export const OTHER_REAL_PROPERTY_DEFS: OtherRealPropertyDef[] = [
  {
    id: "1-deforest-avenue",
    name: "1 DeForest Avenue",
    address: "1 DeForest Avenue, Summit, NJ 07901",
    imageUrl:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
    competitiveGroupId: "comp-fund-i",
    baseline: deforestBaseline as unknown as RealPropertyDef["baseline"],
    modifications: deforestScenarios as unknown as RealPropertyDef["modifications"],
  },
  {
    id: "25-deforest-avenue",
    name: "25 DeForest Avenue",
    address: "25 DeForest Avenue, Summit, NJ 07901",
    imageUrl:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop",
    competitiveGroupId: "comp-fund-i",
    baseline: deforest25Baseline as unknown as RealPropertyDef["baseline"],
    modifications: deforest25Scenarios as unknown as RealPropertyDef["modifications"],
  },
  {
    id: "200-greenwich-avenue",
    name: "200 Greenwich Avenue",
    address: "200 Greenwich Avenue, Greenwich, CT 06830",
    imageUrl:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop",
    competitiveGroupId: "comp-fund-i",
    baseline: greenwich200Baseline as unknown as RealPropertyDef["baseline"],
    modifications:
      greenwich200Scenarios as unknown as RealPropertyDef["modifications"],
  },
]

export const OTHER_REAL_ASSET_IDS: readonly string[] =
  OTHER_REAL_PROPERTY_DEFS.map((def) => def.id)
