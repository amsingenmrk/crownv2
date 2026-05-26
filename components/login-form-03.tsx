"use client"

import * as React from "react"

import { useAppToast } from "@/components/app-toast"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

export function LoginForm03({
  className,
  ...props
}: React.ComponentProps<"div">) {
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
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="gap-6 py-6">
        <CardHeader className="px-6 text-center">
          <CardTitle className="text-xl">Sign in to Glassbox</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <form onSubmit={handleEmailSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="login2-email">Email</FieldLabel>
                <Input
                  id="login2-email"
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
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator>
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
        </CardContent>
      </Card>
    </div>
  )
}
