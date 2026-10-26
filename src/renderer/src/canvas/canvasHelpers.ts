import type { Node } from '@xyflow/react'
import type { CordFlowEdge } from './toFlow'
import type { Device, Hardware, IpConfig } from '../model/types'
import type { Selection } from '../store/projectStore'
import { patchLine, type PatchEntry } from '../model/dmx'
import { LED_STRIP_TYPES, stripPower } from '../model/led'
import { resolvePsu } from '../model/power'
import { primaryIp } from '../model/ips'
import { messages } from '../../../shared/i18n/messages'
import { formatters } from '../../../shared/i18n/format'
import type { Lang } from '../../../shared/i18n/lang'

export const GRID = 8

// Deuxième ligne de la tuile d'un appareil : « adresse · FIXE/DHCP », « DHCP » sans adresse, sinon « IP non définie ».
export function deviceIpLine(ip: IpConfig | undefined, lang: Lang): string {
  const t = messages(lang).canvas.tile
  if (!ip) return t.ipUnset
  if (ip.address) return `${ip.address} · ${ip.mode === 'static' ? t.fixed : t.dhcp}`
  return ip.mode === 'dhcp' ? t.dhcp : t.ipUnset
}

// 2ᵉ ligne d'une tuile (spec patch-puissance-catalogue § 4.7) : l'adresse DMX d'un appareil patchable, sinon l'IP.
export function deviceSecondLine(device: Device, patch: PatchEntry | undefined, lang: Lang): string {
  const fmt = formatters(lang)
  if (device.ledStrip) {
    const power = stripPower(device.ledStrip)
    const len = device.ledStrip.lengthM
    return power && len !== undefined ? `${fmt.qty(power.watts, 'W')} · ${fmt.qty(len, 'm')}` : LED_STRIP_TYPES[device.ledStrip.type].label
  }
  if (device.psu) {
    const r = resolvePsu(device.psu)
    return [r.volts !== undefined ? fmt.qty(r.volts, 'V') : '', r.watts !== undefined ? fmt.qty(r.watts, 'W') : ''].filter(Boolean).join(' · ')
  }
  if (device.dmx) return patchLine(patch, messages(lang))
  return deviceIpLine(primaryIp(device), lang)
}

// Ligne matériel sous l'en-tête d'un hôte : CPU · RAM · GPU renseignés ; '' si rien.
export function hardwareLine(specs: Hardware | undefined, lang: Lang): string {
  if (!specs) return ''
  const fmt = formatters(lang)
  const ram = specs.ramGb !== undefined ? fmt.qty(specs.ramGb, messages(lang).canvas.tile.gb) : ''
  return [specs.cpu?.trim(), ram, specs.gpu?.trim()].filter(Boolean).join(' · ')
}

export function snapPoint(p: { x: number; y: number }, on: boolean): { x: number; y: number } {
  return on ? { x: Math.round(p.x / GRID) * GRID, y: Math.round(p.y / GRID) * GRID } : { x: p.x, y: p.y }
}

// Les nœuds dérivés du store n'ont ni dimensions mesurées ni sélection : on les reprend de l'état local.
export function mergeNodes<T extends Node>(derived: T[], prev: T[]): T[] {
  const byId = new Map(prev.map((n) => [n.id, n]))
  return derived.map((n) => {
    const p = byId.get(n.id)
    if (!p || (p.measured === undefined && !p.selected)) return n
    return { ...n, ...(p.measured ? { measured: p.measured } : {}), selected: p.selected ?? false }
  })
}

// Vrai quand l'état de React Flow reflète déjà les nœuds dérivés du projet courant (mergeNodes garde l'objet position).
export function nodesMatchDerived(nodes: ReadonlyArray<{ id: string; position: unknown }>, derived: ReadonlyArray<{ id: string; position: unknown }>): boolean {
  return nodes.length === derived.length && nodes.every((n, i) => n.id === derived[i].id && n.position === derived[i].position)
}

export function mergeEdges(derived: CordFlowEdge[], prev: CordFlowEdge[]): CordFlowEdge[] {
  const selected = new Set(prev.filter((e) => e.selected).map((e) => e.id))
  return derived.map((e) => (selected.has(e.id) ? { ...e, selected: true } : e))
}

// La sélection posée par le store (coller, tests, panneau VLAN) devient celle du canvas.
export function syncSelected<T extends { id: string; selected?: boolean }>(items: T[], ids: ReadonlySet<string>): T[] {
  let changed = false
  const next = items.map((item) => {
    const want = ids.has(item.id)
    if ((item.selected ?? false) === want) return item
    changed = true
    return { ...item, selected: want }
  })
  return changed ? next : items
}

// Les tuiles de VM ne sont pas des nœuds : quand React Flow vide sa propre sélection (l'hôte se désélectionne
// parce qu'une VM vient d'être choisie), la VM reste sélectionnée. Un clic dans le vide la retire (Canvas).
export function selectionFromFlow(current: Selection, next: Selection): Selection {
  const empty = next.deviceIds.length + next.linkIds.length + (next.zoneIds?.length ?? 0) === 0
  return empty && (current.vmIds?.length ?? 0) > 0 ? current : next
}

