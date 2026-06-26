"use client"

import * as React from "react"
import {
  BriefcaseBusiness,
  MapPin,
  Plus,
  RefreshCw,
  UploadCloud,
} from "lucide-react"

import { useInitialAssetGroupOverrideSnapshot } from "@/components/app-shell-environment"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getAssetGroupOverridesSnapshot,
  parseAssetGroupOverrideSnapshot,
  subscribeAssetGroupOverrides,
} from "@/lib/asset-group-overrides"
import {
  COMPETITIVE_SEEDED_GROUPS,
  getCompetitiveGroupSnapshot,
  parseCompetitiveGroupSnapshot,
  subscribeCompetitiveGroups,
} from "@/lib/competitive-group-overrides"
import {
  ASSET_GROUP_SIDEBAR_LABELS,
  SEEDED_PORTFOLIO_GROUP_IDS,
} from "@/lib/assets"
import { cn } from "@/lib/utils"

type ImportDestination = "your-assets" | "other-assets"
type ImportMode = "add" | "update"

type GroupOption = {
  id: string
  label: string
}

const NO_GROUP_VALUE = "__none__"

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`
}

export function AssetImportDialog({
  open,
  onOpenChange,
  mode,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: ImportMode
}) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [files, setFiles] = React.useState<File[]>([])
  const [destination, setDestination] =
    React.useState<ImportDestination>("your-assets")
  const [groupId, setGroupId] = React.useState(NO_GROUP_VALUE)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  const initialPortfolioSnapshot = useInitialAssetGroupOverrideSnapshot()
  const portfolioSnapshot = React.useSyncExternalStore(
    subscribeAssetGroupOverrides,
    getAssetGroupOverridesSnapshot,
    () => initialPortfolioSnapshot
  )
  const portfolioData = React.useMemo(
    () => parseAssetGroupOverrideSnapshot(portfolioSnapshot),
    [portfolioSnapshot]
  )

  const competitiveSnapshot = React.useSyncExternalStore(
    subscribeCompetitiveGroups,
    getCompetitiveGroupSnapshot,
    () => ""
  )
  const competitiveData = React.useMemo(
    () => parseCompetitiveGroupSnapshot(competitiveSnapshot),
    [competitiveSnapshot]
  )

  const portfolioGroupOptions = React.useMemo<GroupOption[]>(() => {
    const seeded = SEEDED_PORTFOLIO_GROUP_IDS.filter(
      (id) => !portfolioData.removedPortfolioGroupIds.has(id)
    ).map((id) => ({
      id,
      label:
        portfolioData.fundLabelOverrides[id]?.trim() ||
        ASSET_GROUP_SIDEBAR_LABELS[id],
    }))
    const custom = Object.entries(portfolioData.customGroups)
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
      )
    return [...seeded, ...custom]
  }, [
    portfolioData.customGroups,
    portfolioData.fundLabelOverrides,
    portfolioData.removedPortfolioGroupIds,
  ])

  const competitiveGroupOptions = React.useMemo<GroupOption[]>(() => {
    const seeded = COMPETITIVE_SEEDED_GROUPS.filter(
      (group) => !competitiveData.removedSeededGroupIds.has(group.id)
    ).map((group) => ({
      id: group.id,
      label: competitiveData.groupLabels[group.id] ?? group.label,
    }))
    const custom = Object.entries(competitiveData.customGroups)
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
      )
    return [...seeded, ...custom]
  }, [
    competitiveData.customGroups,
    competitiveData.groupLabels,
    competitiveData.removedSeededGroupIds,
  ])

  const groupOptions =
    destination === "your-assets" ? portfolioGroupOptions : competitiveGroupOptions
  const selectedDestinationLabel =
    destination === "your-assets" ? "Your Assets" : "Other Assets"
  const groupSelectItems = React.useMemo(() => {
    const items: Record<string, React.ReactNode> = {
      [NO_GROUP_VALUE]: "Choose group (optional)",
    }
    for (const option of groupOptions) {
      items[option.id] = option.label
    }
    return items
  }, [groupOptions])

  const addFiles = React.useCallback((fileList: FileList | null) => {
    if (fileList == null || fileList.length === 0) return
    setFiles((current) => {
      const next = [...current]
      for (const file of Array.from(fileList)) {
        const duplicate = next.some(
          (existing) =>
            existing.name === file.name &&
            existing.size === file.size &&
            existing.lastModified === file.lastModified
        )
        if (!duplicate) next.push(file)
      }
      return next
    })
  }, [])

  const reset = React.useCallback(() => {
    setFiles([])
    setDestination("your-assets")
    setGroupId(NO_GROUP_VALUE)
    setIsDragging(false)
    if (inputRef.current) inputRef.current.value = ""
  }, [])

  const close = React.useCallback(() => {
    onOpenChange(false)
    reset()
  }, [onOpenChange, reset])

  const isUpdateMode = mode === "update"

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true)
        } else {
          close()
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isUpdateMode ? "Update asset" : "Import assets"}</DialogTitle>
          <DialogDescription>
            {isUpdateMode
              ? "Upload source files to update this asset."
              : "Upload source files and choose where the assets should be organized."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div
            className={cn(
              "flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/25 px-4 py-8 text-center transition-colors",
              isDragging && "border-ring bg-muted/50 ring-3 ring-ring/20"
            )}
            onDragEnter={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setIsDragging(true)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setIsDragging(true)
            }}
            onDragLeave={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setIsDragging(false)
            }}
            onDrop={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setIsDragging(false)
              addFiles(event.dataTransfer.files)
            }}
          >
            <UploadCloud className="mb-3 size-9 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-foreground">
              Drop files here, or{" "}
              <button
                type="button"
                className="underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => inputRef.current?.click()}
              >
                browse your files
              </button>
            </p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              {isUpdateMode
                ? "Add rent rolls, T12s, OMs, or other files for this asset."
                : "Add rent rolls, T12s, OMs, or other asset files. You can choose the destination before importing."}
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="sr-only"
              onChange={(event) => addFiles(event.target.files)}
            />
          </div>

          {files.length > 0 ? (
            <div className="rounded-lg border border-border bg-background">
              <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
                {files.length} {files.length === 1 ? "file" : "files"} selected
              </div>
              <ul className="max-h-28 overflow-y-auto px-3 py-2">
                {files.map((file) => (
                  <li
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    className="flex min-w-0 items-center justify-between gap-3 py-1 text-sm"
                  >
                    <span className="min-w-0 truncate text-foreground">
                      {file.name}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!isUpdateMode ? (
            <div className="grid gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Where should these assets go?
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pick the asset collection first, then optionally place them into a
                  group.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  {
                    value: "your-assets" as const,
                    label: "Your Assets",
                    icon: BriefcaseBusiness,
                  },
                  {
                    value: "other-assets" as const,
                    label: "Other Assets",
                    icon: MapPin,
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                      destination === option.value &&
                        "border-ring bg-accent text-accent-foreground ring-2 ring-ring/20"
                    )}
                    onClick={() => {
                      setDestination(option.value)
                      setGroupId(NO_GROUP_VALUE)
                    }}
                  >
                    <option.icon className="size-4 shrink-0" aria-hidden />
                    {option.label}
                  </button>
                ))}
              </div>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  Asset Group
                </span>
                <Select
                  items={groupSelectItems}
                  value={groupId}
                  onValueChange={(value) => {
                    if (value == null) return
                    setGroupId(value)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value={NO_GROUP_VALUE}>
                      Choose group (optional)
                    </SelectItem>
                    {groupOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="button" disabled={files.length === 0}>
            {isUpdateMode ? "Update asset" : "Import assets"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SidebarAddAssetsImportModal() {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="mb-2 w-full"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4 shrink-0" aria-hidden />
        Add Assets
      </Button>
      <AssetImportDialog open={open} onOpenChange={setOpen} mode="add" />
    </>
  )
}

export function UpdateAssetImportButton({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        <RefreshCw className="size-4 shrink-0" aria-hidden />
        Update asset
      </Button>
      <AssetImportDialog open={open} onOpenChange={setOpen} mode="update" />
    </>
  )
}
