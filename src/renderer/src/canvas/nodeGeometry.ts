import type { Device, Side } from '../model/types'
import { sidedBox, staticSideCounts, type NodeSize } from '../model/layout'
import { isPatchPanel, isRackDevice } from '../model/rules'
import { switchFacade } from './switchFacade'

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

// Taille exacte d'un nœud à l'écran (tuile d'appareil ou façade de rack).
export function nodeSize(device: Device): NodeSize {
  if (!isRackDevice(device)) return device.portSides ? sidedBox(staticSideCounts(device)) : { w: deviceNodeWidth(device.ports.length), h: DEVICE_NODE_HEIGHT }
  const facade = switchFacade(device.ports, { patchPanel: isPatchPanel(device) })
  return { w: facade.width, h: facade.height }
}

export function portOffset(index: number, count: number, length: number): number {
  return Math.round(((index + 1) / (count + 1)) * length)
}

// Taille d'une tuile d'appareil selon le côté de chaque prise. Sans côtés par type : la taille d'avant
// (largeur selon le nombre de prises, hauteur fixe). Avec : chaque bord s'allonge selon ses prises (pas de 18).
export function deviceNodeBox(device: Device, sides: Record<string, Side>): NodeSize {
  if (!device.portSides) return { w: deviceNodeWidth(device.ports.length), h: DEVICE_NODE_HEIGHT }
  const c: Record<Side, number> = { top: 0, bottom: 0, left: 0, right: 0 }
  for (const p of device.ports) c[sides[p.id] ?? 'bottom']++
  return {
    w: Math.max(176, 24 + Math.max(c.top + (c.top > 0 ? Math.ceil(TAPE_RESERVE / 18) : 0), c.bottom) * 18),
    h: Math.max(DEVICE_NODE_HEIGHT, 16 + Math.max(c.left, c.right) * 18)
  }
}

// Position d'une prise le long de son bord (x pour haut/bas, y pour gauche/droite).
export function devicePortOffset(side: Side, index: number, count: number, width: number, height: number): number {
  if (side === 'top') return TAPE_RESERVE + portOffset(index, count, width - TAPE_RESERVE)
  return portOffset(index, count, side === 'bottom' ? width : height)
}
