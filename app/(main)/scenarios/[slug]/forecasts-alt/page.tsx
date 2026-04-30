import { redirect } from "next/navigation"

export default async function ScenarioForecastsAltPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  redirect(`/scenarios/${encodeURIComponent(slug)}/forecasts`)
}
