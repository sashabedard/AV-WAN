import type { Device, PortDef, Project, Side } from './types'
import { isRackDevice } from './rules'

export interface NodeSize {
  w: number
  h: number
}
export type SizeOf = (device: Device) => NodeSize

// Estimation pure de la taille d'un nœud à l'écran. Le canvas passe sa géométrie exacte
// (nodeGeometry.ts, switchFacade.ts) ; ces formules en sont la copie, sans dépendre du canvas.
export function estimateNodeSize(device: Device): NodeSize {
  if (!isRackDevice(device)) return { w: Math.max(176, 24 + device.ports.length * 18), h: 58 }
  const rj = device.ports.filter((p) => p.connector === 'rj45')
  const sfp = device.ports.filter((p) => p.connector !== 'rj45')
  const twoRows = rj.some((p) => p.row === 'top')
  // Colonnes = la rangée la plus longue (copie de canvas/switchFacade.ts, sans dépendre du canvas).
  const perRow = (list: PortDef[]): number =>
    twoRows ? Math.max(list.filter((p) => p.row === 'top').length, list.filter((p) => p.row !== 'top').length) : list.length
  // oreille 12 + marge 28 + pas 20 par colonne RJ45 (+ 14 + 22 par colonne SFP+) + marge 22 + oreille 12
  return { w: 12 + 28 + perRow(rj) * 20 + (sfp.length > 0 ? 14 + perRow(sfp) * 22 : 0) + 22 + 12, h: twoRows ? 92 : 66 }
}

function centre(device: Device, sizeOf: SizeOf): { x: number; y: number } {
  const { w, h } = sizeOf(device)
  return { x: device.position.x + w / 2, y: device.position.y + h / 2 }
}

// Côté « auto » : face aux voisins branchés, de centre à centre. Chaque voisin pèse 1 / distance :
// un voisin proche l'emporte sur un voisin lointain (report du plan 2). En bas s'il n'y en a aucun.
export function resolvePortSide(project: Project, device: Device, sizeOf: SizeOf = estimateNodeSize): Side {
  if (device.portSide !== 'auto') return device.portSide
  const self = centre(device, sizeOf)
  let dx = 0
  let dy = 0
  let n = 0
  for (const l of project.links) {
    const peerId = l.a.deviceId === device.id ? l.b.deviceId : l.b.deviceId === device.id ? l.a.deviceId : null
    if (!peerId || peerId === device.id) continue
    const peer = project.devices.find((d) => d.id === peerId)
    if (!peer) continue
    const other = centre(peer, sizeOf)
    const ox = other.x - self.x
    const oy = other.y - self.y
    const d2 = ox * ox + oy * oy
    if (d2 === 0) continue // voisin superposé : aucune direction
    // Vecteur unitaire vers le voisin, divisé par la distance : (ox, oy) / d².
    dx += ox / d2
    dy += oy / d2
    n++
  }
  if (n === 0) return 'bottom'
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'bottom' : 'top'
}
