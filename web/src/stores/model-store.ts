import { type ConnectionStatus } from '@/types/connection-status'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ModelState {
  contentModel: string | undefined
  overviewModel: string | undefined
  availableModels: string[]
  ollamaStatus: ConnectionStatus
  ankiStatus: ConnectionStatus
  setContentModel: (model: string) => void
  setOverviewModel: (model: string) => void
  setAvailableModels: (models: string[]) => void
  setOllamaStatus: (status: ConnectionStatus) => void
  setAnkiStatus: (status: ConnectionStatus) => void
}

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      contentModel: undefined,
      overviewModel: undefined,
      availableModels: [],
      ollamaStatus: 'loading',
      ankiStatus: 'loading',
      setContentModel: (model) => set({ contentModel: model }),
      setOverviewModel: (model) => set({ overviewModel: model }),
      setAvailableModels: (models) => set({ availableModels: models }),
      setOllamaStatus: (status) => set({ ollamaStatus: status }),
      setAnkiStatus: (status) => set({ ankiStatus: status })
    }),
    {
      name: 'model-storage',
      partialize: (state) => ({
        contentModel: state.contentModel,
        overviewModel: state.overviewModel
      })
    }
  )
) 