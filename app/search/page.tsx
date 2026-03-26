import { AppSidebar } from "@/components/app-sidebar"
import { AppTopbar } from "@/components/app-topbar"

export default function SearchPage() {
  return (
    <div className="flex min-h-svh">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <AppTopbar />
        <main className="flex flex-1 items-center justify-center p-6">
          <p className="text-muted-foreground">Search — coming soon</p>
        </main>
      </div>
    </div>
  )
}
