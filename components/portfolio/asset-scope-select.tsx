"use client"

import * as React from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ASSET_GROUP_SIDEBAR_LABELS,
  BUILT_IN_ASSET_GROUP_IDS,
  resolveAssetGroupLabel,
} from "@/lib/assets"
import { setAssetGroupOverride } from "@/lib/asset-group-overrides"
import { cn } from "@/lib/utils"

type AssetScopeSelectProps = {
  assetId: string
  building: string
  groupId: string
  customGroups?: Record<string, string>
  className?: string
}

export function AssetScopeSelect({
  assetId,
  building,
  groupId,
  customGroups = {},
  className,
}: AssetScopeSelectProps) {
  const scopeOptions = React.useMemo(() => {
    const builtIn = BUILT_IN_ASSET_GROUP_IDS.map((id) => ({
      id,
      label: ASSET_GROUP_SIDEBAR_LABELS[id],
    }))
    const custom = Object.entries(customGroups)
      .map(([id, label]) => ({ id, label }))
      .sort((left, right) =>
        left.label.localeCompare(right.label, undefined, { sensitivity: "base" })
      )

    const options = [...builtIn, ...custom]
    if (options.some((option) => option.id === groupId)) {
      return options
    }

    return [
      {
        id: groupId,
        label: resolveAssetGroupLabel(groupId, customGroups),
      },
      ...options,
    ]
  }, [customGroups, groupId])

  const scopeItemLabels = React.useMemo(() => {
    return Object.fromEntries(
      scopeOptions.map((option) => [option.id, option.label])
    ) as Record<string, React.ReactNode>
  }, [scopeOptions])

  return (
    <span
      className={cn("block min-w-0 w-full max-w-full", className)}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <Select
        items={scopeItemLabels}
        value={groupId}
        onValueChange={(nextGroupId) => {
          if (
            nextGroupId == null ||
            nextGroupId === "" ||
            nextGroupId === groupId
          ) {
            return
          }
          setAssetGroupOverride(assetId, nextGroupId)
        }}
      >
        <SelectTrigger
          size="sm"
          className="w-full min-w-0 max-w-full"
          aria-label={`Portfolio scope for ${building}`}
        >
          <SelectValue
            placeholder={resolveAssetGroupLabel(groupId, customGroups)}
          />
        </SelectTrigger>
        <SelectContent>
          {scopeOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  )
}
