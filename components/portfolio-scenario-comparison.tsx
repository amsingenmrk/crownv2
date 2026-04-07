"use client"

import * as React from "react"
import { PortfolioCompareDataTable } from "@/components/portfolio/portfolio-compare-data-table"
import {
  columnForEntityKey,
  COMPARE_SLOT_COUNT,
  entitySelectOptions,
  PORTFOLIO_KEY,
  scenarioKey,
} from "@/lib/portfolio-compare-model"
import {
  BUILTIN_SCENARIO,
  getUserScenariosStoreSnapshot,
  subscribeUserScenarios,
  USER_SCENARIOS_SERVER_SNAPSHOT,
} from "@/lib/user-scenarios"

export function PortfolioScenarioComparison() {
  const userScenarios = React.useSyncExternalStore(
    subscribeUserScenarios,
    getUserScenariosStoreSnapshot,
    () => USER_SCENARIOS_SERVER_SNAPSHOT
  )

  const validKeys = React.useMemo(() => {
    return new Set(entitySelectOptions(userScenarios).map((o) => o.value))
  }, [userScenarios])

  const [slotKeys, setSlotKeys] = React.useState<string[]>(() => [
    PORTFOLIO_KEY,
    scenarioKey(BUILTIN_SCENARIO.slug),
    scenarioKey(BUILTIN_SCENARIO.slug),
  ])

  const [modificationsOn, setModificationsOn] = React.useState<boolean[]>(() =>
    Array.from({ length: COMPARE_SLOT_COUNT }, () => true)
  )

  React.useEffect(() => {
    setSlotKeys((prev) => {
      const next = prev.map((k) => (validKeys.has(k) ? k : PORTFOLIO_KEY))
      while (next.length < COMPARE_SLOT_COUNT) {
        next.push(scenarioKey(BUILTIN_SCENARIO.slug))
      }
      if (next.length > COMPARE_SLOT_COUNT) {
        return next.slice(0, COMPARE_SLOT_COUNT)
      }
      return next
    })
  }, [validKeys])

  const options = React.useMemo(
    () => entitySelectOptions(userScenarios),
    [userScenarios]
  )

  const baseColumns = React.useMemo(
    () => slotKeys.map((key) => columnForEntityKey(key, userScenarios)),
    [slotKeys, userScenarios]
  )

  const setSlot = React.useCallback((index: number, value: string) => {
    setSlotKeys((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }, [])

  const setModificationsOnAt = React.useCallback(
    (index: number, on: boolean) => {
      setModificationsOn((prev) => {
        const next = [...prev]
        next[index] = on
        return next
      })
    },
    []
  )

  return (
    <div className="mb-6">
      <PortfolioCompareDataTable
        slotKeys={slotKeys}
        setSlot={setSlot}
        options={options}
        modificationsOn={modificationsOn}
        setModificationsOnAt={setModificationsOnAt}
        baseColumns={baseColumns}
      />
    </div>
  )
}
