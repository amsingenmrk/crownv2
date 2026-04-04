"use client"

import mapboxgl from "mapbox-gl"

/**
 * Bundlers (e.g. Turbopack) break mapbox-gl's default worker bootstrap
 * (`new URL("worker.js", import.meta.url)`), so tiles never load while DOM
 * markers still appear. Point the worker at Mapbox's hosted bundle instead.
 *
 * Version must match the installed `mapbox-gl` package.
 *
 * @see https://docs.mapbox.com/mapbox-gl-js/api/properties/#workerurl
 */
const MAPBOX_GL_VERSION = "3.21.0"

if (typeof window !== "undefined") {
  mapboxgl.workerUrl = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl-csp-worker.js`
}
