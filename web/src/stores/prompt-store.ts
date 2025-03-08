import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PromptTemplate = {
    id: string;
    name: string;
    description: string;
    isSystem?: boolean;
    systemMessage: string; // {existingDecks}, {selectedCardTypes}, {userInput}, {exampleOutput}
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
Each outline should contain one concept only. Ensure the deck names follow the format: 'Uni::Sem 5::Economics::Basics::Concept Name'.
Existing decks: {existingDecks}.

### Rules for Creating Cards
1. **Keep it Simple**: Short and simple ideas are easier to remember.
2. **Focus on Single Ideas**: Each card should focus on one concept only.
3. **Be Specific**: Vague or general knowledge is harder to retain.
4. **Use Markdown**: Format the back of the card using markdown.
5. **Strictly One Card Per Concept**: Do NOT generate more than one card per concept.
6. **Card Type**: Each card must have a type. Examples: {selectedCardTypes}.
7. **Deck Naming Format**: Deck names should follow this structure: 'Uni::Sem 5::Economics::Basics::Concept Name'.
8. Always use a single string for all the keys in the json object

### User Input:
{userInput}

### Output Format:
Return a JSON array like this:
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
