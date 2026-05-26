"use client"

import Image from "next/image"

import { LandingContactPricingDialog } from "@/components/landing/landing-contact-pricing-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import * as React from "react"

export function LogInShowcasePanel({ className }: { className?: string }) {
  const [pricingOpen, setPricingOpen] = React.useState(false)

  return (
    <>
      <div
        className={cn(
          "relative hidden min-w-0 overflow-hidden bg-muted lg:flex lg:flex-col lg:justify-center",
          className
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_30%_20%,var(--color-blue-200),transparent)] dark:bg-[radial-gradient(ellipse_70%_60%_at_30%_20%,color-mix(in_oklch,var(--color-blue-600)_35%,transparent),transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-background/90 via-background/20 to-transparent"
        />

        <div className="relative flex min-w-0 flex-col gap-8 p-10 xl:p-14">
          <div className="max-w-md">
            <h2 className="text-3xl font-semibold tracking-tight text-balance xl:text-4xl">
              See your entire portfolio in one workspace
            </h2>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="mt-6"
              onClick={() => setPricingOpen(true)}
            >
              Contact for pricing
            </Button>
          </div>

          <p className="max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
            Model stacking plans, run scenarios, compare assets, and forecast
            performance over time.
          </p>

          <div className="relative w-full min-w-0 self-start">
            <div
              aria-hidden
              className="absolute -inset-4 rounded-2xl bg-primary/10 blur-2xl dark:bg-primary/20"
            />
            <figure className="relative w-full min-w-0 rotate-1 transition-transform duration-500 hover:rotate-0">
              <div className="w-full min-w-0 overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xl ring-1 ring-border/60">
                <Image
                  src="/landing-portfolio-screenshot-light.png"
                  alt="Glassbox portfolio dashboard with asset KPIs, valuation summary, and property table"
                  width={2304}
                  height={1440}
                  quality={90}
                  className="block h-auto w-full max-w-full object-contain dark:hidden"
                  sizes="(max-width: 1023px) 0px, 50vw"
                />
                <Image
                  src="/landing-portfolio-screenshot-dark.png"
                  alt="Glassbox portfolio dashboard with asset KPIs, valuation summary, and property table"
                  width={2304}
                  height={1440}
                  quality={90}
                  className="hidden h-auto w-full max-w-full object-contain dark:block"
                  sizes="(max-width: 1023px) 0px, 50vw"
                />
              </div>
              <figcaption className="sr-only">
                Glassbox portfolio dashboard preview
              </figcaption>
            </figure>
          </div>
        </div>
      </div>

      <LandingContactPricingDialog
        open={pricingOpen}
        onOpenChange={setPricingOpen}
      />
    </>
  )
}
