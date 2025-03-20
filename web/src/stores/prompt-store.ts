import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PromptTemplate = {
    id: string;
    name: string;
    description: string;
    isSystem?: boolean;
    systemMessage: string; // {existingDecks}, {selectedCardTypes}, {userInput}, {exampleOutput}, {rules}
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
    systemMessage: `
### Task:
Generate outlines for flashcards based on the lecture notes provided.
Each outline item should contain one concept only.

### Deck Organization:
- Check {existingDecks} for relevant existing deck structures
- Use existing deck structure when available
- Create new deck only if no suitable structure exists
- Always reuse existing subdeck categories when possible

### Rules for Creating Cards
{rules}

### User Input:
{userInput}

### Output Format:
{exampleOutput}
`
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
