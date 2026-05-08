"use client"

import * as React from "react"

type ThemeMode = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

type ThemeContextValue = {
  theme: ThemeMode
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemeMode) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

const THEME_STORAGE_KEY = "theme"

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system"
  const v = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (v === "light" || v === "dark" || v === "system") return v
  return "system"
}

function applyThemeToDocument(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  // Use class mode to match existing Tailwind dark mode config.
  root.classList.remove("light", "dark")
  root.classList.add(resolved)
  // Helps built-in form controls and the browser UI.
  root.style.colorScheme = resolved
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeMode>(() => readStoredTheme())
  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>(() => {
    const t = readStoredTheme()
    return t === "system" ? getSystemTheme() : t
  })

  const setTheme = React.useCallback((next: ThemeMode) => {
    setThemeState(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    }
    const resolved = next === "system" ? getSystemTheme() : next
    setResolvedTheme(resolved)
    applyThemeToDocument(resolved)
  }, [])

  React.useEffect(() => {
    // Ensure we apply the theme once on mount (avoids SSR mismatch + removes next-themes <script>).
    const stored = readStoredTheme()
    const resolved = stored === "system" ? getSystemTheme() : stored
    setThemeState(stored)
    setResolvedTheme(resolved)
    applyThemeToDocument(resolved)

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      setResolvedTheme((prev) => {
        const currentMode = readStoredTheme()
        if (currentMode !== "system") return prev
        const nextResolved = getSystemTheme()
        applyThemeToDocument(nextResolved)
        return nextResolved
      })
    }

    // Safari < 14 fallback
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    }
    mq.addListener(onChange)
    return () => mq.removeListener(onChange)
  }, [])

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  )

  return (
    <ThemeContext.Provider value={value}>
      <ThemeHotkey />
      {children}
    </ThemeContext.Provider>
  )
}

function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext)
  if (ctx == null) {
    // Keep this non-throwing in case a component renders outside provider in tests.
    return {
      theme: "system",
      resolvedTheme: typeof document !== "undefined" ? (document.documentElement.classList.contains("dark") ? "dark" : "light") : "light",
      setTheme: () => {},
    }
  }
  return ctx
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}

export { ThemeProvider, useTheme }
