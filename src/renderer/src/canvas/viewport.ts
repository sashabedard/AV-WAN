// Pont entre le menu natif (hors de ReactFlowProvider) et l'instance React Flow du canvas principal.
import { uiStore } from '../store/uiStore'
import { visibleFlowRect } from './pinnedView'

export interface ViewportControls {
  fitView(options?: { padding?: number; maxZoom?: number; duration?: number }): Promise<boolean>
  zoomIn(options?: { duration?: number }): Promise<boolean>
  zoomOut(options?: { duration?: number }): Promise<boolean>
  getViewport(): { x: number; y: number; zoom: number }
  setCenter(x: number, y: number, options?: { zoom?: number; duration?: number }): Promise<boolean>
}

export const FIT_OPTIONS = { padding: 0.15, maxZoom: 1 } as const
const CENTER_DURATION = 200
let instance: ViewportControls | null = null
let element: HTMLElement | null = null

// `el` : l'élément du canvas principal ; sa taille donne le cadre à épingler.
export function registerViewport(i: ViewportControls | null, el: HTMLElement | null = null): void {
  instance = i
  element = el
}
export function fitAll(): void {
  void instance?.fitView(FIT_OPTIONS)
}
export function zoomIn(): void {
  void instance?.zoomIn({ duration: 120 })
}
export function zoomOut(): void {
  void instance?.zoomOut({ duration: 120 })
}

// Vue épinglée : le rectangle visible du canvas principal devient le cadre de la vignette (spec 2026-10-14 § 3.1).
export function pinCurrentView(): void {
  if (!instance || !element) return
  const { width, height } = element.getBoundingClientRect()
  if (width === 0 || height === 0) return
  uiStore.getState().setPinned(visibleFlowRect(instance.getViewport(), { width, height }))
}
export function unpinView(): void {
  uiStore.getState().setPinned(null)
}
// Double-clic dans la vignette : la vue principale se centre sur ce point, au même zoom.
export function centerOn(x: number, y: number): void {
  if (!instance) return
  void instance.setCenter(x, y, { zoom: instance.getViewport().zoom, duration: CENTER_DURATION })
}
