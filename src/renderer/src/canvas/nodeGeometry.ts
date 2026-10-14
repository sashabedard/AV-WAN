import type { Side } from '../model/types'

export const DEVICE_NODE_HEIGHT = 58

// Étiquette du nom (.dn__tape dans canvas.css : left 8 px, à cheval sur le bord du haut).
// Quand les prises sont en haut, l'étiquette est bornée à TAPE_TOP_MAX_WIDTH et les prises
// se rangent à droite de cette réserve, pour ne jamais cacher le nom.
export const TAPE_LEFT = 8
export const TAPE_TOP_MAX_WIDTH = 72
export const TAPE_RESERVE = TAPE_LEFT + TAPE_TOP_MAX_WIDTH

export function deviceNodeWidth(portCount: number): number {
  return Math.max(176, 24 + portCount * 18)
}

export function portOffset(index: number, count: number, length: number): number {
  return Math.round(((index + 1) / (count + 1)) * length)
}

// Position d'une prise le long de son bord (x pour haut/bas, y pour gauche/droite).
export function devicePortOffset(side: Side, index: number, count: number, width: number): number {
  if (side === 'top') return TAPE_RESERVE + portOffset(index, count, width - TAPE_RESERVE)
  return portOffset(index, count, side === 'bottom' ? width : DEVICE_NODE_HEIGHT)
}
