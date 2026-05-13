"use client"

import { useServerInsertedHTML } from "next/navigation"

import { buildThemeBootScript } from "@/lib/theme-mode"

/**
 * Injects the theme boot snippet during SSR only (via Next's server-inserted HTML
 * channel). Avoids rendering `<script>` through the client React tree, which React 19
 * warns about and may skip executing on client navigations.
 */
export function ThemeBootScript() {
  useServerInsertedHTML(() => (
    <script
      id="theme-boot"
      dangerouslySetInnerHTML={{ __html: buildThemeBootScript() }}
    />
  ))
  return null
}
