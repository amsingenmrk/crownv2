"use client"

import * as React from "react"

import { useAppToast } from "@/components/app-toast"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 23 23"
      className={className}
      aria-hidden
    >
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  )
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const showToast = useAppToast()

  function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    showToast("Check your email for a sign-in link.")
    event.currentTarget.reset()
  }

  function handleMicrosoftSignIn() {
    showToast("Microsoft sign-in is not configured in this demo.")
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleEmailSubmit}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Sign in to Glassbox</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your email below to login to your account
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </Field>
        <Field>
          <Button type="submit" className="w-full">
            Continue with email
          </Button>
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field>
          <Button
            variant="outline"
            type="button"
            className="w-full"
            onClick={handleMicrosoftSignIn}
          >
            <MicrosoftIcon className="size-4" />
            Login with Microsoft
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
