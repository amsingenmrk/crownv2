"use client"

import * as React from "react"

import { LandingContactForm } from "@/components/landing/landing-contact-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function LandingContactPricingDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,48rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Contact for pricing</DialogTitle>
          <DialogDescription>
            Tell us about your portfolio and we&apos;ll follow up with pricing
            and next steps.
          </DialogDescription>
        </DialogHeader>
        <LandingContactForm
          anchorId={undefined}
          onSuccess={() => onOpenChange(false)}
          submitLabel="Send message"
        />
      </DialogContent>
    </Dialog>
  )
}

export function LandingContactPricingLink({
  className,
}: {
  className?: string
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button
        type="button"
        variant="link"
        className={className}
        onClick={() => setOpen(true)}
      >
        Contact for pricing
      </Button>
      <LandingContactPricingDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
