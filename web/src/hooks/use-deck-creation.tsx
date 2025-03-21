import { useState, useCallback, useEffect, use } from "react";
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
import { useInferenceStore } from "@/stores/inference-store";
import { AddPromptData } from "@/stores/inference-store";
import { generateCard } from "@/lib/deck-creation-inferencing/cards/generation";
import { ankiClient, DeckTreeNode } from "@/lib/anki";
import { useAnkiStore } from "@/stores/anki-store";
/**
 * Define types for deck creation data
 */
export type DeckCreationData = {
    userInput: string;
    promptId: string;
    selectedNoteVariants: string[];
    outline: OutlineItem[];
    setDialogOpen?: (dialogOpen: boolean) => void;
};

export type DeckCreationHook = {
    data: DeckCreationData;
    updateData: (updates: Partial<DeckCreationData>) => void;
    updateOutlineItem: (outlineItem: OutlineItem) => void;
    resetData: () => void;
    handleGenerateAllCards: () => void;
    handleGenerateCard: (outlineItem: OutlineItem, priority?: number) => void;
    handleSaveAllCards: () => void;
    streamFullOutlineGeneration: () => void;
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
    const { decks } = useAnkiStore();

    // Main State
    const [currentStep, _setCurrentStep] = useState<GenerationStep>(GenerationSteps.INPUT);
    const [currentOutlineLoadingState, setCurrentOutlineLoadingState] = useState<OutlineLoadingState>(OutlineLoadingStates.PREPARE);
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
        // reset edit item
        setSelectedEditorOutlineItem(null);

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


        const rules = `
        1. **Keep it Simple**: Short and simple ideas are easier to remember.
        2. **Focus on Single Ideas**: Each card should focus on one concept only.
        3. **Be Specific**: Vague or general knowledge is harder to retain.
        4. **Use Markdown**: Format the back of the card using markdown.
        5. **Strictly One Card Per Concept**: Do NOT generate more than one card per concept.
        6. **Card Type**: Each card must have a type. Examples: ${data.selectedNoteVariants.join(', ')}.
        7. **Deck Naming Format**: Deck names must follow a hierarchical structure using '::' as separator:
           - Start with the highest category (e.g., 'Uni')
           - Follow with sub-categories (e.g., semester, subject, topic)
           - End with the specific concept name
           - Example structure: 'Category::Subcategory::Subject::Topic::Concept'
           - Real examples: 
             * 'Uni::Sem 1::Math::Calculus::Derivatives'
             * 'Work::Programming::Python::Basics::List Comprehension'
             * 'Personal::Languages::Japanese::Grammar::Particles'
           Choose or create an appropriate hierarchy based on the content.
        8. Always use a single string for all the keys in the json object`;

        // get all deck names 
        const getAllDeckNames = (nodes: DeckTreeNode[]): string[] => {
            return nodes.reduce((names: string[], node) => {
                names.push(node.fullName);
                if (node.children.length > 0) {
                    names.push(...getAllDeckNames(node.children));
                }
                return names;
            }, []);
        };

        // these decks get injected into the prompt
        const existingDecks = getAllDeckNames(decks)
            .map(deck => `'${deck}'`)
            .join(', ');
        
        // Get the selected variants from the store and format them as a string
        const selectedCardTypes = data.selectedNoteVariants
            .map(id => `'${id}'`)
            .join(', ');

        const allExamples = [
            {
                "concept": "Introduction to Economics",
                "key_points": "Economics studies how individuals, businesses, and governments allocate resources.",
                "deck": "Uni::Sem 5::Economics::Basics::Introduction to Economics",
                "card_type": "q&a-system"
            },
            {
                "concept": "Law of Supply and Demand",
                "key_points": "The price of a good is determined by its supply and demand in the market.",
                "deck": "Uni::Sem 5::Economics::Basics::Law of Supply and Demand",
                "card_type": "concept-system"
            },
            {
                "concept": "Market Structure Types",
                "key_points": "Markets can be classified into four structures: Perfect Competition, Monopoly, Oligopoly, and Monopolistic Competition.",
                "deck": "Uni::Sem 5::Economics::Basics::Market Structures",
                "card_type": "overview-system"
            },
            {
                "concept": "Inflation",
                "key_points": "Inflation is the rate at which the general level of prices for goods and services rises.",
                "deck": "Uni::Sem 5::Economics::Basics::Inflation",
                "card_type": "definition-system"
            },
            {
                "concept": "Economic Terms: GDP",
                "key_points": "Gross Domestic Product (GDP) - The total monetary value of all finished goods and services produced within a country's borders in a specific time period.",
                "deck": "Uni::Sem 5::Economics::Basics::Terminology",
                "card_type": "vocabulary-system"
            },
            {
                "concept": "Supply Chain Components",
                "key_points": "A supply chain consists of suppliers, manufacturers, distributors, retailers, and end consumers working together to deliver products.",
                "deck": "Uni::Sem 5::Economics::Basics::Supply Chain",
                "card_type": "concept-system"
            },
            {
                "concept": "Economic Systems Overview",
                "key_points": "The main economic systems include market economy, command economy, and mixed economy, each with distinct characteristics in resource allocation.",
                "deck": "Uni::Sem 5::Economics::Basics::Economic Systems",
                "card_type": "overview-system"
            }
        ];

        // Filter examples to only include selected note types
        const filteredExamples = allExamples.filter(example => 
            data.selectedNoteVariants.includes(example.card_type)
        );

        // Use at most 3 examples to keep the prompt concise
        const selectedExamples = filteredExamples;

        const exampleOutput = JSON.stringify(selectedExamples);

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

        console.log("existingDecks", existingDecks);
        console.log("selectedCardTypes", selectedCardTypes);

        const totalPrompt = prompt.systemMessage
            .replace("{existingDecks}", existingDecks)
            .replace("{selectedCardTypes}", selectedCardTypes)
            .replace("{userInput}", userInputContentProcessed)
            .replace("{exampleOutput}", exampleOutput)
            .replace("{rules}", rules);


        console.log("totalPrompt", totalPrompt);

        setCurrentOutlineLoadingState(OutlineLoadingStates.GENERATE);
        await generateOutline(model, totalPrompt, (update) => {
            //print the prompt
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


    function handleGenerateAllCards() {
        //reset the open editor
        closeEditor();

        for (const item of data.outline) {
            // clear the old card

            if (item.status !== "generating" && item.status !== "pending") {
                void handleGenerateCard(item);
            }
        }
    }

    async function handleGenerateCard(outlineItem: OutlineItem, priority: number = 0) {
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

        generateCard(
            outlineItem,
            updateOutlineCard,
            updateOutlineStatus,
            addPrompt,
            { contentModel, overviewModel, availableModels },
            priority,
        );
    }

    async function handleSaveAllCards() {
        //TODO: Add readl logic to save
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
        // await 1s
        await new Promise(resolve => setTimeout(resolve, 1000));
        setCurrentSavingLoadingState(SavingLoadingStates.CONNECT);

        await new Promise(resolve => setTimeout(resolve, 1000));
        setCurrentSavingLoadingState(SavingLoadingStates.SAVE);


        // fir each item in the outline, set the status to saved
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
            setSavedCount(savedCount + 1);
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