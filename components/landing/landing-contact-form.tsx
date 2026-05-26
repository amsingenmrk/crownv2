"use client"

import * as React from "react"

import { useAppToast } from "@/components/app-toast"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export const LANDING_CONTACT_SECTION_ID = "contact"

const textareaClassName = cn(
  "min-h-28 w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30"
)

export function LandingContactForm({
  onSuccess,
  submitLabel = "Send message",
  anchorId = LANDING_CONTACT_SECTION_ID,
}: {
  onSuccess?: () => void
  submitLabel?: string
  /** Set to undefined when the form is not a page anchor target. */
  anchorId?: string
}) {
  const showToast = useAppToast()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    showToast("Thanks for reaching out. We'll get back to you soon.")
    event.currentTarget.reset()
    onSuccess?.()
  }

  return (
    <form
      {...(anchorId ? { id: anchorId } : {})}
      onSubmit={handleSubmit}
      className={cn(anchorId && "scroll-mt-24", "space-y-6")}
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="contact-first-name">First Name</FieldLabel>
          <Input
            id="contact-first-name"
            name="firstName"
            type="text"
            autoComplete="given-name"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="contact-last-name">Last Name</FieldLabel>
          <Input
            id="contact-last-name"
            name="lastName"
            type="text"
            autoComplete="family-name"
            required
          />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="contact-company">Company Name</FieldLabel>
        <Input
          id="contact-company"
          name="company"
          type="text"
          autoComplete="organization"
          required
        />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="contact-email">Email</FieldLabel>
          <Input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="contact-phone">Phone</FieldLabel>
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
          />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="contact-message">Message</FieldLabel>
        <textarea
          id="contact-message"
          name="message"
          className={textareaClassName}
          required
        />
      </Field>
      <Button type="submit" size="lg">
        {submitLabel}
      </Button>
    </form>
  )
}
