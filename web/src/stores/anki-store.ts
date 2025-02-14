import { ankiClient, type DeckTreeNode } from '@/lib/anki'
import { logger } from '@/lib/logger'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AnkiState {
    decks: DeckTreeNode[]
    selectedDeck: string | null
    isLoading: boolean
    error: string | null
    loadDecks: () => Promise<void>
    selectDeck: (deckPath: string) => void
    refreshDecks: () => Promise<void>
}

export const useAnkiStore = create<AnkiState>()(
    persist(
        (set, get) => ({
            decks: [],
            selectedDeck: null,
            isLoading: true,
            error: null,
            loadDecks: async () => {
                if (get().decks.length > 0) return
                return get().refreshDecks()
            },
            selectDeck: (deckPath) => set({ selectedDeck: deckPath }),
            refreshDecks: async () => {
                set({ isLoading: true, error: null })
                try {
                    const decks = await ankiClient.getDeckTree()
                    set({ decks, isLoading: false })
                } catch (error) {
                    logger.error('Failed to load decks', error)
                    set({ error: 'Failed to load decks', isLoading: false })
                }
            }
        }),
        {
            name: 'anki-storage',
            partialize: (state) => ({
                decks: state.decks,
                selectedDeck: state.selectedDeck
            })
        }
    )
)
