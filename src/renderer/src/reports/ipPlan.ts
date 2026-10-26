// src/renderer/src/reports/ipPlan.ts
import type { Device, IpConfig, Project } from '../model/types'
import { isSwitchLike } from '../model/rules'
import { portLabelWithCard } from '../model/cards'
import { vnicVlan } from '../model/vms'
import { portVlan } from '../model/derive'
import type { Column, DataTable } from '../../../shared/tables'
import type { Lang } from '../../../shared/i18n/lang'
import { messages, type Messages } from '../../../shared/i18n/messages'
import { DASH, compareText, vlanName } from './format'
import { isNetworkPort, primaryIp } from '../model/ips'

const WIDTHS = [16, 14, 16, 10, 18, 18]

export function ipColumns(m: Messages): Column[] {
  const c = m.reports.ip
  return [c.device, c.iface, c.address, c.mode, c.vlan, c.hostname].map((label, i) => ({ label, width: WIDTHS[i]! }))
}

interface Entry {
  owner: string // appareil, ou « hôte › VM »
  iface: string
  ip: IpConfig
  vlan?: number
  hostname?: string
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
    if (!isNetworkPort(port)) continue
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
  return compareText(a.owner, b.owner, lang) || compareText(a.iface, b.iface, lang)
}

// Plan d'adressage IP (spec § 11.1, section 6) : trié par VLAN, puis par adresse.
export function ipPlan(project: Project, lang: Lang): DataTable {
  const m = messages(lang)
  const entries: Entry[] = []
  for (const device of project.devices) {
    // Une ligne par IP. L'adresse principale garde le VLAN de l'appareil (gestion d'un switch) et le nom d'hôte.
    const main = primaryIp(device)
    for (const port of device.ports) {
      for (const ip of device.portState[port.id]?.ips ?? []) {
        const isMain = ip === main
        const vlan = isMain ? deviceVlan(project, device) : portVlan(project, { deviceId: device.id, portId: port.id })
        entries.push({ owner: device.name, iface: portLabelWithCard(device, port, m), ip, vlan, ...(isMain && device.hostname ? { hostname: device.hostname } : {}) })
      }
    }
  }
  // VMs : une ligne par IP de vNIC ; le nom d'hôte de la VM sur sa première ligne.
  for (const vm of project.vms ?? []) {
    const host = project.devices.find((d) => d.id === vm.hostId)
    if (!host) continue
    let first = true
    for (const vnic of vm.vnics) {
      for (const ip of vnic.ips) {
        entries.push({ owner: `${host.name} › ${vm.name}`, iface: vnic.label, ip, vlan: vnicVlan(project, vm, vnic), ...(first && vm.hostname ? { hostname: vm.hostname } : {}) })
        first = false
      }
    }
  }
  const rows = entries
    .sort((a, b) => compareEntries(a, b, lang))
    .map((e) => [e.owner, e.iface, e.ip.address || DASH, e.ip.mode === 'static' ? m.reports.ip.static : 'DHCP', e.vlan !== undefined ? vlanName(project, e.vlan) : DASH, e.hostname ?? ''])
  return { id: m.reports.files.ip, title: m.reports.ip.title, columns: ipColumns(m), rows }
}
