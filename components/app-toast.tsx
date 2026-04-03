"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

type ToastItem = { id: number; message: string }

const ToastContext = React.createContext<(message: string) => void>(() => {})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const [mounted, setMounted] = React.useState(false)

  React.useLayoutEffect(() => {
    setMounted(true)
  }, [])

  const showToast = React.useCallback((message: string) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const stack = (
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex max-w-sm flex-col gap-2 p-2 sm:bottom-8 sm:right-8"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto rounded-xl border border-border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200"
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  )

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {mounted && typeof document !== "undefined"
        ? createPortal(stack, document.body)
        : null}
    </ToastContext.Provider>
  )
}

export function useAppToast(): (message: string) => void {
  return React.useContext(ToastContext)
}
