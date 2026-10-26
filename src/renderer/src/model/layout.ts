import type { Connector, Device, Link, PortDef, Project, Side, SideGroup } from './types'
import { isPatchPanel, isRackDevice } from './rules'

export interface NodeSize {
  w: number
  h: number
}
export type SizeOf = (device: Device) => NodeSize

// Estimation pure de la taille d'un nœud à l'écran. Le canvas passe sa géométrie exacte
// (nodeGeometry.ts, switchFacade.ts) ; ces formules en sont la copie, sans dépendre du canvas.
export function estimateNodeSize(device: Device): NodeSize {
  if (!isRackDevice(device)) return device.portSides ? sidedBox(staticSideCounts(device)) : { w: Math.max(176, 24 + device.ports.length * 18), h: 58 }
  const rj = device.ports.filter((p) => p.connector === 'rj45')
  const sfp = device.ports.filter((p) => p.connector !== 'rj45')
  const twoRows = rj.some((p) => p.row === 'top')
  // Colonnes = la rangée la plus longue (copie de canvas/switchFacade.ts, sans dépendre du canvas).
  const perRow = (list: PortDef[]): number =>
    twoRows ? Math.max(list.filter((p) => p.row === 'top').length, list.filter((p) => p.row !== 'top').length) : list.length
  // oreille 12 + marge 28 (46 pour un panneau, qui loge « ARRIÈRE ») + pas 20 par colonne RJ45 (+ 14 + 22 par colonne SFP+) + marge 22 + oreille 12
  return { w: 12 + (isPatchPanel(device) ? 46 : 28) + perRow(rj) * 20 + (sfp.length > 0 ? 14 + perRow(sfp) * 22 : 0) + 22 + 12, h: twoRows ? 92 : 66 }
}

// Copie de sides.ts:sideGroupOf (pas d'import : sides.ts dépend de ce module).
const GROUP: Record<Connector, SideGroup> = {
  rj45: 'reseau', sfp: 'reseau', 'sfp+': 'reseau', wifi: 'reseau',
  hdmi: 'video', sdi: 'video', displayport: 'video',
  usb: 'usb', serial: 'usb', dc: 'alim', dmx: 'dmx', pixel: 'dmx'
}
export const groupOfConnector = (c: Connector): SideGroup => GROUP[c]

// Nombre de prises par côté sans regarder les câbles : un groupe « auto » (ou absent) suit le côté par défaut,
// lui-même « en bas » s'il est automatique. Sert aux tailles (centres, zones), pas au rendu des prises.
export function staticSideCounts(device: Device): Record<Side, number> {
  const fallback: Side = device.portSide === 'auto' ? 'bottom' : device.portSide
  const counts: Record<Side, number> = { top: 0, bottom: 0, left: 0, right: 0 }
  for (const p of device.ports) {
    const set = device.portSides?.[GROUP[p.connector]]
    counts[set && set !== 'auto' ? set : fallback]++
  }
  return counts
}

// Taille d'une tuile à côtés par type (copie de canvas/nodeGeometry.ts:deviceNodeBox) : la réserve de l'étiquette
// (80 px, soit 5 pas de 18) s'ajoute aux prises du haut.
export function sidedBox(c: Record<Side, number>): NodeSize {
  return {
    w: Math.max(176, 24 + Math.max(c.top + (c.top > 0 ? Math.ceil(80 / 18) : 0), c.bottom) * 18),
    h: Math.max(58, 16 + Math.max(c.left, c.right) * 18)
  }
}

function centre(device: Device, sizeOf: SizeOf): { x: number; y: number } {
  const { w, h } = sizeOf(device)
  return { x: device.position.x + w / 2, y: device.position.y + h / 2 }
}

// Côté « auto » : face à la moyenne des voisins branchés (de centre à centre) ; en bas s'il n'y en a aucun.
export function resolvePortSide(project: Project, device: Device, sizeOf: SizeOf = estimateNodeSize): Side {
  if (device.portSide !== 'auto') return device.portSide
  return facingSide(project, device, sizeOf) ?? 'bottom'
}

// Côté qui fait face à la moyenne des voisins branchés par les câbles retenus ; undefined sans voisin.
export function facingSide(project: Project, device: Device, sizeOf: SizeOf = estimateNodeSize, keep: (l: Link) => boolean = () => true): Side | undefined {
  const self = centre(device, sizeOf)
  let dx = 0
  let dy = 0
  let n = 0
  for (const l of project.links) {
    if (!keep(l)) continue
    const peerId = l.a.deviceId === device.id ? l.b.deviceId : l.b.deviceId === device.id ? l.a.deviceId : null
    if (!peerId || peerId === device.id) continue
    const peer = project.devices.find((d) => d.id === peerId)
    if (!peer) continue
    const other = centre(peer, sizeOf)
    dx += other.x - self.x
    dy += other.y - self.y
    n++
  }
  if (n === 0) return undefined
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'bottom' : 'top'
}
