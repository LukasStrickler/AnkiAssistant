export const GenerationSteps = {
    INPUT: 'input',
    GENERATING_OUTLINE: 'generating-outline',
    REVIEWING_OUTLINE: 'reviewing-outline',
    GENERATING_CARDS: 'generating-cards',
    REVIEWING_CARDS: 'reviewing-cards',
    SAVING_DECK: 'saving-deck'
} as const;

export type GenerationStep = (typeof GenerationSteps)[keyof typeof GenerationSteps];

export type Card = {
    id: string;
    front: string;
    back: string;
    status: 'pending' | 'generating' | 'complete';
};

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
    selectedNoteTypes: string[];
    setSelectedNoteTypes: (types: string[]) => void;
    disabled?: boolean;
}

export interface OutlineStepProps extends StepProps {
    outline: string[];
    onRegenerateOutline: () => void;
}

export interface CardsStepProps extends StepProps {
    cards: Card[];
    onRegenerateCard: (cardId: string) => void;
    selectedCardId?: string | null;
    onEditCard?: (cardId: string) => void;
    onCancelEdit?: () => void;
}


// ok now adjust my logic please this works but breaks my logic
// 1. Input
// -left: input fields
// -right: tips and getting started
// 2. Generating outline
// - left "blocked" ui where we cant submit but see what we had put in
// - right loading animation
// 3. Review Outline
// - left options to regen / gen cards
// - right side: outline preview
// 4. Generate cards
// -  Left Side loading animation with all cards that are due / generated
// - right: stream in generated cards
// 5. review cards
// - left side: Nothing ontil we select a card to edit, and save deck button at the top
// - right side: fully streamed in generated cards
// 6. Saving deck
// - left side: locked ui
// - right side: locked ui