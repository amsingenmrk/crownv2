import { AppSidebar } from "@/components/app-sidebar"
import { AppShellEnvironmentProvider } from "@/components/app-shell-environment"
import { DemoDataBootstrap } from "@/components/demo-data-bootstrap"
import { RecentAssetTracker } from "@/components/recent-asset-tracker"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  ASSET_GROUP_SNAPSHOT_COOKIE_NAME,
  decodeAssetGroupSnapshotCookie,
} from "@/lib/asset-group-overrides"
import { cookies, headers } from "next/headers"

export default async function MainShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const initialAssetGroupOverrideSnapshot = decodeAssetGroupSnapshotCookie(
    cookieStore.get(ASSET_GROUP_SNAPSHOT_COOKIE_NAME)?.value
  )
  const initialMacLikePlatform = /Mac|iPhone|iPad|iPod/i.test(
    headerStore.get("user-agent") ?? ""
  )

  return (
    <SidebarProvider>
      <AppShellEnvironmentProvider
        initialAssetGroupOverrideSnapshot={initialAssetGroupOverrideSnapshot}
        initialMacLikePlatform={initialMacLikePlatform}
      >
        <DemoDataBootstrap />
        <RecentAssetTracker />
        <AppSidebar />
        <SidebarInset>{children}</SidebarInset>
      </AppShellEnvironmentProvider>
    </SidebarProvider>
  )
}
