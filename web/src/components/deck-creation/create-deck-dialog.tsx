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
    OutlineEditor
} from "./steps";
import { HelpPanel } from "./steps/input/help-panel";
import { Separator } from "@/components/ui/separator";
import { preprocessInput, isValidInput } from "./lib-inferencing/outline/preprocessing";
import { checkOutlineQuality } from "./lib-inferencing/outline/qualityCheck";
import { optimizeOutline } from "./lib-inferencing/outline/qualityOptimize";
import { generateOutline } from "./lib-inferencing/outline/generation";
import { useModelStore } from "@/stores/model-store";
import { logger } from "@/lib/logger";
interface CreateDeckDialogProps {
    onCreateDeck: (deckName: string) => void;
}

const sampleCards: Card[] = [
    {
        "id": 1,
        "front": "What is Economics?",
        "back": "Economics is the study of how individuals, businesses, and governments allocate resources. It involves understanding the production, distribution, and consumption of goods and services.",
    },
    {
        "id": 2,
        "front": "Microeconomics vs. Macroeconomics",
        "back": "**Microeconomics** focuses on individual decision-making, such as supply and demand of goods and services. It examines the behavior of individual consumers and firms in making decisions regarding consumption, production, and resource allocation.\n\n**Macroeconomics**, on the other hand, deals with large-scale economic factors like Gross Domestic Product (GDP), unemployment rates, and inflation. It analyzes the overall performance of an economy and its institutions.",
    },
    // {
    //     "id": 3,
    //     "front": "What is the Law of Demand?",
    //     "back": "The Law of Demand states that as price decreases, demand for a good or service increases. This relationship between price and quantity demanded is fundamental to understanding supply and demand in economics.",
    // },
    // {
    //     "id": 4,
    //     "front": "What is the Law of Supply?",
    //     "back": "The Law of Supply states that as the price of a good or service increases, the quantity supplied also increases. This relationship reflects the incentive for producers to supply more when prices rise, as it becomes profitable to do so.",
    // }
]



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
        // is valid input
        { id: 'ANALYZE', text: OutlineLoadingStates.ANALYZE }, // preprocess input
        { id: 'GENERATE', text: OutlineLoadingStates.GENERATE }, // generate outline
        { id: 'CHECK', text: OutlineLoadingStates.CHECK }, // check outline
        { id: 'OPTIMIZE', text: OutlineLoadingStates.OPTIMIZE } // optimize outline (optional)
    ]);

    // Initialize cards loading states with our new system
    const cardsLoadingStates = useLoadingStates([
        { id: 'GENERATE', text: CardsLoadingStates.GENERATE, replacementParams: { current: 1, total: 0 } }, // generate cards
        { id: 'CHECK', text: CardsLoadingStates.CHECK }, // check cards
        //  fix cards if needed
        { id: 'OPTIMIZE', text: CardsLoadingStates.OPTIMIZE } // optimize cards (optional)
    ]);

    // Initialize saving loading states
    const savingLoadingStates = useLoadingStates([
        { id: 'PREPARE', text: SavingLoadingStates.PREPARE }, //md to html
        { id: 'CONNECT', text: SavingLoadingStates.CONNECT }, // check connection
        { id: 'SAVE', text: SavingLoadingStates.SAVE }, // save to anki
        { id: 'FINALIZE', text: SavingLoadingStates.FINALIZE } // check if all cards are s^aved (load corresponding decks and check amounts)
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
        // 1. Start with ANALYZE
        outlineLoadingStates.setCurrentState('ANALYZE');
        // Preprocess user input
        const userInputContentProcessed = preprocessInput(userInputContent);

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

        // 2. Move to GENERATE
        setTimeout(() => {
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
            //TODO: make restricitons to not be able to use the deck creation when no model is available

            let selectedPrompt = prompts.find(prompt => prompt.id === promptId);
            // if not found, use the default prompt
            if (!selectedPrompt?.systemMessage) {
                selectedPrompt = prompts[0];
            }

            // Ensure we have a valid prompt with system message
            if (!selectedPrompt?.systemMessage) {
                toast({
                    title: "No valid prompt available",
                    description: "Please check your prompt configuration.",
                    variant: "destructive",
                });
                return;
            }

            // TODO: TIM get real values
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
                // 3. CHECK the results
                outlineLoadingStates.setCurrentState('CHECK');

                // Perform quality check on the outline
                const isQualityGood = await checkOutlineQuality(finalResult.result, model, userInputContentProcessed);

                if (!isQualityGood) {
                    // 4. If quality check fails, OPTIMIZE
                    outlineLoadingStates.setCurrentState('OPTIMIZE');

                    // Apply optimization to the outline    
                    const optimizedOutline = await optimizeOutline(finalResult.result, model, userInputContentProcessed);
                    setOutline(optimizedOutline);

                    // Finally move to the REVIEWING_OUTLINE step
                    setCurrentStep(GenerationSteps.REVIEWING_OUTLINE);
                } else {
                    setCurrentStep(GenerationSteps.REVIEWING_OUTLINE);
                }
            }).catch(error => {
                logger.error("Error generating outline:", error);
                toast({
                    title: "Error",
                    description: "Failed to generate outline. Please try again.",
                    variant: "destructive",
                });
                setCurrentStep(GenerationSteps.INPUT);
            });
        }, 1000);
    };

    const handleSubmitOutline = () => {
        setCurrentStep(GenerationSteps.GENERATING_CARDS);
        handleGeneratingCards();
    };

    const handleGeneratingCards = () => {
        const totalCards = sampleCards.length;

        // Reset cards loading states and set proper initial parameters
        cardsLoadingStates.resetStates([
            { id: 'GENERATE', text: CardsLoadingStates.GENERATE, replacementParams: { current: 1, total: totalCards } },
            { id: 'CHECK', text: CardsLoadingStates.CHECK },
            { id: 'OPTIMIZE', text: CardsLoadingStates.OPTIMIZE }
        ]);

        // Start with GENERATE for first card
        cardsLoadingStates.setCurrentState('GENERATE');

        //set all outline items to pending
        setOutline(prevOutline =>
            prevOutline.map(item => ({ ...item, status: "pending" }))
        );

        // Sequential card generation - each completes before moving to next
        const generateCardSequentially = (index = 0) => {
            if (index >= totalCards) {
                // All cards generated, move to check and optimize
                setTimeout(() => {
                    cardsLoadingStates.setCurrentState('CHECK');

                    setTimeout(() => {
                        cardsLoadingStates.setCurrentState('OPTIMIZE');

                        setTimeout(() => {
                            setCurrentStep(GenerationSteps.REVIEWING_CARDS);
                        }, 1000);
                    }, 1000);
                }, 500);
                return;
            }

            const currentCardNum = index + 1;

            // Update the current card number in the loading text
            cardsLoadingStates.updateStateParams('GENERATE', {
                current: currentCardNum,
                total: totalCards
            });

            // Set current item to generating status
            setOutline(prevOutline =>
                prevOutline.map(item =>
                    item.id === currentCardNum
                        ? { ...item, status: "generating" }
                        : item
                )
            );

            // Simulate card generation
            setTimeout(() => {
                // Card 2 (index 1) will fail and need fixing
                if (index === 1) {
                    // Update outline item status
                    setOutline(prevOutline =>
                        prevOutline.map(item =>
                            item.id === currentCardNum
                                ? { ...item, status: "fixing-error", error: "Failed to generate card" }
                                : item
                        )
                    );

                    // Inject a FIX state after GENERATE
                    cardsLoadingStates.addConditionalState(
                        {
                            id: 'FIX',
                            text: CardsLoadingStates.FIX,
                            conditional: true,
                            replacementParams: { current: currentCardNum, total: totalCards }
                        },
                        'GENERATE'
                    );

                    // Move to FIX state
                    setTimeout(() => {
                        cardsLoadingStates.setCurrentState('FIX');

                        // After fixing, update the outline item and proceed
                        setTimeout(() => {
                            setOutline(prevOutline =>
                                prevOutline.map(item =>
                                    item.id === currentCardNum
                                        ? {
                                            ...item,
                                            status: "card-review",
                                            error: undefined,
                                            card: sampleCards[index]
                                        }
                                        : item
                                )
                            );

                            // Move back to GENERATE for the next card
                            cardsLoadingStates.setCurrentState('GENERATE');
                            generateCardSequentially(index + 1);
                        }, 1500);
                    }, 800);
                } else {
                    // Update outline item with card and status
                    setOutline(prevOutline =>
                        prevOutline.map(item =>
                            item.id === currentCardNum
                                ? {
                                    ...item,
                                    status: "card-review",
                                    card: sampleCards[index]
                                }
                                : item
                        )
                    );

                    // Proceed to next card
                    setTimeout(() => {
                        generateCardSequentially(index + 1);
                    }, 800);
                }
            }, 1500);
        };

        // Start the sequential generation with the first card
        generateCardSequentially();
    };

    const handleRegenerateAllCards = () => {
        //TOOD: implement this
        setCurrentStep(GenerationSteps.GENERATING_CARDS);

        const prevOutline = [...outline];
        setOutline(prevOutline =>
            prevOutline.map(item => ({ ...item, status: "pending", card: undefined }))
        );

        handleGeneratingCards();
    };

    const handleSaveDeck = async () => {
        setCurrentStep(GenerationSteps.SAVING_DECK);
        const totalCards = outline.filter(item => item.status === "card-review").length;

        // Reset saving loading states with proper initial parameters
        savingLoadingStates.resetStates([
            { id: 'PREPARE', text: SavingLoadingStates.PREPARE },
            { id: 'CONNECT', text: SavingLoadingStates.CONNECT },
            { id: 'SAVE', text: SavingLoadingStates.SAVE, replacementParams: { current: 1, total: totalCards } },
            { id: 'FINALIZE', text: SavingLoadingStates.FINALIZE }
        ]);

        // Simulate save to Anki with steps
        savingLoadingStates.setCurrentState('PREPARE');
        await new Promise(resolve => setTimeout(resolve, 500));

        savingLoadingStates.setCurrentState('CONNECT');
        await new Promise(resolve => setTimeout(resolve, 500));

        // Save cards one by one
        savingLoadingStates.setCurrentState('SAVE');
        for (let i = 0; i < totalCards; i++) {
            savingLoadingStates.updateStateParams('SAVE', {
                current: i + 1,
                total: totalCards
            });
            await new Promise(resolve => setTimeout(resolve, 300));
        }

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

    const handleRegenerateCard = (outlineItem: OutlineItem) => {
        const prevOutline = [...outline]
        //clear the card from the outline item
        prevOutline.map(item =>
            item.id === outlineItem.id
                ? { ...item, card: undefined }
                : item
        );

        // Update the outline item status
        setOutline(prevOutline =>
            prevOutline.map(item =>
                item.id === outlineItem.id
                    ? { ...item, status: "generating", card: undefined }
                    : item
            )
        );

        // Simulate card regeneration
        setTimeout(() => {
            setOutline(prevOutline =>
                prevOutline.map(item =>
                    item.id === outlineItem.id
                        ? {
                            ...item,
                            status: "card-review",
                            card: {
                                ...item.card!,
                                front: `Regenerated front for ${item.concept}`,
                                back: `Regenerated back for ${item.concept}`
                            }
                        }
                        : item
                )
            );
        }, 1500);
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
            case GenerationSteps.GENERATING_CARDS:
            case GenerationSteps.SAVING_DECK:
                return (
                    <EnhancedLoadingStep
                        title={currentStep === GenerationSteps.GENERATING_OUTLINE ? "Generating Outline" :
                            currentStep === GenerationSteps.GENERATING_CARDS ? "Generating Cards" :
                                "Saving Deck"}
                        loadingConfig={
                            currentStep === GenerationSteps.GENERATING_OUTLINE ? outlineLoadingStates.config :
                                currentStep === GenerationSteps.GENERATING_CARDS ? cardsLoadingStates.config :
                                    savingLoadingStates.config
                        }
                    />
                );
            case GenerationSteps.REVIEWING_OUTLINE:
            case GenerationSteps.REVIEWING_CARDS:
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
                        <div className="flex-grow" />
                        {!editingOutline && !selectedCard && (
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
                                currentStep === GenerationSteps.REVIEWING_CARDS
                                    ? handleRegenerateAllCards
                                    : undefined
                            }
                            onRegenerateCard={
                                currentStep === GenerationSteps.REVIEWING_CARDS
                                    ? handleRegenerateCard
                                    : undefined
                            }
                            onEditCard={
                                currentStep === GenerationSteps.REVIEWING_CARDS
                                    ? handleEditCard
                                    : undefined
                            }
                            onEditOutline={
                                (currentStep === GenerationSteps.REVIEWING_OUTLINE || currentStep === GenerationSteps.REVIEWING_CARDS)
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