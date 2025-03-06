"use client";

import { type OutlineItem, type Card, type GenerationStep, GenerationSteps } from "./types";
import { OutlineWithCards } from "./outline-with-cards";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface OutlineCardsViewProps {
    outline: OutlineItem[];
    currentStep: GenerationStep;
    selectedOutlineId?: number;
    onOutlineItemClick?: (item: OutlineItem) => void;
    onRegenerateOutline?: () => void;
    onRegenerateCards?: () => void;
    onRegenerateCard?: (outlineItem: OutlineItem) => void;
    onEditCard?: (card: Card) => void;
    onSaveDeck?: () => void;
}

export function OutlineCardsView({
    outline,
    currentStep,
    selectedOutlineId,
    onOutlineItemClick,
    onRegenerateOutline,
    onRegenerateCards,
    onRegenerateCard,
    onEditCard,
    onSaveDeck
}: OutlineCardsViewProps) {
    const isGeneratingOutline = currentStep === GenerationSteps.GENERATING_OUTLINE;
    const isGeneratingCards = currentStep === GenerationSteps.GENERATING_CARDS;
    const isReviewingOutline = currentStep === GenerationSteps.REVIEWING_OUTLINE;
    const isReviewingCards = currentStep === GenerationSteps.REVIEWING_CARDS;
    const isSaving = currentStep === GenerationSteps.SAVING_DECK;

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
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-bold">
                        {currentStep === GenerationSteps.REVIEWING_OUTLINE ? "Generated Outline" : "Generated Cards"}
                    </h2>
                    <div className="text-muted-foreground">
                        {getDescription()}
                    </div>
                </div>
                {(isGeneratingOutline || isGeneratingCards || isSaving) && (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
                {(onRegenerateOutline || onRegenerateCards) && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRegenerateOutline || onRegenerateCards}
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

            <div className="flex-grow overflow-y-auto">
                <OutlineWithCards
                    outline={outline}
                    selectedOutlineId={selectedOutlineId}
                    onOutlineItemClick={onOutlineItemClick}
                    onRegenerateCard={onRegenerateCard}
                    onEditCard={onEditCard}
                />
            </div>
        </div>
    );
} 