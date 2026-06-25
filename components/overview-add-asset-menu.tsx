"use client"

import * as React from "react"
import { ChevronDown, Plus } from "lucide-react"

import { getAddAssetOptionsForContext, type AddAssetActionKey, type AddAssetContext } from "@/components/add-asset-option-matrix"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  AddFromOtherAssetsModal,
  AddFromYourAssetsModal,
  UploadOmModal,
  UploadRentRollT12Modal,
} from "@/components/overview-add-asset-modals"

function useAddAssetModalState() {
  const [openAction, setOpenAction] = React.useState<AddAssetActionKey | null>(null)
  return {
    openAction,
    openModalForAction: (action: AddAssetActionKey) => setOpenAction(action),
    closeModal: () => setOpenAction(null),
  }
}

function AddAssetModals({
  openAction,
  closeModal,
}: {
  openAction: AddAssetActionKey | null
  closeModal: () => void
}) {
  return (
    <>
      <UploadRentRollT12Modal
        open={openAction === "upload-rent-roll-t12"}
        onOpenChange={(open) => {
          if (!open) closeModal()
        }}
      />
      <UploadOmModal
        open={openAction === "upload-om"}
        onOpenChange={(open) => {
          if (!open) closeModal()
        }}
      />
      <AddFromYourAssetsModal
        open={openAction === "add-from-your-assets"}
        onOpenChange={(open) => {
          if (!open) closeModal()
        }}
      />
      <AddFromOtherAssetsModal
        open={openAction === "add-from-other-assets"}
        onOpenChange={(open) => {
          if (!open) closeModal()
        }}
      />
    </>
  )
}

export function OverviewAddAssetMenu({
  context,
  triggerClassName,
  triggerLabel = "Add asset",
}: {
  context: AddAssetContext
  triggerClassName?: string
  triggerLabel?: string
}) {
  const options = React.useMemo(
    () => getAddAssetOptionsForContext(context),
    [context]
  )
  const { openAction, openModalForAction, closeModal } = useAddAssetModalState()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button className={triggerClassName} />}>
          {triggerLabel}
          <ChevronDown className="size-4 opacity-70" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[120] min-w-[14rem]">
          {options.map((option) => (
            <DropdownMenuItem
              key={option.key}
              onClick={() => openModalForAction(option.key)}
            >
              <Plus className="size-4 shrink-0 opacity-80" aria-hidden />
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AddAssetModals openAction={openAction} closeModal={closeModal} />
    </>
  )
}
