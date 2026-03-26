import { notFound } from "next/navigation"
import { AppTopbar } from "@/components/app-topbar"
import { AssetDetailHeader } from "@/components/asset-detail-header"
import { getAssetById } from "@/lib/assets"

export default async function AssetDetailLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ id: string }>
}>) {
  const { id } = await params
  if (!getAssetById(id)) {
    notFound()
  }

  return (
    <>
      <AppTopbar />
      <div className="flex min-h-0 flex-1 flex-col">
        <AssetDetailHeader />
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </>
  )
}
