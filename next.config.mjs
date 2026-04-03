import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** ESM build — Turbopack cannot bundle mapbox-gl's default UMD `define()` entry. */
const mapboxGlEsm = path.join(
  __dirname,
  "node_modules/mapbox-gl/dist/esm-min/mapbox-gl.js"
)

/** Turbopack treats absolute alias targets as relative to the importing file; use a project-relative path. */
const mapboxGlEsmTurbopack = "./node_modules/mapbox-gl/dist/esm-min/mapbox-gl.js"

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["mapbox-gl"],
  turbopack: {
    resolveAlias: {
      "mapbox-gl": mapboxGlEsmTurbopack,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // Suffix `$` so `mapbox-gl/dist/mapbox-gl.css` still resolves normally.
      "mapbox-gl$": mapboxGlEsm,
    }
    return config
  },
}

export default nextConfig
