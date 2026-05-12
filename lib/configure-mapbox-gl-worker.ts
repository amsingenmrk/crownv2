"use client"

import mapboxgl from "mapbox-gl"

/**
 * Bundlers (e.g. Turbopack) break mapbox-gl's default worker bootstrap
 * (`new URL("worker.js", import.meta.url)`), so tiles never load while DOM
 * markers still appear.
 *
 * A cross-origin worker URL (e.g. api.mapbox.com) throws SecurityError in the
 * browser; serve the CSP worker from this origin instead. The file is copied
 * from `node_modules/mapbox-gl/dist/mapbox-gl-csp-worker.js` on `postinstall`
 * (see `scripts/sync-mapbox-csp-worker.mjs`).
 *
 * @see https://docs.mapbox.com/mapbox-gl-js/api/properties/#workerurl
 */
if (typeof window !== "undefined") {
  mapboxgl.workerUrl = `${window.location.origin}/mapbox-gl-csp-worker.js`
}
