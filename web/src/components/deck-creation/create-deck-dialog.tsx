"use client";

import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { usePromptStore } from "@/stores/prompt-store";
import { useNoteTypeStore } from "@/stores/note-type-store";
import { useToast } from "@/hooks/use-toast";
import {
    InputStepLeft,
    InputStepRight,
    OutlineStepLeft,
    OutlineStepRight,
    CardsStepLeft,
    CardsStepRight,
    LoadingStep,
    GenerationSteps,
    type GenerationStep,
    type Card,
} from "./steps";
import { cn } from "@/lib/utils";

interface CreateDeckDialogProps {
    onCreateDeck: (deckName: string) => void;
}

export function CreateDeckDialog({ onCreateDeck }: CreateDeckDialogProps) {
    const [topic, setTopic] = useState("");
    const prompts = usePromptStore((state) => state.prompts);
    const defaultPromptId = prompts[0]?.id ?? "";
    const [promptId, setPromptId] = useState<string>(defaultPromptId);
    const selectPrompt = usePromptStore((state) => state.selectPrompt);
    const noteTypes = useNoteTypeStore((state) => state.noteTypes);
    const [selectedNoteTypes, setSelectedNoteTypes] = useState<string[]>(() =>
        noteTypes.map((type) => type.id)
    );
    const [currentStep, setCurrentStep] = useState<GenerationStep>(GenerationSteps.INPUT);
    const [outline, setOutline] = useState<string[]>([]);
    const [cards, setCards] = useState<Card[]>([]);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
    const { toast } = useToast();

    // Reset all state to initial values
    const resetState = async () => {
        setShowCloseConfirmation(false);
        setTopic("");
        setPromptId(defaultPromptId);
        setSelectedNoteTypes(noteTypes.map(type => type.id));
        setOutline([]);
        setCards([]);
        setSelectedCardId(null);
        setCurrentStep(GenerationSteps.INPUT);
        setOpen(false);
    };

    // Update the selected prompt in the store when promptId changes
    React.useEffect(() => {
        if (promptId) {
            selectPrompt(promptId);
        }
    }, [promptId, selectPrompt]);

    const handleSubmitInput = () => {
        setCurrentStep(GenerationSteps.GENERATING_OUTLINE);
        setOutline([]);
        setCards([]);
        handleGeneratingOutline();
    };

    const handleGeneratingOutline = () => {
        setTimeout(() => {
            setOutline(['Section 1', 'Section 2', 'Section 3']);
            setCurrentStep(GenerationSteps.REVIEWING_OUTLINE);
        }, 1000);
    };

    const handleSubmitOutline = () => {
        setCurrentStep(GenerationSteps.GENERATING_CARDS);
        setCards([]);
        handleGeneratingCards();
    };

    const handleGeneratingCards = () => {
        const generateCard = (card: Card) => {
            setTimeout(() => {
                setCards(prevCards => [...prevCards, card]);
            }, 1000);
        };

        // Simulate streaming cards with different timings
        setTimeout(() => generateCard({ id: '1', front: 'Question 1', back: 'Answer 1', status: 'complete' }), 500);
        setTimeout(() => generateCard({ id: '2', front: 'Question 2', back: 'Answer 2', status: 'complete' }), 1500);
        setTimeout(() => generateCard({ id: '3', front: 'Question 3', back: 'Answer 3', status: 'complete' }), 2500);

        // After all cards are generated, transition to review step
        setTimeout(() => {
            setCurrentStep(GenerationSteps.REVIEWING_CARDS);
        }, 3000);
    };

    const handleRegenerateCard = (cardId: string) => {
        setCards(prevCards =>
            prevCards.map(card =>
                card.id === cardId
                    ? { ...card, status: 'generating' }
                    : card
            )
        );

        setTimeout(() => {
            setCards(prevCards =>
                prevCards.map(card =>
                    card.id === cardId
                        ? { ...card, front: 'Regenerated Question', back: 'Regenerated Answer', status: 'complete' }
                        : card
                )
            );
        }, 1000);
    };

    const handleSaveDeck = async () => {
        setCurrentStep(GenerationSteps.SAVING_DECK);

        // Simulate save to Anki
        await new Promise(resolve => setTimeout(resolve, 1500));

        toast({
            title: "Success",
            description: "Your deck has been saved to Anki",
        });
        onCreateDeck(topic);

        handleClose();
    };

    const handleClose = () => {
        void resetState();
    };

    const handleEditCard = (cardId: string) => {
        setSelectedCardId(cardId);
    };

    const handleCancelEdit = () => {
        setSelectedCardId(null);
    };

    const renderLeftContent = () => {
        switch (currentStep) {
            case GenerationSteps.INPUT:
                // Left: input fields
                return (
                    <InputStepLeft
                        topic={topic}
                        setTopic={setTopic}
                        promptId={promptId}
                        setPromptId={setPromptId}
                        selectedNoteTypes={selectedNoteTypes}
                        setSelectedNoteTypes={setSelectedNoteTypes}
                        onNext={handleSubmitInput}
                    />
                );
            case GenerationSteps.GENERATING_OUTLINE:
                // Left: blocked UI where we can't submit but see what we had put in
                return (
                    <div className="opacity-50 pointer-events-none">
                        <InputStepLeft
                            topic={topic}
                            setTopic={setTopic}
                            promptId={promptId}
                            setPromptId={setPromptId}
                            selectedNoteTypes={selectedNoteTypes}
                            setSelectedNoteTypes={setSelectedNoteTypes}
                            onNext={handleSubmitInput}
                            disabled={true}
                        />
                    </div>
                );
            case GenerationSteps.REVIEWING_OUTLINE:
                // Left: options to regen / gen cards
                return (
                    <div className="h-full flex flex-col">
                        <h2 className="text-2xl font-bold mb-4">Review Outline</h2>
                        <div className="flex-grow flex flex-col min-h-0">
                            <div className="flex-grow mb-4"></div>
                            <div className="flex flex-col gap-4">
                                <Button
                                    variant="outline"
                                    onClick={handleGeneratingOutline}
                                    className="w-full"
                                >
                                    Regenerate Outline
                                </Button>
                                <Button
                                    onClick={handleSubmitOutline}
                                    className="w-full"
                                >
                                    Generate Cards
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            case GenerationSteps.GENERATING_CARDS:
                // Left: Loading animation with all cards that are due/generated
                return (
                    <LoadingStep
                        title="Generating Cards"
                        loadingStates={[{ text: "Creating flashcards from outline..." }]}
                        currentStep={0}
                    />
                );
            case GenerationSteps.REVIEWING_CARDS:
                // Left: Nothing until we select a card to edit, and save deck button at the top
                return (
                    <div className="h-full flex flex-col">
                        <h2 className="text-2xl font-bold mb-4">Review Cards</h2>
                        <div className="flex-grow flex flex-col min-h-0">
                            <Button
                                onClick={handleSaveDeck}
                                className="w-full mb-4"
                                disabled={cards.some(card => card.status !== 'complete')}
                            >
                                Save to Anki
                            </Button>

                            {selectedCardId && (
                                <div className="flex-grow">
                                    <div className="border rounded-lg p-4 mb-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-semibold">Edit Card</h3>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleCancelEdit}
                                            >
                                                Cancel
                                            </Button>
                                        </div>

                                        {/* Edit form would go here */}
                                        <div className="mb-4">
                                            {/* This is where you'd implement card editing */}
                                            <div className="text-muted-foreground">
                                                Editing card {selectedCardId}
                                            </div>
                                        </div>

                                        <Button
                                            variant="outline"
                                            onClick={() => handleRegenerateCard(selectedCardId)}
                                            disabled={cards.find(c => c.id === selectedCardId)?.status === 'generating'}
                                            className="w-full"
                                        >
                                            Regenerate Card
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case GenerationSteps.SAVING_DECK:
                // Left: locked UI
                return (
                    <div className="opacity-50 pointer-events-none">
                        <div className="h-full flex flex-col">
                            <h2 className="text-2xl font-bold mb-4">Saving Deck</h2>
                            <div className="flex-grow flex flex-col min-h-0">
                                <Button className="w-full mb-4" disabled>
                                    Save to Anki
                                </Button>

                                {selectedCardId && (
                                    <div className="flex-grow">
                                        <div className="border rounded-lg p-4 mb-4">
                                            <h3 className="text-lg font-semibold mb-4">Edit Card</h3>
                                            {/* Disabled edit form */}
                                            <Button
                                                variant="outline"
                                                disabled
                                                className="w-full"
                                            >
                                                Regenerate Card
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const renderRightContent = () => {
        switch (currentStep) {
            case GenerationSteps.INPUT:
                // Right: tips and getting started
                return <InputStepRight />;

            case GenerationSteps.GENERATING_OUTLINE:
                // Right: loading animation
                return (
                    <LoadingStep
                        title="Generating Outline"
                        loadingStates={[{ text: "Analyzing topic and generating outline..." }]}
                        currentStep={0}
                    />
                );

            case GenerationSteps.REVIEWING_OUTLINE:
                // Right: outline preview
                return (
                    <div className="h-full flex flex-col">
                        <h2 className="text-xl font-semibold mb-4">Generated Outline</h2>
                        <div className="flex-grow flex flex-col min-h-0">
                            <div className="flex-grow overflow-y-auto mb-4 space-y-2">
                                {outline.map((section, index) => (
                                    <div key={index} className="p-4 border rounded-lg">
                                        {section}
                                    </div>
                                ))}
                            </div>
                            <OutlineStepRight />
                        </div>
                    </div>
                );

            case GenerationSteps.GENERATING_CARDS:
                // Right: stream in generated cards (no loading animation here)
                return (
                    <div className="h-full flex flex-col">
                        <h2 className="text-xl font-semibold mb-4">Generating Cards</h2>
                        <div className="flex-grow flex flex-col min-h-0">
                            <div className="flex-grow overflow-y-auto mb-4 space-y-2">
                                {cards.map((card) => (
                                    <div
                                        key={card.id}
                                        className={cn(
                                            "border rounded-lg p-4 transition-all duration-300",
                                            card.status === 'pending' && "opacity-50",
                                            card.status === 'generating' && "border-green-500",
                                            card.status === 'complete' && "border-blue-500"
                                        )}
                                    >
                                        <div className="space-y-4">
                                            <div>
                                                <div className="font-semibold mb-2">Front</div>
                                                <div className="p-2 bg-muted rounded">{card.front}</div>
                                            </div>
                                            <div>
                                                <div className="font-semibold mb-2">Back</div>
                                                <div className="p-2 bg-muted rounded">{card.back}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case GenerationSteps.REVIEWING_CARDS:
                // Right: fully streamed in generated cards
                return (
                    <div className="h-full flex flex-col">
                        <h2 className="text-xl font-semibold mb-4">Review Cards</h2>
                        <div className="flex-grow flex flex-col min-h-0">
                            <div className="flex-grow overflow-y-auto mb-4 space-y-2">
                                {cards.map((card) => (
                                    <div
                                        key={card.id}
                                        className={cn(
                                            "border rounded-lg p-4 transition-all duration-300 cursor-pointer",
                                            card.status === 'complete' && "border-blue-500",
                                            selectedCardId === card.id && "ring-2 ring-primary",
                                            "hover:border-primary"
                                        )}
                                        onClick={() => handleEditCard(card.id)}
                                    >
                                        <div className="space-y-4">
                                            <div>
                                                <div className="font-semibold mb-2">Front</div>
                                                <div className="p-2 bg-muted rounded">{card.front}</div>
                                            </div>
                                            <div>
                                                <div className="font-semibold mb-2">Back</div>
                                                <div className="p-2 bg-muted rounded">{card.back}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case GenerationSteps.SAVING_DECK:
                // Right: locked UI
                return (
                    <div className="opacity-50 pointer-events-none">
                        <div className="h-full flex flex-col">
                            <h2 className="text-xl font-semibold mb-4">Saving Deck</h2>
                            <div className="flex-grow flex flex-col min-h-0">
                                <div className="flex-grow overflow-y-auto mb-4 space-y-2">
                                    {cards.map((card) => (
                                        <div
                                            key={card.id}
                                            className="border rounded-lg p-4"
                                        >
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="font-semibold mb-2">Front</div>
                                                    <div className="p-2 bg-muted rounded">{card.front}</div>
                                                </div>
                                                <div>
                                                    <div className="font-semibold mb-2">Back</div>
                                                    <div className="p-2 bg-muted rounded">{card.back}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <>
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        title="Create new deck"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="sr-only">Create new deck</span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent
                    className="max-w-[90vw] w-[90vw] max-h-[90vh] h-[90vh] pt-4"
                    onEscapeKeyDown={(e) => {
                        e.preventDefault();
                        setShowCloseConfirmation(true);
                    }}
                >
                    <AlertDialogHeader className="sr-only">
                        <AlertDialogTitle>Create New Deck</AlertDialogTitle>
                    </AlertDialogHeader>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 z-50"
                        onClick={() => setShowCloseConfirmation(true)}
                    >
                        <X className="h-4 w-4" />
                    </Button>

                    <div className="flex h-full">
                        {/* Left Side */}
                        <div className="flex-1 border-r p-8">
                            {renderLeftContent()}
                        </div>

                        {/* Right Side */}
                        <div className="flex-1 p-8 overflow-y-auto">
                            {renderRightContent()}
                        </div>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showCloseConfirmation} onOpenChange={setShowCloseConfirmation}>
                <AlertDialogContent className="max-w-[400px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-semibold">Close Deck Creation?</AlertDialogTitle>
                        <AlertDialogDescription className="text-base">
                            Any unsaved progress will be lost. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="min-w-[100px]">
                            Keep Editing
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleClose}
                            className="min-w-[100px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Close Dialog
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
} 