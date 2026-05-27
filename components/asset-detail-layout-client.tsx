"use client"

import { AssetDetailHeader } from "@/components/asset-detail-header"
import { AssetLeasingAssumptionsProvider } from "@/components/asset-leasing-assumptions-provider"

export function AssetDetailLayoutClient({
  assetId,
  children,
}: {
  assetId: string
  children: React.ReactNode
}) {
  return (
    <AssetLeasingAssumptionsProvider assetId={assetId}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AssetDetailHeader />
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto px-6 py-6">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </div>
      </div>
    </AssetLeasingAssumptionsProvider>
  )
}
