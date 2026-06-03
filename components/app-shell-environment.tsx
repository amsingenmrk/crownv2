"use client"

import * as React from "react"

type AppShellEnvironmentValue = {
  initialAssetGroupOverrideSnapshot: string
  initialMacLikePlatform: boolean
}

const DEFAULT_ENVIRONMENT: AppShellEnvironmentValue = {
  initialAssetGroupOverrideSnapshot: "",
  initialMacLikePlatform: false,
}

const AppShellEnvironmentContext =
  React.createContext<AppShellEnvironmentValue>(DEFAULT_ENVIRONMENT)

export function AppShellEnvironmentProvider({
  initialAssetGroupOverrideSnapshot = "",
  initialMacLikePlatform = false,
  children,
}: React.PropsWithChildren<Partial<AppShellEnvironmentValue>>) {
  const value = React.useMemo(
    () => ({
      initialAssetGroupOverrideSnapshot,
      initialMacLikePlatform,
    }),
    [initialAssetGroupOverrideSnapshot, initialMacLikePlatform]
  )

  return (
    <AppShellEnvironmentContext.Provider value={value}>
      {children}
    </AppShellEnvironmentContext.Provider>
  )
}

export function useInitialAssetGroupOverrideSnapshot(): string {
  return React.useContext(AppShellEnvironmentContext)
    .initialAssetGroupOverrideSnapshot
}

export function useInitialMacLikePlatform(): boolean {
  return React.useContext(AppShellEnvironmentContext).initialMacLikePlatform
}
