// src/renderer/src/store/uiStore.ts
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

export type XY = { x: number; y: number }

// État d'interface : jamais enregistré dans le fichier, jamais dans l'historique.
export interface UiState {
  pendingTemplateId: string | null
  pendingSwitch: { position: XY; screen: XY } | null
  search: { at: XY | null } | null
  focusVlan: number | null
  hoverDeviceId: string | null
  setFocusVlan(id: number | null): void
  setHoverDevice(id: string | null): void
  setPendingTemplate(id: string | null): void
  setPendingSwitch(value: { position: XY; screen: XY } | null): void
  openSearch(at: XY | null): void
  closeSearch(): void
}

export const uiStore = createStore<UiState>()((set) => ({
  pendingTemplateId: null,
  pendingSwitch: null,
  search: null,
  focusVlan: null,
  hoverDeviceId: null,
  setFocusVlan: (id) => set({ focusVlan: id }),
  setHoverDevice: (id) => set({ hoverDeviceId: id }),
  setPendingTemplate: (id) => set({ pendingTemplateId: id }),
  setPendingSwitch: (value) => set({ pendingSwitch: value }),
  openSearch: (at) => set({ search: { at } }),
  closeSearch: () => set({ search: null })
}))

export function useUiStore<T>(selector: (s: UiState) => T): T {
  return useStore(uiStore, selector)
}
