import { notFound } from "next/navigation"

import { AppTopbar } from "@/components/app-topbar"
import { PropertyDetailHeader } from "@/components/property-detail-header"
import { getMarketListingPinById } from "@/lib/market-search-demo-listings"

export default async function PropertyDetailLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ id: string }>
}>) {
  const { id } = await params
  if (!getMarketListingPinById(id)) {
    notFound()
  }

  return (
    <>
      <AppTopbar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PropertyDetailHeader />
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto px-6 py-6">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </div>
      </div>
    </>
  )
}

