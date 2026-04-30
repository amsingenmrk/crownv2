import { redirect } from "next/navigation"

export default async function AssetIndexPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/assets/${id}/stacking-plan`)
}
