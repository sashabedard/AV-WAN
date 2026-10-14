// src/renderer/src/store/uiStore.ts
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

export type XY = { x: number; y: number }

// État d'interface : jamais enregistré dans le fichier, jamais dans l'historique.
export interface UiState {
  welcome: boolean
  setWelcome(on: boolean): void
  pendingTemplateId: string | null
  pendingSwitch: { position: XY; screen: XY } | null
  pendingZone: boolean
  search: { at: XY | null } | null
  focusVlan: number | null
  sidebarTab: 'devices' | 'vlans'
  inspectVlanId: number | null
  setSidebarTab(tab: 'devices' | 'vlans'): void
  setInspectVlan(id: number | null): void
  hoverDeviceId: string | null
  reconnectingLinkId: string | null
  setReconnecting(id: string | null): void
  setFocusVlan(id: number | null): void
  setHoverDevice(id: string | null): void
  setPendingTemplate(id: string | null): void
  setPendingSwitch(value: { position: XY; screen: XY } | null): void
  setPendingZone(on: boolean): void
  openSearch(at: XY | null): void
  closeSearch(): void
  resetForDocument(): void
}

export const uiStore = createStore<UiState>()((set) => ({
  welcome: true,
  setWelcome: (on) => set({ welcome: on }),
  pendingTemplateId: null,
  pendingSwitch: null,
  pendingZone: false,
  search: null,
  focusVlan: null,
  sidebarTab: 'devices',
  inspectVlanId: null,
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setInspectVlan: (id) => set({ inspectVlanId: id }),
  hoverDeviceId: null,
  reconnectingLinkId: null,
  setReconnecting: (id) => set({ reconnectingLinkId: id }),
  setFocusVlan: (id) => set({ focusVlan: id }),
  setHoverDevice: (id) => set({ hoverDeviceId: id }),
  setPendingTemplate: (id) => set(id ? { pendingTemplateId: id, pendingZone: false } : { pendingTemplateId: null }),
  setPendingZone: (on) => set(on ? { pendingZone: true, pendingTemplateId: null } : { pendingZone: false }),
  setPendingSwitch: (value) => set({ pendingSwitch: value }),
  openSearch: (at) => set({ search: { at } }),
  closeSearch: () => set({ search: null }),
  // Un autre document remplace le courant : tout l'état transitoire qui s'y rapportait est remis à zéro.
  resetForDocument: () =>
    set({
      focusVlan: null,
      inspectVlanId: null,
      hoverDeviceId: null,
      reconnectingLinkId: null,
      pendingZone: false,
      pendingTemplateId: null,
      pendingSwitch: null,
      search: null
    })
}))

export function useUiStore<T>(selector: (s: UiState) => T): T {
  return useStore(uiStore, selector)
}
