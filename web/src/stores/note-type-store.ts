import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NoteType = {
    id: string;
    name: string;
    description: string;
    isSystem?: boolean;
    promptHint: string; // Hint for the LLM about how to process this type
};

export interface NoteTypeState {
    noteTypes: NoteType[];
    selectedNoteTypeId: string | null;
    addNoteType: (noteType: Omit<NoteType, 'id'>) => void;
    updateNoteType: (id: string, noteType: Partial<NoteType>) => void;
    deleteNoteType: (id: string) => void;
    selectNoteType: (id: string) => void;
    getSelectedNoteType: () => NoteType | undefined;
}

const DEFAULT_NOTE_TYPES: NoteType[] = [
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

export const useNoteTypeStore = create<NoteTypeState>()(
    persist(
        (set, get) => ({
            noteTypes: DEFAULT_NOTE_TYPES,
            selectedNoteTypeId: DEFAULT_NOTE_TYPES[0]?.id ?? null,

            addNoteType: (noteType) => set((state) => ({
                noteTypes: [...state.noteTypes, { ...noteType, id: crypto.randomUUID() }]
            })),

            updateNoteType: (id, noteTypeUpdate) => set((state) => ({
                noteTypes: state.noteTypes.map(nt =>
                    nt.id === id ? { ...nt, ...noteTypeUpdate } : nt
                )
            })),

            deleteNoteType: (id) => set((state) => {
                // Prevent deletion of system note types
                if (state.noteTypes.find(nt => nt.id === id)?.isSystem) {
                    return state;
                }

                // If deleting selected note type, select default
                if (state.selectedNoteTypeId === id) {
                    return {
                        noteTypes: state.noteTypes.filter(nt => nt.id !== id),
                        selectedNoteTypeId: DEFAULT_NOTE_TYPES[0]?.id ?? null
                    };
                }

                return {
                    noteTypes: state.noteTypes.filter(nt => nt.id !== id)
                };
            }),

            selectNoteType: (id) => set({ selectedNoteTypeId: id }),

            getSelectedNoteType: () => {
                const state = get();
                return state.noteTypes.find(nt => nt.id === state.selectedNoteTypeId) ?? DEFAULT_NOTE_TYPES[0];
            }
        }),
        {
            name: 'anki-note-type-store',
            partialize: (state) => ({
                noteTypes: state.noteTypes,
                selectedNoteTypeId: state.selectedNoteTypeId
            })
        }
    )
);