import { GenerationSteps, GenerationStep, OutlineItem, Card } from "@/components/dialogs/deck-creation/types";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useRef, useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { useNoteVariantStore } from "@/stores/note-variant-store";
import { NoteVariantSelector } from "@/components/deck-creation-old/note-variant-selector";

function OutlineNavigator({
    currentStep,
    handleGenerateAllCards,
    handleSaveAllCards,
    disableSaveAllCards,
    generationStatus
}: {
    currentStep: GenerationStep,
    handleGenerateAllCards: () => void,
    handleSaveAllCards: () => void,
    disableSaveAllCards: boolean,
    generationStatus: string
}) {
    return (
        <div className="w-full mt-auto pt-4 border-t">
            {currentStep === GenerationSteps.REVIEWING_OUTLINE && (
                <Button
                    onClick={handleGenerateAllCards}
                    className="w-full"
                    variant="default"
                >Generate All Cards</Button>
            )}
            {currentStep === GenerationSteps.REVIEWING_CARDS && (
                <Button
                    onClick={handleSaveAllCards}
                    className="w-full"
                    variant="default"
                    disabled={disableSaveAllCards}
                >Save All Cards</Button>
            )}
            {currentStep === GenerationSteps.GENERATING_CARDS && (
                <div className="w-full bg-muted rounded-lg p-4 flex flex-col items-center justify-center h-9">
                    <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        <p className="text-xs text-muted-foreground text-center">
                            {generationStatus || "AI is creating your flashcards..."}
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

function OutlineItemEditor(
    {
        outlineItem,
        onChange
    }: {
        outlineItem: OutlineItem | null,
        onChange: (outlineItem: OutlineItem) => void
    }) {

    if (!outlineItem) return null;

    // Access note variants from the store
    const { variants, selectedVariantId, selectVariant } = useNoteVariantStore();

    // Create refs for textareas to handle auto-resizing
    const frontTextareaRef = useRef<HTMLTextAreaElement>(null);
    const backTextareaRef = useRef<HTMLTextAreaElement>(null);
    const keyPointsTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Use a local state to buffer changes before updating the parent
    const [localOutlineItem, setLocalOutlineItem] = useState<OutlineItem>({ ...outlineItem });

    // Sync local state with props when outlineItem changes
    useEffect(() => {
        setLocalOutlineItem({ ...outlineItem });
    }, [outlineItem.id, JSON.stringify(outlineItem)]);

    // Debounced commit of changes to parent
    useEffect(() => {
        // Only update parent if values are different
        if (JSON.stringify(localOutlineItem) !== JSON.stringify(outlineItem)) {
            const timeoutId = setTimeout(() => {
                onChange(localOutlineItem);
            }, 10); // 10ms debounce (as in original)

            return () => clearTimeout(timeoutId);
        }
    }, [localOutlineItem, onChange, outlineItem]);

    // Function to resize textarea based on content
    const resizeTextarea = (textarea: HTMLTextAreaElement | null) => {
        if (!textarea) return;
        // Reset height before calculating scroll height
        textarea.style.height = 'auto';
        // Set height to scrollHeight to fit content (with minimum height of 50px)
        textarea.style.height = `${Math.max(textarea.scrollHeight, 50)}px`;
    };

    // Auto-resize textareas when content changes or component mounts
    useEffect(() => {
        // Resize all textareas
        resizeTextarea(frontTextareaRef.current);
        resizeTextarea(backTextareaRef.current);
        resizeTextarea(keyPointsTextareaRef.current);
    }, [
        localOutlineItem.key_points,
        localOutlineItem.card?.front,
        localOutlineItem.card?.back
    ]);

    // Local handlers for updating fields
    const handleChange = (field: keyof OutlineItem, value: string) => {
        setLocalOutlineItem(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleCardChange = (field: 'front' | 'back', value: string) => {
        setLocalOutlineItem(prev => {
            const updatedCard = prev.card ? {
                ...prev.card,
                [field]: value
            } : {
                front: field === 'front' ? value : '',
                back: field === 'back' ? value : ''
            };

            return {
                ...prev,
                card: updatedCard
            };
        });
    };

    // Safely access the first variant ID if available
    const safeFirstVariantId = variants[0]?.id ?? "";

    // When variant changes, update both the store and the local outline item
    const handleVariantChange = (variantIds: string[]) => {
        if (variantIds.length > 0) {
            // Non-null assertion tells TypeScript this won't be undefined
            const variantId = variantIds[0]!;
            selectVariant(variantId);
            handleChange("card_type", variantId);
        }
    };

    // Convert possibly undefined values to empty strings for safety
    const cardTypeValue = localOutlineItem.card_type || "";
    const selectedValue = selectedVariantId || "";

    // Determine which value to use for the selector
    const variantValue = cardTypeValue || selectedValue || safeFirstVariantId;

    // Only include the variant in the array if it's not empty
    const selectorValue = variantValue ? [variantValue] : [];

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="concept">Concept</Label>
                <Input
                    id="concept"
                    value={localOutlineItem.concept || ""}
                    onChange={(e) => handleChange("concept", e.target.value)}
                    placeholder="Enter the main concept or topic"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="key_points">Key Points</Label>
                <Textarea
                    ref={keyPointsTextareaRef}
                    id="key_points"
                    value={localOutlineItem.key_points || ""}
                    onChange={(e) => handleChange("key_points", e.target.value)}
                    placeholder="Enter key points or information to include"
                    className="min-h-[80px] resize-none overflow-hidden"
                    style={{ height: 'auto' }}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="deck">Deck</Label>
                <Input
                    id="deck"
                    value={localOutlineItem.deck || ""}
                    onChange={(e) => handleChange("deck", e.target.value)}
                    placeholder="Enter deck name"
                />
            </div>

            <div className="space-y-2">
                <NoteVariantSelector
                    value={selectorValue}
                    onChange={handleVariantChange}
                    selectionMode="single"
                />
            </div>

            {/* only if its card-review */}
            {outlineItem.status === "card-review" && (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                    <div className="space-y-2">
                        <Textarea
                            ref={frontTextareaRef}
                            id="front"
                            value={localOutlineItem.card?.front || ""}
                            onChange={(e) => handleCardChange("front", e.target.value)}
                            placeholder="Front of the card"
                            className="min-h-[50px] resize-none overflow-hidden"
                            style={{ height: 'auto' }}
                        />
                    </div>

                    <Separator className="my-2 bg-secondary-foreground/50 rounded-xl p-[1.5px]" />
                    <div className="space-y-2">
                        <Textarea
                            ref={backTextareaRef}
                            id="back"
                            value={localOutlineItem.card?.back || ""}
                            onChange={(e) => handleCardChange("back", e.target.value)}
                            placeholder="Back of the card"
                            className="min-h-[50px] resize-none overflow-hidden"
                            style={{ height: 'auto' }}
                        />
                    </div>
                </div>
            )}

            {localOutlineItem.error && (
                <div className="mt-2 p-2 bg-destructive/10 text-destructive rounded-md">
                    Error: {localOutlineItem.error}
                </div>
            )}
        </div>
    );
}

export function OutlineEditor(
    {
        outlineItem,
        closeEditor,
        currentStep,
        handleGenerateAllCards,
        handleSaveAllCards,
        disableSaveAllCards,
        updateOutlineItem,
        generationStatus
    }: {
        outlineItem: OutlineItem | null,
        closeEditor: () => void,
        currentStep: GenerationStep,
        handleGenerateAllCards: () => void,
        handleSaveAllCards: () => void,
        disableSaveAllCards: boolean,
        updateOutlineItem: (outlineItem: OutlineItem) => void,
        generationStatus: string
    }) {

    if (!outlineItem) {
        return (
            <div className="flex flex-col h-full">
                <div className="p-6 pb-2">
                    <h1 className="text-2xl font-bold">Outline Editor</h1>
                </div>
                <div className="flex-grow flex items-center justify-center p-6">
                    <p className="text-muted-foreground text-center">Please select an outline item to edit</p>
                </div>
                <div className="p-6">
                    <OutlineNavigator
                        currentStep={currentStep}
                        handleGenerateAllCards={handleGenerateAllCards}
                        handleSaveAllCards={handleSaveAllCards}
                        disableSaveAllCards={disableSaveAllCards}
                        generationStatus={generationStatus}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-6 pb-2">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Outline Editor</h1>
                    <div className="flex gap-2">
                        <Button
                            onClick={closeEditor}
                            variant="ghost"
                            size="sm"
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </div>
            <div className="flex-grow overflow-hidden px-6">
                <ScrollArea className="h-full px-2">
                    <div className="space-y-6 pb-6 p-0.5">
                        <OutlineItemEditor
                            outlineItem={outlineItem}
                            onChange={updateOutlineItem}
                        />
                    </div>
                </ScrollArea>
            </div>
            <div className="p-6 pt-2">
                <OutlineNavigator
                    currentStep={currentStep}
                    handleGenerateAllCards={handleGenerateAllCards}
                    handleSaveAllCards={handleSaveAllCards}
                    disableSaveAllCards={disableSaveAllCards}
                    generationStatus={generationStatus}
                />
            </div>
        </div>
    );
}