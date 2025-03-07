"use client";

import { Button } from "@/components/ui/button";
import { type OutlineItem } from "../types";
import { useNoteVariantStore } from "@/stores/note-variant-store";
import { NoteVariantSelector } from "../../note-variant-selector";

interface OutlineEditorProps {
    outlineItem: OutlineItem;
    onOutlineChange: (outlineItem: OutlineItem) => void;
    onClose: () => void;
    onSwitchToCard?: () => void;
}

export function OutlineEditor({
    outlineItem,
    onOutlineChange,
    onClose,
    onSwitchToCard
}: OutlineEditorProps) {
    const noteVariants = useNoteVariantStore((state) => state.variants);

    // Find the variant ID of the current card type - try matching by ID first, then by name
    const currentVariantId = noteVariants.find(
        variant => variant.id === outlineItem.card_type || variant.name === outlineItem.card_type
    )?.id || '';

    // Handle card type change from the selector
    const handleCardTypeChange = (selectedIds: string[]) => {
        if (selectedIds.length === 0) return;

        const selectedId = selectedIds[0];
        const selectedVariant = noteVariants.find(variant => variant.id === selectedId);

        if (selectedVariant) {
            onOutlineChange({
                ...outlineItem,
                card_type: selectedVariant.id // Store the variant ID instead of name
            });
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Edit Outline</h2>
                {outlineItem.card && onSwitchToCard && (
                    <Button
                        variant="outline"
                        onClick={onSwitchToCard}
                    >
                        Switch to Card Editor
                    </Button>
                )}
            </div>
            <div className="flex-grow flex flex-col min-h-0">
                <div className="flex-grow overflow-y-auto mb-4">
                    <div className="space-y-4">
                        <div>
                            <div className="font-semibold mb-2">Concept</div>
                            <input
                                type="text"
                                className="w-full p-2 bg-muted rounded"
                                value={outlineItem.concept}
                                onChange={(e) => onOutlineChange({
                                    ...outlineItem,
                                    concept: e.target.value
                                })}
                            />
                        </div>
                        <div>
                            <div className="font-semibold mb-2">Key Points</div>
                            <textarea
                                className="w-full p-2 bg-muted rounded resize-none min-h-[100px]"
                                value={outlineItem.key_points}
                                onChange={(e) => onOutlineChange({
                                    ...outlineItem,
                                    key_points: e.target.value
                                })}
                            />
                        </div>
                        <div>
                            <NoteVariantSelector
                                value={currentVariantId ? [currentVariantId] : []}
                                onChange={handleCardTypeChange}
                                selectionMode="single"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1"
                    >
                        Close Editor
                    </Button>
                </div>
            </div>
        </div>
    );
} 