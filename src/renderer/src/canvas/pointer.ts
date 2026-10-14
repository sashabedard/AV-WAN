// src/renderer/src/canvas/pointer.ts
import type { XY } from '../store/uiStore'

// Dernière position du curseur au-dessus du canvas (coordonnées écran). Pas d'état React :
// un mouvement de souris ne doit provoquer aucun rendu.
export const canvasPointer: { client: XY | null } = { client: null }

export function centreOf(el: Element | null): XY | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}
