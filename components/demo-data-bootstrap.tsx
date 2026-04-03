"use client"

import * as React from "react"
import { seedDemoLocalStorageIfNeeded } from "@/lib/demo-local-storage-seed"

/** Applies one-time demo `localStorage` so production matches a seeded local session. */
export function DemoDataBootstrap() {
  React.useLayoutEffect(() => {
    seedDemoLocalStorageIfNeeded()
  }, [])
  return null
}
