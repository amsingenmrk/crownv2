"use client"

import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"

export function LandingLogInLink() {
  return (
    <Link
      href="/portfolio"
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      Log in
    </Link>
  )
}
