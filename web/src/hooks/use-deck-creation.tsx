import { useState, useCallback, useEffect } from "react";
import {
    type GenerationStep,
    type OutlineItem,
    type OutlineLoadingState,
    type SavingLoadingState,
    SavingLoadingStates,
    GenerationSteps,
    OutlineLoadingStates
} from "@/components/dialogs/deck-creation/types";
import { usePromptStore } from "@/stores/prompt-store";
import { useNoteVariantStore } from "@/stores/note-variant-store";
import { generateOutline } from "@/lib/deck-creation-inferencing/outline/generation";
import { isValidInput, preprocessInput } from "@/lib/deck-creation-inferencing/outline/preprocessing";
import { toast } from "./use-toast";
import { useModelStore } from "@/stores/model-store";
import { useInferenceStore } from "@/stores/inference-store";
import { generateCard } from "@/lib/deck-creation-inferencing/cards/generation";
import { ankiClient, type DeckTreeNode } from "@/lib/anki";
import { logger } from "@/lib/logger";
/**
 * Define types for deck creation data
 */
export type DeckCreationData = {
    userInput: string;
    promptId: string;
    selectedNoteVariants: string[];
    outline: OutlineItem[];
    setDialogOpen?: (dialogOpen: boolean) => void;
    parentDeck?: DeckTreeNode;
};

export type DeckCreationHook = {
    data: DeckCreationData;
    updateData: (updates: Partial<DeckCreationData>) => void;
    updateOutlineItem: (outlineItem: OutlineItem) => void;
    resetData: () => void;
    handleGenerateAllCards: () => void;
    handleGenerateCard: (outlineItem: OutlineItem, priority?: number) => Promise<void>;
    handleSaveAllCards: () => Promise<void>;
    streamFullOutlineGeneration: () => Promise<void>;
    outlineDelta: string;
    currentStep: GenerationStep;
    setCurrentStep: (step: GenerationStep) => void;
    currentOutlineLoadingState: OutlineLoadingState;
    currentSavingLoadingState: SavingLoadingState;
    savedCount: number;
    saveTotalCount: number;
    selectedEditorOutlineItem: OutlineItem | null;
    setEditor: (outlineItem: OutlineItem) => void;
    closeEditor: () => void;
    disableSaveAllCards: boolean;
    disableGenerateAllCards: boolean;
    generationStatus: string;
    handleUpdateItemDeck: (outlineItem: OutlineItem, newDeck: string) => void;
}

// export enum EditorMode {
//     OUTLINE = "outline",
//     CARD = "card",
// }

/**
 * Hook for managing deck creation state
 */
export function useDeckCreation(initialData?: Partial<DeckCreationData>): DeckCreationHook {
    const { prompts } = usePromptStore();
    const { variants } = useNoteVariantStore();
    const { overviewModel, contentModel, availableModels } = useModelStore();
    const { addPrompt } = useInferenceStore();

    // Main State
    const [currentStep, _setCurrentStep] = useState<GenerationStep>(GenerationSteps.INPUT);
    const [currentOutlineLoadingState, setCurrentOutlineLoadingState] = useState<OutlineLoadingState>(OutlineLoadingStates.PREPARE);
    const [outlineDelta, setOutlineDelta] = useState<string>("");
    // const [currentCardsLoadingState, setCurrentCardsLoadingState] = useState<CardsLoadingState>(CardsLoadingStates.GENERATE);
    const [currentSavingLoadingState, setCurrentSavingLoadingState] = useState<SavingLoadingState>(SavingLoadingStates.PREPARE);
    const [savedCount, setSavedCount] = useState(0);
    const [saveTotalCount, setSaveTotalCount] = useState(0);

    const [selectedEditorOutlineItem, setSelectedEditorOutlineItem] = useState<OutlineItem | null>(null);
    // const [selectedEditorMode, setSelectedEditorMode] = useState<EditorMode>(EditorMode.OUTLINE);

    const [disableSaveAllCards, setDisableSaveAllCards] = useState(true);
    const [disableGenerateAllCards, setDisableGenerateAllCards] = useState(true);

    const [generationStatus, setGenerationStatus] = useState<string>("");

    const [data, setData] = useState<DeckCreationData>({
        userInput: initialData?.userInput ?? '',
        promptId: initialData?.promptId ?? 'default-system',
        selectedNoteVariants: initialData?.selectedNoteVariants ?? variants.map(variant => variant.id),
        outline: initialData?.outline ?? [],
        setDialogOpen: initialData?.setDialogOpen ?? undefined,
        parentDeck: initialData?.parentDeck ?? undefined,
    });

    const updateData = useCallback((updates: Partial<DeckCreationData>) => {
        setData(current => ({ ...current, ...updates }));
    }, []);

    const updateOutlineItem = useCallback((outlineItem: OutlineItem) => {
        updateData({ outline: data.outline.map(item => item.id === outlineItem.id ? outlineItem : item) });
    }, [data.outline]);


    const updateOutlineCard = useCallback((outlineItem: OutlineItem) => {
        // get the current item from the store
        const currentItem = data.outline.find(item => item.id === outlineItem.id);
        if (currentItem) {
            currentItem.card = outlineItem.card;
        }
        updateData({ outline: data.outline });
    }, [data.outline]);

    const updateOutlineStatus = useCallback((outlineItem: OutlineItem) => {
        const currentItem = data.outline.find(item => item.id === outlineItem.id);
        if (currentItem) {
            currentItem.status = outlineItem.status;
        }
        updateData({ outline: data.outline });
    }, [data.outline]);

    const handleUpdateItemDeck = useCallback((outlineItem: OutlineItem, newDeck: string) => {
        const currentItem = data.outline.find(item => item.id === outlineItem.id);
        if (currentItem) {
            currentItem.deck = newDeck;
        }
        updateData({ outline: data.outline });
    }, [data.outline]);

    const setCurrentStep = useCallback((step: GenerationStep) => {
        _setCurrentStep(step);
        resetStates();
    }, []);

    const resetData = useCallback(() => {
        setData({
            userInput: '',
            promptId: '',
            selectedNoteVariants: [],
            outline: [],
            setDialogOpen: data.setDialogOpen,
        });
        _setCurrentStep(GenerationSteps.INPUT);
        setSavedCount(0);
        setSaveTotalCount(0);
        setOutlineDelta("");
        resetStates();
    }, []);

    const resetStates = useCallback(() => {
        setCurrentOutlineLoadingState(OutlineLoadingStates.PREPARE);
        // setCurrentCardsLoadingState(CardsLoadingStates.GENERATE);
        setCurrentSavingLoadingState(SavingLoadingStates.PREPARE);
    }, []);

    const setEditor = useCallback((outlineItem: OutlineItem) => {
        setSelectedEditorOutlineItem(outlineItem);
    }, []);

    const closeEditor = useCallback(() => {
        setSelectedEditorOutlineItem(null);
    }, []);


    useEffect(() => {
        if (currentStep === GenerationSteps.REVIEWING_CARDS) {
            // const allCardsReviewed = data.outline.every(item => item.status === "card-review");
            // check if all outline items have a card
            const allCardsReviewed = data.outline.every(item => item.card !== undefined);
            setDisableSaveAllCards(!allCardsReviewed);
        } else {
            setDisableSaveAllCards(true);
        }
    }, [data, currentStep]);

    useEffect(() => {
        if (currentStep === GenerationSteps.GENERATING_CARDS) {
            if (data.outline.every(item => item.status !== "generating" && item.status !== "pending")) {
                setCurrentStep(GenerationSteps.REVIEWING_CARDS);
            }

            // amount of cards that are done vs total amount of cards
            const doneCards = data.outline.filter(item => item.status === "card-review").length;
            const totalCards = data.outline.length;
            setGenerationStatus(`${doneCards}/${totalCards} cards done`);
        }
    }, [data]);

    // Add an effect to manage disableGenerateAllCards based on outline length
    useEffect(() => {
        setDisableGenerateAllCards(data.outline.length === 0);
    }, [data.outline]);

    // -------------
    // INFERENCE
    // -------------

    // Outline
    async function streamFullOutlineGeneration() {
        updateData({ outline: [] });
        setOutlineDelta("");
        setSelectedEditorOutlineItem(null);

        setCurrentStep(GenerationSteps.GENERATING_OUTLINE);
        setCurrentOutlineLoadingState(OutlineLoadingStates.PREPARE);

        const userInputContentProcessed = await preprocessInput(data.userInput);
        if (!isValidInput(userInputContentProcessed)) {
            toast({
                title: "Invalid input",
                description: "Please provide a valid input with 1-1000 characters.",
                variant: "destructive",
            });
            setCurrentStep(GenerationSteps.INPUT);
            return;
        }

        const model = overviewModel ?? contentModel ?? availableModels[0];
        if (!model) {
            toast({
                title: "No model available",
                description: "Please select a model in the settings.",
                variant: "destructive",
            });
            setCurrentStep(GenerationSteps.INPUT);
            return;
        }

        setCurrentOutlineLoadingState(OutlineLoadingStates.LOADING_MODEL);
        await generateOutline(
            model,
            {
                selectedNoteVariants: data.selectedNoteVariants,
                parentDeck: data.parentDeck,
                promptId: data.promptId,
                userInput: userInputContentProcessed,
            },
            prompts,
            (update) => {
                updateData({ outline: update.result });
            },
            (delta) => {
                setCurrentOutlineLoadingState(OutlineLoadingStates.GENERATE);
                setOutlineDelta(prev => prev + delta);
            }
        );

        setOutlineDelta("");

        setCurrentOutlineLoadingState(OutlineLoadingStates.CHECK);
        await new Promise(resolve => setTimeout(resolve, 1000));
        // TODO: Tim add real logic
        // await checkOutline(data.outline);

        setCurrentOutlineLoadingState(OutlineLoadingStates.OPTIMIZE);
        await new Promise(resolve => setTimeout(resolve, 1000));
        // TODO: Tim add real logic
        // await optimizeOutline(data.outline);

        setCurrentStep(GenerationSteps.REVIEWING_OUTLINE);
    }


    function handleGenerateAllCards() {
        //reset the open editor
        closeEditor();

        for (const item of data.outline) {
            // clear the old card

            if (item.status !== "generating" && item.status !== "pending") {
                handleGenerateCard(item).catch(error => {
                    throw error;
                });
            }
        }
    }

    async function handleGenerateCard(outlineItem: OutlineItem, priority = 0) {
        // Skip if this card is already being generated (status is generating or pending)
        // This prevents duplicate generation when connection is restored
        // if open editor is this card, close it
        if (selectedEditorOutlineItem?.id === outlineItem.id) {
            closeEditor();
        }
        if (outlineItem.status === "generating" || outlineItem.status === "pending") {
            return;
        }

        setCurrentStep(GenerationSteps.GENERATING_CARDS);
        // call card creation service
        // set the card to undefined
        updateOutlineCard({
            ...outlineItem,
            card: undefined,
        });

        void generateCard(
            outlineItem,
            updateOutlineCard,
            updateOutlineStatus,
            addPrompt,
            { contentModel, overviewModel, availableModels },
            priority,
        );
    }

    async function handleSaveAllCards() {
        setSavedCount(0);
        setSaveTotalCount(data.outline.length);
        setCurrentStep(GenerationSteps.SAVING_DECK);
        setCurrentSavingLoadingState(SavingLoadingStates.PREPARE);
        // set to save-pending
        for (const item of data.outline) {
            updateOutlineStatus({
                ...item,
                status: "pending-saving",
            });
        }
        // call deck saving service
        await new Promise(resolve => setTimeout(resolve, 1000));
        setCurrentSavingLoadingState(SavingLoadingStates.CONNECT);

        await new Promise(resolve => setTimeout(resolve, 1000));
        setCurrentSavingLoadingState(SavingLoadingStates.SAVE);

        for (const item of data.outline) {
            // set to saving
            updateOutlineStatus({
                ...item,
                status: "saving",
            });
            await ankiClient.addCardFromOutline(item);

            await new Promise(resolve => setTimeout(resolve, 1000));
            // set to saved
            updateOutlineStatus({
                ...item,
                status: "saved",
            });
            setSavedCount(prev => prev + 1);  // Use functional update form
        }

        toast({
            title: "Deck saved",
            description: "Your deck has been saved successfully.",
            variant: "success",
        });
        data.setDialogOpen?.(false);
        resetData();
    }



    return {
        data,
        updateData,
        updateOutlineItem,
        resetData,
        handleGenerateAllCards,
        handleGenerateCard,
        handleSaveAllCards,
        streamFullOutlineGeneration,
        outlineDelta,
        currentStep,
        setCurrentStep,
        currentOutlineLoadingState,
        currentSavingLoadingState,
        savedCount,
        saveTotalCount,
        selectedEditorOutlineItem,
        setEditor,
        closeEditor,
        disableGenerateAllCards,
        disableSaveAllCards,
        generationStatus,
        handleUpdateItemDeck
    };
}