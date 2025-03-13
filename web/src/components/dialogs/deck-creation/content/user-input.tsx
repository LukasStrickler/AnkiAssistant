"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import { SystemPromptSelector } from "@/components/selectors/system-prompt";
import { NoteVariantSelector } from "@/components/selectors/note-variant";
import { logger } from "@/lib/logger";
import { DeckCreationData } from "@/hooks/use-deck-creation";
/**
 * Custom hook to handle markdown file uploads and pastes
 */
function useMarkdownFileHandler(onFileContent: (content: string) => void) {
    const processMarkdownFile = async (file: File) => {
        if (!file?.name?.endsWith('.md')) {
            return false;
        }

        try {
            const text = await file.text();
            const contentWithHeader = `-----\nFILE: ${file.name}\n-----\n\n${text}`;
            onFileContent(contentWithHeader);
            return true;
        } catch (error) {
            logger.error('Error reading file:', error);
            return false;
        }
    };

    const handleFileDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            await processMarkdownFile(file);
        }
    };

    const handleFilePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData.items;

        for (const item of items) {
            if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file) {
                    const processed = await processMarkdownFile(file);
                    if (processed) {
                        e.preventDefault();
                        break;
                    }
                }
            }
        }
    };

    return {
        handleFileDrop,
        handleFilePaste
    };
}

/**
 * Selectors for system prompt and note variants
 */
type SelectorsProps = {
    data: Pick<DeckCreationData, 'promptId' | 'selectedNoteVariants'>;
    onChange: (updates: Partial<DeckCreationData>) => void;
    disabled?: boolean;
};

function DeckSelectors({ data, onChange, disabled }: SelectorsProps) {
    return (
        <div className={cn("grid grid-cols-2 gap-4 mb-4", disabled && "pointer-events-none")}>
            <SystemPromptSelector
                value={data.promptId}
                onChange={(newPromptId) => onChange({ promptId: newPromptId })}
            />
            <NoteVariantSelector
                value={data.selectedNoteVariants}
                onChange={(newVariants) => onChange({ selectedNoteVariants: newVariants })}
            />
        </div>
    );
}

/**
 * Markdown input textarea with file handling
 */
type MarkdownInputProps = {
    data: Pick<DeckCreationData, 'userInput'>;
    onChange: (updates: Partial<DeckCreationData>) => void;
    disabled?: boolean;
};

function MarkdownInput({ data, onChange, disabled }: MarkdownInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { handleFileDrop, handleFilePaste } = useMarkdownFileHandler(
        (content) => onChange({ userInput: content })
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange({ userInput: e.target.value });
    };

    return (
        <div className="flex-grow mb-4 min-h-0">
            <ScrollArea className="h-full border rounded-md">
                <Textarea
                    ref={textareaRef}
                    value={data.userInput}
                    onChange={handleChange}
                    onDrop={handleFileDrop}
                    onPaste={handleFilePaste}
                    disabled={disabled}
                    placeholder="Paste your markdown-formatted notes here or drag and drop a .md file"
                    className="absolute inset-0 w-full h-full min-h-[500px] p-4 font-mono text-base resize-none border-0 focus-visible:ring-0"
                />
                <ScrollBar orientation="vertical" />
            </ScrollArea>
        </div>
    );
}

/**
 * Submit button for the form
 */
type SubmitButtonProps = {
    onSubmit: () => void;
    disabled: boolean;
};

function SubmitButton({ onSubmit, disabled }: SubmitButtonProps) {
    return (
        <Button
            onClick={onSubmit}
            className="w-full py-6"
            disabled={disabled}
        >
            Generate Deck <ChevronRight className="ml-2" />
        </Button>
    );
}

interface InputStepProps {
    data: DeckCreationData;
    onChange: (updates: Partial<DeckCreationData>) => void;
    onSubmit: () => void;
}

export function InputStep({
    data,
    onChange,
    onSubmit,
}: InputStepProps) {

    const [isSubmitting, setIsSubmitting] = useState(false);
    const disableSubmit = !data.userInput || isSubmitting;

    return (
        <div className={cn(
            "h-full flex flex-col",
            isSubmitting && "opacity-90"
        )}>
            <h2 className="text-2xl font-bold mb-4">Create Your Deck</h2>
            <div className="flex-grow flex flex-col min-h-0">
                <DeckSelectors
                    data={data}
                    onChange={onChange}
                    disabled={isSubmitting}
                />

                <MarkdownInput
                    data={data}
                    onChange={onChange}
                    disabled={isSubmitting}
                />

                <SubmitButton
                    onSubmit={onSubmit}
                    disabled={disableSubmit}
                />
            </div>
        </div>
    );
}
