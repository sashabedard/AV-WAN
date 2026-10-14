import type { IpConfig, PortRef, Project } from '../model/types'
import { findPort, isRackDevice } from '../model/rules'
import { POE_LABELS, type LinkPoe } from '../model/derive'
import type { Cell } from '../../../shared/tables'

export const DASH = '—'

export const STATUS_LABELS: Record<Project['meta']['status'], string> = {
  conception: 'Conception',
  'tel-que-construit': 'Tel que construit'
}

const collator = new Intl.Collator('fr-CA', { numeric: true, sensitivity: 'base' })

// Tri naturel en français : C-002 avant C-010, « é » rangé avec « e ».
export function compareText(a: string, b: string): number {
  return collator.compare(a, b)
}

// Nombre à la française : 1.5 → « 1,5 ».
export function formatNumber(n: number): string {
  return String(n).replace('.', ',')
}

// Texte d'une cellule dans le PDF : nombre à la française, cellule vide → tiret.
export function cellText(c: Cell): string {
  if (c === null || c === '') return DASH
  return typeof c === 'number' ? formatNumber(c) : c
}

// « SW-1 · port 3 » pour un port numéroté de façade, sinon « CAM-1 · ETH ». « ? » si le port a disparu.
export function portRefLabel(project: Project, ref: PortRef): string {
  const found = findPort(project, ref)
  if (!found) return `? · ${ref.portId}`
  const { device, port } = found
  return `${device.name} · ${isRackDevice(device) && /^\d+$/.test(port.label) ? `port ${port.label}` : port.label}`
}

// « 40 NDI » ; le numéro seul si le VLAN n'est plus dans le projet.
export function vlanName(project: Project, id: number): string {
  const v = project.vlans.find((x) => x.id === id)
  return v ? `${id} ${v.name}` : String(id)
}

export function taggedLabel(tagged: number[] | 'all'): string {
  if (tagged === 'all') return 'Tous'
  return tagged.length === 0 ? DASH : [...tagged].sort((a, b) => a - b).join(', ')
}

export function poeLabel(poe: LinkPoe): string {
  if (!poe.active || !poe.cls) return DASH
  return `${POE_LABELS[poe.cls]} actif${poe.drawW !== undefined ? ` (${formatNumber(poe.drawW)} W)` : ''}`
}

export function lengthLabel(m: number | undefined): string {
  return m === undefined ? DASH : `${formatNumber(m)} m`
}

export function ipLabel(ip: IpConfig | undefined): string {
  if (!ip) return 'non définie'
  if (ip.mode === 'dhcp') return ip.address ? `${ip.address} (DHCP)` : 'DHCP'
  return ip.address ? `${ip.address} statique` : 'statique, adresse à définir'
}
