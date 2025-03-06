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
    ANALYZE: "Analyzing input and chunking notes...",
    GENERATE: "Generating outline...",
    CHECK: "Checking Results...",
    OPTIMIZE: "Optimizing outline..."
} as const;

export type OutlineLoadingState = (typeof OutlineLoadingStates)[keyof typeof OutlineLoadingStates];

export const CardsLoadingStates = {
    GENERATE: "Generating card {current} of {total}...",
    CHECK: "Checking card quality...",
    OPTIMIZE: "Optimizing cards...",
    FIX: "Fixing card {current}..."
} as const;

export type CardsLoadingState = (typeof CardsLoadingStates)[keyof typeof CardsLoadingStates];

export const SavingLoadingStates = {
    PREPARE: "Preparing deck for export...",
    CONNECT: "Connecting to Anki...",
    SAVE: "Saving card {current} of {total} to Anki...",
    FINALIZE: "Finalizing changes..."
} as const;

export type SavingLoadingState = (typeof SavingLoadingStates)[keyof typeof SavingLoadingStates];

// Loading state management system
export interface LoadingStateItem {
    id: string;
    text: string;
    conditional?: boolean;
    replacementParams?: Record<string, string | number>;
}

export interface LoadingStateConfig {
    items: LoadingStateItem[];
    currentId: string | null;
}

// Core interfaces
export interface Card {
    id: number;
    front: string;
    back: string;
}

export interface OutlineItem {
    id: number;
    concept: string;
    key_points: string;
    deck: string;
    card_type: string;
    status: "pending" | "generating" | "completed" | "error";
    error?: string;
    card?: Card;
}

export interface StepProps {
    onNext: () => void;
    onBack?: () => void;
    onClose?: () => void;
}

export interface InputStepProps extends StepProps {
    topic: string;
    setTopic: (topic: string) => void;
    promptId: string;
    setPromptId: (id: string) => void;
    selectedNoteVariants: string[];
    setSelectedNoteVariants: (variants: string[]) => void;
    disabled?: boolean;
}

export interface OutlineStepProps extends StepProps {
    outline: OutlineItem[];
    onRegenerateOutline: () => void;
}

export interface CardsStepRightProps extends StepProps {
    cards: Card[];
    setSelectedCard: (card: Card | null) => void;
    disabled?: boolean;
}

export interface CardsStepLeftProps extends StepProps {
    selectedCard: Card;
    onEditCard: (card: Card) => void;
    setSelectedCard: (card: Card | null) => void;
}

// TODO:
// add outline edit
//    - new sections -> empty be ignored
//    - delete sections -> delete all cards in section
//    - rename sections
// add card edit
//    - new cards -> empty be ignored
//    - delete cards
//    - edit cards
//      - move cards between decks
// add deck saving
// add deck review