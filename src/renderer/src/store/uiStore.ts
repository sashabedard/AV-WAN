import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

type XY = { x: number; y: number }

export interface UiState {
  pendingTemplateId: string | null
  pendingSwitch: { position: XY; screen: XY } | null
  setPendingTemplate(id: string | null): void
  setPendingSwitch(value: { position: XY; screen: XY } | null): void
}

export const uiStore = createStore<UiState>()((set) => ({
  pendingTemplateId: null,
  pendingSwitch: null,
  setPendingTemplate: (id) => set({ pendingTemplateId: id }),
  setPendingSwitch: (value) => set({ pendingSwitch: value })
}))

export function useUiStore<T>(selector: (s: UiState) => T): T {
  return useStore(uiStore, selector)
}
