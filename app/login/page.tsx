import type { Metadata } from "next"

import { LogIn2Page } from "@/components/landing/log-in2-page"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Glassbox with your work email.",
}

export default function LoginRoutePage() {
  return <LogIn2Page />
}
