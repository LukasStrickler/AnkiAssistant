"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import { SystemPromptSelector } from "../../system-prompt-selector";
import { NoteVariantSelector } from "../../note-variant-selector";
import { type InputStepProps } from "../types";
import { logger } from "@/lib/logger";
export function InputStep({
    topic,
    setTopic,
    promptId,
    setPromptId,
    selectedNoteVariants,
    setSelectedNoteVariants,
    onNext,
    disabled
}: InputStepProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTopic(e.target.value);
    };

    const handleDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
        e.preventDefault();

        const file = e.dataTransfer.files[0];
        if (!file?.name?.endsWith('.md')) {
            return;
        }

        try {
            const text = await file.text();
            const contentWithHeader = `-----\nFILE: ${file.name}\n-----\n\n${text}`;
            setTopic(contentWithHeader);
        } catch (error) {
            logger.error('Error reading file:', error);
        }
    };

    const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData.items;

        for (const item of items) {
            if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file?.name?.endsWith('.md')) {
                    e.preventDefault();
                    try {
                        const text = await file.text();
                        const contentWithHeader = `-----\nFILE: ${file.name}\n-----\n\n${text}`;
                        setTopic(contentWithHeader);
                    } catch (error) {
                        logger.error('Error reading file:', error);
                    }
                    break;
                }
            }
        }
    };

    return (
        <div className={cn(
            "h-full flex flex-col",
            disabled && "opacity-90"
        )}>
            <h2 className="text-2xl font-bold mb-4">Create Your Deck</h2>
            <div className="flex-grow flex flex-col min-h-0">
                <div className={cn("grid grid-cols-2 gap-4 mb-4", disabled && "pointer-events-none")}>
                    <SystemPromptSelector
                        value={promptId}
                        onChange={setPromptId}
                    />
                    <NoteVariantSelector
                        value={selectedNoteVariants}
                        onChange={setSelectedNoteVariants}
                    />
                </div>
                <div className="flex-grow mb-4 min-h-0">
                    <ScrollArea className="h-full border rounded-md">
                        <Textarea
                            ref={textareaRef}
                            value={topic}
                            onChange={handleChange}
                            onDrop={handleDrop}
                            onPaste={handlePaste}
                            disabled={disabled}
                            placeholder="Paste your markdown-formatted notes here or drag and drop a .md file"
                            className="absolute inset-0 w-full h-full min-h-[500px] p-4 font-mono text-base resize-none border-0 focus-visible:ring-0"
                        />
                        <ScrollBar orientation="vertical" />
                    </ScrollArea>
                </div>
                <Button
                    onClick={onNext}
                    className="w-full py-6"
                    disabled={!topic || disabled}
                >
                    Generate Deck <ChevronRight className="ml-2" />
                </Button>
            </div>
        </div>
    );
} 