import fs from "node:fs"
import path from "node:path"

/** Owned portfolio baseline export filename → app asset slug. */
const SLUG_BY_BASELINE_FILE = {
  "mt-kemble.baseline.json": "340-mt-kemble",
  "east-putnam.baseline.json": "1700-east-putnam",
  "mack-centre-iv.baseline.json": "mack-centre-iv",
}

/** Other Assets baseline export filename → app asset slug (see other-assets/registry.ts). */
const OTHER_SLUG_BY_BASELINE_FILE = {
  "1_deforest_avenue_baseline.json": "1-deforest-avenue",
  "25_deforest_avenue_baseline.json": "25-deforest-avenue",
  "200_greenwich_avenue_baseline.json": "200-greenwich-avenue",
}

function loadSlugMapFromDir(dataDir, slugByFile) {
  /** @type {Record<string, string>} */
  const map = {}

  for (const [fileName, slug] of Object.entries(slugByFile)) {
    const filePath = path.join(dataDir, fileName)
    if (!fs.existsSync(filePath)) continue
    const json = JSON.parse(fs.readFileSync(filePath, "utf8"))
    const buildingId = json.building_id
    if (typeof buildingId === "string" && buildingId.trim() !== "") {
      map[buildingId] = slug
    }
  }

  return map
}

export function loadBuildingSlugMap(rootDir) {
  return {
    ...loadSlugMapFromDir(
      path.join(rootDir, "lib/real-properties/data"),
      SLUG_BY_BASELINE_FILE
    ),
    ...loadSlugMapFromDir(
      path.join(rootDir, "lib/real-properties/other-assets/data"),
      OTHER_SLUG_BY_BASELINE_FILE
    ),
  }
}
