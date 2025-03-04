import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NoteVariant = {
    id: string;
    name: string;
    description: string;
    isSystem?: boolean;
    promptHint: string; // Hint for the LLM about how to process this variant
};

interface NoteVariantState {
    variants: NoteVariant[];
    selectedVariantId: string | null;
    addVariant: (variant: Omit<NoteVariant, 'id'>) => void;
    updateVariant: (id: string, variant: Partial<NoteVariant>) => void;
    deleteVariant: (id: string) => void;
    selectVariant: (id: string) => void;
    getSelectedVariant: () => NoteVariant | undefined;
}

const DEFAULT_VARIANTS: NoteVariant[] = [
    {
        id: 'qa-system',
        name: 'Q&A',
        description: 'Question and answer pairs for testing understanding',
        isSystem: true,
        promptHint: 'Create question-answer pairs that test understanding of key concepts'
    },
    {
        id: 'definition-system',
        name: 'Definition',
        description: 'Clear definitions of key terms and concepts',
        isSystem: true,
        promptHint: 'Extract and define important terms and concepts'
    },
    {
        id: 'vocabulary-system',
        name: 'Vocabulary',
        description: 'Language terms with meanings and usage examples',
        isSystem: true,
        promptHint: 'Focus on language terms, their meanings, and contextual usage'
    },
    {
        id: 'overview-system',
        name: 'Overview',
        description: 'Broad topic summaries and key points',
        isSystem: true,
        promptHint: 'Create high-level summaries and main takeaways'
    },
    {
        id: 'concept-system',
        name: 'Concept',
        description: 'Detailed explanation of complex concepts',
        isSystem: true,
        promptHint: 'Break down complex concepts into understandable components'
    }
];

export const useNoteVariantStore = create<NoteVariantState>()(
    persist(
        (set, get) => ({
            variants: DEFAULT_VARIANTS,
            selectedVariantId: DEFAULT_VARIANTS[0]?.id ?? null,

            addVariant: (variant) => set((state) => ({
                variants: [...state.variants, { ...variant, id: crypto.randomUUID() }]
            })),

            updateVariant: (id, variantUpdate) => set((state) => ({
                variants: state.variants.map(v =>
                    v.id === id ? { ...v, ...variantUpdate } : v
                )
            })),

            deleteVariant: (id) => set((state) => {
                // Prevent deletion of system variants
                if (state.variants.find(v => v.id === id)?.isSystem) {
                    return state;
                }

                // If deleting selected variant, select default
                if (state.selectedVariantId === id) {
                    return {
                        variants: state.variants.filter(v => v.id !== id),
                        selectedVariantId: DEFAULT_VARIANTS[0]?.id ?? null
                    };
                }

                return {
                    variants: state.variants.filter(v => v.id !== id)
                };
            }),

            selectVariant: (id) => set({ selectedVariantId: id }),

            getSelectedVariant: () => {
                const state = get();
                return state.variants.find(v => v.id === state.selectedVariantId) ?? DEFAULT_VARIANTS[0];
            }
        }),
        {
            name: 'anki-note-variant-store',
            partialize: (state) => ({
                variants: state.variants,
                selectedVariantId: state.selectedVariantId
            })
        }
    )
);