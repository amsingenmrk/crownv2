import { AppTopbar } from "@/components/app-topbar"
import { InactiveScenarioModificationSelectionsProvider } from "@/components/scenario-modification-selections-context"
import { OtherAssetsPageHeader } from "@/components/other-assets-page-header"
import { OtherAssetsRouteSurface } from "@/components/other-assets-route-surface"

export default function OtherAssetsLayout({
  children: _children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <InactiveScenarioModificationSelectionsProvider>
      <AppTopbar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <OtherAssetsPageHeader />
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-clip px-4 py-6 md:px-6">
          <OtherAssetsRouteSurface />
        </div>
      </div>
    </InactiveScenarioModificationSelectionsProvider>
  )
}
