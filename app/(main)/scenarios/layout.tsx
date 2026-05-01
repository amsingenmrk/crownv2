import { AppTopbar } from "@/components/app-topbar"
import { ScenarioPageHeader } from "@/components/scenario-page-header"
import { ScenarioModificationSelectionsProvider } from "@/components/scenario-modification-selections-context"

export default function ScenariosLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ScenarioModificationSelectionsProvider>
      <AppTopbar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ScenarioPageHeader />
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 md:px-6">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </div>
      </div>
    </ScenarioModificationSelectionsProvider>
  )
}
