import { redirect } from "next/navigation"

export default async function OtherAssetsGroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const resolvedGroupId = decodeURIComponent(groupId)
  const canonicalGroupParam = encodeURIComponent(resolvedGroupId)
  if (groupId !== canonicalGroupParam) {
    redirect(`/other-assets/groups/${canonicalGroupParam}`)
  }
  return null
}
