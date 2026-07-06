import { notFound } from "next/navigation"
import { AppTopbar } from "@/components/app-topbar"
import { AssetDetailLayoutClient } from "@/components/asset-detail-layout-client"
import { getAssetById } from "@/lib/assets"
import { getMarketListingPinById } from "@/lib/market-search-demo-listings"
import { getOtherRealAssetById } from "@/lib/real-properties/other-assets"

export default async function AssetDetailLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ id: string }>
}>) {
  const { id } = await params
  if (
    !getAssetById(id) &&
    !getMarketListingPinById(id) &&
    !getOtherRealAssetById(id)
  ) {
    notFound()
  }

  return (
    <>
      <AppTopbar />
      <AssetDetailLayoutClient assetId={id}>{children}</AssetDetailLayoutClient>
    </>
  )
}
