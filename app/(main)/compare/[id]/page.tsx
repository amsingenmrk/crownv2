import { CompareEditorById } from "@/components/compare-editor"

export default async function CompareByIdPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CompareEditorById id={id} />
}
