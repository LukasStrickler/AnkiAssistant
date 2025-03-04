"use client"

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { db } from "@/local-db"
import { MessageSquarePlus, Eye } from "lucide-react"
import { logger } from "@/lib/logger"
import { EnhancedChatInput } from "./[...slug]/components/EnhancedChatInput"

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <MessageSquarePlus className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Start a new conversation</h2>
        <p className="text-muted-foreground max-w-md">
            Type your message below to create a new chat.
        </p>
    </div>
);

const EmptyPreviewState = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Eye className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Referenced Preview</h2>
        <p className="text-muted-foreground max-w-md">
            Referenced content will appear here for easy viewing.
        </p>
    </div>
);

export default function ChatPage() {
    const [inputText, setInputText] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    const handleSendMessage = async () => {
        if (!inputText.trim() || isSubmitting) return;

        logger.log(`[${new Date().toISOString()}] Starting handleSendMessage`);
        setIsSubmitting(true);

        try {
            logger.log(`[${new Date().toISOString()}] Creating chat in IndexedDB`);
            const timestamp = new Date();
            const startTime = performance.now();

            const chatId = await db.chats.add({
                name: "Generating name...",
                createdAt: timestamp,
            });

            logger.log(`[${new Date().toISOString()}] Chat created in ${performance.now() - startTime}ms, chatId: ${chatId}`);

            // Capture message content before clearing input
            const messageContent = inputText;
            logger.log(`[${new Date().toISOString()}] Message content captured: ${messageContent.length} characters`);

            logger.log(`[${new Date().toISOString()}] Adding message to IndexedDB`);
            const messageStartTime = performance.now();

            const messageId = await db.messages.add({
                content: messageContent,
                role: 'user',
                createdAt: timestamp,
                modelUsed: "",
                chatId,
            });

            logger.log(`[${new Date().toISOString()}] Message added in ${performance.now() - messageStartTime}ms, messageId: ${messageId}`);

            logger.log(`[${new Date().toISOString()}] Starting navigation to /chat/${chatId}`);
            const navigationStartTime = performance.now();

            // Immediately redirect to the new chat page with starting inference parameter
            router.push(`/chat/${chatId}?startInference=true`);

            logger.log(`[${new Date().toISOString()}] Navigation initiated in ${performance.now() - navigationStartTime}ms`);
            logger.log(`[${new Date().toISOString()}] Total operation time: ${performance.now() - startTime}ms`);

            setIsSubmitting(false);
        } catch (error) {
            logger.error(`[${new Date().toISOString()}] Error in handleSendMessage:`, error);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-row h-[calc(100vh-20px)] p-4 pb-2">
            <div className="flex-1 flex flex-col p-2">
                <ScrollArea className="flex-1">
                    <div className="h-full flex items-center justify-center">
                        <EmptyState />
                    </div>
                    <ScrollBar orientation="vertical" />
                </ScrollArea>

                <div className="pt-4">
                    <div className="max-w-3xl mx-auto">
                        <EnhancedChatInput
                            inputText={inputText}
                            setInputText={setInputText}
                            isSubmitting={isSubmitting}
                            onSendMessage={handleSendMessage}
                        />
                    </div>
                </div>
            </div>

            <Separator orientation="vertical" className="px-0.5 rounded-xl" />

            <div className="flex-1">
                <ScrollArea className="h-full">
                    <div className="h-full flex items-center justify-center">
                        <EmptyPreviewState />
                    </div>
                    <ScrollBar orientation="vertical" />
                </ScrollArea>
            </div>
        </div>
    );
}