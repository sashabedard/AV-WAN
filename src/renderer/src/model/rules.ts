import type { Connector, Device, Link, Medium, PortDef, PortRef, Project } from './types'

export type Family = 'ethernet' | 'optical' | 'wifi' | 'usb' | 'dmx' | 'pixel' | 'hdmi' | 'sdi' | 'serial'

export const FAMILY_LABELS: Record<Family, string> = {
  ethernet: 'RJ45',
  optical: 'SFP/SFP+',
  wifi: 'Wi-Fi',
  usb: 'USB',
  dmx: 'DMX',
  pixel: 'pixels',
  hdmi: 'HDMI',
  sdi: 'SDI',
  serial: 'série'
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

// Ne réutilise jamais un numéro supprimé : l'étiquette physique existe peut-être déjà.
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
