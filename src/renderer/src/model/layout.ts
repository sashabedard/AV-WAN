import type { Connector, Device, Link, PortDef, Project, Side, SideGroup, Vm } from './types'
import { isPatchPanel, isRackDevice } from './rules'

export interface NodeSize {
  w: number
  h: number
}
export type SizeOf = (device: Device) => NodeSize

// Estimation pure de la taille d'un nœud à l'écran. Le canvas passe sa géométrie exacte
// (nodeGeometry.ts, switchFacade.ts) ; ces formules en sont la copie, sans dépendre du canvas.
export function estimateNodeSize(device: Device, vms: readonly Vm[] = []): NodeSize {
  if (!isRackDevice(device)) {
    const base = device.portSides ? sidedBox(staticSideCounts(device)) : { w: Math.max(176, 24 + device.ports.length * 18), h: 58 }
    return withVms(base, vms)
  }
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

// Bloc des VMs (copie de canvas/nodeGeometry.ts : tuiles de 150, écart 8, 3 par rangée, 44 + 14 par vNIC, ligne matériel 18).
function withVms(box: NodeSize, vms: readonly Vm[]): NodeSize {
  if (vms.length === 0) return box
  const cols = Math.min(3, vms.length)
  let h = 0
  for (let i = 0; i < vms.length; i += 3) h += (i > 0 ? 8 : 0) + Math.max(...vms.slice(i, i + 3).map((v) => 44 + 14 * v.vnics.length))
  return { w: Math.max(box.w, cols * 150 + (cols - 1) * 8 + 24), h: box.h + 18 + h + 8 }
}

// Tailles qui tiennent compte des VMs du projet (une VM agrandit son hôte).
export function projectSizeOf(project: Project): SizeOf {
  const vms = project.vms ?? []
  if (vms.length === 0) return (d) => estimateNodeSize(d)
  return (d) => estimateNodeSize(d, vms.filter((v) => v.hostId === d.id))
}

function centre(device: Device, sizeOf: SizeOf): { x: number; y: number } {
  const { w, h } = sizeOf(device)
  return { x: device.position.x + w / 2, y: device.position.y + h / 2 }
}

// Côté « auto » : face à la moyenne des voisins branchés (de centre à centre) ; en bas s'il n'y en a aucun.
export function resolvePortSide(project: Project, device: Device, sizeOf: SizeOf = projectSizeOf(project)): Side {
  if (device.portSide !== 'auto') return device.portSide
  return facingSide(project, device, sizeOf) ?? 'bottom'
}

// Côté qui fait face à la moyenne des voisins branchés par les câbles retenus ; undefined sans voisin.
export function facingSide(project: Project, device: Device, sizeOf: SizeOf = projectSizeOf(project), keep: (l: Link) => boolean = () => true): Side | undefined {
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
