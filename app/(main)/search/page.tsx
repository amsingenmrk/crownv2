import { AppTopbar } from "@/components/app-topbar"
import { SearchComingSoon } from "@/components/search-coming-soon"

export default function SearchPage() {
  return (
    <>
      <AppTopbar />
      <div className="flex min-h-0 flex-1 flex-col">
        <SearchComingSoon />
      </div>
    </>
  )
}
