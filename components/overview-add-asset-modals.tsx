"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type BaseModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
}

function BaseModal({
  open,
  onOpenChange,
  title,
  description,
}: BaseModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function UploadRentRollT12Modal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Upload Rent Roll & T12"
      description="Rent Roll + T12 upload workflow will be connected here. This modal is wired and ready for the ingestion pipeline."
    />
  )
}

export function UploadOmModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Upload OM"
      description="OM upload workflow will be connected here. This modal is wired and ready for the ingestion pipeline."
    />
  )
}

export function AddFromYourAssetsModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add from Your Assets"
      description="Selection flow for adding existing assets from Your Assets into the target subgroup will be connected here."
    />
  )
}

export function AddFromOtherAssetsModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add from Other Assets"
      description="Selection flow for moving assets from Other Assets into the target context will be connected here."
    />
  )
}
