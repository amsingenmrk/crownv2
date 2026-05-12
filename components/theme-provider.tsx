"use client"

import * as React from "react"
import {
  coerceThemeMode,
  resolveThemeMode,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemeMode,
} from "@/lib/theme-mode"

type ThemeContextValue = {
  theme: ThemeMode
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemeMode) => void
}

type ThemeSnapshot = {
  theme: ThemeMode
  resolvedTheme: ResolvedTheme
}

const DEFAULT_THEME_SNAPSHOT: ThemeSnapshot = {
  theme: "system",
  resolvedTheme: "light",
}

let themeSnapshot = DEFAULT_THEME_SNAPSHOT
const themeListeners = new Set<() => void>()

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light"
  return resolveThemeMode(
    "system",
    window.matchMedia("(prefers-color-scheme: dark)").matches
  )
}

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system"
  return coerceThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY))
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

function readThemeSnapshotFromEnvironment(): ThemeSnapshot {
  if (typeof window === "undefined") return DEFAULT_THEME_SNAPSHOT
  const theme = readStoredTheme()
  return {
    theme,
    resolvedTheme: theme === "system" ? getSystemTheme() : theme,
  }
}

function themeSnapshotChanged(next: ThemeSnapshot): boolean {
  return (
    themeSnapshot.theme !== next.theme ||
    themeSnapshot.resolvedTheme !== next.resolvedTheme
  )
}

function notifyThemeListeners() {
  for (const listener of themeListeners) {
    listener()
  }
}

function commitThemeSnapshot(next: ThemeSnapshot) {
  if (!themeSnapshotChanged(next)) {
    applyThemeToDocument(next.resolvedTheme)
    return
  }
  themeSnapshot = next
  applyThemeToDocument(next.resolvedTheme)
  notifyThemeListeners()
}

function syncThemeSnapshotFromEnvironment() {
  commitThemeSnapshot(readThemeSnapshotFromEnvironment())
}

function subscribeThemeStore(listener: () => void) {
  themeListeners.add(listener)
  return () => {
    themeListeners.delete(listener)
  }
}

function getThemeSnapshot(): ThemeSnapshot {
  if (typeof window === "undefined") return DEFAULT_THEME_SNAPSHOT
  const next = readThemeSnapshotFromEnvironment()
  if (themeSnapshotChanged(next)) {
    themeSnapshot = next
  }
  return themeSnapshot
}

function useTheme(): ThemeContextValue {
  const snapshot = React.useSyncExternalStore(
    subscribeThemeStore,
    getThemeSnapshot,
    () => DEFAULT_THEME_SNAPSHOT
  )

  const setTheme = React.useCallback((next: ThemeMode) => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(THEME_STORAGE_KEY, next)
    commitThemeSnapshot({
      theme: next,
      resolvedTheme: next === "system" ? getSystemTheme() : next,
    })
  }, [])

  return {
    theme: snapshot.theme,
    resolvedTheme: snapshot.resolvedTheme,
    setTheme,
  }
}

function ThemeRuntimeEffects() {
  React.useEffect(() => {
    syncThemeSnapshotFromEnvironment()

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onMediaChange = () => {
      if (readStoredTheme() !== "system") return
      syncThemeSnapshotFromEnvironment()
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key != null && event.key !== THEME_STORAGE_KEY) return
      syncThemeSnapshotFromEnvironment()
    }

    window.addEventListener("storage", onStorage)

    // Safari < 14 fallback
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onMediaChange)
    } else {
      mq.addListener(onMediaChange)
    }

    return () => {
      window.removeEventListener("storage", onStorage)
      if (typeof mq.removeEventListener === "function") {
        mq.removeEventListener("change", onMediaChange)
      } else {
        mq.removeListener(onMediaChange)
      }
    }
  }, [])

  return null
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeRuntimeEffects />
      <ThemeHotkey />
      {children}
    </>
  )
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
