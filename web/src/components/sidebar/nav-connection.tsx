"use client"
import * as React from "react"
import { ChevronDown, Loader2, Settings } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { ankiClient } from "@/lib/anki"
import { ollamaClient } from "@/lib/ollama"
import { useToast } from "@/hooks/use-toast"
import { useModelStore } from "@/stores/model-store"


export function NavConnection({
  ...props
}: {
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const { toast } = useToast()
  const statusColors = {
    connected: 'bg-green-500',
    disconnected: 'bg-yellow-500',
    error: 'bg-red-500',
  }

  const {
    availableModels,
    overviewModel,
    contentModel,
    ollamaStatus,
    ankiStatus,
    setOverviewModel,
    setContentModel,
    setAvailableModels,
    setOllamaStatus,
    setAnkiStatus,
    chatModel,
    setChatModel
  } = useModelStore()

  const prevStatuses = React.useRef({
    ollama: ollamaStatus,
    anki: ankiStatus
  });

  // Start collapsed by default.
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('sidebarOpen');
    if (stored !== null) {
      if (stored === 'true') {
        // Delay setting open to let the initial render show the collapsed state,
        // then animate to open.
        setTimeout(() => setMenuOpen(true), 50);
      } else {
        setMenuOpen(false);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarOpen', menuOpen.toString());
  }, [menuOpen]);

  // eslint-disable-next-line
  useEffect(() => {
    const fetchStatus = async () => {
      const newAnkiStatus = await ankiClient.getConnectionStatus()
      const newOllamaStatus = await ollamaClient.getConnectionStatus()

      if (newOllamaStatus === 'disconnected' && prevStatuses.current.ollama !== 'disconnected') {
        toast({
          title: "Ollama not connected",
          description: "Please check your Ollama connection. If you are using the default port, please ensure that Ollama is running and accessible.",
          variant: "destructive",
        })
      }
      if (newOllamaStatus === 'error') {
        toast({
          title: "Ollama error",
          description: "Please make sure you have at least one model loaded.",
          variant: "destructive",
        })
      }

      if (newAnkiStatus === 'disconnected' && prevStatuses.current.anki !== 'disconnected') {
        toast({
          title: "Anki not connected",
          description: "Please check your Anki connection. If you are using the default port, please ensure that Anki is running and accessible.",
          variant: "destructive",
        })
      }

      setOllamaStatus(newOllamaStatus)
      setAnkiStatus(newAnkiStatus)
      prevStatuses.current = {
        ollama: newOllamaStatus,
        anki: newAnkiStatus
      }
    }
    void fetchStatus()
    const interval = setInterval(() => {
      if (ollamaStatus === 'disconnected' || ankiStatus === 'disconnected') {
        void fetchStatus()
      }
    }, (ollamaStatus === 'disconnected' || ankiStatus === 'disconnected') ? 1000 : 10000)

    return () => clearInterval(interval)
  },
    // eslint-disable-next-line
    [])


  useEffect(() => {
    const loadModels = async () => {
      if (ollamaStatus === 'connected') {
        const models = await ollamaClient.listModels()
        setAvailableModels(models)

        if (!overviewModel) {
          setOverviewModel(models[0] ?? "No models available")
        }
        if (!contentModel) {
          setContentModel(models[0] ?? "No models available")
        }
        if (!chatModel) {
          setChatModel(models[0] ?? "No models available")
        }
      }
    }

    void loadModels()
  }, [ollamaStatus, overviewModel, contentModel, chatModel, setOverviewModel, setContentModel, setChatModel, setAvailableModels])

  // Set up a ref and state for animating the height of the content.
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState("0px");

  useEffect(() => {
    if (contentRef.current) {
      if (menuOpen) {
        // Set the height to the scrollHeight to animate open.
        setHeight(`${contentRef.current.scrollHeight + 12}px`);
      } else {
        // When closing, set the height to the current scrollHeight, then transition to 0 immediately.
        setHeight(`${contentRef.current.scrollHeight}px`);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setHeight("0px");
          });
        });
      }
    }
  }, [menuOpen]);

  // Disable natural browser scrollbars when the sidebar menu is open
  React.useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <SidebarGroup {...props} className={cn("p-0", props.className)}>
      <SidebarGroupContent>
        <Card className="w-full border-none shadow-sm">
          <CardHeader className={cn(
            "relative flex items-center justify-between px-4 pb-1 pt-1",
          )}>
            <button onClick={() => setMenuOpen(prev => !prev)} className="absolute left-2 top-[3px] p-0.5 m-0.5 rounded hover:bg-neutral-200/20">
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${menuOpen ? '' : '-rotate-90'}`} />
              <span className="sr-only">Toggle Menu</span>
            </button>

            <CardTitle className="text-sm text-muted-foreground flex items-center justify-center relative" style={{ top: "-4px" }}>
              <div className="flex justify-center items-center space-x-2">
                <div className="flex items-center">
                  {ollamaStatus === 'loading' ?
                    <Loader2 className="h-3 w-3 animate-spin" style={{ strokeWidth: '5' }} />
                    :
                    <span className={`h-3 w-3 rounded-full ${statusColors[ollamaStatus]}`} />}
                  <span className="ml-2">Ollama</span>
                </div>
                <div className="flex items-center">
                  {ankiStatus === 'loading' ?
                    <Loader2 className="h-3 w-3 animate-spin" style={{ strokeWidth: '5' }} />
                    :
                    <span className={`h-3 w-3 rounded-full ${statusColors[ankiStatus]}`} />}
                  <span className="ml-2">Anki</span>
                </div>
              </div>
            </CardTitle>
            <Link href="/settings" className="absolute right-2 -top-[1px] p-0.5 m-0.5 rounded hover:bg-neutral-200/20 text-muted-foreground">
              <Settings className="h-5 w-5" />
            </Link>
          </CardHeader>
          <CardContent
            ref={contentRef}
            style={{ height, transition: 'height 500ms ease, padding 500ms ease' }}
            className={cn("overflow-hidden", menuOpen ? "px-4 py-2" : "px-8 py-0")}
          >
            <SidebarMenu>
              <SidebarMenuItem className="group relative">
                <div className="flex w-full items-center gap-2 rounded-md p-1">
                  <span>Chat</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="ml-auto flex items-center gap-1">
                      <span className="truncate text-muted-foreground">
                        {chatModel ?? 'Select model'}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48 h-auto overflow-visible">
                      {availableModels.map((model) => (
                        <DropdownMenuItem
                          key={model}
                          onSelect={() => setChatModel(model)}
                        >
                          {model}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </SidebarMenuItem>

              <SidebarMenuItem className="group relative">
                <div className="flex w-full items-center gap-2 rounded-md p-1">
                  <span>Overview</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="ml-auto flex items-center gap-1">
                      <span className="truncate text-muted-foreground">
                        {overviewModel ?? 'Select model'}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48 h-auto overflow-visible">
                      {availableModels.map((model) => (
                        <DropdownMenuItem
                          key={model}
                          onSelect={() => setOverviewModel(model)}
                        >
                          {model}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </SidebarMenuItem>

              <SidebarMenuItem className="group relative">
                <div className="flex w-full items-center gap-2 rounded-md p-1">
                  <span>Content</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="ml-auto flex items-center gap-1">
                      <span className="truncate text-muted-foreground">
                        {contentModel ?? 'Select model'}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48 h-auto overflow-visible">
                      {availableModels.map((model) => (
                        <DropdownMenuItem
                          key={model}
                          onSelect={() => setContentModel(model)}
                        >
                          {model}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </CardContent>
        </Card>
      </SidebarGroupContent>
    </SidebarGroup >
  )
}

