"use client"

import { buttonVariants } from "@/components/ui/button"

import { LANDING_CONTACT_SECTION_ID } from "./landing-contact-form"

export function LandingContactCta() {
  return (
    <a
      href={`/landing#${LANDING_CONTACT_SECTION_ID}`}
      className={buttonVariants({ size: "lg" })}
    >
      Contact for pricing
    </a>
  )
}
