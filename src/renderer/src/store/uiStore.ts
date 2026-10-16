// src/renderer/src/store/uiStore.ts
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { Lang } from '../../../shared/i18n/lang'
import type { PdfSection } from '../../../shared/pdfOptions'
import type { PinnedRect } from '../canvas/pinnedView'

export type XY = { x: number; y: number }

// État d'interface : jamais enregistré dans le fichier, jamais dans l'historique.
export type ComponentEditorState = { mode: 'new' } | { mode: 'edit'; templateId: string }

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
  exportOpen: boolean
  setExportOpen(on: boolean): void
  // Dernier choix de sections (pour la session) : la boîte le reprend au prochain export.
  lastPdfChoice: { sections: PdfSection[]; zonePages: boolean } | null
  rememberPdfChoice(choice: { sections: PdfSection[]; zonePages: boolean }): void
  // Vue épinglée (spec 2026-10-14) : le cadre de la vignette, le temps de la session.
  pinnedRect: PinnedRect | null
  setPinned(rect: PinnedRect | null): void
  // Le pointeur est au-dessus de la vignette : aucun câble ne s'y branche.
  pointerOverPinned: boolean
  setPointerOverPinned(on: boolean): void
  // Boîte « Nouvelle composante » (spec plan 4 § 6.2) : la bibliothèque n'appartient à aucun document.
  componentEditor: ComponentEditorState | null
  openComponentEditor(state: ComponentEditorState | null): void
  // Réglage de l'app, pas du document : jamais remis à zéro par resetForDocument.
  autoSave: boolean
  setAutoSave(on: boolean): void
  // Langue de l'interface (spec plan 6 § 4.2) : vient du main ; jamais remise à zéro par resetForDocument.
  lang: Lang
  setLang(lang: Lang): void
  resetForDocument(): void
}

const initialLang = (): Lang => (typeof window !== 'undefined' && window.avwan?.initialLang) || 'fr'

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
  exportOpen: false,
  setExportOpen: (on) => set({ exportOpen: on }),
  lastPdfChoice: null,
  rememberPdfChoice: (choice) => set({ lastPdfChoice: choice }),
  // Vue épinglée (spec 2026-10-14) : le cadre de la vignette, le temps de la session.
  pinnedRect: null,
  setPinned: (rect) => set({ pinnedRect: rect }),
  pointerOverPinned: false,
  setPointerOverPinned: (on) => set({ pointerOverPinned: on }),
  // Un autre document remplace le courant : tout l'état transitoire qui s'y rapportait est remis à zéro.
  componentEditor: null,
  openComponentEditor: (state) => set({ componentEditor: state }),
  autoSave: true,
  setAutoSave: (on) => set({ autoSave: on }),
  lang: initialLang(),
  setLang: (lang) => set({ lang }),
  resetForDocument: () =>
    set({
      focusVlan: null,
      inspectVlanId: null,
      hoverDeviceId: null,
      reconnectingLinkId: null,
      pendingZone: false,
      pendingTemplateId: null,
      pendingSwitch: null,
      search: null,
      pinnedRect: null
    })
}))

export function useUiStore<T>(selector: (s: UiState) => T): T {
  return useStore(uiStore, selector)
}
