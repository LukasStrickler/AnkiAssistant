"use client"

import { Plus } from "lucide-react"
import { useState } from "react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Chat {
  id: string
  title: string
  createdAt: Date
  modelUsed: string
}

// Mock data initialization
const mockChats: Chat[] = [
  {
    id: '1',
    title: 'Card Review Session',
    createdAt: new Date('2024-03-15'),
    modelUsed: 'llama2'
  },
  {
    id: '2',
    title: 'Japanese Vocabulary',
    createdAt: new Date('2024-03-14'),
    modelUsed: 'mistral'
  },
  {
    id: '3',
    title: 'Japanese Vocabulary',
    createdAt: new Date('2024-03-14'),
    modelUsed: 'mistral'
  },
  {
    id: '4',
    title: 'Japanese Vocabulary',
    createdAt: new Date('2024-03-14'),
    modelUsed: 'mistral'
  },
  {
    id: '5',
    title: 'Japanese Vocabulary',
    createdAt: new Date('2024-03-14'),
    modelUsed: 'mistral'
  },
  {
    id: '6',
    title: 'Japanese Vocabulary',
    createdAt: new Date('2024-03-14'),
    modelUsed: 'mistral'
  },
  {
    id: '7',
    title: 'Japanese Vocabulary',
    createdAt: new Date('2024-03-14'),
    modelUsed: 'mistral'
  },
  {
    id: '8',
    title: 'Japanese Vocabulary',
    createdAt: new Date('2024-03-14'),
    modelUsed: 'mistral'
  },
  {
    id: '9',
    title: 'Japanese Vocabulary',
    createdAt: new Date('2024-03-14'),
    modelUsed: 'mistral'
  },
  {
    id: '10',
    title: 'Japanese Vocabulary',
    createdAt: new Date('2024-03-14'),
    modelUsed: 'mistral'
  },
  {
    id: '11',
    title: 'Japanese Vocabulary',
    createdAt: new Date('2024-03-14'),
    modelUsed: 'mistral'
  },
  {
    id: '12',
    title: 'Japanese Vocabulary',
    createdAt: new Date('2024-03-14'),
    modelUsed: 'mistral'
  },
  {
    id: '13',
    title: 'Japanese Vocabulary',
    createdAt: new Date('2024-03-14'),
    modelUsed: 'mistral'
  },


]

export function NavMain() {
  const [chats, setChats] = useState<Chat[]>(mockChats)

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: `Chat ${new Date().toLocaleDateString()}`,
      createdAt: new Date(),
      modelUsed: 'default'
    }

    setChats([newChat, ...chats])
  }

  return (
    <SidebarGroup className="flex flex-col h-full">
      <SidebarGroupLabel>Chats</SidebarGroupLabel>
      <SidebarMenu className="flex-1 min-h-0">
        {/* Sticky New Chat button */}
        <div className="sticky top-0 z-10 pt-1 pr-2">
          <SidebarMenuItem>
            <SidebarMenuButton onClick={createNewChat} className="rounded-xl">
              <Plus className="h-4 w-4" />
              <span>New Chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </div>

        <ScrollArea className="h-full">
          <div className="space-y-1 pr-2">
            {chats.map((chat) => (
              <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton asChild className="rounded-xl">
                  <a href={`/chat/${chat.id}`} className="flex justify-between items-center">
                    <span className="truncate">{chat.title}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {chat.createdAt.toLocaleDateString()}
                    </span>
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
