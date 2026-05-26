"use client"

import { GlassboxBrand } from "@/components/landing/glassbox-brand"
import { LogInShowcasePanel } from "@/components/landing/log-in-showcase-panel"
import { LoginForm } from "@/components/login-form"

export function LogInPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center md:justify-start">
          <GlassboxBrand href="/login" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <LogInShowcasePanel />
    </div>
  )
}
