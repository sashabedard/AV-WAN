import type { Device, Side, Vm } from '../model/types'
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

// VMs imbriquées (spec cartes-ip-vms § 4.5) : sous l'en-tête de l'hôte, une ligne matériel (VM_HEADER_H)
// puis des tuiles de VM_TILE_W, VM_PER_ROW par rangée. Constantes copiées dans model/layout.ts.
export const VM_TILE_W = 150
export const VM_GAP = 8
export const VM_PER_ROW = 3
export const VM_HEADER_H = 18

export function vmTileHeight(vm: Vm): number {
  return 44 + 14 * vm.vnics.length
}

export function vmBlock(vms: readonly Vm[]): NodeSize {
  if (vms.length === 0) return { w: 0, h: 0 }
  const cols = Math.min(VM_PER_ROW, vms.length)
  let h = 0
  for (let i = 0; i < vms.length; i += VM_PER_ROW) h += (i > 0 ? VM_GAP : 0) + Math.max(...vms.slice(i, i + VM_PER_ROW).map(vmTileHeight))
  return { w: cols * VM_TILE_W + (cols - 1) * VM_GAP, h }
}

// Ajoute le bloc des VMs sous la tuile de base.
function withVms(box: NodeSize, vms: readonly Vm[]): NodeSize {
  if (vms.length === 0) return box
  const block = vmBlock(vms)
  return { w: Math.max(box.w, block.w + 24), h: box.h + VM_HEADER_H + block.h + VM_GAP }
}

// Taille exacte d'un nœud à l'écran (tuile d'appareil ou façade de rack).
export function nodeSize(device: Device, vms: readonly Vm[] = []): NodeSize {
  if (!isRackDevice(device)) return withVms(device.portSides ? sidedBox(staticSideCounts(device)) : { w: deviceNodeWidth(device.ports.length), h: DEVICE_NODE_HEIGHT }, vms)
  const facade = switchFacade(device.ports, { patchPanel: isPatchPanel(device) })
  return { w: facade.width, h: facade.height }
}

export function portOffset(index: number, count: number, length: number): number {
  return Math.round(((index + 1) / (count + 1)) * length)
}

// Taille d'une tuile d'appareil selon le côté de chaque prise. Sans côtés par type : la taille d'avant
// (largeur selon le nombre de prises, hauteur fixe). Avec : chaque bord s'allonge selon ses prises (pas de 18).
export function deviceNodeBox(device: Device, sides: Record<string, Side>, vms: readonly Vm[] = []): NodeSize {
  return withVms(baseBox(device, sides), vms)
}

// Hauteur de la tuile sans VMs : les tuiles de VM commencent sous cette hauteur, après la ligne matériel.
export function baseBox(device: Device, sides: Record<string, Side>): NodeSize {
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
