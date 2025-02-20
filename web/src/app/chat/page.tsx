"use client"
// TODO: Implement new chat page

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"
import { useToast } from "@/hooks/use-toast"
import { Copy, Check, CheckCircle2 } from "lucide-react"

// Add this mock data above the component
const mockMessages: Message[] = [
    { id: 1, model: "gpt-4", content: "Hello! How can I help you today? @Deck(My Deck)", role: "assistant", timestamp: new Date("2025-02-20T17:33:00.000Z") },
    { id: 2, content: "I'd like to learae. Natusceum. @Deck(My Deck) asdadsasdaasdasdasdasdasdasdadsasdasdasdasdasdasdasdadsasdasdasdasdasdasdadsasdasdasdasdasdasd", role: "user", timestamp: new Date("2025-02-20T17:35:00.000Z") },
    { id: 3, model: "gpt-4", content: "Great question! Let me explain.... ", role: "assistant", timestamp: new Date("2025-02-20T17:36:00.000Z") },
]

export const Card = ({ cardId }: { cardId: string }) => {
    return (
        <>
            <span> </span>
            <span className="inline-flex items-center p-0.5 rounded-md bg-accent text-foreground">
                {cardId}
            </span>
        </>
    )
}

export const Deck = ({ deckName }: { deckName: string }) => {
    return (
        <>
            <span> </span>
            <span className="inline-flex items-center p-0.5 rounded-md bg-accent underline text-foreground">
                {deckName}
            </span>
        </>
    )
}

export const MessageContent = ({ message }: { message: string }) => {
    const parts = message.split(/(@Card\(\d+\)|@Deck\([^)]+\))/);

    return (
        <span className="whitespace-normal break-words">
            {parts.map((part, index) => {
                const cardMatch = part.match(/@Card\((\d+)\)/);
                const deckMatch = part.match(/@Deck\(([^)]+)\)/);

                if (cardMatch) {
                    return <Card key={index} cardId={cardMatch[1]!} />;
                }
                if (deckMatch) {
                    return <Deck key={index} deckName={deckMatch[1]!} />;
                }
                return part;
            })}
        </span>
    )
}

type Message = {
    id: number;
    content: string;
    role: 'user' | 'assistant';
    model?: string;
    timestamp?: Date;
}

export const UserMessage = ({ message }: { message: Message }) => {
    return (
        <div className="flex gap-4 justify-end">
            <div className="p-4 rounded-xl bg-primary text-primary-foreground ml-auto max-w-[90%] w-full break-words">
                <MessageContent message={message.content} />
                <p className="text-xs mt-2 opacity-70">
                    {message.timestamp?.toLocaleString('en-US', {
                        year: 'numeric',
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZone: 'UTC'
                    })}
                </p>
            </div>
        </div>
    )
}

export const AssistantMessage = ({ message }: { message: Message }) => {
    const { toast } = useToast();
    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
        toast({
            variant: "default",
            description: (
                <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    <span>Copied to clipboard</span>
                </div>
            ),
        });
    };

    return (
        <div className="flex gap-4 justify-start relative">
            <HoverCard openDelay={0}
                closeDelay={250}
            >
                <HoverCardTrigger asChild>
                    <div className="p-4 rounded-xl bg-transparent shadow-none px-0 w-full max-w-[90%] break-words">
                        <MessageContent message={message.content} />
                    </div>
                </HoverCardTrigger>
                <HoverCardContent
                    align="start"
                    className="min-w-[var(--radix-hover-card-trigger-width)] rounded-none shadow-none border-0 p-0 animate-none -mt-5 -ml-4 left-0"
                    side="bottom"
                >
                    <div className="flex flex-col w-full">
                        <div className="flex items-center justify-start h-8 gap-2 px-2 w-full">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleCopy}
                                className="h-8 flex items-center gap-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                                <Copy className="h-4 w-4" />
                                <span>Copy response</span>
                            </Button>

                            <Separator orientation="vertical" className="h-4 mx-0.5 px-0.5 rounded-full" />

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>Generated with</span>
                                <span className="font-medium">
                                    {message.model || 'Not specified'}
                                </span>
                            </div>

                            <Separator orientation="vertical" className="h-4 mx-0.5 px-0.5 rounded-full" />

                            <div className="flex items-center text-sm text-muted-foreground">
                                <span className="text-xs whitespace-nowrap">
                                    {message.timestamp?.toLocaleString('en-US', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false,
                                        timeZone: 'UTC'
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>
                </HoverCardContent>
            </HoverCard>
        </div >
    )
}

export default function ChatPage() {
    return (
        <div className="flex flex-row h-[calc(100vh-20px)] p-4 pb-2">
            {/* Left Chat Area */}
            <div className="flex-1 flex flex-col p-2">
                <ScrollArea className="flex-1 pr-1">
                    <div className="pr-4">
                        <div className="max-w-3xl mx-auto p-4 space-y-6">
                            {mockMessages.map((message) => (
                                message.role === 'user' ? (
                                    <UserMessage key={message.id} message={message} />
                                ) : (
                                    <AssistantMessage key={message.id} message={message} />
                                )
                            ))}
                        </div>
                    </div>
                    <ScrollBar orientation="vertical" />
                </ScrollArea>

                {/* Input Area */}
                <div className="pt-4 border-t">
                    <div className="max-w-3xl mx-auto flex gap-2">
                        <Input placeholder="Type your message..." className="flex-1" />
                        <Button>Send</Button>
                    </div>
                </div>
            </div>

            <Separator orientation="vertical" className="px-0.5 rounded-xl" />

            {/* Right Preview Area */}
            <div className="flex-1">
                <ScrollArea className="h-full pr-1">
                    <div className="pr-4">
                        <div className="max-w-3xl mx-auto p-4 text-muted-foreground">
                            Preview/Assistant Area (Placeholder)
                        </div>
                    </div>
                    <ScrollBar orientation="vertical" />
                </ScrollArea>
            </div>
        </div>
    )
}