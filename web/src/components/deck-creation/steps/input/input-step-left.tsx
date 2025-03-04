import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight } from "lucide-react";
import { type InputStepProps } from "../types";
import { NoteTypeSelector } from "../../note-type-selector";
import type { ChangeEvent } from "react";
import { SystemPromptSelector } from "../../system-prompt-selector";
import { cn } from "@/lib/utils";

export function InputStepLeft({
    topic,
    setTopic,
    promptId,
    setPromptId,
    selectedNoteTypes,
    setSelectedNoteTypes,
    onNext,
    disabled
}: InputStepProps) {
    return (
        <div className={cn(
            "h-full flex flex-col",
            disabled && "opacity-50 pointer-events-none"
        )}>
            <h2 className="text-2xl font-bold mb-4">Create Your Deck</h2>
            <div className="flex-grow flex flex-col min-h-0">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <SystemPromptSelector
                        value={promptId}
                        onChange={setPromptId}
                    />
                    <NoteTypeSelector
                        value={selectedNoteTypes}
                        onChange={setSelectedNoteTypes}
                    />
                </div>
                <div className="flex-grow flex flex-col min-h-0 mb-4">
                    <Textarea
                        value={topic}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTopic(e.target.value)}
                        placeholder="Paste your markdown-formatted notes here"
                        className="flex-grow text-base p-4 min-h-0 resize-none font-mono bg-transparent"
                    />
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