import { redirect } from "next/navigation"

export default async function PropertyIndexPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/properties/${encodeURIComponent(id)}/stacking-plan`)
}

