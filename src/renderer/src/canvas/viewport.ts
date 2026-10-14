// Pont entre le menu natif (hors de ReactFlowProvider) et l'instance React Flow.
export interface ViewportControls {
  fitView(options?: { padding?: number; maxZoom?: number; duration?: number }): Promise<boolean>
  zoomIn(options?: { duration?: number }): Promise<boolean>
  zoomOut(options?: { duration?: number }): Promise<boolean>
}

export const FIT_OPTIONS = { padding: 0.15, maxZoom: 1 } as const
let instance: ViewportControls | null = null

export function registerViewport(i: ViewportControls | null): void {
  instance = i
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
