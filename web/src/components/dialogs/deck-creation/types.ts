export const GenerationSteps = {
    INPUT: 'input',
    GENERATING_OUTLINE: 'generating-outline',
    REVIEWING_OUTLINE: 'reviewing-outline',
    GENERATING_CARDS: 'generating-cards',
    REVIEWING_CARDS: 'reviewing-cards',
    SAVING_DECK: 'saving-deck'
} as const;

export type GenerationStep = (typeof GenerationSteps)[keyof typeof GenerationSteps];

export const OutlineLoadingStates = {
    PREPARE: "Preparing input...",
    GENERATE: "Generating outline...",
    CHECK: "Checking outline...",
    OPTIMIZE: "Optimizing outline...",
} as const;

export type OutlineLoadingState = (typeof OutlineLoadingStates)[keyof typeof OutlineLoadingStates];

export const CardsLoadingStates = {
    GENERATE: "Generating card {current}/{total}: {concept}...",
} as const;

export type CardsLoadingState = (typeof CardsLoadingStates)[keyof typeof CardsLoadingStates];

export const SavingLoadingStates = {
    PREPARE: "Preparing deck for export...",
    CONNECT: "Connecting to Anki...",
    SAVE: "Saving card {current} of {total} to Anki...",
} as const;

export type SavingLoadingState = (typeof SavingLoadingStates)[keyof typeof SavingLoadingStates];

export interface OutlineItem {
    id: number;
    concept: string;
    key_points: string;
    deck: string;
    card_type: string;
    status: "outline-review" | "pending" | "generating" | "card-review" | "pending-saving" | "saving" | "saved" | "error";
    error?: string;
    card?: Card;
}

export type Card = {
    front: string;
    back: string;
}