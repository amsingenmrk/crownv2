"use client"

export type AddAssetActionKey =
  | "upload-rent-roll-t12"
  | "upload-om"
  | "add-from-your-assets"
  | "add-from-other-assets"

export type AddAssetContext =
  | "your-parent"
  | "your-group"
  | "other-parent"
  | "other-group"

export type AddAssetMenuOption = {
  key: AddAssetActionKey
  label: string
}

const ADD_ASSET_OPTIONS_BY_CONTEXT: Record<AddAssetContext, AddAssetMenuOption[]> = {
  "your-parent": [
    { key: "upload-rent-roll-t12", label: "Upload Rent Roll & T12" },
    { key: "add-from-other-assets", label: "Add from Other Assets" },
  ],
  "your-group": [
    { key: "add-from-your-assets", label: "Add from Your Assets" },
    { key: "upload-rent-roll-t12", label: "Add Rent Roll & T12" },
    { key: "add-from-other-assets", label: "Add from Other Assets" },
  ],
  "other-parent": [{ key: "upload-om", label: "Add OM" }],
  "other-group": [
    { key: "upload-om", label: "Add OM" },
    { key: "add-from-other-assets", label: "Add from Other Assets" },
  ],
}

export function getAddAssetOptionsForContext(
  context: AddAssetContext
): AddAssetMenuOption[] {
  return ADD_ASSET_OPTIONS_BY_CONTEXT[context]
}
