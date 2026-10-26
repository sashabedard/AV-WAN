import type { Connector, Device, PortDef, Project, Side, SideGroup } from './types'
import { facingSide, groupOfConnector, projectSizeOf, resolvePortSide, type SizeOf } from './layout'

// Côté des ports par type de connecteur (spec cartes-ip-vms § 4.3, § 4.4).
export const SIDE_GROUPS: readonly SideGroup[] = ['reseau', 'video', 'usb', 'alim', 'dmx']

export function sideGroupOf(c: Connector): SideGroup {
  return groupOfConnector(c)
}

// portId → côté. Groupe réglé → ce côté ; « auto » → face aux voisins branchés par les seuls ports du groupe,
// sinon le côté par défaut ; groupe absent → le côté par défaut (device.portSide résolu, comme avant).
export function resolvePortSides(project: Project, device: Device, sizeOf: SizeOf = projectSizeOf(project)): Record<string, Side> {
  const fallback = resolvePortSide(project, device, sizeOf)
  const bySet = new Map<SideGroup, Side>()
  for (const g of SIDE_GROUPS) {
    const set = device.portSides?.[g]
    if (!set) continue
    if (set !== 'auto') bySet.set(g, set)
    else {
      const ids = new Set(device.ports.filter((p) => sideGroupOf(p.connector) === g).map((p) => p.id))
      const mine = (r: { deviceId: string; portId: string }): boolean => r.deviceId === device.id && ids.has(r.portId)
      bySet.set(g, facingSide(project, device, sizeOf, (l) => mine(l.a) || mine(l.b)) ?? fallback)
    }
  }
  return Object.fromEntries(device.ports.map((p) => [p.id, bySet.get(sideGroupOf(p.connector)) ?? fallback]))
}

// Prises de chaque côté. Avec des côtés par type : groupées (réseau, vidéo, USB, alim, DMX) puis dans l'ordre des ports ;
// sans réglage, l'ordre des ports d'aujourd'hui (rendu identique).
export function sideLayout(device: Device, sides: Record<string, Side>): Record<Side, PortDef[]> {
  const out: Record<Side, PortDef[]> = { top: [], bottom: [], left: [], right: [] }
  const ordered = device.portSides
    ? SIDE_GROUPS.flatMap((g) => device.ports.filter((p) => sideGroupOf(p.connector) === g))
    : device.ports
  for (const p of ordered) out[sides[p.id] ?? 'bottom'].push(p)
  return out
}
