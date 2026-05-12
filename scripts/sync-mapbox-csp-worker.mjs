import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const src = path.join(root, "node_modules/mapbox-gl/dist/mapbox-gl-csp-worker.js")
const dest = path.join(root, "public/mapbox-gl-csp-worker.js")

if (!fs.existsSync(src)) {
  console.warn("sync-mapbox-csp-worker: mapbox-gl not installed, skipping")
  process.exit(0)
}

fs.mkdirSync(path.dirname(dest), { recursive: true })
fs.copyFileSync(src, dest)
console.log("sync-mapbox-csp-worker: copied to public/mapbox-gl-csp-worker.js")
