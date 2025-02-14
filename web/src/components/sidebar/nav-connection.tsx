"use client"
import * as React from "react"
import { ChevronDown, Loader2 } from "lucide-react"

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
    setAnkiStatus
  } = useModelStore()

  const prevStatuses = React.useRef({
    ollama: ollamaStatus,
    anki: ankiStatus
  });

  React.useEffect(() => {
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
  }, [])


  React.useEffect(() => {
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
      }
    }

    void loadModels()
  }, [ollamaStatus, overviewModel, contentModel, setOverviewModel, setContentModel, setAvailableModels])


  return (
    <SidebarGroup {...props} className={cn("p-0", props.className)}>
      <SidebarGroupContent>
        <Card className="w-full border-none shadow-sm">
          <CardHeader className="flex items-left justify-between px-2 pb-1 pt-2">
            <CardTitle className="text-sm text-muted-foreground">
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
          </CardHeader>
          <CardContent className="p-2">
            <SidebarMenu>
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
                    <DropdownMenuContent className="w-48">
                      {availableModels.map((model) => (
                        <DropdownMenuItem
                          key={model}
                          onSelect={() => {
                            setOverviewModel(model)
                          }}
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
                    <DropdownMenuContent className="w-48">
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
    </SidebarGroup>
  )
}

