"use client";

import { Button } from "@/components/ui/button";
import { type Card } from "../types";
import { cn } from "@/lib/utils";

interface CardEditorProps {
    card: Card;
    onEditCard: (card: Card) => void;
    onClose: () => void;
    onSaveDeck?: () => void;
}

export function CardEditor({
    card,
    onEditCard,
    onClose,
    onSaveDeck
}: CardEditorProps) {
    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Edit Card</h2>
                {onSaveDeck && (
                    <Button onClick={onSaveDeck}>
                        Save to Anki
                    </Button>
                )}
            </div>
            <div className="flex-grow flex flex-col min-h-0">
                <div className="flex-grow overflow-y-auto mb-4">
                    <div className="space-y-4">
                        <div>
                            <div className="font-semibold mb-2">Front</div>
                            <textarea
                                className="w-full p-2 bg-muted rounded resize-none min-h-[100px]"
                                value={card.front}
                                onChange={(e) => onEditCard({ ...card, front: e.target.value })}
                            />
                        </div>
                        <div>
                            <div className="font-semibold mb-2">Back</div>
                            <textarea
                                className="w-full p-2 bg-muted rounded resize-none min-h-[200px]"
                                value={card.back}
                                onChange={(e) => onEditCard({ ...card, back: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                    >
                        Back to Cards
                    </Button>
                </div>
            </div>
        </div>
    );
} 