import { useState, useCallback, useEffect } from "react";
import {
    CardsLoadingStates,
    CardsLoadingState,
    GenerationStep,
    OutlineItem,
    OutlineLoadingState,
    SavingLoadingState,
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
/**
 * Define types for deck creation data
 */
export type DeckCreationData = {
    userInput: string;
    promptId: string;
    selectedNoteVariants: string[];
    outline: OutlineItem[];
    setDialogOpen: (dialogOpen: boolean) => void;
};

export type DeckCreationHook = {
    data: DeckCreationData;
    updateData: (updates: Partial<DeckCreationData>) => void;
    updateOutlineItem: (outlineItem: OutlineItem) => void;
    resetData: () => void;
    handleGenerateAllCards: () => void;
    handleSaveAllCards: () => void;
    streamFullOutlineGeneration: () => void;
    currentStep: GenerationStep;
    setCurrentStep: (step: GenerationStep) => void;
    currentOutlineLoadingState: OutlineLoadingState;
    currentCardsLoadingState: CardsLoadingState;
    currentSavingLoadingState: SavingLoadingState;
    selectedEditorOutlineItem: OutlineItem | null;
    selectedEditorMode: EditorMode;
    setEditor: (outlineItem: OutlineItem, editorMode: EditorMode) => void;
    switchEditor: (editorMode: EditorMode) => void;
    closeEditor: () => void;
    disableSaveAllCards: boolean;
    generationStatus: string;
}

export enum EditorMode {
    OUTLINE = "outline",
    CARD = "card",
}

/**
 * Hook for managing deck creation state
 */
export function useDeckCreation(initialData?: Partial<DeckCreationData>): DeckCreationHook {
    const { prompts } = usePromptStore();
    const { variants } = useNoteVariantStore();
    const { overviewModel, contentModel, availableModels } = useModelStore();
    // Main State
    const [currentStep, _setCurrentStep] = useState<GenerationStep>(GenerationSteps.INPUT);
    const [currentOutlineLoadingState, setCurrentOutlineLoadingState] = useState<OutlineLoadingState>(OutlineLoadingStates.PREPARE);
    const [currentCardsLoadingState, setCurrentCardsLoadingState] = useState<CardsLoadingState>(CardsLoadingStates.GENERATE);
    const [currentSavingLoadingState, setCurrentSavingLoadingState] = useState<SavingLoadingState>(SavingLoadingStates.PREPARE);

    const [selectedEditorOutlineItem, setSelectedEditorOutlineItem] = useState<OutlineItem | null>(null);
    const [selectedEditorMode, setSelectedEditorMode] = useState<EditorMode>(EditorMode.OUTLINE);

    const [disableSaveAllCards, setDisableSaveAllCards] = useState(true);

    const [generationStatus, setGenerationStatus] = useState<string>("");

    const [data, setData] = useState<DeckCreationData>({
        userInput: initialData?.userInput || '',
        promptId: initialData?.promptId || 'default-system',
        selectedNoteVariants: initialData?.selectedNoteVariants || variants.map(variant => variant.id),
        outline: initialData?.outline || [],
        setDialogOpen: initialData?.setDialogOpen || (() => { }),
    });

    const updateData = useCallback((updates: Partial<DeckCreationData>) => {
        setData(current => ({ ...current, ...updates }));
    }, []);

    const updateOutlineItem = useCallback((outlineItem: OutlineItem) => {
        updateData({ outline: data.outline.map(item => item.id === outlineItem.id ? outlineItem : item) });
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
        resetStates();
    }, []);

    const resetStates = useCallback(() => {
        setCurrentOutlineLoadingState(OutlineLoadingStates.PREPARE);
        setCurrentCardsLoadingState(CardsLoadingStates.GENERATE);
        setCurrentSavingLoadingState(SavingLoadingStates.PREPARE);
    }, []);

    const setEditor = useCallback((outlineItem: OutlineItem, editorMode: EditorMode) => {
        setSelectedEditorOutlineItem(outlineItem);
        setSelectedEditorMode(editorMode);
    }, []);

    const closeEditor = useCallback(() => {
        setSelectedEditorOutlineItem(null);
    }, []);

    const switchEditor = useCallback((editorMode: EditorMode) => {
        setSelectedEditorMode(editorMode);
    }, []);

    useEffect(() => {
        if (currentStep === GenerationSteps.REVIEWING_CARDS) {
            const allCardsReviewed = data.outline.every(item => item.status === "card-review");
            setDisableSaveAllCards(!allCardsReviewed);
        } else {
            setDisableSaveAllCards(true);
        }
    }, [data.outline, currentStep]);

    // -------------
    // INFERENCE
    // -------------

    // Outline
    async function streamFullOutlineGeneration() {
        updateData({ outline: [] });

        setCurrentStep(GenerationSteps.GENERATING_OUTLINE);
        setCurrentOutlineLoadingState(OutlineLoadingStates.PREPARE);

        let prompt = prompts.find(prompt => prompt.id === data.promptId);
        if (!prompt) {
            // select default prompt
            prompt = prompts.find(prompt => prompt.id === 'default-system')!;
        }

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

        // TODO: Tim add real logic
        const existingDecks = "'Uni::Sem 5::Economics::Basics::Introduction to Economics', 'Uni::Sem 5::Economics::Basics::Economics::Comparison'"
        const selectedCardTypes = "'Q&A', 'Definition'"
        const exampleOutput = "[{\"concept\":\"Introduction to Economics\",\"key_points\":\"Economics studies how individuals, businesses, and governments allocate resources.\",\"deck\":\"Uni::Sem 5::Economics::Basics::Introduction to Economics\",\"card_type\":\"Q&A\"},{\"concept\":\"Micro vs. Macro Economics\",\"key_points\":\"Microeconomics focuses on individual decision-making (supply and demand), while Macroeconomics deals with large-scale economic factors (GDP, inflation).\",\"deck\":\"Uni::Sem 5::Economics::Basics::Economics::Comparison\",\"card_type\":\"Definition\"}]"


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

        const totalPrompt = prompt.systemMessage
            .replace("{existingDecks}", existingDecks)
            .replace("{selectedCardTypes}", selectedCardTypes)
            .replace("{userInput}", userInputContentProcessed)
            .replace("{exampleOutput}", exampleOutput);


        setCurrentOutlineLoadingState(OutlineLoadingStates.GENERATE);
        await generateOutline(model, totalPrompt, (update) => {
            updateData({ outline: update.result });
        });

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


    async function handleGenerateAllCards() {
        setCurrentStep(GenerationSteps.GENERATING_CARDS);
        // call card creation service

        await new Promise(resolve => setTimeout(resolve, 1000));
        setCurrentStep(GenerationSteps.REVIEWING_CARDS);
    }

    async function handleSaveAllCards() {
        setCurrentStep(GenerationSteps.SAVING_DECK);
        // call deck saving service
        // await 1s
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast({
            title: "Deck saved",
            description: "Your deck has been saved successfully.",
            variant: "success",
        });
        data.setDialogOpen(false);
        resetData();
    }


    return {
        data,
        updateData,
        updateOutlineItem,
        resetData,
        handleGenerateAllCards,
        handleSaveAllCards,
        streamFullOutlineGeneration,
        currentStep,
        setCurrentStep,
        currentOutlineLoadingState,
        currentCardsLoadingState,
        currentSavingLoadingState,
        selectedEditorOutlineItem,
        selectedEditorMode,
        setEditor,
        closeEditor,
        switchEditor,
        disableSaveAllCards,
        generationStatus,
    };
}