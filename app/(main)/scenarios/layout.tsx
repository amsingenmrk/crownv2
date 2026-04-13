import { AppTopbar } from "@/components/app-topbar"
import { ScenarioPageHeader } from "@/components/scenario-page-header"

export default function ScenariosLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <AppTopbar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ScenarioPageHeader />
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 md:px-6">
          {children}
        </div>
      </div>
    </>
  )
}
