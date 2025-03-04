import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PromptTemplate = {
    id: string;
    name: string;
    description: string;
    isSystem?: boolean;
    systemMessage: string;
    ruleSet: string;
};

interface PromptState {
    prompts: PromptTemplate[];
    selectedPromptId: string | null;
    addPrompt: (prompt: Omit<PromptTemplate, 'id'>) => void;
    updatePrompt: (id: string, prompt: Partial<PromptTemplate>) => void;
    deletePrompt: (id: string) => void;
    selectPrompt: (id: string) => void;
    getSelectedPrompt: () => PromptTemplate | undefined;
}

const DEFAULT_SYSTEM_PROMPT: PromptTemplate = {
    id: 'default-system',
    name: 'Default Prompt',
    description: 'Standard flashcard generation from markdown notes',
    isSystem: true,
    systemMessage: `You are an expert at creating educational flashcards.
Your task is to analyze the provided notes and create effective study materials.
Focus on accuracy, clarity, and pedagogical value.`,

    ruleSet: `Based on the provided markdown notes, create flashcards following these guidelines:
1. Extract key concepts, definitions, and relationships
2. Generate questions that test understanding
3. Ensure answers are comprehensive but concise
4. Use markdown formatting in answers when appropriate
5. Include examples for complex concepts`
};

export const usePromptStore = create<PromptState>()(
    persist(
        (set, get) => ({
            prompts: [DEFAULT_SYSTEM_PROMPT],
            selectedPromptId: DEFAULT_SYSTEM_PROMPT.id,

            addPrompt: (prompt) => set((state) => ({
                prompts: [...state.prompts, { ...prompt, id: crypto.randomUUID() }]
            })),

            updatePrompt: (id, promptUpdate) => set((state) => ({
                prompts: state.prompts.map(p =>
                    p.id === id ? { ...p, ...promptUpdate } : p
                )
            })),

            deletePrompt: (id) => set((state) => {
                // Prevent deletion of system prompts
                if (state.prompts.find(p => p.id === id)?.isSystem) {
                    return state;
                }

                // If deleting selected prompt, select default
                if (state.selectedPromptId === id) {
                    return {
                        prompts: state.prompts.filter(p => p.id !== id),
                        selectedPromptId: DEFAULT_SYSTEM_PROMPT.id
                    };
                }

                return {
                    prompts: state.prompts.filter(p => p.id !== id)
                };
            }),

            selectPrompt: (id) => set({ selectedPromptId: id }),

            getSelectedPrompt: () => {
                const state = get();
                return state.prompts.find(p => p.id === state.selectedPromptId) ?? DEFAULT_SYSTEM_PROMPT;
            }
        }),
        {
            name: 'anki-prompt-store',
            // Only persist the prompts and selected ID
            partialize: (state) => ({
                prompts: state.prompts,
                selectedPromptId: state.selectedPromptId
            })
        }
    )
);
