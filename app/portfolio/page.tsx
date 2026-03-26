import { AppSidebar } from "@/components/app-sidebar"
import { AppTopbar } from "@/components/app-topbar"
import { HomeContent } from "@/components/home-content"

export default function PortfolioPage() {
  return (
    <div className="flex min-h-svh">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <HomeContent />
      </div>
    </div>
  )
}
