import type { IpConfig, PortRef, Project } from '../model/types'
import { findPort, isRackDevice } from '../model/rules'
import { POE_LABELS, type LinkPoe } from '../model/derive'
import type { Cell } from '../../../shared/tables'
import type { Lang } from '../../../shared/i18n/lang'
import { messages } from '../../../shared/i18n/messages'

export const DASH = '—'

export const STATUS_LABELS: Record<Project['meta']['status'], string> = {
  conception: 'Conception',
  'tel-que-construit': 'Tel que construit'
}

const collators: Record<Lang, Intl.Collator> = {
  fr: new Intl.Collator('fr-CA', { numeric: true, sensitivity: 'base' }),
  en: new Intl.Collator('en-CA', { numeric: true, sensitivity: 'base' })
}

// Tri naturel : C-002 avant C-010, « é » rangé avec « e » en français.
export function compareText(a: string, b: string, lang: Lang): number {
  return collators[lang].compare(a, b)
}

// Nombre sans séparateur de milliers : 1.5 → « 1,5 » en français, « 1.5 » en anglais.
export function formatNumber(n: number, lang: Lang): string {
  return String(n).replace('.', lang === 'fr' ? ',' : '.')
}

// Texte d'une cellule dans le PDF : nombre selon la langue, cellule vide → tiret.
export function cellText(c: Cell, lang: Lang): string {
  if (c === null || c === '') return DASH
  return typeof c === 'number' ? formatNumber(c, lang) : c
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

export function taggedLabel(tagged: number[] | 'all', lang: Lang): string {
  if (tagged === 'all') return messages(lang).reports.common.taggedAll
  return tagged.length === 0 ? DASH : [...tagged].sort((a, b) => a - b).join(', ')
}

export function poeLabel(poe: LinkPoe, lang: Lang): string {
  if (!poe.active || !poe.cls) return DASH
  return messages(lang).reports.common.poeActive({ label: POE_LABELS[poe.cls], ...(poe.drawW !== undefined ? { watts: formatNumber(poe.drawW, lang) } : {}) })
}

export function lengthLabel(m: number | undefined, lang: Lang): string {
  return m === undefined ? DASH : `${formatNumber(m, lang)} m`
}

export function ipLabel(ip: IpConfig | undefined, lang: Lang): string {
  const c = messages(lang).reports.common
  if (!ip) return c.ipNone
  if (ip.mode === 'dhcp') return ip.address ? `${ip.address} (DHCP)` : 'DHCP'
  return ip.address ? c.ipStatic({ address: ip.address }) : c.ipStaticTbd
}
