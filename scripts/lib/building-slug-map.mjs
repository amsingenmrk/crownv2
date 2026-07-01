import fs from "node:fs"
import path from "node:path"

/** Baseline export filename → app asset slug (see lib/real-properties/index.ts). */
const SLUG_BY_BASELINE_FILE = {
  "mt-kemble.baseline.json": "340-mt-kemble",
  "east-putnam.baseline.json": "1700-east-putnam",
  "mack-centre-iv.baseline.json": "mack-centre-iv",
}

export function loadBuildingSlugMap(rootDir) {
  const dataDir = path.join(rootDir, "lib/real-properties/data")
  /** @type {Record<string, string>} */
  const map = {}

  for (const [fileName, slug] of Object.entries(SLUG_BY_BASELINE_FILE)) {
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
