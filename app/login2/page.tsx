import type { Metadata } from "next"

import { LogInPage } from "@/components/landing/log-in-page"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Glassbox with your work email.",
}

export default function Login2RoutePage() {
  return <LogInPage />
}
