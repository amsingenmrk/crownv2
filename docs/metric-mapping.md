# Metric Mapping: `cbx_chatbot` -> `glassbox`

## Purpose
This document maps the metric surfaces, source fields, and legacy workflows in `cbx_chatbot` to the current and planned routes in `glassbox`.

The intended audience is the engineer implementing the migration. The goal is to answer:

- Where does each legacy metric belong in the new app?
- Which `glassbox` route or component should own it?
- What fields or model families are missing in `glassbox` today?
- Which names are safe aliases, and which are not?

## Scope
Included:

- Portfolio rollups
- Asset summary KPIs
- Rent / valuation / debt metrics
- Lease / occupancy / rollover metrics
- Floor and space metrics
- Modification / scenario metrics
- Forecast / cash-flow metrics
- Benchmark / comp-set metrics
- Report-only metric bundles

Excluded:

- Styling decisions
- API design
- Backend persistence details
- Exact UI layout beyond identifying the target route and likely component slot
- Chat-only renderers and conversational prompt artifacts

## Status Legend
- `live-slot`: a concrete destination slot already exists in `glassbox`
- `placeholder-slot`: the route/component exists, but currently renders skeleton or placeholder content
- `missing-route`: no real destination route exists yet
- `unresolved-alias`: labels appear similar, but should not be treated as equivalent without a formula-level decision

## Evidence Reviewed
Legacy metric sources in `cbx_chatbot`:

- `src/lib/constants.ts`
- `src/components/folio/LandingRefactorHome.tsx`
- `src/components/analytics/PortfolioAnalytics.tsx`
- `src/components/analytics/KpiStrip.tsx`
- `src/features/analytics/StrategiesWorkspace.tsx`
- `src/components/stacking/StackingPlanView.tsx`
- `src/components/floors/FloorMetricsView.jsx`
- `src/features/cashflow/components/IntegratedCashFlowTable.tsx`
- `src/features/cashflow/lib/calculations.ts`
- `src/components/reports/ReportsPage.tsx`
- `src/lib/reportSeedMaterializer.ts`

Target surfaces in `glassbox`:

- `components/nav-routes.tsx`
- `components/portfolio-dashboard.tsx`
- `components/asset-detail-header.tsx`
- `app/(main)/benchmarks/page.tsx`
- `app/(main)/assets/[id]/stacking-plan/page.tsx`
- `components/modifications-workspace.tsx`
- `app/(main)/assets/[id]/forecasts/page.tsx`
- `lib/assets.ts`

## Current Route Coverage
| Legacy surface | Legacy route/tab | Target `glassbox` route | Target component / slot | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Portfolio landing / map / top KPIs | `Map View`, `LandingRefactorHome` | `/portfolio` | `components/portfolio-dashboard.tsx` KPI row, map, asset table | `live-slot` | Best home for portfolio rollups and ranked opportunity metrics |
| Analytics KPI strip | `Building Modifications`, `PortfolioAnalytics`, `KpiStrip` | `/portfolio` and `/assets/[id]/modifications` | Portfolio KPI row; future asset stat cards on modifications page | `live-slot` / `placeholder-slot` | Split portfolio-level vs asset-scenario metrics instead of keeping one overloaded surface |
| Stacking plan | `View and Modify Floors & Spaces` | `/assets/[id]/stacking-plan` | `AssetStatCardsSkeleton`, `StackingPlanSkeleton` | `placeholder-slot` | Route exists but metric canvas is not implemented |
| Floor metrics | `Floor Metrics` | none directly | likely `/assets/[id]/stacking-plan` or future dedicated tab | `missing-route` | New app has no floor-metrics route today |
| Modification scenario modeling | `Building Modifications`, `StrategiesWorkspace` | `/assets/[id]/modifications` | `BuildingModificationsSidebar`, future stat cards, future scenario canvas | `placeholder-slot` | Controls exist; outputs do not |
| Forecast scenarios | `Forecast Scenarios` | `/assets/[id]/forecasts` | route exists but returns `null` | `placeholder-slot` | Best future home for forecast charts and cash-flow tables |
| Benchmarks | benchmark dropdowns, `BenchmarksLandingView` | `/benchmarks` | placeholder benchmark cards | `placeholder-slot` | Route exists, benchmark metrics not yet wired |
| Search / discovery | discovery and selection workflows | `/search` | `SearchComingSoon` map/list shell | `placeholder-slot` | Good fit for discovery metrics later |
| Reports | `ReportsPage` | none directly | future route or export/report module | `missing-route` | No reports route in current `glassbox` |

## Canonical Terminology
These terms should be normalized before implementation. Several current `glassbox` labels are not safe one-to-one aliases.

| Canonical term | Legacy labels | Current `glassbox` label(s) | Decision | Notes |
| --- | --- | --- | --- | --- |
| Predicted Rent | `Predicted Rent`, `Newmark Predicted Rent`, `Intrinsic Rent` | `Current Rent` | `unresolved-alias` | `Current Rent` should not be used unless the field truly represents achieved in-place rent |
| In-Place Rent | `In-Place Rent` | none explicit | canonical | Best label for current leased-rate rollup |
| Asking Rent | `Asking Rent` | none explicit | canonical | Only map once `avgRentAsking` or equivalent exists |
| Rent Spread: Predicted vs In-Place | `Newmark Predicted vs In-Place`, `In-place vs prediction` | `Potential Lift`, `Projected Upside` | `unresolved-alias` | Could mean rent gap, value gap, or scenario uplift; must be explicitly defined |
| Estimated Value | `Est. Value`, `Value` | `Portfolio Value` | canonical | `Portfolio Value` is a portfolio-scope rollup of estimated values |
| WALE / WALT | `WALE`, `WALT`, `Weighted Avg Lease` | none | `unresolved-alias` | Choose one canonical metric and define units and formula before wiring |
| Occupancy | `Occupancy`, `CurrentOccupancy`, `occupiedPercent` | `Avg Occupancy`, `Occupied`, `Vacant` | canonical | Portfolio uses average occupancy; asset header uses occupied/vacant split |
| Debt Yield | `Debt Yield` | none | canonical | Present in legacy model and reports; absent from current `glassbox` UI |
| NOI Margin | `NOI Margin` | none | canonical | Should remain distinct from NOI itself |

## Mapping By Metric Family

### 1. Portfolio And Asset Summary Metrics
| Canonical metric | Legacy label(s) | Legacy source fields / derivation | Legacy surfaces | Target route | Target component / slot | Proposed `glassbox` field(s) | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Portfolio Value | `Value`, `Est. Value`, `Portfolio Value` | sum of `predictedValue`; portfolio rollup uses total value | `LandingRefactorHome`, `PortfolioAnalytics` | `/portfolio` | KPI row card `Portfolio Value` | `asset.metrics.estimatedValue`, derived `portfolio.metrics.totalEstimatedValue` | `live-slot` | Existing slot is hard-coded; data model does not yet carry estimated value |
| Avg Occupancy | `Occupancy`, `Avg Occupancy` | weighted average of `occupancy` by `rentableSf` | `LandingRefactorHome`, `PortfolioAnalytics` | `/portfolio` | KPI row card `Avg Occupancy` | `asset.metrics.occupancyPct`, derived `portfolio.metrics.avgOccupancyPct` | `live-slot` | Closest current real metric in new app |
| Projected Upside | `Predicted vs In-Place`, scenario uplift metrics, rent/value lift | often derived from `wRent - wRentInPlace`, or scenario `valueDelta`, or snapshot deltas | multiple | `/portfolio` | KPI row card `Projected Upside` | `asset.metrics.projectedUpsidePct` | `unresolved-alias` | Must define whether this is rent-gap %, value-lift %, or underwriting score |
| High-Potential Building Count | opportunity count | thresholded count over upside / scenario ranking | legacy ranking and workflow lists | `/portfolio` | KPI row card `# High Potential Bldgs` | derived from `projectedUpsidePct` or recommendation score | `live-slot` | Current slot exists but formula must be chosen |
| Asset Occupancy | `Occupancy` | asset `occupancy`; portfolio table also renders it per building | `LandingRefactorHome`, analytics tables | `/portfolio` | asset table `Occupancy` column | `asset.metrics.occupancyPct` | `live-slot` | Today only `occupiedPercent` exists in `lib/assets.ts` |
| Asset Current Rent | `In-Place Rent` or possibly `Predicted Rent` depending view | asset `avgRentInPlace` or `avgRentPred` | tables and KPI strips | `/portfolio` | asset table `Current Rent` column | `asset.metrics.inPlaceRentPsf` or `asset.metrics.predictedRentPsf` | `unresolved-alias` | Rename the column once formula is chosen |
| Asset Potential Lift | rent spread or value-add uplift | `predicted - inPlace`, scenario delta, or recommendation model output | tables, comparison blocks, scenarios | `/portfolio` | asset table `Potential Lift` column and map pin intensity | `asset.metrics.potentialLiftPct` | `unresolved-alias` | Current `glassbox` implementation uses synthetic seeded values |
| Top Recommendation | recommendation / next best action | recommendation engine or scenario suggestion | landing and workflow cards | `/portfolio` | asset table `Top Recommendation` column | `asset.recommendation.primaryLabel` | `live-slot` | Not itself a metric, but should remain tied to quantified upside |
| Occupied / Vacant Split | `Occupancy`, `Vacancy` | `occupiedPercent`, `100 - occupiedPercent` | asset shell variants | `/assets/[id]/*` | `AssetDetailHeader` occupancy bar | `asset.metrics.occupancyPct`, derived `vacancyPct` | `live-slot` | Only asset-detail metric currently wired in new app |
| Estimated Value | `Est. Value` | asset `predictedValue` | KPI strips and reports | `/assets/[id]/stacking-plan` | first stat card | `asset.metrics.estimatedValue` | `placeholder-slot` | Best asset-detail top-line value card |
| NOI | `NOI` | latest or aggregated `analytics.noi[]`; fallback `revenue - expenses` | KPI strips, reports | `/assets/[id]/stacking-plan` | stat card | `asset.metrics.noiAnnual` | `placeholder-slot` | Good alongside estimated value |
| Cap Rate | `Cap Rate` | asset `capRate`; portfolio weighted by `predictedValue` | landing, analytics, scenarios | `/assets/[id]/stacking-plan` | stat card | `asset.metrics.capRatePct` | `placeholder-slot` | Often paired with NOI and value |
| WALE / WALT | `WALE`, `WALT`, `Weighted Avg Lease` | weighted average of `analytics.wale` by `rentableSf` | landing, reports, charts | `/assets/[id]/stacking-plan` | stat card or subheader chip | `asset.metrics.waleYears` or `asset.metrics.waltYears` | `placeholder-slot` | Must canonicalize before implementing |

### 2. Rent, Valuation, And Debt Metrics
| Canonical metric | Legacy label(s) | Legacy source fields / derivation | Target route | Target component / slot | Proposed `glassbox` field(s) | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Predicted Rent | `Predicted Rent`, `Newmark Predicted Rent`, `Intrinsic Rent` | asset `avgRentPred`; portfolio weighted by `rentableSf` | `/portfolio`, `/assets/[id]/stacking-plan`, `/assets/[id]/modifications` | portfolio KPI row or expanded row; asset stat card; modification summary | `predictedRentPsf` | `live-slot` / `placeholder-slot` | High-value differentiator from legacy app |
| In-Place Rent | `In-Place Rent` | asset `avgRentInPlace`; portfolio weighted by `rentableSf` | `/portfolio`, `/assets/[id]/stacking-plan`, `/assets/[id]/modifications` | table column, KPI, stat card | `inPlaceRentPsf` | `placeholder-slot` | Needed to interpret rent gap correctly |
| Asking Rent | `Asking Rent` | asset `avgRentAsking`; portfolio weighted by `rentableSf` | `/portfolio`, `/benchmarks`, `/assets/[id]/modifications` | compare panels and benchmark cards | `askingRentPsf` | `placeholder-slot` | Optional in legacy model; may need new source |
| Predicted vs In-Place | `Newmark Predicted vs In-Place`, `In-place vs prediction` | `predictedRentPsf - inPlaceRentPsf`; often also `%` over in-place | `/portfolio`, `/assets/[id]/modifications` | KPI card, map encoding, recommendation logic | `predictedVsInPlaceAbs`, `predictedVsInPlacePct` | `placeholder-slot` | Best candidate for current `Potential Lift` if no scenario engine is used |
| Predicted vs Asking | `Newmark Predicted vs Asking` | `predictedRentPsf - askingRentPsf` | `/benchmarks`, `/assets/[id]/modifications` | compare card / benchmark card | `predictedVsAskingAbs`, `predictedVsAskingPct` | `placeholder-slot` | Useful only once asking rent exists |
| In-Place vs Asking | `In-Place vs Asking` | `inPlaceRentPsf - askingRentPsf` | `/benchmarks`, `/assets/[id]/modifications` | compare card / benchmark card | `inPlaceVsAskingAbs`, `inPlaceVsAskingPct` | `placeholder-slot` | Secondary but useful for leasing context |
| Value-Add Rent Premium | `Value-Add Rent Premium` | scenario-driven rent delta relative to baseline | `/assets/[id]/modifications` | scenario KPI card | `scenario.outputs.rentPremiumPsf`, `scenario.outputs.rentPremiumPct` | `placeholder-slot` | Should stay scenario-specific, not generic portfolio KPI |
| Estimated Value | `Est. Value` | asset `predictedValue`; portfolio sum | `/portfolio`, `/assets/[id]/stacking-plan`, `/assets/[id]/modifications` | KPI card, stat card, scenario summary | `estimatedValue` | `live-slot` / `placeholder-slot` | Use same canonical field for both as-is and scenario views |
| Price / SF | `Price / SF` | `estimatedValue / rentableSf` | `/portfolio`, `/benchmarks`, `/assets/[id]/stacking-plan` | table detail, benchmark card, stat card | `pricePerSf` | `placeholder-slot` | Strong benchmark and valuation metric |
| NOI | `NOI` | latest / annualized `analytics.noi[]`; fallback `revenue - expenses` | `/portfolio`, `/assets/[id]/stacking-plan`, `/assets/[id]/forecasts` | KPI row detail, stat card, forecast chart/table | `noiAnnual`, `noiSeries[]` | `placeholder-slot` | Needs both summary and series representations |
| NOI Margin | `NOI Margin` | `incomeStatement.noi / incomeStatement.revenue * 100` | `/portfolio`, `/benchmarks` | KPI card / benchmark card | `noiMarginPct` | `placeholder-slot` | Portfolio- and compare-oriented metric |
| Cap Rate | `Cap Rate` | asset `capRate`; portfolio weighted by value | `/portfolio`, `/assets/[id]/stacking-plan`, `/benchmarks`, `/assets/[id]/forecasts` | KPI, stat card, benchmark card, forecast output | `capRatePct` | `placeholder-slot` | Keep summary metric separate from exit cap assumptions in forecasts |
| Total Debt | `Total Debt` | sum of `analytics.debt.total` | `/portfolio`, `/assets/[id]/stacking-plan`, `/benchmarks`, `/assets/[id]/forecasts` | KPI or detail card | `debt.total` | `placeholder-slot` | Legacy app treats this as core debt family |
| LTV | `LTV`, `Wtd LTV` | asset `analytics.debt.ltv`; portfolio weighted by debt total | `/portfolio`, `/benchmarks`, `/assets/[id]/forecasts` | debt KPI / benchmark card / forecast summary | `debt.ltvPct` | `placeholder-slot` | Benchmark-ready metric |
| Debt Service | `Debt Service` | sum of `analytics.debt.debtService` | `/portfolio`, `/assets/[id]/forecasts` | forecast debt summary | `debt.debtServiceAnnual` | `placeholder-slot` | Better fit in forecasts than top-level portfolio cards |
| DSCR | `DSCR` | `noiAnnual / debtServiceAnnual` | `/portfolio`, `/benchmarks`, `/assets/[id]/forecasts` | debt KPI / benchmark card / forecast summary | `debt.dscr` | `placeholder-slot` | Legacy reports already expose this clearly |
| Debt Yield | `Debt Yield` | `noiAnnual / debt.total * 100` | `/portfolio`, `/benchmarks`, `/assets/[id]/forecasts` | debt KPI / benchmark card / forecast summary | `debt.debtYieldPct` | `placeholder-slot` | Missing from current `glassbox`, valuable to preserve |

### 3. Lease, Occupancy, Floor, And Space Metrics
| Canonical metric | Legacy label(s) | Legacy source fields / derivation | Target route | Target component / slot | Proposed `glassbox` field(s) | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Rentable SF | `RSF`, `Rentable SF` | building `rentableSf`; space `rsf` | `/portfolio`, `/assets/[id]/stacking-plan` | asset table detail; stat card; stacking tooltip | `rentableSf`, `floors[].spaces[].rsf` | `placeholder-slot` | Core denominator for many portfolio metrics |
| Overall Occupancy | `Occupancy`, `Overall Occupancy` | building `occupancy`; stacking view also derives from occupied sqft / total sqft | `/assets/[id]/stacking-plan` | header bar supplement or stat card | `occupancyPct` | `live-slot` / `placeholder-slot` | Existing header already has a split bar |
| Vacancy | `Vacancy`, `Vacant` | `100 - occupancyPct` or floor vacancy | `/assets/[id]/stacking-plan` | stat card or floor legend | `vacancyPct` | `placeholder-slot` | Useful companion to occupancy |
| Lease Expiration Schedule | `Lease Expiration Schedule` | `analytics.lease.{years,g1,g2,g3,g4,other}` | `/assets/[id]/stacking-plan`, `/assets/[id]/forecasts` | chart region within stacking or forecasts | `leaseSchedule` | `placeholder-slot` | New app has no lease model yet |
| WALE / WALT Trend | `WALT Trend`, `Weighted Avg Lease` | derived from lease roll-off / `analytics.wale` | `/assets/[id]/stacking-plan`, `/assets/[id]/forecasts` | chart region | `waleYears` or `waltYears`, optional series | `placeholder-slot` | Terminology unresolved |
| Contract Rent | `ContractRate` | per-space contract rate | `/assets/[id]/stacking-plan` | space tooltip / stacked row detail | `floors[].spaces[].contractRentPsf` | `placeholder-slot` | Needed to compare against predicted / market rent |
| Space Predicted Rent | `predicted_rent`, `Predicted Rent` | `space.predicted_rent` or `CurrentPrediction.Summary.PredictedRent` | `/assets/[id]/stacking-plan` | space tooltip, floor detail, summary chip | `floors[].spaces[].predictedRentPsf` | `placeholder-slot` | High-value floor-level signal |
| Space Market Rent | `MarketRent` | market-rent fallback / prediction payloads | `/assets/[id]/stacking-plan` | space tooltip / compare overlay | `floors[].spaces[].marketRentPsf` | `placeholder-slot` | Used to compute premium |
| Rent Premium | `premium` | `(predictedRent - marketRent) / marketRent * 100` | `/assets/[id]/stacking-plan` | floor card / space tooltip | `floors[].spaces[].rentPremiumPct` | `placeholder-slot` | Strong fit for floor-level opportunity analysis |
| Floor Occupancy | `Filled`, floor occupancy | occupied sqft / floor size * 100 | `/assets/[id]/stacking-plan` | floor row chip or hover state | `floors[].occupancyPct` | `placeholder-slot` | Distinct from building-level occupancy |
| SunScore | `SunScore`, `Sun` | floor / space score; normalized 0-100 | `/assets/[id]/stacking-plan` | floor row chip, tooltip, legend | `floors[].sunScore` | `placeholder-slot` | No direct route today, stacking is best fit |
| ViewScore | `ViewScore`, `View` | floor / space score; normalized 0-100 | `/assets/[id]/stacking-plan` | floor row chip, tooltip, legend | `floors[].viewScore` | `placeholder-slot` | Same as above |
| AccessScore | `AccessScore` | building / floor access score; normalized 0-100 | `/portfolio`, `/assets/[id]/stacking-plan` | asset detail metadata, score chips, report bundle | `metrics.accessScore` | `placeholder-slot` | Legacy constant exists; no target UI yet |
| Intrinsic Value | `Intrinsic Value` | legacy floor metric mode; synthetic/generated in some places | `/assets/[id]/stacking-plan` | optional floor metric mode or overlay | `floors[].intrinsicValuePct` or `floors[].intrinsicScore` | `missing-route` | If not creating a separate floor-metrics route, fold into stacking |
| Time to Lease | `timeToLease`, `buildingTimeToLease` | per-space or forecast assumption | `/assets/[id]/stacking-plan`, `/assets/[id]/forecasts` | tooltip or forecast assumptions panel | `floors[].spaces[].timeToLeaseMonths` | `placeholder-slot` | Relevant to stacking and forecasts |
| Renewal Probability | `renewalProbability`, `defaultRenewalProbability` | per-space or forecast assumption | `/assets/[id]/stacking-plan`, `/assets/[id]/forecasts` | assumptions panel / tooltip | `floors[].spaces[].renewalProbabilityPct` | `placeholder-slot` | Useful for rollover and forecasting |
| Buildout | `buildout`, `Shell`, `White Box`, `Fully Built-Out` | per-space assumption | `/assets/[id]/stacking-plan`, `/assets/[id]/modifications` | space detail or modification assumptions | `floors[].spaces[].buildoutType` | `placeholder-slot` | Important if space planning remains in scope |

#### Floor Metric Banding And Display Semantics
These are not separate KPIs, but they are implementation-relevant because the legacy product treats the metric thresholds as part of the meaning of the surface.

| Metric mode | Legacy semantics | Suggested `glassbox` handling | Notes |
| --- | --- | --- | --- |
| `SunScore` | score bands of `0-33`, `34-66`, `67-100` | preserve as explicit legend metadata on floor views | These bands are part of the visual interpretation, not just color choices |
| `ViewScore` | score bands of `0-33`, `34-66`, `67-100` | preserve as explicit legend metadata on floor views | Same threshold model as `SunScore` |
| `Intrinsic Value` | bands of `<= -20%`, `-10-20%`, `-5-10%`, `±5%`, `+5-10%`, `+10-20%`, `>= 20%` | preserve as threshold metadata if folded into `Stacking Plan` | Important because legacy views treat this as a tiered floor-value lens |
| `Occupancy` floor series | charted on a `0-100%` y-axis | keep as raw per-floor `%` values | Should not inherit intrinsic-value thresholds |
| `Vacancy` floor series | charted on a `0-100%` y-axis | keep as raw per-floor `%` values | Same as occupancy, but inverse operational meaning |
| Occupancy / vacancy legend behavior | current `FloorMetricsView` reuses intrinsic-style legend items for `occupancy` and `vacancy` | do not treat the reused intrinsic legend as canonical | This looks like a presentational shortcut, not a true business threshold model |

### 4. Modification And Scenario Metrics
| Canonical metric | Legacy label(s) | Legacy source fields / derivation | Target route | Target component / slot | Proposed `glassbox` field(s) | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Scenario Inputs: Converted Area | `Amenity area (% of RSF)`, `Cafe footprint (% of RSF)` | `convertedAreaPct` | `/assets/[id]/modifications` | sidebar inputs or advanced assumptions drawer | `scenario.inputs.convertedAreaPct` | `placeholder-slot` | Existing new sidebar only stores categorical choices |
| Scenario Inputs: Build Cost / SF | `Build cost / SF` | `buildCostPerSf` | `/assets/[id]/modifications` | assumptions panel | `scenario.inputs.buildCostPerSf` | `placeholder-slot` | Needed to compute capex |
| Scenario Inputs: Rent Premium / SF | `Annual rent premium / SF` | `rentPremiumPerSf` | `/assets/[id]/modifications` | assumptions panel | `scenario.inputs.rentPremiumPerSf` | `placeholder-slot` | Primary rent-lift lever |
| Scenario Inputs: Occupancy Lift | `Occupancy lift (pts)` | `occupancyLiftPts` | `/assets/[id]/modifications` | assumptions panel | `scenario.inputs.occupancyLiftPts` | `placeholder-slot` | Needed for modeled value and NOI change |
| Scenario Inputs: Annual Opex | `Annual operating cost` | `annualOpex` | `/assets/[id]/modifications` | assumptions panel | `scenario.inputs.annualOpex` | `placeholder-slot` | Drives opex impact |
| Scenario Inputs: Stabilization Months | `Stabilization period (months)` | `stabilizationMonths` | `/assets/[id]/modifications` | assumptions panel | `scenario.inputs.stabilizationMonths` | `placeholder-slot` | Useful for forecast handoff |
| Headline New Avg Rent | `Average Rent Lift`, `New Avg Rent` | scenario headline card uses adjusted `wRent` plus delta vs baseline | `/assets/[id]/modifications` | headline KPI card | `scenario.outputs.newPredictedRentPsf`, `scenario.outputs.effectiveRentLiftPsf`, `scenario.outputs.effectiveRentLiftPct` | `placeholder-slot` | This is a packaged scenario headline, not just the generic rent metric reused elsewhere |
| Headline New Value | `Building Value Lift`, `New Value` | scenario headline card uses adjusted `totalValue` plus delta vs baseline | `/assets/[id]/modifications` | headline KPI card | `scenario.outputs.newEstimatedValue`, `scenario.outputs.valueDelta`, `scenario.outputs.valueDeltaPct` | `placeholder-slot` | Should be preserved as a first-class scenario summary card |
| Opex Impact | `Opex Impact` | user-facing scenario summary metric; legacy surfaces also derive it from expense lift or compare deltas | `/assets/[id]/modifications` | KPI card | `scenario.outputs.opexImpactAnnual`, optional `scenario.outputs.opexImpactPct` | `placeholder-slot` | Define whether this is annual dollars, percent, or both |
| Capex | `Expected Cost`, `capex` | derived from area * build cost plus financing logic | `/assets/[id]/modifications` | KPI card or summary panel | `scenario.outputs.capex` | `placeholder-slot` | Strong candidate for one of the four stat cards |
| Annual Revenue Lift | `annualRevenueLift` | scenario engine output | `/assets/[id]/modifications` | secondary summary card or detail panel | `scenario.outputs.annualRevenueLift` | `placeholder-slot` | Best kept in a detail panel if top cards are limited |
| Annual Expense Lift | `Annual Operating Expense Impact`, `annualExpenseLift` | scenario engine output | `/assets/[id]/modifications` | KPI card or detail row | `scenario.outputs.annualExpenseLift` | `placeholder-slot` | Distinct from total capex |
| Annual NOI Delta | `NOI Impact`, `annualNoiDelta` | revenue lift minus expense lift | `/assets/[id]/modifications` | KPI card | `scenario.outputs.annualNoiDelta` | `placeholder-slot` | High-signal scenario output |
| Value Delta | `Building Value Impact`, `Building Value Lift`, `valueDelta` | modeled from NOI delta and cap-rate context | `/assets/[id]/modifications` | KPI card | `scenario.outputs.valueDelta`, `scenario.outputs.valueDeltaPct` | `placeholder-slot` | Likely best candidate for current `Potential Lift` on scenario pages |
| Effective Rent Lift | `Average Rent Lift`, `effectiveRentLift` | modeled scenario rent uplift | `/assets/[id]/modifications` | KPI card | `scenario.outputs.effectiveRentLiftPsf`, `scenario.outputs.effectiveRentLiftPct` | `placeholder-slot` | High-value scenario headline |
| Effective Occupancy Lift | `effectiveOccLift` | modeled occupancy change | `/assets/[id]/modifications` | detail chip or KPI | `scenario.outputs.effectiveOccLiftPts` | `placeholder-slot` | Useful but may not make top 4 cards |
| Combine / Divide Selected Spaces | `selectedSpaceCount` | operation count in combine/divide modeling | `/assets/[id]/modifications` | operation summary panel | `scenario.outputs.selectedSpaceCount` | `placeholder-slot` | Useful if the modifications route exposes space-planning variants |
| Combine / Divide Selected SF | `totalSelectedRsf` | selected rentable SF in combine/divide workflow | `/assets/[id]/modifications` | operation summary panel | `scenario.outputs.totalSelectedSf` | `placeholder-slot` | Important denominator for combine/divide impact |
| Combine / Divide Configured Rent | `weightedConfiguredRent` | weighted configured rent for selected space operations | `/assets/[id]/modifications` | operation summary panel | `scenario.outputs.weightedConfiguredRentPsf` | `placeholder-slot` | Relevant to space-planning implementations |
| Combine / Divide Subdivision Count | `subdivisionCount` | number of subdivided operations in scenario state | `/assets/[id]/modifications` | operation summary panel | `scenario.outputs.subdivisionCount` | `placeholder-slot` | Operational metric, not a top-line KPI |
| Snapshot Compare Deltas | `rentLiftPct`, `valueLiftPct`, `opexLiftPct`, `capRateBps` | saved snapshot compare object | `/assets/[id]/modifications` | compare drawer or snapshot list | `scenario.compare.*` | `placeholder-slot` | Useful if saved presets become more than categorical options |

### 5. Forecast And Cash-Flow Metrics
| Canonical metric | Legacy label(s) | Legacy source fields / derivation | Target route | Target component / slot | Proposed `glassbox` field(s) | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mark to Market Enabled | `markToMarketEnabled` | forecast toolbar assumption | `/assets/[id]/forecasts` | assumptions toolbar | `forecast.assumptions.markToMarketEnabled` | `placeholder-slot` | Route is empty today |
| Building Time to Lease | `buildingTimeToLease` | forecast assumption | `/assets/[id]/forecasts` | assumptions toolbar | `forecast.assumptions.timeToLeaseMonths` | `placeholder-slot` | Also relevant to stacking |
| Occupancy Target | `occupancyTargetPct` | forecast assumption | `/assets/[id]/forecasts` | assumptions toolbar | `forecast.assumptions.occupancyTargetPct` | `placeholder-slot` | Needed for scenario explainability |
| Default Renewal Probability | `defaultRenewalProbability` | forecast assumption | `/assets/[id]/forecasts` | assumptions toolbar | `forecast.assumptions.defaultRenewalProbabilityPct` | `placeholder-slot` | Drives rollover math |
| Gross Revenue | `Gross Revenue`, `income` | derived quarter-level forecast output | `/assets/[id]/forecasts` | cash-flow table and line chart | `forecast.series.revenue[]` | `placeholder-slot` | First-class forecast metric in legacy app |
| OpEx | `OpEx`, `opex` | derived quarter-level forecast output | `/assets/[id]/forecasts` | cash-flow table and line chart | `forecast.series.opex[]` | `placeholder-slot` | Companion to revenue and NOI |
| NOI | `NOI`, `noi` | `income - opex` per period | `/assets/[id]/forecasts` | cash-flow table and line chart | `forecast.series.noi[]` | `placeholder-slot` | Distinct from static annual NOI summary |
| Capex | `capex` | scenario-adjusted cash-flow output | `/assets/[id]/forecasts` | forecast table detail row | `forecast.series.capex[]` | `placeholder-slot` | Useful if forecast route also absorbs scenario math |
| FCF | `fcf` | `noi - capex` | `/assets/[id]/forecasts` | forecast table / chart | `forecast.series.fcf[]` | `placeholder-slot` | Not always shown in old top line, still worth preserving |
| Sale Price | `Sale Price` | legacy prototype often uses `annualizedNoi / 5.5%` | `/assets/[id]/forecasts` | cash-flow table / summary card | `forecast.series.salePrice[]` | `placeholder-slot` | Keep formula configurable if implementation goes beyond prototype |
| Exit Cap Rate | `Cap Rate` in forecast tables | legacy prototype uses `5.5%` constant | `/assets/[id]/forecasts` | cash-flow table / assumptions | `forecast.assumptions.exitCapRatePct` | `placeholder-slot` | Distinguish from current operating cap rate |
| Scenario Effects | occupancy, inflation, treasury shocks | `occupancyFactor`, `rentFactor`, `opexFactor` | `/assets/[id]/forecasts` | scenario selector / detail panel | `forecast.scenarioEffects.*` | `placeholder-slot` | Optional implementation detail, but useful for traceability |
| Portfolio Forecast Rollup | portfolio cash-flow summary | building-row rollups of the same metrics | `/portfolio` or future portfolio forecast route | expanded row or future route | `portfolio.forecast.*` | `missing-route` | Current new app has no portfolio forecast surface |

### 6. Benchmark And Competitive Set Metrics
| Canonical metric | Legacy label(s) | Legacy source fields / derivation | Target route | Target component / slot | Proposed `glassbox` field(s) | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Benchmark Occupancy | `Occ`, `Occupancy` | benchmark `wOcc` | `/benchmarks` | placeholder benchmark cards | `benchmark.metrics.occupancyPct` | `placeholder-slot` | Direct fit |
| Benchmark Predicted Rent | `Rent`, `Predicted Rent` | benchmark `wRent` | `/benchmarks` | placeholder card | `benchmark.metrics.predictedRentPsf` | `placeholder-slot` | Direct fit |
| Benchmark Cap Rate | `Cap` | benchmark `wCap` | `/benchmarks` | placeholder card | `benchmark.metrics.capRatePct` | `placeholder-slot` | Direct fit |
| Benchmark In-Place Rent | `wRentInPlace` | benchmark object field | `/benchmarks` | compare card | `benchmark.metrics.inPlaceRentPsf` | `placeholder-slot` | Useful for rent-gap views |
| Benchmark Value | `totalValue` | benchmark object field | `/benchmarks` | compare card | `benchmark.metrics.estimatedValue` | `placeholder-slot` | Useful once compare view deepens |
| Benchmark WALE / WALT | `wale` | benchmark object field | `/benchmarks` | compare card | `benchmark.metrics.waleYears` | `placeholder-slot` | Depends on terminology decision |
| Benchmark NOI | `noi` | benchmark object field | `/benchmarks` | compare card | `benchmark.metrics.noiAnnual` | `placeholder-slot` | Strong compare signal |
| Benchmark Debt Metrics | `debt.total`, `debt.ltv`, `debt.debtService`, `debt.dscr`, `debt.debtYield` | benchmark object fields | `/benchmarks` | benchmark cards or compare table | `benchmark.metrics.debt.*` | `placeholder-slot` | Current page shape can support 6 cards immediately |
| Competitive Set Asset Count | `assets selected` | selection count | `/benchmarks` or `/search` | comp-set summary region | `competitiveSet.assetCount` | `placeholder-slot` | More workflow than metric, but still useful |
| Competitive Set Selected SF | `total selected SF` | selected building `rentableSf` sum | `/benchmarks` or `/search` | comp-set summary region | `competitiveSet.totalSelectedSf` | `placeholder-slot` | Useful contextual metric |
| Competitive Set Member Occupancy | `% occ` collector chip | selected building `occupancy` displayed per member in collector | `/benchmarks` or `/search` | comp-set member chip / compare list row | `competitiveSet.members[].occupancyPct` | `placeholder-slot` | Useful at selection time even if not part of top-level benchmark cards |

### 7. Compact Browse And Collector Metrics
These are smaller browse-level metrics rather than headline analytics, but they still matter because they shape navigation, triage, and shortlist-building behavior.

| Metric | Legacy surface | Legacy fields / derivation | Target route | Target component / slot | Proposed `glassbox` field(s) | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Compact RSF | `AssetCard` | `building.rentableSf` shown as `RSF` | `/portfolio`, `/search` | asset browse card or compact row | `asset.metrics.rentableSf` | `placeholder-slot` | Good for card-based browse surfaces |
| Compact Rent | `AssetCard` | `building.avgRentPred` shown as compact `Rent` | `/portfolio`, `/search` | asset browse card or compact row | `asset.metrics.predictedRentPsf` | `placeholder-slot` | Legacy compact card uses predicted rent, not explicitly in-place rent |
| Compact Occupancy | `AssetCard` | `building.occupancy` shown as `Occ.` | `/portfolio`, `/search` | asset browse card or compact row | `asset.metrics.occupancyPct` | `placeholder-slot` | Small but important browse filter signal |
| Scenario NOI Badge | `AssetCard` scenario row | `scenario.noiImpactPct` shown as `NOI +/- %` badge when non-baseline scenario is active | `/portfolio`, `/assets/[id]/modifications` | scenario chip on cards or snapshot rows | `scenario.outputs.noiImpactPct` | `placeholder-slot` | Useful for quick scenario comparisons without opening detail views |

### 8. Report-Only Metric Bundles
These bundles are first-class in `cbx_chatbot`, but there is no direct reports route in `glassbox` yet.

| Report bundle | Legacy fields | Best target in `glassbox` | Status | Notes |
| --- | --- | --- | --- | --- |
| Executive KPI row | `Occupancy`, `Avg Rent`, `NOI`, `WALT` | future `/reports` route or export module; partial reuse in `/portfolio` and `/assets/[id]/stacking-plan` | `missing-route` | Do not force the whole bundle into one existing page |
| NOI Trend chart | `analytics.noi[]` | `/assets/[id]/forecasts` | `placeholder-slot` | Best future chart for the forecasts route |
| Rent comparison chart | `inPlace`, `intrinsic`, `asking` | `/benchmarks` or `/assets/[id]/modifications` | `placeholder-slot` | Good compare view once all three rents exist |
| Debt summary table | `DSCR`, `Debt Yield`, `LTV`, `Total Debt` | `/benchmarks` and `/assets/[id]/forecasts` | `placeholder-slot` | Strong candidate for benchmark and forecast pages |
| Lease chart | `lease.years`, `g1..g4`, `other` | `/assets/[id]/stacking-plan` or `/assets/[id]/forecasts` | `placeholder-slot` | Depends on whether lease risk lives more in stacking or forecasts |
| Tenant mix table | `analytics.tenantMix[]` | future asset detail subview or reports route | `missing-route` | No obvious slot in current `glassbox` IA |
| ESG / score radar | synthetic `Energy Star`, `GRESB`, `Renewable`, `Waste Diversion`, `Water Efficiency` from `sunScore`, `viewScore`, `accessibilityScore` | future reports route or asset score panel | `missing-route` | Current app has no reporting or ESG surface |

#### Structured Report Metrics
These are the specific report-table and report-chart payloads that should be preserved if report parity matters later.

| Structured metric set | Legacy fields | Best target in `glassbox` | Status | Notes |
| --- | --- | --- | --- | --- |
| Tenant mix rows | `tenantMix[].name`, `tenantMix[].pct`; displayed as `Tenant`, `% Space`, `Share` | future reports route or asset-detail tenant subview | `missing-route` | The rendered table shape matters, not just the raw array |
| Debt summary rows | `metrics[].{ label, value, benchmark, status }` for `DSCR`, `Debt Yield`, `LTV`, `Total Debt` | `/benchmarks`, `/assets/[id]/forecasts`, future reports route | `placeholder-slot` | Legacy reports preserve benchmark and status alongside value |
| Lease-grade schedule | `lease.{ years, g1, g2, g3, g4, other }`; rendered with grade rows and `Total` | `/assets/[id]/stacking-plan`, `/assets/[id]/forecasts`, future reports route | `placeholder-slot` | Preserve the grade-bucket structure, not just a flattened lease count |
| ESG axis scores | `{ label, value }[]` for `Energy Star`, `GRESB`, `Renewable`, `Waste Diversion`, `Water Efficiency` | future reports route or asset score panel | `missing-route` | Legacy report output treats these as named axes, not one composite ESG score |
| Rent-comparison triplet | `inPlace`, `intrinsic`, `asking` | `/benchmarks`, `/assets/[id]/modifications`, future reports route | `placeholder-slot` | Useful whenever report parity or recommendation-basis views matter |

## Proposed `glassbox` Data Model Extensions
Current `glassbox/lib/assets.ts` only includes:

- `id`
- `name`
- `groupId`
- `groupLabel`
- `address`
- `imageUrl`
- `occupiedPercent`

That is not sufficient for the legacy metric model. The least disruptive migration path is to keep `Asset` lean for navigation and add optional metric families.

### Recommended Summary Types
```ts
type AssetGroupId = "office" | "industrial" | "retail"

interface Asset {
  id: string
  name: string
  groupId: AssetGroupId
  groupLabel: string
  address: string
  imageUrl: string
  occupiedPercent: number
  metrics?: AssetMetricsSummary
  floors?: FloorMetrics[]
  benchmark?: BenchmarkComparison
}

interface AssetMetricsSummary {
  rentableSf?: number
  occupancyPct?: number
  vacancyPct?: number
  predictedRentPsf?: number
  inPlaceRentPsf?: number
  askingRentPsf?: number
  predictedVsInPlaceAbs?: number
  predictedVsInPlacePct?: number
  predictedVsAskingAbs?: number
  predictedVsAskingPct?: number
  inPlaceVsAskingAbs?: number
  inPlaceVsAskingPct?: number
  estimatedValue?: number
  pricePerSf?: number
  noiAnnual?: number
  noiMarginPct?: number
  capRatePct?: number
  waleYears?: number
  debt?: {
    total?: number
    ltvPct?: number
    debtServiceAnnual?: number
    dscr?: number
    debtYieldPct?: number
  }
  projectedUpsidePct?: number
  recommendationLabel?: string
  accessScore?: number
}

interface FloorMetrics {
  id: string
  floorLabel: string
  floorSizeSf?: number
  occupancyPct?: number
  vacancyPct?: number
  sunScore?: number
  viewScore?: number
  intrinsicValuePct?: number
  leaseRollYears?: number
  spaces?: SpaceMetrics[]
}

interface SpaceMetrics {
  id: string
  suite: string
  rsf: number
  contractRentPsf?: number
  predictedRentPsf?: number
  marketRentPsf?: number
  rentPremiumPct?: number
  leaseStart?: string | null
  leaseExpiration?: string | null
  timeToLeaseMonths?: number
  renewalProbabilityPct?: number
  buildoutType?: "shell" | "white_box" | "fully_built"
}

interface ModificationScenario {
  id: string
  name: string
  inputs: {
    convertedAreaPct?: number
    buildCostPerSf?: number
    rentPremiumPerSf?: number
    occupancyLiftPts?: number
    annualOpex?: number
    stabilizationMonths?: number
  }
  outputs: {
    capex?: number
    annualRevenueLift?: number
    annualExpenseLift?: number
    annualNoiDelta?: number
    valueDelta?: number
    valueDeltaPct?: number
    effectiveRentLiftPsf?: number
    effectiveRentLiftPct?: number
    effectiveOccLiftPts?: number
  }
}

interface ForecastMetrics {
  assumptions?: {
    markToMarketEnabled?: boolean
    timeToLeaseMonths?: number
    occupancyTargetPct?: number
    defaultRenewalProbabilityPct?: number
    exitCapRatePct?: number
  }
  series?: {
    revenue?: Array<{ period: string; value: number }>
    opex?: Array<{ period: string; value: number }>
    noi?: Array<{ period: string; value: number }>
    capex?: Array<{ period: string; value: number }>
    fcf?: Array<{ period: string; value: number }>
    salePrice?: Array<{ period: string; value: number }>
  }
}

interface BenchmarkComparison {
  benchmarkId?: string
  benchmarkLabel?: string
  metrics?: AssetMetricsSummary
}
```

### Migration Notes
- Keep all new metric fields optional initially so the current static `ASSETS` seed can continue to compile.
- Do not reuse formatted strings for numeric metrics. Current `PortfolioDashboard` stores rent and lift as strings, which is fine for mock data but not for real analytics.
- Introduce raw numeric fields first, then derive display strings in UI components.
- Compact browse cards and competitive-set collectors can reuse the same summary fields; they do not need a separate card-only metric model.
- Report tables require richer structured payloads than a flat KPI summary, especially for tenant mix, debt rows with benchmarks/status, lease-grade schedules, and ESG axis lists.
- Floor metric legends should preserve threshold metadata explicitly rather than inferring meaning from color alone.

## Missing Or Placeholder Destinations
| Metric family | Expected target route | Current state in `glassbox` | Impact | Recommendation |
| --- | --- | --- | --- | --- |
| Asset top-line KPI set | `/assets/[id]/stacking-plan` | four stat cards are skeleton-only | blocks most asset-detail analytics | implement summary metric card component first |
| Scenario outputs | `/assets/[id]/modifications` | controls exist; outputs are placeholder | prevents value of modification workflow | add scenario output model and stat cards immediately after stacking summary |
| Forecast metrics | `/assets/[id]/forecasts` | route returns `null` | no destination for cash-flow migration | implement route shell and one chart + one table first |
| Benchmark metrics | `/benchmarks` | six placeholder cards | no destination for compare metrics | replace placeholders with benchmark summary cards |
| Floor metrics | none | no route/tab | no direct destination for `SunScore`, `ViewScore`, `Intrinsic Value` modes | fold into stacking plan before considering a new route |
| Reports | none | no route | report bundles have nowhere to live | treat as separate phase; do not hide report bundles inside unrelated pages |

## Recommended Implementation Order
1. Extend `lib/assets.ts` or add adjacent view-model types for raw numeric metric fields.
2. Replace the synthetic portfolio KPI data in `components/portfolio-dashboard.tsx` with real summary rollups.
3. Implement asset summary stat cards in `/assets/[id]/stacking-plan`.
4. Add scenario output cards to `/assets/[id]/modifications`, reusing the same summary metric model plus scenario outputs.
5. Implement `/benchmarks` with summary benchmark cards and compare deltas.
6. Implement `/assets/[id]/forecasts` with one chart family and one table family from the cash-flow model.
7. Add report bundles only after the main route-level metric migration is stable.

## Open Decisions Before Implementation
- Decide whether `Potential Lift` and `Projected Upside` mean:
  - predicted-vs-in-place rent gap,
  - scenario value uplift,
  - or a broader recommendation score.
- Choose one canonical lease-duration term:
  - `WALE`
  - or `WALT`
- Decide whether `Current Rent` in `glassbox` becomes:
  - `In-Place Rent`
  - or `Predicted Rent`
- Decide whether floor metrics remain standalone or are absorbed into `Stacking Plan`.
- Decide whether report bundles require a dedicated route in `glassbox` or a later export module.

## Bottom Line
The `glassbox` information architecture is already good enough to host most of the legacy metric model. The main gaps are not navigation gaps; they are:

- terminology gaps,
- missing destination implementations,
- and a very thin current asset data model.

The cleanest migration is:

- portfolio rollups -> `/portfolio`
- asset / floor / lease metrics -> `/assets/[id]/stacking-plan`
- scenario outputs -> `/assets/[id]/modifications`
- cash-flow outputs -> `/assets/[id]/forecasts`
- benchmark deltas -> `/benchmarks`
- report bundles -> future dedicated reports surface
