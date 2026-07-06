"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { getAssetById } from "@/lib/assets"
import { recordRecentAsset } from "@/lib/recent-assets"
import { getOtherRealAssetById } from "@/lib/real-properties/other-assets"

/**
 * Records asset detail visits in localStorage for the command palette.
 */
export function RecentAssetTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const match = pathname?.match(/^\/properties\/([^/]+)/)
    const id = match?.[1]
    if (!id || (!getAssetById(id) && !getOtherRealAssetById(id))) return
    recordRecentAsset(id)
  }, [pathname])

  return null
}
