// src/renderer/src/reports/ipPlan.ts
import type { Device, IpConfig, PortRef, Project } from '../model/types'
import { findDevice, isSwitchLike, linksOnPort } from '../model/rules'
import { linkVlanView } from '../model/derive'
import type { Column, DataTable } from '../../../shared/tables'
import type { Lang } from '../../../shared/i18n/lang'
import { messages, type Messages } from '../../../shared/i18n/messages'
import { DASH, compareText, vlanName } from './format'

const WIDTHS = [16, 14, 16, 10, 18, 18]

export function ipColumns(m: Messages): Column[] {
  const c = m.reports.ip
  return [c.device, c.iface, c.address, c.mode, c.vlan, c.hostname].map((label, i) => ({ label, width: WIDTHS[i]! }))
}

interface Entry {
  device: Device
  iface: string
  ip: IpConfig
  vlan?: number
  hostname?: string
}

const NETWORK_CONNECTORS: ReadonlySet<string> = new Set(['rj45', 'sfp', 'sfp+', 'wifi'])

// VLAN d'une prise : le réglage du port d'un switch, sinon celui du câble branché (accès, ou natif d'un trunk).
function portVlan(project: Project, ref: PortRef): number | undefined {
  const device = findDevice(project, ref.deviceId)
  const own = device && isSwitchLike(device) ? device.portState[ref.portId]?.nativeVlan : undefined
  if (own !== undefined) return own
  const link = linksOnPort(project, ref)[0]
  if (!link) return undefined
  const v = linkVlanView(project, link)
  return v.kind === 'access' ? v.vlan : v.kind === 'trunk' ? v.native : undefined
}

// VLAN de l'adresse principale : pour un switch, une passerelle ou un point d'accès, le natif du premier trunk
// (le VLAN de gestion) ; sinon celui du premier port réseau branché qui en a un.
function deviceVlan(project: Project, device: Device): number | undefined {
  if (isSwitchLike(device)) {
    for (const port of device.ports) {
      const st = device.portState[port.id]
      if (st?.mode === 'trunk' && st.nativeVlan !== undefined) return st.nativeVlan
    }
  }
  for (const port of device.ports) {
    if (!NETWORK_CONNECTORS.has(port.connector)) continue
    const v = portVlan(project, { deviceId: device.id, portId: port.id })
    if (v !== undefined) return v
  }
  return undefined
}

function ipv4(address: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(address.trim())
  if (!m) return null
  const parts = m.slice(1).map(Number)
  return parts.every((n) => n <= 255) ? parts : null
}

function compareEntries(a: Entry, b: Entry, lang: Lang): number {
  if (a.vlan !== b.vlan) {
    if (a.vlan === undefined) return 1
    if (b.vlan === undefined) return -1
    return a.vlan - b.vlan
  }
  const ka = ipv4(a.ip.address)
  const kb = ipv4(b.ip.address)
  if (ka && kb) {
    for (let i = 0; i < 4; i++) if (ka[i] !== kb[i]) return ka[i]! - kb[i]!
  } else if (ka) return -1
  else if (kb) return 1
  else {
    const t = compareText(a.ip.address, b.ip.address, lang)
    if (t !== 0) return t
  }
  return compareText(a.device.name, b.device.name, lang) || compareText(a.iface, b.iface, lang)
}

// Plan d'adressage IP (spec § 11.1, section 6) : trié par VLAN, puis par adresse.
export function ipPlan(project: Project, lang: Lang): DataTable {
  const m = messages(lang)
  const entries: Entry[] = []
  for (const device of project.devices) {
    if (device.ip) {
      entries.push({ device, iface: m.reports.ip.main, ip: device.ip, vlan: deviceVlan(project, device), ...(device.hostname ? { hostname: device.hostname } : {}) })
    }
    for (const port of device.ports) {
      const ip = device.portState[port.id]?.ip
      if (ip) entries.push({ device, iface: port.label, ip, vlan: portVlan(project, { deviceId: device.id, portId: port.id }) })
    }
  }
  const rows = entries
    .sort((a, b) => compareEntries(a, b, lang))
    .map((e) => [e.device.name, e.iface, e.ip.address || DASH, e.ip.mode === 'static' ? m.reports.ip.static : 'DHCP', e.vlan !== undefined ? vlanName(project, e.vlan) : DASH, e.hostname ?? ''])
  return { id: m.reports.files.ip, title: m.reports.ip.title, columns: ipColumns(m), rows }
}
