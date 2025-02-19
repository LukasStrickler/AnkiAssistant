"use client"

import * as React from "react"
import {
  WalletCardsIcon,
} from "lucide-react"

import { NavMain } from "@/components/sidebar/nav-main"
import { NavDecks } from "@/components/sidebar/nav-decks"
import { NavConnection } from "@/components/sidebar/nav-connection"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
                  <WalletCardsIcon className="size-6" />
                </div>
                {process.env.NODE_ENV === 'production' ?
                  <span className="truncate text-xl font-semibold">Anki Assistant</span>
                  :
                  <div className="flex flex-col">
                    <span className="truncate font-semibold">Anki Assistant</span>
                    <span className="truncate text-xs">Local Instance</span>
                  </div>
                }
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="flex flex-col flex-1 min-h-0 gap-0">
        <div className="flex-1 min-h-0">
          <NavMain />
        </div>
        <Separator className="mx-auto py-0.5 rounded-xl max-w-[90%]" />
        <div className="flex-1 min-h-0">
          <NavDecks />
        </div>
      </SidebarContent>
      <SidebarFooter className="pb-0 gap-0">
        <NavConnection />
      </SidebarFooter>
    </Sidebar>
  )
}
