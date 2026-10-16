import type { Connector, Device, Link, Medium, PortDef, PortRef, Project } from './types'
import type { Messages } from '../../../shared/i18n/messages'
import { PATCH_PANEL_TEMPLATE_IDS, RACK_TEMPLATE_IDS } from '../catalog/templates'

export type Family = 'ethernet' | 'optical' | 'wifi' | 'usb' | 'dmx' | 'pixel' | 'hdmi' | 'sdi' | 'serial' | 'dc'

// Libellés des familles de ports dans la langue de `m` (les identifiants de famille ne changent pas).
export function familyLabels(m: Messages): Record<Family, string> {
  return m.model.family
}

export function connectorFamily(c: Connector): Family {
  if (c === 'rj45') return 'ethernet'
  if (c === 'sfp' || c === 'sfp+') return 'optical'
  return c
}

const SWITCH_LIKE_TEMPLATES: ReadonlySet<string> = new Set(['switch', 'gateway', 'ap'])

export function isSwitchLike(device: Device): boolean {
  return SWITCH_LIKE_TEMPLATES.has(device.templateId)
}

export function findDevice(project: Project, id: string): Device | undefined {
  return project.devices.find((d) => d.id === id)
}

export function findPort(project: Project, ref: PortRef): { device: Device; port: PortDef } | undefined {
  const device = findDevice(project, ref.deviceId)
  const port = device?.ports.find((p) => p.id === ref.portId)
  return device && port ? { device, port } : undefined
}

export function sameRef(a: PortRef, b: PortRef): boolean {
  return a.deviceId === b.deviceId && a.portId === b.portId
}

export function linksOnPort(project: Project, ref: PortRef): Link[] {
  return project.links.filter((l) => sameRef(l.a, ref) || sameRef(l.b, ref))
}

export function acceptsMultipleLinks(device: Device, port: PortDef): boolean {
  return port.connector === 'wifi' && isSwitchLike(device)
}

export function isPortFree(project: Project, ref: PortRef): boolean {
  const found = findPort(project, ref)
  if (!found) return false
  if (acceptsMultipleLinks(found.device, found.port)) return true
  return linksOnPort(project, ref).length === 0
}

export function canConnectPorts(project: Project, a: PortRef, b: PortRef): boolean {
  if (a.deviceId === b.deviceId) return false
  const pa = findPort(project, a)
  const pb = findPort(project, b)
  if (!pa || !pb) return false
  if (connectorFamily(pa.port.connector) !== connectorFamily(pb.port.connector)) return false
  if (!isPortFree(project, a) || !isPortFree(project, b)) return false
  return !project.links.some((l) => (sameRef(l.a, a) && sameRef(l.b, b)) || (sameRef(l.a, b) && sameRef(l.b, a)))
}

// Rebrancher le bout `end` d'un câble sur `to` : on juge comme si le câble n'existait pas encore.
export function canReconnect(project: Project, linkId: string, end: 'a' | 'b', to: PortRef): boolean {
  const link = project.links.find((l) => l.id === linkId)
  if (!link) return false
  const fixed = end === 'a' ? link.b : link.a
  return canConnectPorts({ ...project, links: project.links.filter((l) => l.id !== linkId) }, fixed, to)
}

export function defaultMedium(c: Connector): Medium {
  switch (c) {
    case 'rj45':
      return 'cat6'
    case 'sfp':
    case 'sfp+':
      return 'om4'
    default:
      return c
  }
}

// Prochain numéro après le plus élevé : ne comble pas les trous (un numéro supprimé au milieu ne revient pas). Le numéro du dernier câble, s'il est supprimé, peut être réattribué.
export function nextCableId(project: Project): string {
  const prefix = project.settings.cableIdPrefix
  let max = 0
  for (const l of project.links) {
    if (!l.cableId.startsWith(prefix)) continue
    const n = Number(l.cableId.slice(prefix.length))
    if (Number.isInteger(n) && n > max) max = n
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

export function nextDeviceName(project: Project, code: string): string {
  const used = new Set(project.devices.map((d) => d.name))
  let n = 1
  while (used.has(`${code}-${n}`)) n++
  return `${code}-${n}`
}

export function pickPort(project: Project, from: PortRef, targetDeviceId: string): string | undefined {
  const src = findPort(project, from)
  const target = findDevice(project, targetDeviceId)
  if (!src || !target || target.id === from.deviceId) return undefined
  const family = connectorFamily(src.port.connector)
  const score = (p: PortDef): number => {
    if ((src.port.poeIn && p.poeOut) || (src.port.poeOut && p.poeIn)) return 2
    if (!src.port.poeIn && p.poeOut) return 0 // garder les ports PoE pour les appareils alimentés
    return 1
  }
  let best: PortDef | undefined
  let bestScore = -1
  for (const p of target.ports) {
    if (connectorFamily(p.connector) !== family) continue
    if (!canConnectPorts(project, from, { deviceId: target.id, portId: p.id })) continue
    const s = score(p)
    if (s > bestScore) {
      best = p
      bestScore = s
    }
  }
  return best?.id
}

export function isRackDevice(device: Device): boolean {
  return device.switch !== undefined || RACK_TEMPLATE_IDS.has(device.templateId)
}

// Prise jumelle dans un panneau de brassage (avant A3 ⇄ arrière R3), ou undefined hors d'un panneau.
export function passThroughPeer(device: Device, portId: string): string | undefined {
  if (!PATCH_PANEL_TEMPLATE_IDS.has(device.templateId)) return undefined
  const m = /^([AR])(\d+)$/.exec(portId)
  if (!m) return undefined
  const peer = `${m[1] === 'A' ? 'R' : 'A'}${m[2]}`
  return device.ports.some((p) => p.id === peer) ? peer : undefined
}
