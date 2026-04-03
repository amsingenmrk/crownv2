import { AppSidebar } from "@/components/app-sidebar"
import { DemoDataBootstrap } from "@/components/demo-data-bootstrap"
import { RecentAssetTracker } from "@/components/recent-asset-tracker"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function MainShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider>
      <DemoDataBootstrap />
      <RecentAssetTracker />
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
