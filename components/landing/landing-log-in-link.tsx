"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"

export function LandingLogInLink() {
  return (
    <Button variant="outline" size="sm" render={<Link href="/portfolio" />}>
      Log in
    </Button>
  )
}
