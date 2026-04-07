"use client"

import * as React from "react"
import { PortfolioCompareDataTable } from "@/components/portfolio/portfolio-compare-data-table"
import {
  columnForEntityKey,
  defaultCompareSlotKeys,
  entitySelectOptions,
  MAX_COMPARE_COLUMNS,
  MIN_COMPARE_COLUMNS,
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

  const [slotKeys, setSlotKeys] = React.useState(() => defaultCompareSlotKeys([]))

  React.useEffect(() => {
    const built = scenarioKey(BUILTIN_SCENARIO.slug)
    setSlotKeys((prev) => {
      let next = prev.length > 0 ? [...prev] : [PORTFOLIO_KEY]
      next = next.map((k) => (validKeys.has(k) ? k : built))
      if (next.length > MAX_COMPARE_COLUMNS) {
        next = next.slice(0, MAX_COMPARE_COLUMNS)
      }
      while (next.length < MIN_COMPARE_COLUMNS) {
        next.push(built)
      }
      const duplicateDefault =
        next.length === 3 &&
        next[0] === PORTFOLIO_KEY &&
        next[1] === built &&
        next[2] === built
      if (duplicateDefault) {
        next = defaultCompareSlotKeys(userScenarios)
        next = next.map((k) => (validKeys.has(k) ? k : built))
        if (next.length > MAX_COMPARE_COLUMNS) {
          next = next.slice(0, MAX_COMPARE_COLUMNS)
        }
        while (next.length < MIN_COMPARE_COLUMNS) {
          next.push(built)
        }
      }
      return next
    })
  }, [validKeys, userScenarios])

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

  const addCompareColumn = React.useCallback(() => {
    const built = scenarioKey(BUILTIN_SCENARIO.slug)
    setSlotKeys((prev) => {
      if (prev.length >= MAX_COMPARE_COLUMNS) return prev
      return [...prev, built]
    })
  }, [])

  const removeCompareColumn = React.useCallback((index: number) => {
    setSlotKeys((prev) => {
      if (prev.length <= MIN_COMPARE_COLUMNS) return prev
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  return (
    <div className="mb-6">
      <PortfolioCompareDataTable
        slotKeys={slotKeys}
        setSlot={setSlot}
        options={options}
        baseColumns={baseColumns}
        onAddColumn={addCompareColumn}
        onRemoveColumn={removeCompareColumn}
      />
    </div>
  )
}
