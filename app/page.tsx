import type { Metadata } from "next"

import { LandingPage } from "@/components/landing/landing-page"

export const metadata: Metadata = {
  title: "Glassbox — Portfolio clarity for CRE teams",
  description:
    "Portfolio views, building-level stacking, scenarios, and forecasts in one workspace for institutional real estate teams.",
}

export default function RootPage() {
  return <LandingPage />
}
