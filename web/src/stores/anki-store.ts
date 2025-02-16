import { ankiClient, type DeckTreeNode } from '@/lib/anki'
import { logger } from '@/lib/logger'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AnkiState {
    decks: DeckTreeNode[]
    selectedDeck: string | null
    isLoading: boolean
    error: string | null
    expandedDecks: Set<string>
    loadDecks: () => Promise<void>
    selectDeck: (deckPath: string) => void
    refreshDecks: () => Promise<void>
    toggleDeckExpansion: (deckFullName: string) => void
    collapseAllDecks: () => void
    expandAllDecks: () => void
}

export const useAnkiStore = create<AnkiState>()(
    persist(
        (set, get) => ({
            decks: [],
            selectedDeck: null,
            isLoading: true,
            error: null,
            expandedDecks: new Set<string>(),
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
            },
            toggleDeckExpansion: (deckFullName) => {
                set((state) => {
                    const newExpanded = new Set(state.expandedDecks)
                    if (newExpanded.has(deckFullName)) {
                        newExpanded.delete(deckFullName)
                    } else {
                        newExpanded.add(deckFullName)
                    }
                    return { expandedDecks: newExpanded }
                })
            },
            collapseAllDecks: () => {
                set({ expandedDecks: new Set() })
            },
            expandAllDecks: () => {
                set((state) => {
                    const allDeckNames = new Set<string>()
                    const collectDeckNames = (nodes: DeckTreeNode[]) => {
                        nodes.forEach(node => {
                            allDeckNames.add(node.fullName)
                            if (node.children.length > 0) {
                                collectDeckNames(node.children)
                            }
                        })
                    }
                    collectDeckNames(state.decks)
                    return { expandedDecks: allDeckNames }
                })
            }
        }),
        {
            name: 'anki-storage',
            partialize: (state) => ({
                decks: state.decks,
                selectedDeck: state.selectedDeck,
                expandedDecks: Array.from(state.expandedDecks)
            }),
            storage: {
                getItem: (name) => {
                    const str = localStorage.getItem(name);
                    if (!str) return null;

                    const parsed = JSON.parse(str);
                    return {
                        state: {
                            ...parsed.state,
                            expandedDecks: new Set(parsed.state?.expandedDecks || [])
                        }
                    };
                },
                setItem: (name, value) => {
                    const state = {
                        ...value,
                        state: {
                            ...value.state,
                            expandedDecks: Array.from(value.state.expandedDecks)
                        }
                    };
                    localStorage.setItem(name, JSON.stringify(state));
                },
                removeItem: (name) => localStorage.removeItem(name)
            }
        }
    )
)
