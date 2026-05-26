"use client"

import { GlassboxBrand } from "@/components/landing/glassbox-brand"
import { LandingContactPricingLink } from "@/components/landing/landing-contact-pricing-dialog"
import { LoginForm03 } from "@/components/login-form-03"

export function LogIn2Page() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
          <GlassboxBrand href="/login" className="self-center" />
        <LoginForm03 />
        <div className="text-center">
          <LandingContactPricingLink className="h-auto p-0 text-sm" />
        </div>
      </div>
    </div>
  )
}
