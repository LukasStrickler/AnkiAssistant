"use client"

import { Plus } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { db } from "@/local-db"
import { useLiveQuery } from "dexie-react-hooks"
import { useRouter } from "next/navigation"

export function NavMain() {
  const chats = useLiveQuery(() =>
    db.chats
      .orderBy('createdAt')
      .reverse()
      .toArray()
  ) ?? []

  const router = useRouter()

  return (
    <SidebarGroup className="flex flex-col h-full">
      <SidebarGroupLabel>Chats</SidebarGroupLabel>
      <SidebarMenu className="flex-1 min-h-0">
        {/* Sticky New Chat button */}
        <div className="sticky top-0 z-10 pt-1 pr-2">
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => router.push('/chat')} className="rounded-xl cursor-pointer">
              <Plus className="h-4 w-4" />
              <span>New Chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </div>

        <ScrollArea className="h-full">
          <div className="space-y-0 pr-2">
            {chats.map((chat) => (
              <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton asChild className="rounded-xl group cursor-pointer"
                  onClick={() => router.push(`/chat/${chat.id}`)}
                >
                  <a className="flex justify-between items-center">
                    <span className="truncate">{chat.name.length > 40 ? chat.name.substring(0, 40) + "..." : chat.name}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </div>
        </ScrollArea>
      </SidebarMenu>
    </SidebarGroup>
  )
}
