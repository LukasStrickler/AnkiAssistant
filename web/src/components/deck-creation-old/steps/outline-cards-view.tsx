"use client";

import { type OutlineItem, type Card, type GenerationStep, GenerationSteps } from "./types";
import { OutlineWithCards } from "./outline-with-cards";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface OutlineCardsViewProps {
    outline: OutlineItem[];
    currentStep: GenerationStep;
    selectedOutlineId?: number;
    onRegenerateOutline?: () => void;
    onRegenerateCards?: () => void;
    onRegenerateCard?: (outlineItem: OutlineItem) => void;
    onEditCard?: (card: Card) => void;
    onEditOutline?: (outlineItem: OutlineItem) => void;
    onSaveDeck?: () => void;
}

export function OutlineCardsView({
    outline,
    currentStep,
    selectedOutlineId,
    onRegenerateOutline,
    onRegenerateCards,
    onRegenerateCard,
    onEditCard,
    onEditOutline,
    onSaveDeck
}: OutlineCardsViewProps) {
    // const isGeneratingOutline = currentStep === GenerationSteps.GENERATING_OUTLINE;
    // const isGeneratingCards = currentStep === GenerationSteps.GENERATING_CARDS;
    // const isReviewingOutline = currentStep === GenerationSteps.REVIEWING_OUTLINE;
    const isReviewingCards = currentStep === GenerationSteps.REVIEWING_CARDS;
    // const isSaving = currentStep === GenerationSteps.SAVING_DECK;

    const getTitle = () => {
        switch (currentStep) {
            case GenerationSteps.GENERATING_OUTLINE:
                return "Generating Outline...";
            case GenerationSteps.REVIEWING_OUTLINE:
                return "Review Outline";
            case GenerationSteps.GENERATING_CARDS:
                return "Generating Cards...";
            case GenerationSteps.REVIEWING_CARDS:
                return "Review Cards";
            case GenerationSteps.SAVING_DECK:
                return "Saving Deck...";
            default:
                return "";
        }
    };

    const getDescription = () => {
        switch (currentStep) {
            case GenerationSteps.GENERATING_OUTLINE:
                return "Creating an outline based on your notes...";
            case GenerationSteps.REVIEWING_OUTLINE:
                return "Review the generated outline. You can regenerate it if needed.";
            case GenerationSteps.GENERATING_CARDS:
                return "Creating flashcards for each section...";
            case GenerationSteps.REVIEWING_CARDS:
                return "Review the generated cards. You can regenerate or edit individual cards.";
            case GenerationSteps.SAVING_DECK:
                return "Saving your deck to Anki...";
            default:
                return "";
        }
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{getTitle()}</h2>
                    <p className="text-muted-foreground">{getDescription()}</p>
                </div>

                <div className="flex gap-2">
                    {(onRegenerateOutline ?? onRegenerateCards) && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRegenerateOutline ?? onRegenerateCards}
                            className="gap-2"
                        >
                            <RefreshCw className="h-3 w-3" />
                            {onRegenerateOutline ? "Regenerate Outline" : "Regenerate All Cards"}
                        </Button>
                    )}
                    {isReviewingCards && onSaveDeck && (
                        <Button
                            size="sm"
                            onClick={onSaveDeck}
                            className="gap-2"
                        >
                            Save to Anki
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
                <OutlineWithCards
                    outline={outline}
                    selectedOutlineId={selectedOutlineId}
                    onRegenerateCard={onRegenerateCard}
                    onEditCard={onEditCard}
                    onEditOutline={onEditOutline}
                />
            </div>
        </div>
    );
} 