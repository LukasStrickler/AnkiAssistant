"use client";

import React, { useState } from "react";
import { Plus, X, ChevronRight } from "lucide-react";
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
import { useNoteVariantStore } from "@/stores/note-variant-store";
import { useToast } from "@/hooks/use-toast";
import { useLoadingStates } from "@/hooks/use-loading-states";
import {
    InputStep,
    CardEditor,
    OutlineCardsView,
    EnhancedLoadingStep,
    GenerationSteps,
    type GenerationStep,
    type Card,
    type OutlineItem,
    OutlineLoadingStates,
    CardsLoadingStates,
    SavingLoadingStates,
    OutlineEditor,
    CompactLoadingIndicator
} from "./steps";
import { HelpPanel } from "./steps/input/help-panel";
import { Separator } from "@/components/ui/separator";
import { preprocessInput, isValidInput } from "./lib-inferencing/outline/preprocessing";
import { checkOutlineQuality } from "./lib-inferencing/outline/qualityCheck";
import { optimizeOutline } from "./lib-inferencing/outline/qualityOptimize";
import { generateOutline } from "./lib-inferencing/outline/generation";
import { generateCard } from "./lib-inferencing/cards/generation";
import { checkCardQuality } from "./lib-inferencing/cards/qualityCheck";
import { useModelStore } from "@/stores/model-store";
import { logger } from "@/lib/logger";
interface CreateDeckDialogProps {
    onCreateDeck: (deckName: string) => void;
}

export function CreateDeckDialog({ onCreateDeck }: CreateDeckDialogProps) {
    const [userInputContent, setUserInputContent] = useState("");
    const prompts = usePromptStore((state) => state.prompts);
    const defaultPromptId = prompts[0]?.id ?? "";
    const [promptId, setPromptId] = useState<string>(defaultPromptId);
    // const selectPrompt = usePromptStore((state) => state.selectPrompt);

    const noteVariants = useNoteVariantStore((state) => state.variants);
    const [selectedNoteVariants, setSelectedNoteVariants] = useState<string[]>(() =>
        noteVariants.map((type) => type.id)
    );
    const [currentStep, setCurrentStep] = useState<GenerationStep>(GenerationSteps.INPUT);
    const [outline, setOutline] = useState<OutlineItem[]>([]);
    const [selectedOutlineId, setSelectedOutlineId] = useState<number>();
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [open, setOpen] = useState(false);
    const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
    const [editingOutline, setEditingOutline] = useState<OutlineItem | null>(null);
    const { toast } = useToast();

    // Initialize outline loading states with our new system
    const outlineLoadingStates = useLoadingStates([
        // Required states that always run
        { id: 'ANALYZE', text: OutlineLoadingStates.ANALYZE, required: true }, // preprocess input
        { id: 'GENERATE', text: OutlineLoadingStates.GENERATE, required: true }, // generate outline
        { id: 'CHECK', text: OutlineLoadingStates.CHECK, required: true }, // check outline
        // Conditional state that only runs if needed
        { id: 'OPTIMIZE', text: OutlineLoadingStates.OPTIMIZE, required: false } // optimize outline (conditional)
    ]);

    // Initialize cards loading states with our new system
    const cardsLoadingStates = useLoadingStates([
        { id: 'GENERATE', text: CardsLoadingStates.GENERATE, required: true, replacementParams: { current: 1, total: 0 } }, // generate cards
    ]);

    // Initialize saving loading states
    const savingLoadingStates = useLoadingStates([
        // All states in the saving process are required
        { id: 'PREPARE', text: SavingLoadingStates.PREPARE, required: true }, // md to html
        { id: 'CONNECT', text: SavingLoadingStates.CONNECT, required: true }, // check connection
        { id: 'SAVE', text: SavingLoadingStates.SAVE, required: true }, // save to anki
        { id: 'FINALIZE', text: SavingLoadingStates.FINALIZE, required: true } // check if all cards are saved
    ]);

    // Get the overview model from the model store
    const overviewModel = useModelStore((state) => state.overviewModel);
    const availableModels = useModelStore((state) => state.availableModels);

    // Reset all state to initial values
    const resetState = async () => {
        setShowCloseConfirmation(false);
        setUserInputContent("");
        setPromptId(defaultPromptId);
        setSelectedNoteVariants(noteVariants.map(variant => variant.id));
        setOutline([]);
        setSelectedCard(null);
        setCurrentStep(GenerationSteps.INPUT);
        setOpen(false);
        setSelectedOutlineId(undefined);
        setSelectedCard(null);
        setEditingOutline(null);

        // Reset loading states
        outlineLoadingStates.resetStates();
        cardsLoadingStates.resetStates();
        savingLoadingStates.resetStates();
    };

    // Update the selected prompt in the store when promptId changes
    // React.useEffect(() => {
    //     if (promptId) {
    //         selectPrompt(promptId);
    //     }
    // }, [promptId, selectPrompt]);

    const handleSubmitInput = () => {
        void handleGeneratingOutline();
    };

    const handleGeneratingOutline = async () => {
        const prevOutline = [...outline];

        setCurrentStep(GenerationSteps.GENERATING_OUTLINE);
        setOutline([]);

        // Reset outline loading states to ensure we have the proper configuration
        outlineLoadingStates.resetStates([
            // Required states that always run
            { id: 'ANALYZE', text: OutlineLoadingStates.ANALYZE, required: true },
            { id: 'GENERATE', text: OutlineLoadingStates.GENERATE, required: true },
            { id: 'CHECK', text: OutlineLoadingStates.CHECK, required: true },
            // Conditional state that only runs if needed
            { id: 'OPTIMIZE', text: OutlineLoadingStates.OPTIMIZE, required: false }
        ]);

        // 1. Start with ANALYZE - this is a required state
        outlineLoadingStates.setCurrentState('ANALYZE');

        // Preprocess user input
        const userInputContentProcessed = await preprocessInput(userInputContent);

        // Validate the input
        if (!isValidInput(userInputContentProcessed)) {
            toast({
                title: "Invalid input",
                description: "Please provide a valid input with 1-1000 characters.",
                variant: "destructive",
            });
            setCurrentStep(GenerationSteps.INPUT);
            return;
        }

        // 2. Move to GENERATE - this is a required state
        outlineLoadingStates.setCurrentState('GENERATE');

        // Use the overview model from the model store, or fall back to first available model or default
        const model = overviewModel ?? availableModels[0]
        if (!model) {
            toast({
                title: "No model available",
                description: "Please select a model in the settings.",
                variant: "destructive",
            });
            return;
        }

        // Rest of model validation code...
        let selectedPrompt = prompts.find(prompt => prompt.id === promptId);
        if (!selectedPrompt?.systemMessage) {
            selectedPrompt = prompts[0];
        }

        if (!selectedPrompt?.systemMessage) {
            toast({
                title: "No valid prompt available",
                description: "Please check your prompt configuration.",
                variant: "destructive",
            });
            return;
        }

        // Generate example values and prompt
        const existingDecks = "'Uni::Sem 5::Economics::Basics::Introduction to Economics', 'Uni::Sem 5::Economics::Basics::Economics::Comparison'"
        const selectedCardTypes = "'Q&A', 'Definition'"
        const exampleOutput = "[{\"concept\":\"Introduction to Economics\",\"key_points\":\"Economics studies how individuals, businesses, and governments allocate resources.\",\"deck\":\"Uni::Sem 5::Economics::Basics::Introduction to Economics\",\"card_type\":\"Q&A\"},{\"concept\":\"Micro vs. Macro Economics\",\"key_points\":\"Microeconomics focuses on individual decision-making (supply and demand), while Macroeconomics deals with large-scale economic factors (GDP, inflation).\",\"deck\":\"Uni::Sem 5::Economics::Basics::Economics::Comparison\",\"card_type\":\"Definition\"}]"

        const totalPrompt = selectedPrompt.systemMessage
            .replace("{existingDecks}", existingDecks)
            .replace("{selectedCardTypes}", selectedCardTypes)
            .replace("{userInput}", userInputContentProcessed)
            .replace("{exampleOutput}", exampleOutput);

        generateOutline(
            model,
            totalPrompt,
            (update) => {
                // Handle streaming updates from the outline generation
                setOutline(update.result);
            }
        ).then(async finalResult => {
            logger.info("finalResult", finalResult);

            // 3. CHECK is a required state, always run it
            outlineLoadingStates.setCurrentState('CHECK');

            // Perform quality check on the outline
            const isQualityGood = await checkOutlineQuality(finalResult.result, model, userInputContentProcessed);

            if (!isQualityGood) {
                // 4. OPTIMIZE is conditional, only run if quality check fails
                outlineLoadingStates.setCurrentState('OPTIMIZE');

                // Apply optimization to the outline    
                const optimizedOutline = await optimizeOutline(finalResult.result, model, userInputContentProcessed);
                setOutline(optimizedOutline);
            }

            // Move to the REVIEWING_OUTLINE step regardless of whether optimization was needed
            setCurrentStep(GenerationSteps.REVIEWING_OUTLINE);

        }).catch(error => {
            logger.error("Error generating outline:", error);
            toast({
                title: "Error",
                description: "Failed to generate outline. Please try again.",
                variant: "destructive",
            });
            setCurrentStep(GenerationSteps.INPUT);
        });
    };

    const handleSubmitOutline = () => {
        setCurrentStep(GenerationSteps.GENERATING_CARDS);
        handleGeneratingCards();
    };

    const handleGenerateOneCard = async (outlineItem: OutlineItem) => {

        // Set card status to generating
        setOutline(prevOutline =>
            prevOutline.map(item =>
                item.id === outlineItem.id
                    ? { ...item, status: "generating", progress: 0 }
                    : item
            )
        );



        try {
            // Generate the card using the lib-inferencing
            const generatedCard = await generateCard(outlineItem);

            // Check card quality
            const isValid = checkCardQuality(generatedCard);

            if (isValid) {
                // Update outline item with generated card and mark as card-review immediately
                setOutline(prevOutline =>
                    prevOutline.map(item =>
                        item.id === outlineItem.id
                            ? {
                                ...item,
                                status: "card-review",
                                progress: 100,
                                card: generatedCard
                            }
                            : item
                    )
                );


                return true;
            } else {
                // Handle invalid card case
                setOutline(prevOutline =>
                    prevOutline.map(item =>
                        item.id === outlineItem.id
                            ? {
                                ...item,
                                status: "error",
                                error: "Generated card failed quality check",
                                progress: 0
                            }
                            : item
                    )
                );
                return false;
            }
        } catch (error) {
            // Handle error for individual card generation
            logger.error(`Error generating card for ${outlineItem.concept}:`, error);

            // Update outline item to error state
            setOutline(prevOutline =>
                prevOutline.map(item =>
                    item.id === outlineItem.id
                        ? {
                            ...item,
                            status: "error",
                            error: "Failed to generate card",
                            progress: 0
                        }
                        : item
                )
            );
            return false;
        }
    }

    const handleGeneratingCards = async () => {
        setCurrentStep(GenerationSteps.GENERATING_CARDS);

        cardsLoadingStates.resetStates([
            { id: 'GENERATE', text: "Generating card {current}/{total}: {concept}...", required: true, replacementParams: { current: 1, total: outline.length } }
        ]);

        try {
            const outlineToProcess = outline;

            if (outlineToProcess.length === 0) {
                // If no cards need to be generated, move directly to review
                setCurrentStep(GenerationSteps.REVIEWING_CARDS);
                return;
            }

            setOutline(prevOutline =>
                prevOutline.map(item =>
                    outlineToProcess.some(o => o.id === item.id)
                        ? { ...item, status: "pending" }
                        : item
                )
            );

            for (const item of outlineToProcess) {
                // Update loading state to indicate which card we're working on
                cardsLoadingStates.updateStateParams('GENERATE', {
                    current: item.id,
                    total: outlineToProcess.length,
                    concept: item.concept
                });
                await handleGenerateOneCard(item);
            }

            setCurrentStep(GenerationSteps.REVIEWING_CARDS);

        } catch (error) {
            void resetState();
            logger.error("Error in card generation process:", error);
            toast({
                title: "Error",
                description: "Failed to generate cards. Check console for more details.",
                variant: "destructive",
            });
        }
    };

    const handleRegenerateCard = (outlineItem: OutlineItem) => {
        // Clear the card and start generating a new one
        setOutline(prevOutline =>
            prevOutline.map(item =>
                item.id === outlineItem.id
                    ? { ...item, status: "pending", card: undefined }
                    : item
            )
        );

        // Stay in the current step (likely REVIEWING_CARDS) 
        // but make sure handleGenerateOneCard updates the loading state
        cardsLoadingStates.updateStateParams('GENERATE', {
            current: 1,
            total: 1,
            concept: outlineItem.concept
        });
        void handleGenerateOneCard(outlineItem);
    };

    const handleRegenerateAllCards = () => {
        setCurrentStep(GenerationSteps.GENERATING_CARDS);

        // remove all cards from the outline
        setOutline(prevOutline =>
            prevOutline.map(item =>
                item.status === "card-review" ? { ...item, status: "pending", card: undefined } : item
            )
        );

        void handleGeneratingCards();
    };

    const handleSaveDeck = async () => {
        setCurrentStep(GenerationSteps.SAVING_DECK);
        const totalCards = outline.filter(item => item.status === "card-review").length;

        // Reset saving loading states with proper initial parameters
        // For saving, we'll make all states required since they're all essential steps
        savingLoadingStates.resetStates([
            { id: 'PREPARE', text: SavingLoadingStates.PREPARE, required: true },
            { id: 'CONNECT', text: SavingLoadingStates.CONNECT, required: true },
            { id: 'SAVE', text: SavingLoadingStates.SAVE, required: true, replacementParams: { current: 1, total: totalCards } },
            { id: 'FINALIZE', text: SavingLoadingStates.FINALIZE, required: true }
        ]);

        // PREPARE step (required) - convert markdown to HTML or other preparation
        savingLoadingStates.setCurrentState('PREPARE');
        await new Promise(resolve => setTimeout(resolve, 500));

        // Conditionally add error-handling state if needed
        const hasConnectionIssue = false; // Simulated condition
        if (hasConnectionIssue) {
            // Add a conditional state for reconnection attempts
            savingLoadingStates.addConditionalState(
                {
                    id: 'RECONNECT',
                    text: "Reconnecting to Anki...",
                    required: false,
                    conditional: true
                },
                'PREPARE'
            );
            savingLoadingStates.setCurrentState('RECONNECT');
            await new Promise(resolve => setTimeout(resolve, 1000));
            // After reconnection, remove this conditional state
            savingLoadingStates.removeConditionalState('RECONNECT');
        }

        // CONNECT step (required) - establish connection to Anki
        savingLoadingStates.setCurrentState('CONNECT');
        await new Promise(resolve => setTimeout(resolve, 500));

        // SAVE step (required) - save cards one by one
        savingLoadingStates.setCurrentState('SAVE');
        for (let i = 0; i < totalCards; i++) {
            savingLoadingStates.updateStateParams('SAVE', {
                current: i + 1,
                total: totalCards
            });

            // Simulate occasional saving error for a specific card
            if (i === 2 && totalCards > 3) {
                // Add a conditional state for retrying the save
                savingLoadingStates.addConditionalState(
                    {
                        id: 'RETRY',
                        text: `Retrying save for card ${i + 1}...`,
                        required: false,
                        conditional: true
                    },
                    'SAVE'
                );

                savingLoadingStates.setCurrentState('RETRY');
                await new Promise(resolve => setTimeout(resolve, 800));

                // After retry, remove this conditional state
                savingLoadingStates.removeConditionalState('RETRY');
                savingLoadingStates.setCurrentState('SAVE');
            }

            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // FINALIZE step (required) - verify all cards were saved
        savingLoadingStates.setCurrentState('FINALIZE');
        await new Promise(resolve => setTimeout(resolve, 500));

        toast({
            title: "Success",
            description: "Your deck has been saved to Anki",
        });
        onCreateDeck(userInputContent);

        handleClose();
    };

    const handleClose = () => {
        void resetState();
    };

    const handleEditOutline = (outlineItem: OutlineItem) => {
        // Skip if the outline item is in pending state to prevent editing
        if (outlineItem.status === "pending" || outlineItem.status === "generating") {
            return;
        }

        setSelectedOutlineId(outlineItem.id);
        setSelectedCard(null);
        setEditingOutline(outlineItem);
    };

    const handleEditCard = (card: Card) => {
        setSelectedOutlineId(card.id);
        setEditingOutline(null);
        setSelectedCard(card);
        setOutline(prevOutline =>
            prevOutline.map(item =>
                item.card?.id === card.id
                    ? { ...item, card }
                    : item
            )
        );
    };

    const handleOutlineChange = (updatedOutline: OutlineItem) => {
        setEditingOutline(updatedOutline);
        setOutline(prevOutline =>
            prevOutline.map(item =>
                item.id === updatedOutline.id
                    ? updatedOutline
                    : item
            )
        );
    };

    const isCardGenerationInProgress = () => {
        return outline.some(item => item.status === "generating" || item.status === "pending");
    };

    const renderLeftContent = () => {
        switch (currentStep) {
            case GenerationSteps.INPUT:
                return (
                    <InputStep
                        topic={userInputContent}
                        setTopic={setUserInputContent}
                        promptId={promptId}
                        setPromptId={setPromptId}
                        selectedNoteVariants={selectedNoteVariants}
                        setSelectedNoteVariants={setSelectedNoteVariants}
                        onNext={handleSubmitInput}
                    />
                );
            case GenerationSteps.GENERATING_OUTLINE:
            case GenerationSteps.SAVING_DECK:
                return (
                    <EnhancedLoadingStep
                        title={currentStep === GenerationSteps.GENERATING_OUTLINE ? "Generating Outline" : "Saving Deck"}
                        loadingConfig={
                            currentStep === GenerationSteps.GENERATING_OUTLINE ? outlineLoadingStates.config : savingLoadingStates.config
                        }
                    />
                );
            case GenerationSteps.REVIEWING_OUTLINE:
            case GenerationSteps.REVIEWING_CARDS:
            case GenerationSteps.GENERATING_CARDS:
                if (selectedCard) {
                    const outlineItem = outline.find(item => item.card?.id === selectedCard.id);
                    return (
                        <CardEditor
                            card={selectedCard}
                            onEditCard={handleEditCard}
                            onClose={() => {
                                setSelectedCard(null);
                                setSelectedOutlineId(undefined);
                            }}
                            onSaveDeck={handleSaveDeck}
                            onSwitchToOutline={outlineItem ? () => handleEditOutline(outlineItem) : undefined}
                        />
                    );
                }
                if (editingOutline) {
                    return (
                        <OutlineEditor
                            outlineItem={editingOutline}
                            onOutlineChange={handleOutlineChange}
                            onClose={() => {
                                setEditingOutline(null);
                                setSelectedOutlineId(undefined);
                            }}
                            onSwitchToCard={editingOutline.card ? () => handleEditCard(editingOutline.card!) : undefined}
                        />
                    );
                }
                return (
                    <div className="h-full flex flex-col">
                        <h2 className="text-2xl font-bold mb-4">
                            {currentStep === GenerationSteps.REVIEWING_OUTLINE ? "Review Outline" : "Review Cards"}
                        </h2>

                        {/* Show compact loading indicator during card generation */}
                        <div className="flex-grow" />

                        {!editingOutline && !selectedCard && (
                            <>
                                {(currentStep === GenerationSteps.GENERATING_CARDS && isCardGenerationInProgress()) ||
                                    (currentStep === GenerationSteps.REVIEWING_CARDS && isCardGenerationInProgress()) ? (
                                    <div className="w-full">
                                        <CompactLoadingIndicator loadingConfig={cardsLoadingStates.config} />
                                    </div>
                                ) : (
                                    <Button
                                        onClick={currentStep === GenerationSteps.REVIEWING_OUTLINE ? handleSubmitOutline : handleSaveDeck}
                                        className="w-full"
                                    >
                                        {currentStep === GenerationSteps.REVIEWING_OUTLINE ? (
                                            <>Generate Cards <ChevronRight className="ml-2" /></>
                                        ) : (
                                            <>Save to Anki <ChevronRight className="ml-2" /></>
                                        )}
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    const renderRightContent = () => {
        switch (currentStep) {
            case GenerationSteps.INPUT:
                return <HelpPanel />;
            case GenerationSteps.GENERATING_OUTLINE:
            case GenerationSteps.REVIEWING_OUTLINE:
            case GenerationSteps.GENERATING_CARDS:
            case GenerationSteps.REVIEWING_CARDS:
            case GenerationSteps.SAVING_DECK:
                return (
                    <div className="flex flex-col h-full">
                        <OutlineCardsView
                            outline={outline}
                            currentStep={currentStep}
                            selectedOutlineId={selectedOutlineId}
                            onRegenerateOutline={
                                currentStep === GenerationSteps.REVIEWING_OUTLINE
                                    ? handleGeneratingOutline
                                    : undefined
                            }
                            onRegenerateCards={
                                currentStep === GenerationSteps.REVIEWING_CARDS && !isCardGenerationInProgress()
                                    ? handleRegenerateAllCards
                                    : undefined
                            }
                            onRegenerateCard={
                                (currentStep === GenerationSteps.REVIEWING_CARDS && !isCardGenerationInProgress()) ||
                                    currentStep === GenerationSteps.GENERATING_CARDS
                                    ? handleRegenerateCard
                                    : undefined
                            }
                            onEditCard={
                                (currentStep === GenerationSteps.REVIEWING_CARDS || currentStep === GenerationSteps.GENERATING_CARDS)
                                    ? handleEditCard
                                    : undefined
                            }
                            onEditOutline={
                                (currentStep === GenerationSteps.REVIEWING_OUTLINE ||
                                    currentStep === GenerationSteps.REVIEWING_CARDS ||
                                    currentStep === GenerationSteps.GENERATING_CARDS)
                                    ? handleEditOutline
                                    : undefined
                            }
                            onSaveDeck={undefined}
                        />
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

                    <div className="flex h-full overflow-hidden">
                        {/* Left Side */}
                        <div className="flex-1 p-8">
                            {renderLeftContent()}
                        </div>
                        <Separator orientation="vertical" />
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