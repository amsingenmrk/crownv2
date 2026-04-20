import { ScopedForecastsWorkspace } from "@/components/scoped-forecasts-workspace"

export default async function ScenarioForecastsAltPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  return <ScopedForecastsWorkspace scope={{ kind: "scenario", scenarioSlug: slug }} layout="alt" />
}
