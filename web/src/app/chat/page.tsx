"use client"

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { db } from "@/local-db"
import { useModelStore } from "@/stores/model-store"
import { ollamaClient } from "@/lib/ollama"
import { MessageSquarePlus, Eye } from "lucide-react"

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

        setIsSubmitting(true);

        try {
            const timestamp = new Date();
            const chatId = await db.chats.add({
                name: "Generating Chat Name ...",
                createdAt: timestamp,
            });

            await db.messages.add({
                content: inputText,
                role: 'user',
                createdAt: timestamp,
                modelUsed: "",
                chatId,
            });

            void generateChatName(inputText).then(async (name) => {
                await db.chats.update(chatId, { name });
            });

            const model = useModelStore.getState().chatModel;
            if (model) {
                const assistantMessage = await db.messages.add({
                    content: '',
                    role: 'assistant',
                    createdAt: new Date(),
                    modelUsed: model,
                    chatId,
                });

                setTimeout(() => {
                    void (async () => {
                        let content = '';
                        await ollamaClient.streamChatCompletion(
                            [{ role: 'user', content: inputText }],
                            model,
                            {},
                            (delta) => {
                                if (delta.content) {
                                    content += delta.content;
                                    void db.messages.update(assistantMessage, { content });
                                }
                            }
                        );
                    })();
                }, 0);
            }

            void router.push(`/chat/${chatId}`);
        } catch {
            void Promise.resolve();
        } finally {
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

                <div className="pt-4 border-t">
                    <div className="max-w-3xl mx-auto flex gap-2">
                        <Input
                            placeholder="Type your message..."
                            className="flex-1"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    void handleSendMessage();
                                }
                            }}
                        />
                        <Button
                            onClick={() => void handleSendMessage()}
                            disabled={isSubmitting || !inputText.trim()}
                        >
                            {isSubmitting ? "Creating..." : "Send"}
                        </Button>
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

async function generateChatName(_content: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return "GENERATED NAME";
}