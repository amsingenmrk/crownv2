"use client"

import * as React from "react"
import Link from "next/link"
import { BriefcaseBusiness, Plus, Radar } from "lucide-react"
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export type TreeGroupItem = {
  id: string
  label: string
  href: string
  isActive: boolean
  navigable?: boolean
}

export function SidebarTreeSection({
  sectionLabel,
  sectionHref,
  sectionTooltip,
  sectionIsActive,
  onSectionNavigate,
  sectionNavigable = true,
  groups,
  onCreateGroup,
}: {
  sectionLabel: string
  sectionHref: string
  sectionTooltip: string
  sectionIsActive: boolean
  onSectionNavigate?: () => void
  sectionNavigable?: boolean
  groups: TreeGroupItem[]
  onCreateGroup: () => void
}) {
  return (
    <SidebarMenu className="gap-0">
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={sectionTooltip}
          className="h-8 pr-8 font-medium"
          isActive={sectionIsActive}
          render={
            sectionNavigable ? (
              <Link href={sectionHref} onClick={onSectionNavigate} />
            ) : (
              <button
                type="button"
                onClick={onSectionNavigate}
                className="cursor-default"
              />
            )
          }
        >
          {sectionLabel.toLowerCase().includes("competitive") ? (
            <Radar aria-hidden />
          ) : (
            <BriefcaseBusiness aria-hidden />
          )}
          <span>{sectionLabel}</span>
        </SidebarMenuButton>
        <SidebarMenuAction
          type="button"
          className="top-1.5 right-1 rounded-md hover:bg-sidebar-accent/80"
          aria-label={`New ${sectionLabel} group`}
          title={`New ${sectionLabel} group`}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onCreateGroup()
          }}
        >
          <Plus className="size-4 shrink-0" aria-hidden />
        </SidebarMenuAction>
      </SidebarMenuItem>

      {groups.length > 0 ? (
        <li className="list-none group-data-[collapsible=icon]:hidden">
          <SidebarMenuSub className="mx-0 mt-1 translate-x-0 gap-0 border-l-0 px-0 py-0.5">
            <SidebarMenuSub className="mt-0 gap-0 border-l border-sidebar-border/70 py-0 pl-3">
              {groups.map((group) => (
                <SidebarMenuSubItem key={`${sectionLabel}-${group.id}`}>
                  <SidebarMenuSubButton
                    size="md"
                    className="h-7 text-[13px] text-sidebar-foreground/85 data-active:font-medium data-active:text-sidebar-accent-foreground"
                    isActive={group.isActive}
                    render={
                      group.navigable === false ? (
                        <button type="button" className="cursor-default" />
                      ) : (
                        <Link href={group.href} />
                      )
                    }
                  >
                    <span className="truncate">{group.label}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </SidebarMenuSub>
        </li>
      ) : null}
    </SidebarMenu>
  )
}
